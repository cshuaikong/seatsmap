import { ref, type Ref } from 'vue'
import { Leafer, App, ZoomEvent, PointerEvent as LP, type ILeaferConfig } from 'leafer-ui'

import '@leafer-in/view'
import '@leafer-in/viewport'
import '@leafer-in/editor'
import { Editor, EditorEvent, EditorMoveEvent, EditorRotateEvent } from '@leafer-in/editor'

export interface CanvasContextOptions {
  containerRef: Ref<HTMLDivElement | undefined>
  config?: Partial<ILeaferConfig>
  beforeSelect?: (data: { target: any }) => any | false
  onEditorSelect?: (e: any) => void
  onEditorMove?: () => void
  onEditorRotate?: () => void
  onPointerMove?: (e: any) => void
  onPointerUp?: (e: any) => void
  onPointerDown?: () => void
  onPointerClick?: (e: any) => void
  onDoubleTap?: () => void
  onZoomEnd?: () => void
}

export interface CanvasContext {
  /** App 实例（单 Leafer 模式下为空） */
  app: any | null
  /** 业务内容层：SectionGroup / SeatRowGroup */
  tree: Leafer
  /** 覆盖层：Editor / 手柄 / 预览 */
  sky: Leafer
  /** 背景层：网格 / 画布背景 */
  ground: Leafer
  /** Editor 实例 */
  editor: Editor
  /** 主 canvas 元素 */
  canvas: HTMLCanvasElement
  /** 获取当前缩放比例 */
  getScale: () => number
  /** 屏幕/视图坐标 → 业务世界坐标 */
  clientToWorld: (x: number, y: number) => { x: number; y: number }
  /** 业务世界坐标 → 屏幕/视图坐标 */
  worldToClient: (x: number, y: number) => { x: number; y: number }
  /** 销毁 */
  destroy: () => void
}

export function useCanvasContext(options: CanvasContextOptions) {
  const app = ref<any | null>(null)
  const tree = ref<Leafer | null>(null)
  const sky = ref<Leafer | null>(null)
  const ground = ref<Leafer | null>(null)
  const editor = ref<Editor | null>(null)
  const canvas = ref<HTMLCanvasElement | null>(null)

  // App 多层模式：tree 放业务内容，sky 放 Editor / 手柄 / 预览，ground 放背景
  function init(): CanvasContext | null {
    const container = options.containerRef.value
    if (!container) return null

    const width = container.clientWidth || 800
    const height = container.clientHeight || 800

    const appInstance = new App({
      view: container,
      width,
      height,
      pixelRatio: window.devicePixelRatio || 2,
      tree: {
        type: 'design',
        move: { scroll: true, disabled: false, holdSpaceKey: true, holdMiddleKey: true },
        wheel: { preventDefault: true },
        zoom: { min: 0.05, max: 20 },
      },
      ground: { type: 'draw' },
      sky: {},
      editor: {
        selector: true,
        moveable: true,
        rotateable: true,
        resizeable: false,
        skewable: false,
        keyEvent: true,
        hover: false,
        pointSize: 6,
        strokeWidth: 1,
        stroke: '#3b82f6',
        multiSelect: true,
        area: { fill: 'rgba(59,130,246,0.1)' },
        beforeSelect: options.beforeSelect,
      },
      ...options.config,
    })

    const treeLeafer = appInstance.tree as Leafer
    const skyLeafer = appInstance.sky as Leafer
    const groundLeafer = appInstance.ground as Leafer
    const ed = (appInstance as any).editor as Editor

    app.value = appInstance
    tree.value = treeLeafer
    sky.value = skyLeafer
    ground.value = groundLeafer
    editor.value = ed
    ;(window as any).__leafer = appInstance
    canvas.value = (treeLeafer.canvas?.view as HTMLCanvasElement) ?? null

    bindEvents(treeLeafer, ed)

    return createContext(treeLeafer, skyLeafer, groundLeafer, ed)
  }

  function createContext(treeLeafer: Leafer, skyLeafer: Leafer, groundLeafer: Leafer, ed: Editor): CanvasContext {
    function getScale(): number {
      return (treeLeafer as any)?.scaleX ?? (treeLeafer as any)?.__zoomLayer?.scaleX ?? 1
    }

    function clientToWorld(x: number, y: number): { x: number; y: number } {
      const l = treeLeafer as any
      const zl = l?.__zoomLayer
      const sx = l?.scaleX ?? zl?.scaleX ?? 1
      const sy = l?.scaleY ?? zl?.scaleY ?? 1
      const px = l?.x ?? zl?.x ?? 0
      const py = l?.y ?? zl?.y ?? 0
      return { x: (x - px) / sx, y: (y - py) / sy }
    }

    function worldToClient(x: number, y: number): { x: number; y: number } {
      const l = treeLeafer as any
      const zl = l?.__zoomLayer
      const sx = l?.scaleX ?? zl?.scaleX ?? 1
      const sy = l?.scaleY ?? zl?.scaleY ?? 1
      const px = l?.x ?? zl?.x ?? 0
      const py = l?.y ?? zl?.y ?? 0
      return { x: x * sx + px, y: y * sy + py }
    }

    return {
      app: app.value as any,
      tree: treeLeafer,
      sky: skyLeafer,
      ground: groundLeafer,
      editor: ed,
      get canvas() { return canvas.value ?? (treeLeafer as any).canvas?.view as HTMLCanvasElement },
      getScale,
      clientToWorld,
      worldToClient,
      destroy: () => {
        unbindEvents(treeLeafer, ed)
        treeLeafer.destroy()
        app.value = null
        tree.value = null
        sky.value = null
        ground.value = null
        editor.value = null
        canvas.value = null
      },
    }
  }

  function bindEvents(l: Leafer, e: Editor): void {
    if (options.onEditorSelect) e.on(EditorEvent.SELECT, options.onEditorSelect)
    if (options.onEditorMove) e.on(EditorMoveEvent.MOVE, options.onEditorMove)
    if (options.onEditorRotate) e.on(EditorRotateEvent.ROTATE, options.onEditorRotate)
    if (options.onPointerMove) l.on(LP.MOVE, options.onPointerMove)
    if (options.onPointerUp) l.on(LP.UP, options.onPointerUp)
    if (options.onPointerDown) l.on(LP.DOWN, options.onPointerDown)
    if (options.onPointerClick) l.on(LP.CLICK, options.onPointerClick)
    if (options.onDoubleTap) l.on(LP.DOUBLE_TAP, options.onDoubleTap)
    if (options.onZoomEnd) l.on(ZoomEvent.END, options.onZoomEnd)
  }

  function unbindEvents(l: Leafer, e: Editor): void {
    if (options.onEditorSelect) e.off(EditorEvent.SELECT, options.onEditorSelect)
    if (options.onEditorMove) e.off(EditorMoveEvent.MOVE, options.onEditorMove)
    if (options.onEditorRotate) e.off(EditorRotateEvent.ROTATE, options.onEditorRotate)
    if (options.onPointerMove) l.off(LP.MOVE, options.onPointerMove)
    if (options.onPointerUp) l.off(LP.UP, options.onPointerUp)
    if (options.onPointerDown) l.off(LP.DOWN, options.onPointerDown)
    if (options.onPointerClick) l.off(LP.CLICK, options.onPointerClick)
    if (options.onDoubleTap) l.off(LP.DOUBLE_TAP, options.onDoubleTap)
    if (options.onZoomEnd) l.off(ZoomEvent.END, options.onZoomEnd)
  }

  return {
    init,
    app,
    tree,
    sky,
    ground,
    editor,
    canvas,
  }
}
