import { Leafer, Group, ZoomEvent, PointerEvent as LeaferPointer } from 'leafer-ui'
import '@leafer-in/view'
import '@leafer-in/editor'
import { Editor } from '@leafer-in/editor'

const DRAG_THRESHOLD = 3

export interface EditorEngineOptions {
  container: HTMLElement
  width?: number
  height?: number
  editorConfig?: Record<string, any>
  /** 返回 true 时跳过 EditorEngine 的拖拽平移，用于绘制工具激活时 */
  shouldPan?: () => boolean
}

export class EditorEngine {
  readonly leafer: Leafer
  readonly editor: Editor
  readonly previewGroup: Group

  private _options: EditorEngineOptions
  private _destroyed = false
  private _canvas: HTMLCanvasElement | null = null

  // 单指拖拽
  private _pointerDown = false
  private _dragStarted = false
  private _downClient = { x: 0, y: 0 }
  private _startViewX = 0
  private _startViewY = 0

  // 双指缩放
  private _pinching = false
  private _pinchStartDist = 0
  private _pinchStartScale = 1

  private _boundWheel: ((e: WheelEvent) => void) | null = null
  private _boundPointerDown: ((e: PointerEvent) => void) | null = null
  private _boundPointerMove: ((e: PointerEvent) => void) | null = null
  private _boundPointerUp: ((e: PointerEvent) => void) | null = null
  private _boundTouchStart: ((e: TouchEvent) => void) | null = null
  private _boundTouchMove: ((e: TouchEvent) => void) | null = null
  private _boundTouchEnd: ((e: TouchEvent) => void) | null = null
  private _doubleTapOff: (() => void) | null = null

  constructor(options: EditorEngineOptions) {
    this._options = options
    const { container, editorConfig } = options
    const width = options.width || container.clientWidth || 800
    const height = options.height || container.clientHeight || 600

    this.leafer = new Leafer({ view: container, width, height })

    // 预览层（最顶层，用于绘制工具预览）
    this.previewGroup = new Group({ id: 'preview-layer' })
    this.leafer.add(this.previewGroup)

    // Editor 插件实例
    this.editor = new Editor(editorConfig)
    this.leafer.add(this.editor)

    this.leafer.waitViewReady(() => {
      this._canvas = this.leafer.canvas.view as HTMLCanvasElement
      if (this._canvas) {
        this._setupManualEvents()
      }
    })
  }

