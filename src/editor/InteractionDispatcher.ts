import type { Section } from '../types'

export type InteractionMode = 'IDLE' | 'DRAWING' | 'VERTEX_EDIT' | 'SEAT_SELECT'

export interface InteractionDispatcherOptions {
  isVertexEditActive: () => boolean
  isDrawing: () => boolean

  // Drawing lifecycle
  onEnterDrawing: (tool: string) => void
  onExitDrawing: () => void
  // Vertex-edit lifecycle
  onEnterVertexEdit: (section: Section, kind: 'path') => void
  onExitVertexEdit: () => void

  // Editor controls
  cancelEditorSelection: () => void
  setEditorHittable: (v: boolean) => void
  /** 同步 viewport pan 开关 */
  setPanEnabled: (v: boolean) => void
}

/**
 * 集中式交互模式状态机。
 * mode 是同步普通变量（非 Vue ref），事件处理中直接读取。
 *
 * Pan/Zoom 由 Leafer Viewport 插件原生处理，
 * 此调度器仅负责模式切换时通知外部启用/禁用 pan。
 */
export class InteractionDispatcher {
  mode: InteractionMode = 'IDLE'
  private opts: InteractionDispatcherOptions

  constructor(opts: InteractionDispatcherOptions) {
    this.opts = opts
  }

  get canPan(): boolean {
    return this.mode === 'IDLE'
  }

  get canSelect(): boolean {
    return this.mode === 'IDLE'
  }

  // ==================== 模式转换 ====================

  /** 进入 IDLE（默认选择模式）→ 启用 pan + Editor 可交互 */
  enterIdle(): void {
    if (this.mode === 'IDLE') return
    this._exitMode(this.mode)
    this.mode = 'IDLE'
    this.opts.setEditorHittable(true)
    this.opts.setPanEnabled(true)
  }

  /** 强制退出到 IDLE — 供 undo/redo/import/delete 等外部操作前置调用 */
  exitToIdle(): void {
    this.enterIdle()
  }

  /** 进入绘制模式 → 禁用 pan + Editor 不可交互（事件穿透到 leafer 根） */
  enterDrawing(tool: string): void {
    if (this.mode === 'DRAWING') {
      this.opts.onEnterDrawing(tool)
      return
    }
    this._exitMode(this.mode)
    this.mode = 'DRAWING'
    this.opts.cancelEditorSelection()
    this.opts.setEditorHittable(false)
    this.opts.setPanEnabled(false)  // 绘制时禁用画布平移
    this.opts.onEnterDrawing(tool)
  }

  /** 进入顶点编辑模式 → 禁用 pan + Editor 取消选中但分区保持可点 */
  enterVertexEdit(section: Section, kind: 'path'): void {
    this._exitMode(this.mode)
    this.mode = 'VERTEX_EDIT'
    this.opts.cancelEditorSelection()
    this.opts.setEditorHittable(false)
    this.opts.setPanEnabled(false)  // 顶点编辑时禁用画布平移
    this.opts.onEnterVertexEdit(section, kind)
  }

  /** 进入座位选择模式 → 禁用 pan + Editor 不可交互 */
  enterSeatSelect(): void {
    if (this.mode === 'SEAT_SELECT') return
    this._exitMode(this.mode)
    this.mode = 'SEAT_SELECT'
    this.opts.setEditorHittable(false)
    this.opts.setPanEnabled(false)  // 选座时禁用画布平移
  }

  // ==================== 内部 ====================

  private _exitMode(mode: InteractionMode): void {
    switch (mode) {
      case 'DRAWING':
        this.opts.onExitDrawing()
        break
      case 'VERTEX_EDIT':
        this.opts.onExitVertexEdit()
        break
    }
  }
}
