import type { Section } from '../types'
import { getSectionAABB, isInsideSection, isNearSectionBorder } from '../viewer/geometry'

export type InteractionMode = 'IDLE' | 'DRAWING' | 'VERTEX_EDIT' | 'SEAT_SELECT'

export interface InteractionDispatcherOptions {
  getSections: () => Section[]
  getScale: () => number
  isVertexEditActive: () => boolean
  isDrawing: () => boolean

  // Drawing lifecycle
  onEnterDrawing: (tool: string) => void
  onExitDrawing: () => void
  // Vertex-edit lifecycle
  onEnterVertexEdit: (section: Section, kind: 'path' | 'polygon') => void
  onExitVertexEdit: () => void
  // Section focus
  onEnterSectionFocus: (sectionId: string) => void
  onExitSectionFocus: () => void

  // Editor controls
  cancelEditorSelection: () => void
  setEditorHittable: (v: boolean) => void
}

/**
 * 集中式交互模式状态机。
 * mode 是同步普通变量（非 Vue ref），事件处理中直接读取。
 */
export class InteractionDispatcher {
  mode: InteractionMode = 'IDLE'
  private opts: InteractionDispatcherOptions

  constructor(opts: InteractionDispatcherOptions) {
    this.opts = opts
  }

  // ==================== 状态查询 ====================

  get canPan(): boolean {
    return this.mode === 'IDLE'
  }

  get canSelect(): boolean {
    return this.mode === 'IDLE'
  }

  // ==================== 模式转换 ====================

  /** 进入 IDLE（默认选择模式） */
  enterIdle(): void {
    if (this.mode === 'IDLE') return
    this._exitMode(this.mode)
    this.mode = 'IDLE'
    this.opts.setEditorHittable(true)
  }

  /** 强制退出到 IDLE — 供 undo/redo/import/delete 等外部操作前置调用 */
  exitToIdle(): void {
    this.enterIdle()
  }

  /** 进入绘制模式 */
  enterDrawing(tool: string): void {
    if (this.mode === 'DRAWING') {
      this.opts.onEnterDrawing(tool)
      return
    }
    this._exitMode(this.mode)
    this.mode = 'DRAWING'
    this.opts.cancelEditorSelection()
    this.opts.setEditorHittable(false)
    this.opts.onEnterDrawing(tool)
  }

  /** 进入顶点编辑模式 */
  enterVertexEdit(section: Section, kind: 'path' | 'polygon'): void {
    this._exitMode(this.mode)
    this.mode = 'VERTEX_EDIT'
    this.opts.cancelEditorSelection()
    this.opts.setEditorHittable(false)
    this.opts.onEnterVertexEdit(section, kind)
  }

  /** 进入座位选择模式 */
  enterSeatSelect(): void {
    if (this.mode === 'SEAT_SELECT') return
    this._exitMode(this.mode)
    this.mode = 'SEAT_SELECT'
    this.opts.setEditorHittable(false)
  }

  // ==================== 双击分发 ====================

  /**
   * 双击画布时调用，根据命中位置分发到顶点编辑或分区聚焦。
   * 返回 true 表示已处理，false 表示未命中任何分区。
   * 仅在 IDLE 模式生效。
   */
  handleDoubleClick(worldPos: { x: number; y: number }): boolean {
    if (this.mode !== 'IDLE') return false

    const sections = this.opts.getSections()
    const scale = this.opts.getScale()
    const threshold = 10 / Math.max(scale, 0.01)

    // 从后往前遍历（上层分区优先命中）
    for (let i = sections.length - 1; i >= 0; i--) {
      const section = sections[i]
      if (!section.borderType || section.borderType === 'none') continue
      if (section.readonly) continue

      const aabb = getSectionAABB(section)
      if (!aabb) continue

      // AABB 粗筛
      if (
        worldPos.x < aabb.x - threshold || worldPos.x > aabb.x + aabb.width + threshold ||
        worldPos.y < aabb.y - threshold || worldPos.y > aabb.y + aabb.height + threshold
      ) continue

      // 精筛 — 边框附近 → 顶点编辑
      if (isNearSectionBorder(section, worldPos, scale)) {
        if (section.borderType === 'polygon' && section.borderPoints?.length) {
          this.enterVertexEdit(section, 'polygon')
          return true
        }
        if (section.borderType === 'path' && section.borderPathPoints?.length) {
          this.enterVertexEdit(section, 'path')
          return true
        }
        // rect/ellipse 顶点编辑在 VertexEditManager 完成后接入
      }

      // 内部区域 → 分区聚焦
      if (isInsideSection(section, worldPos)) {
        this._exitMode(this.mode)
        this.mode = 'IDLE'
        this.opts.onEnterSectionFocus(section.id)
        return true
      }
    }

    return false
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
