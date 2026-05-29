import { Group, ZoomEvent, PointerEvent as LeaferPointer } from 'leafer-ui'
import '@leafer-in/editor'
import { Editor } from '@leafer-in/editor'
import { LeaferEngine } from '../viewer/LeaferEngine'

export interface EditorEngineOptions {
  container: HTMLElement
  width?: number
  height?: number
  editorConfig?: Record<string, any>
}

export class EditorEngine extends LeaferEngine {
  readonly editor: Editor
  readonly previewGroup: Group

  private _options: EditorEngineOptions

  constructor(options: EditorEngineOptions) {
    super(options.container, { width: options.width, height: options.height })
    this._options = options

    // 预览层（最顶层，用于绘制工具预览）
    this.previewGroup = new Group({ id: 'preview-layer' })
    this.leafer.add(this.previewGroup)

    // Editor 插件（内置 select/drag/resize/rotate/boxSelect）
    this.editor = new Editor(options.editorConfig)
    this.leafer.add(this.editor)

    // 修复框选：selector.allow() 检查 e.target.leafer !== editor.leafer，
    // 但在 viewport 模式下空画布点击的 target 与 editor 同属一个 leafer，导致返回 false。
    // 覆写为始终返回 true（允许空画布框选 + 点击空白取消选中，均为正常行为）。
    const sel = (this.editor as any).selector
    if (sel) sel.allow = () => true

    // 协调 Editor 拖拽与 Viewport 平移：Editor 操作时暂停 pan
    this._setupEditorViewportCoordination()

    // 画布可聚焦（键盘事件用）
    this.leafer.waitViewReady(() => {
      if (this.canvasElement) {
        this.canvasElement.tabIndex = 0
      }
    })
  }

  /** Editor 拖拽/框选期间暂停 viewport pan，松手后恢复 */
  private _setupEditorViewportCoordination(): void {
    let panWasEnabled = true
    let editorActive = false

    this.leafer.on(LeaferPointer.DOWN, () => {
      panWasEnabled = !((this.leafer as any).app?.config?.move?.disabled)
    })
    this.leafer.on(LeaferPointer.MOVE, () => {
      if (editorActive) return
      const ed = this.editor as any
      if (ed.dragging || ed.selector?.dragging) {
        editorActive = true
        this.setPanEnabled(false)
      }
    })
    this.leafer.on(LeaferPointer.UP, () => {
      if (editorActive) {
        editorActive = false
        if (panWasEnabled) this.setPanEnabled(true)
      }
    })
  }

  // ==================== 覆写保护方法 ====================

  protected _shouldEnableDoubleTapZoom(): boolean { return false }

  protected _doFitContent(padding: number): void {
    try {
      const bounds = this._getContentBounds()
      if (!bounds || bounds.width === 0 || bounds.height === 0) {
        super._doFitContent(padding)
        return
      }

      const viewW = this.leafer.width ?? 800
      const viewH = this.leafer.height ?? 600
      const availW = viewW - padding * 2
      const availH = viewH - padding * 2
      const scaleW = availW / bounds.width
      const scaleH = availH / bounds.height
      const newScale = Math.min(scaleW, scaleH, 2)

      const contentCX = bounds.x + bounds.width / 2
      const contentCY = bounds.y + bounds.height / 2

      const l: any = this.leafer
      if (l.zoom) {
        l.zoom('set', newScale, undefined, true)
      } else {
        this.leafer.scaleOfWorld({ x: contentCX, y: contentCY }, newScale / (this.scale || 1))
      }

      this.leafer.x = viewW / 2 - contentCX * newScale
      this.leafer.y = viewH / 2 - contentCY * newScale
      ;(this.leafer as any).__updateViewPort?.()

      this.leafer.emit(ZoomEvent.END, { scale: newScale, totalScale: newScale } as any)
    } catch (e) {
      console.warn('[EditorEngine] _doFitContent error:', e)
    }
  }

  protected _onDestroy(): void {
    // Editor 和 previewGroup 由 Leafer 的 destroy 统一清理
  }

  // ==================== 内容边界 ====================

  private _getContentBounds(): { x: number; y: number; width: number; height: number } | null {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity

    const collectBounds = (node: any) => {
      if (!node || node === this.previewGroup || node === this.editor) return
      if (node.children && node.children.length > 0) {
        node.children.forEach((c: any) => collectBounds(c))
      }
      const w = node.width ?? 0
      const h = node.height ?? 0
      if (w > 0 || h > 0) {
        const x = node.x ?? 0
        const y = node.y ?? 0
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

    if ((this.leafer as any).children) {
      ;(this.leafer as any).children.forEach((c: any) => collectBounds(c))
    }
    if (minX === Infinity) return null
    return { x: minX, y: minY, width: maxX - minX, height: maxY - minY }
  }
}