  private _setupManualEvents(): void {
    if (!this._canvas) return

    this._canvas.style.touchAction = 'none'
    ;(this._canvas.style as any).webkitTapHighlightColor = 'transparent'

    // —— 桌面端滚轮缩放 ——
    this._boundWheel = (e: WheelEvent) => {
      e.preventDefault()
      const local = this.leafer.interaction?.getLocal({ clientX: e.clientX, clientY: e.clientY })
      if (!local) return
      const delta = e.deltaY > 0 ? -0.5 : 0.5
      const changeScale = 1 + delta * 0.5
      this.leafer.scaleOfWorld(local, changeScale)
      this.leafer.emit(ZoomEvent.END, { scale: this.scale, totalScale: this.scale } as any)
    }

    // —— 单指拖拽 ——
    this._boundPointerDown = (e: PointerEvent) => {
      if (this._pinching) return
      if (this._options.shouldPan?.() === false) return
      this._pointerDown = true
      this._dragStarted = false
      this._downClient = { x: e.clientX, y: e.clientY }
      this._startViewX = this.leafer.x ?? 0
      this._startViewY = this.leafer.y ?? 0
    }

    this._boundPointerMove = (e: PointerEvent) => {
      if (!this._pointerDown || this._pinching) return
      if (!this._dragStarted) {
        const dx = e.clientX - this._downClient.x
        const dy = e.clientY - this._downClient.y
        if (Math.abs(dx) < DRAG_THRESHOLD && Math.abs(dy) < DRAG_THRESHOLD) return
        this._dragStarted = true
      }
      const dx = e.clientX - this._downClient.x
      const dy = e.clientY - this._downClient.y
      this.leafer.x = this._startViewX + dx
      this.leafer.y = this._startViewY + dy
    }

    this._boundPointerUp = () => {
      this._pointerDown = false
      this._dragStarted = false
    }

    // —— 双指缩放 ——
    this._boundTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        this._pinching = true
        this._pointerDown = false
        this._dragStarted = false
        this._pinchStartDist = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY
        )
        this._pinchStartScale = this.scale
      }
    }

    this._boundTouchMove = (e: TouchEvent) => {
      if (!this._pinching || e.touches.length !== 2) return
      e.preventDefault()
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      )
      const targetScale = this._pinchStartScale * (dist / this._pinchStartDist)
      const local = this.leafer.interaction?.getLocal({
        clientX: (e.touches[0].clientX + e.touches[1].clientX) / 2,
        clientY: (e.touches[0].clientY + e.touches[1].clientY) / 2,
      })
      if (!local) return
      const changeScale = targetScale / this.scale
      this.leafer.scaleOfWorld(local, changeScale)
      this.leafer.emit(ZoomEvent.END, { scale: this.scale, totalScale: this.scale } as any)
    }

    this._boundTouchEnd = (e: TouchEvent) => {
      if (e.touches.length < 2) {
        this._pinching = false
        this.leafer.emit(ZoomEvent.END, { scale: this.scale, totalScale: this.scale } as any)
        if (e.touches.length === 0) {
          this._pointerDown = false
          this._dragStarted = false
        }
      }
    }

    // —— 双击缩放 ——
    this._doubleTapOff = this.leafer.on_(LeaferPointer.DOUBLE_TAP, (e: any) => {
      const local = this.leafer.interaction?.getLocal({ clientX: e.clientX ?? e.x, clientY: e.clientY ?? e.y })
      if (!local) return
      const zoomType = this.scale < 1.5 ? 'in' : 'out'
      const l: any = this.leafer
      if (l.zoom) l.zoom(zoomType, 0, undefined, true)
      setTimeout(() => {
        this.leafer.emit(ZoomEvent.END, { scale: this.scale, totalScale: this.scale } as any)
      }, 350)
    }) as unknown as (() => void)

    // 注册事件
    this._canvas.addEventListener('wheel', this._boundWheel, { passive: false })
    this._canvas.addEventListener('pointerdown', this._boundPointerDown)
    window.addEventListener('pointermove', this._boundPointerMove)
    window.addEventListener('pointerup', this._boundPointerUp)
    this._canvas.addEventListener('touchstart', this._boundTouchStart, { passive: false })
    this._canvas.addEventListener('touchmove', this._boundTouchMove, { passive: false })
    this._canvas.addEventListener('touchend', this._boundTouchEnd)
    this._canvas.addEventListener('touchcancel', this._boundTouchEnd)
  }

  get scale(): number {
    return this.leafer.scaleX ?? (this.leafer as any).__zoomLayer?.scaleX ?? 1
  }

  get canvasElement(): HTMLCanvasElement | null {
    return this._canvas
  }

  get destroyed(): boolean {
    return this._destroyed
  }

  fitContent(padding: number = 50): Promise<void> {
    return new Promise(resolve => {
      const doFit = () => {
        this._manualFitContent(padding)
        setTimeout(resolve, 350)
      }
      if (this.leafer.viewReady) {
        doFit()
      } else {
        this.leafer.waitViewReady(doFit)
      }
    })
  }

  private _manualFitContent(padding: number): void {
    try {
      const bounds = this._getContentBounds()
      if (!bounds || bounds.width === 0 || bounds.height === 0) return

      const viewW = this.leafer.width ?? 800
      const viewH = this.leafer.height ?? 600
      const availW = viewW - padding * 2
      const availH = viewH - padding * 2
      const scaleW = availW / bounds.width
      const scaleH = availH / bounds.height
      const newScale = Math.min(scaleW, scaleH, 2)

      const contentCX = bounds.x + bounds.width / 2
      const contentCY = bounds.y + bounds.height / 2

      // 使用 viewport 插件的 zoom('set') 设置缩放
      const l: any = this.leafer
      if (l.zoom) {
        l.zoom('set', newScale, undefined, true)
      } else {
        this.leafer.scaleOfWorld(
          { x: contentCX, y: contentCY },
          newScale / (this.scale || 1)
        )
      }

      // 平移使内容居中
      this.leafer.x = viewW / 2 - contentCX * newScale
      this.leafer.y = viewH / 2 - contentCY * newScale
      ;(this.leafer as any).__updateViewPort?.()

      this.leafer.emit(ZoomEvent.END, { scale: newScale, totalScale: newScale } as any)
    } catch (e) {
      console.warn('[EditorEngine] _manualFitContent error:', e)
    }
  }

  private _getContentBounds(): { x: number; y: number; width: number; height: number } | null {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
    const collectBounds = (node: any, depth: number = 0) => {
      if (!node || node === this.previewGroup || node === this.editor) return
      // 遍历 children 而非依赖 width/height（Line 元素没有 width/height）
      if (node.children && node.children.length > 0) {
        node.children.forEach((c: any) => collectBounds(c, depth + 1))
      }
      // 叶子节点或有位置的节点：使用实际坐标和尺寸
      const w = node.width ?? 0
      const h = node.height ?? 0
      if (w > 0 || h > 0) {
        const x = node.x ?? 0
        const y = node.y ?? 0
        // 对于 Ellipse，(x,y) 是中心点，width/height 是直径
        const tag = node.tag ?? node.className ?? ''
        if (tag === 'Ellipse' || node.leafType === 'ellipse') {
          minX = Math.min(minX, x - w / 2)
          minY = Math.min(minY, y - h / 2)
          maxX = Math.max(maxX, x + w / 2)
          maxY = Math.max(maxY, y + h / 2)
        } else {
          minX = Math.min(minX, x)
          minY = Math.min(minY, y)
          maxX = Math.max(maxX, x + w)
          maxY = Math.max(maxY, y + h)
        }
      }
      // 对于 Line 元素，检查 points
      if (node.points && Array.isArray(node.points)) {
        const pts = node.points
        const nx = node.x ?? 0
        const ny = node.y ?? 0
        for (let i = 0; i < pts.length; i += 2) {
          minX = Math.min(minX, nx + pts[i])
          minY = Math.min(minY, ny + pts[i + 1])
          maxX = Math.max(maxX, nx + pts[i])
          maxY = Math.max(maxY, ny + pts[i + 1])
        }
      }
    }
    // 直接从 leafer children 开始遍历
    if ((this.leafer as any).children) {
      ;(this.leafer as any).children.forEach((c: any) => collectBounds(c))
    }
    if (minX === Infinity) return null
    return { x: minX, y: minY, width: maxX - minX, height: maxY - minY }
  }

  onZoomChange(handler: (scale: number) => void): void {
    this.leafer.on(ZoomEvent.END, () => {
      handler(this.scale)
    })
  }

  resize(width: number, height: number): void {
    if (this._destroyed) return
    this.leafer.resize?.({ width, height })
  }

  destroy(): void {
    if (this._destroyed) return
    this._destroyed = true

    if (this._canvas) {
      if (this._boundWheel) {
        this._canvas.removeEventListener('wheel', this._boundWheel)
        this._boundWheel = null
      }
      if (this._boundPointerDown) {
        this._canvas.removeEventListener('pointerdown', this._boundPointerDown)
        window.removeEventListener('pointermove', this._boundPointerMove!)
        window.removeEventListener('pointerup', this._boundPointerUp!)
        this._boundPointerDown = null
        this._boundPointerMove = null
        this._boundPointerUp = null
      }
      if (this._boundTouchStart) {
        this._canvas.removeEventListener('touchstart', this._boundTouchStart)
        this._canvas.removeEventListener('touchmove', this._boundTouchMove!)
        this._canvas.removeEventListener('touchend', this._boundTouchEnd!)
        this._canvas.removeEventListener('touchcancel', this._boundTouchEnd!)
        this._boundTouchStart = null
        this._boundTouchMove = null
        this._boundTouchEnd = null
      }
      if (this._doubleTapOff) {
        this._doubleTapOff()
        this._doubleTapOff = null
      }
      this._canvas = null
    }

    this.leafer.destroy()
  }
}
