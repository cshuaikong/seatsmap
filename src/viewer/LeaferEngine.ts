import { Leafer, ZoomEvent, PointerEvent as LeaferPointer } from 'leafer-ui'
import '@leafer-in/view'
import '@leafer-in/viewport'

/**
 * 基于 Leafer 原生 Viewport 插件的渲染引擎。
 * Pan / 双指缩放 由 @leafer-in/viewport 内置处理，
 * Ctrl+滚轮缩放 / 双击缩放 由自定义处理器接管。
 */
export class LeaferEngine {
  readonly leafer: Leafer
  private _destroyed = false
  private _canvas: HTMLCanvasElement | null = null
  private _doubleTapOff: (() => void) | null = null
  private _boundWheel: ((e: WheelEvent) => void) | null = null

  constructor(container: HTMLElement, config?: Record<string, any>) {
    const width = container.clientWidth || 800
    const height = container.clientHeight || 600

    this.leafer = new Leafer({
      view: container,
      width,
      height,
      move: { scroll: true, disabled: false, holdSpaceKey: true, holdMiddleKey: true },
      wheel: { preventDefault: true, speed: 0.5 },
      zoom: { min: 0.05, max: 20 },
      ...config,
    })

    this.leafer.waitViewReady(() => {
      this._canvas = this.leafer.canvas.view as HTMLCanvasElement
      if (this._canvas) {
        this._setupWheelZoom()
        this._setupDoubleTapZoom()
      }
    })
  }

  // ==================== Ctrl+滚轮缩放 ====================

  private _setupWheelZoom(): void {
    if (!this._canvas) return
    this._boundWheel = (e: WheelEvent) => {
      if (!e.ctrlKey && !e.metaKey) return
      e.preventDefault()
      const local = this.leafer.interaction?.getLocal({ clientX: e.clientX, clientY: e.clientY })
      if (!local) return
      const delta = e.deltaY > 0 ? -0.5 : 0.5
      const changeScale = 1 + delta * 0.5
      this.leafer.scaleOfWorld(local, changeScale)
      this.leafer.emit(ZoomEvent.END, { scale: this.scale, totalScale: this.scale } as any)
    }
    this._canvas.addEventListener('wheel', this._boundWheel, { passive: false })
  }

  // ==================== 双击缩放（自定义业务逻辑） ====================

  private _setupDoubleTapZoom(): void {
    if (!this._shouldEnableDoubleTapZoom()) return
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
  }

  // ==================== 子类可覆写的保护方法 ====================

  /** 是否启用双击缩放（编辑器模式下禁用，双击用于顶点编辑/聚焦） */
  protected _shouldEnableDoubleTapZoom(): boolean { return true }

  /** fitContent 核心实现，子类可覆写 */
  protected _doFitContent(padding: number): void {
    const l: any = this.leafer
    if (l.zoom) {
      l.zoom('fit', padding, undefined, true)
    }
  }

  /** 销毁时调用，子类覆写以清理额外资源 */
  protected _onDestroy(): void {}

  // ==================== 动态控制 Viewport 行为 ====================

  /** 运行时切换画布平移是否可用（绘制模式/顶点编辑时禁用） */
  setPanEnabled(enabled: boolean): void {
    const app: any = (this.leafer as any).app
    if (app?.config?.move) {
      app.config.move.disabled = !enabled
    }
  }

  /** 运行时切换滚轮缩放是否可用 */
  setWheelZoomEnabled(enabled: boolean): void {
    const app: any = (this.leafer as any).app
    if (app?.config?.wheel) {
      app.config.wheel.disabled = !enabled
    }
  }

  // ==================== 公共 API ====================

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
        this._doFitContent(padding)
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
    this._onDestroy()

    if (this._boundWheel) {
      this._canvas?.removeEventListener('wheel', this._boundWheel)
      this._boundWheel = null
    }
    if (this._doubleTapOff) {
      this.leafer.off_(this._doubleTapOff)
      this._doubleTapOff = null
    }
    this._canvas = null

    this.leafer.destroy()
  }
}
