import { Leafer, ZoomEvent, PointerEvent as LeaferPointer } from 'leafer-ui'
import '@leafer-in/view'

const DRAG_THRESHOLD = 3

export class LeaferEngine {
  readonly leafer: Leafer
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
  // 绑定的事件引用
  private _boundWheel: ((e: WheelEvent) => void) | null = null
  private _boundPointerDown: ((e: PointerEvent) => void) | null = null
  private _boundPointerMove: ((e: PointerEvent) => void) | null = null
  private _boundPointerUp: ((e: PointerEvent) => void) | null = null
  private _boundTouchStart: ((e: TouchEvent) => void) | null = null
  private _boundTouchMove: ((e: TouchEvent) => void) | null = null
  private _boundTouchEnd: ((e: TouchEvent) => void) | null = null
  private _doubleTapOff: (() => void) | null = null

  constructor(container: HTMLElement, config?: Record<string, any>) {
    const width = container.clientWidth || 800
    const height = container.clientHeight || 600

    this.leafer = new Leafer({
      view: container,
      width,
      height,
      ...config,
    })

    this.leafer.waitViewReady(() => {
      this._canvas = this.leafer.canvas.view as HTMLCanvasElement
      if (this._canvas) {
        this._setupManualEvents()
      }
    })
  }

  private _setupManualEvents(): void {
    if (!this._canvas) return

    // 防止浏览器手势（移动端滚动、缩放）拦截触摸事件
    this._canvas.style.touchAction = 'none'
    // 消除移动端 tap 高亮闪烁
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

    // —— 单指拖拽（PC + 移动端） ——
    this._boundPointerDown = (e: PointerEvent) => {
      if (this._pinching) return
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

    // —— 双指缩放（移动端 pinch-to-zoom） ——
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

      const currentScale = this.scale
      const changeScale = targetScale / currentScale
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

    // —— 双击缩放（移动端） ——
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

  get destroyed(): boolean {
    return this._destroyed
  }

  fitContent(padding: number = 50): Promise<void> {
    return new Promise(resolve => {
      const doFit = () => {
        const l: any = this.leafer
        if (l.zoom) {
          l.zoom('fit', padding, undefined, true)
        }
        setTimeout(resolve, 350)
      }
      if (this.leafer.viewReady) {
        doFit()
      } else {
        this.leafer.waitViewReady(doFit)
      }
    })
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
