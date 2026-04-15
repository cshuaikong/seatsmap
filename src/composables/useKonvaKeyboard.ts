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
  /** 是否处于座位绘制模式（单排/转折/多行） */
  isSeatDrawingMode: () => boolean
  /** 座位绘制步骤（用于 ESC 判断） */
  seatDrawStep: { value: 'idle' | 'first' | 'dragging' | 'segment_done' }
  /** 重置座位绘制状态 */
  resetSeatDrawingState: () => void
  /** 清除绘制预览 */
  clearDrawingPreview: () => void
  /** 重置绘制工具状态 */
  resetDrawingState: () => void
  /** 撤销多边形最后一个点 */
  undoPolygonPoint?: () => void
  /** 获取多边形点数量 */
  getPolygonPointCount?: () => number
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
    isSeatDrawingMode,
    seatDrawStep,
    resetSeatDrawingState,
    clearDrawingPreview,
    resetDrawingState,
    undoPolygonPoint,
    getPolygonPointCount
  } = options

  const venueStore = useVenueStore()

  /** 键盘事件处理 */
  const handleKeyDown = (e: KeyboardEvent) => {
    // ESC 取消绘制 / 清空选择
    if (e.key === 'Escape') {
      // 优先处理座位绘制状态（单排/转折/多行）
      if (isSeatDrawingMode() && seatDrawStep.value !== 'idle') {
        resetSeatDrawingState()
        clearDrawingPreview()
        return
      }
      // 多边形/区域绘制模式：清空所有点并退出
      if (isDrawingMode() && (currentTool === 'draw_polygon' || currentTool === 'draw_area')) {
        const pointCount = getPolygonPointCount?.() || 0
        if (pointCount > 0) {
          // 有绘制点时，ESC 清空所有点
          clearDrawingPreview()
          resetDrawingState()
        }
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

    // Delete 删除选中对象
    if (e.key === 'Delete') {
      // 绘制模式下不处理删除
      if (isDrawingMode()) return

      deleteSelectedObjects()
      return
    }

    // Backspace 删除选中对象（绘制模式下不处理）
    if (e.key === 'Backspace') {
      if (isDrawingMode()) return
      deleteSelectedObjects()
      return
    }

    // Ctrl+Z 撤销
    if (e.key === 'z' && e.ctrlKey) {
      e.preventDefault()
      // 多边形/区域绘制模式：撤销最后一个点
      if (isDrawingMode() && (currentTool === 'draw_polygon' || currentTool === 'draw_area')) {
        const pointCount = getPolygonPointCount?.() || 0
        if (pointCount > 0) {
          undoPolygonPoint?.()
        } else {
          // 没有点了，退出绘制模式
          clearDrawingPreview()
          resetDrawingState()
        }
      } else {
        // 非绘制模式：撤销历史记录
        venueStore.undo()
      }
      return
    }

    // Ctrl+Y 重做
    if (e.key === 'y' && e.ctrlKey) {
      e.preventDefault()
      venueStore.redo()
      return
    }
  }

  /** 删除选中的对象 */
  const deleteSelectedObjects = () => {
    // 座位选择模式：删除选中的具体座位
    if (venueStore.selectedSeatIds.length > 0) {
      venueStore.removeSelectedSeats()
      return
    }

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

    // 删除选中的分区（Section）
    venueStore.selectedSectionIds.forEach(id => {
      venueStore.deleteSection(id)
    })

    // 清除选择状态
    venueStore.clearSelection()
  }

  return {
    handleKeyDown,
    deleteSelectedObjects
  }
}
