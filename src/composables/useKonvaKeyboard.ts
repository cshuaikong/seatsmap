/**
 * @file useKonvaKeyboard.ts
 * @brief Konva 键盘事件处理 Composable
 *
 * 职责：
 * - ESC 取消绘制 / 清空选择
 * - Delete/Backspace 删除选中对象
 *
 * 从 KonvaRenderer.vue 拆分出来
 */

import { useVenueStore } from '../stores/venueStore'
import type { DrawingToolMode } from './useKonvaDrawing'

export interface UseKonvaKeyboardOptions {
  /** 当前绘制工具 */
  currentTool: DrawingToolMode
  /** 是否处于绘制模式 */
  isDrawingMode: () => boolean
  /** 座位绘制步骤（用于 ESC 判断） */
  seatDrawStep: { value: 'idle' | 'first' | 'dragging' | 'segment_done' }
  /** 重置座位绘制状态 */
  resetSeatDrawingState: () => void
  /** 清除绘制预览 */
  clearDrawingPreview: () => void
  /** 重置绘制工具状态 */
  resetDrawingState: () => void
}

export interface UseKonvaKeyboardReturn {
  /** 键盘事件处理器 */
  handleKeyDown: (e: KeyboardEvent) => void
  /** 删除选中的对象 */
  deleteSelectedObjects: () => void
}

export function useKonvaKeyboard(options: UseKonvaKeyboardOptions): UseKonvaKeyboardReturn {
  const {
    currentTool,
    isDrawingMode,
    seatDrawStep,
    resetSeatDrawingState,
    clearDrawingPreview,
    resetDrawingState
  } = options

  const venueStore = useVenueStore()

  /** 键盘事件处理 */
  const handleKeyDown = (e: KeyboardEvent) => {
    // ESC 取消绘制 / 清空选择
    if (e.key === 'Escape') {
      // 优先处理座位绘制状态
      if (currentTool === 'draw_seat' && seatDrawStep.value !== 'idle') {
        resetSeatDrawingState()
        clearDrawingPreview()
        return
      }
      if (isDrawingMode()) {
        clearDrawingPreview()
        resetDrawingState()
        resetSeatDrawingState()
      } else {
        // 非绘制模式：清空选择（Seats.io 风格）
        venueStore.clearSelection()
      }
      return
    }

    // Delete/Backspace 删除选中
    if (e.key === 'Delete' || e.key === 'Backspace') {
      // 绘制模式下不处理删除
      if (isDrawingMode()) return

      deleteSelectedObjects()
    }
  }

  /** 删除选中的对象 */
  const deleteSelectedObjects = () => {
    // 删除选中的排
    venueStore.selectedRowIds.forEach(id => {
      venueStore.deleteRow(id)
    })

    // 删除选中的形状
    venueStore.selectedShapeIds.forEach(id => {
      venueStore.deleteShape(id)
    })

    // 删除选中的文本
    venueStore.selectedTextIds.forEach(id => {
      venueStore.deleteText(id)
    })

    // 删除选中的区域
    venueStore.selectedAreaIds.forEach(id => {
      venueStore.deleteArea(id)
    })

    // 清除选择状态
    venueStore.clearSelection()
  }

  return {
    handleKeyDown,
    deleteSelectedObjects
  }
}
