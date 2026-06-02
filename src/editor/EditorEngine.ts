import { Group, ZoomEvent, PointerEvent as LeaferPointer } from 'leafer-ui'
import '@leafer-in/editor'
import { Editor, EditorMoveEvent, EditorRotateEvent } from '@leafer-in/editor'
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

    // 修复框选：selector.allow() 检查 target.leafer !== editor.leafer，
    // 但 viewport zoomLayer 与 editor 同属一个 leafer，导致空画布框选失效。
    // 同时避免 section 双层边框的 stroke/fill 元素被误判为框选目标，
    // 以及编辑器内部元素（editMask 等）在多选空白区点击时错误清空选中。
    const sel = (this.editor as any).selector
    if (sel) {
      const _origAllow = sel.allow.bind(sel)
      const editorInstance = this.editor
      sel.allow = (target: any) => {
        if (!target) return _origAllow(target)
        // 分区边框元素不触发框选（让 section 本体响应拖拽）
        if (target?.id?.startsWith?.('section-border-')) return false
        // 编辑器内部元素不触发 allow（避免点击多选包围盒空白区时清空选中）
        let node = target
        while (node) {
          if (node === editorInstance) return false
          node = node.parent
        }
        // 非交互背景元素允许框选（空画布框选无需 Shift）
        // allowDrag 仅在 !e.target.draggable 时才检查 allow，可拖拽元素不受影响
        if (!target?.draggable && !target?.editable) return true
        return _origAllow(target)
      }

      // 修复多选拖拽：点击已选中元素时跳过 checkAndSelect，避免
      // editor.target = find 把多选替换成单选。Shift+click 仍走原生逻辑。
      const _origCheckAndSelect = sel.checkAndSelect.bind(sel)
      sel.checkAndSelect = function (e: any) {
        const find = sel.findUI(e)
        if (find && sel.editor.hasItem(find) && sel.editor.multiple && !sel.isMultipleSelect(e)) {
          return
        }
        _origCheckAndSelect(e)
      }
    }

    // 修复拖拽/旋转时选择框不跟手：Leafer 默认只在 dragEnd 时调用
    // editBox.update()，需要在 MOVE/ROTATE 事件中手动触发
    this.editor.on(EditorMoveEvent.MOVE, () => {
      ;(this.editor as any).editBox?.update()
    })
    this.editor.on(EditorRotateEvent.ROTATE, () => {
      ;(this.editor as any).editBox?.update()
    })

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
