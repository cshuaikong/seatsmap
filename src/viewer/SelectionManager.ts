import type { Seat, SeatRow, Section } from '../types'
import { SEAT_STATUS } from '../types'
import type { SeatRenderer } from './SeatRenderer'

export type SeatClickCallback = (seat: Seat, row: SeatRow, section: Section) => void
export type SelectionChangeCallback = (seatIds: string[]) => void

/**
 * 管理座位选中/取消选中的逻辑。
 * 不直接处理 UI 事件绑定，只负责状态切换和外观同步。
 */
export class SelectionManager {
  private seatRenderer: SeatRenderer
  private venueSections: Section[]
  private onSelectionChange: SelectionChangeCallback

  // 防止 watch 循环的标志
  private _internalUpdate = false

  constructor(
    seatRenderer: SeatRenderer,
    venueSections: Section[],
    onSelectionChange: SelectionChangeCallback
  ) {
    this.seatRenderer = seatRenderer
    this.venueSections = venueSections
    this.onSelectionChange = onSelectionChange
  }

  get internalUpdate(): boolean { return this._internalUpdate }

  /** 更新内部 seatRenderer 引用（renderAll 重建时调用） */
  setRenderer(renderer: SeatRenderer): void {
    this.seatRenderer = renderer
  }

  /** 处理座位点击（从 SeatRenderer 回调触发） */
  handleSeatClick(seat: Seat, row: SeatRow, section: Section, emitClick: SeatClickCallback): void {
    const wasSelected = seat.status === SEAT_STATUS.SELECTED

    // 切换 status
    seat.status = wasSelected ? SEAT_STATUS.AVAILABLE : SEAT_STATUS.SELECTED

    // 更新外观
    this.seatRenderer.updateSeatAppearance(seat)

    // 通知外部
    this._internalUpdate = true
    const selectedIds = this.collectSelectedIds()
    this.onSelectionChange(selectedIds)
    emitClick(seat, row, section)

    // 异步重置标志
    setTimeout(() => { this._internalUpdate = false }, 0)
  }

  /** 外部选中 ID 列表变化时同步 */
  syncExternalSelection(selectedIds: string[]): void {
    if (this._internalUpdate) return

    const idSet = new Set(selectedIds)

    for (const section of this.venueSections) {
      for (const row of section.rows) {
        for (const seat of row.seats) {
          const shouldBeSelected = idSet.has(seat.id)
          const isSelected = seat.status === SEAT_STATUS.SELECTED

          if (shouldBeSelected && !isSelected) {
            seat.status = SEAT_STATUS.SELECTED
            this.seatRenderer.updateSeatAppearance(seat)
          } else if (!shouldBeSelected && isSelected) {
            seat.status = SEAT_STATUS.AVAILABLE
            this.seatRenderer.updateSeatAppearance(seat)
          }
        }
      }
    }
  }

  /** 清空所有选中 */
  clearAll(): void {
    this._internalUpdate = true
    for (const section of this.venueSections) {
      for (const row of section.rows) {
        for (const seat of row.seats) {
          if (seat.status === SEAT_STATUS.SELECTED) {
            seat.status = SEAT_STATUS.AVAILABLE
            this.seatRenderer.updateSeatAppearance(seat)
          }
        }
      }
    }
    this.onSelectionChange([])
    setTimeout(() => { this._internalUpdate = false }, 0)
  }

  /** 收集当前所有已选座位 ID */
  private collectSelectedIds(): string[] {
    const ids: string[] = []
    for (const section of this.venueSections) {
      for (const row of section.rows) {
        for (const seat of row.seats) {
          if (seat.status === SEAT_STATUS.SELECTED) {
            ids.push(seat.id)
          }
        }
      }
    }
    return ids
  }
}
