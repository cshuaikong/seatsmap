import { computed } from 'vue'
import { defineStore } from 'pinia'
import { useVenueDataStore } from './venueDataStore'
import { useEditorStore } from './editorStore'
import { useHistoryStore } from './historyStore'
import type { VenueData } from '../types'

/**
 * 兼容层 Store
 *
 * 已将职责拆分为：
 * - venueDataStore: 纯场馆数据
 * - editorStore: 编辑器会话状态（选中、聚焦、图片）
 * - historyStore: 撤销/重做历史
 *
 * 本文件保留旧 API，让现有组件可逐步迁移。
 * 新代码建议直接使用上述三个 Store。
 */
export const useVenueStore = defineStore('venue', () => {
  const venueDataStore = useVenueDataStore()
  const editorStore = useEditorStore()
  const historyStore = useHistoryStore()

  // ==================== State（代理）====================

  const venue = computed({
    get: () => venueDataStore.venue,
    set: (value: VenueData) => { venueDataStore.venue = value }
  })

  // ==================== Getters（代理）====================

  const totalSeats = computed(() => venueDataStore.totalSeats)
  const availableSeats = computed(() => venueDataStore.availableSeats)
  const selectedSeats = computed(() => editorStore.selectedSeats)
  const selectedRows = computed(() => editorStore.selectedRows)
  const selectedShapes = computed(() => editorStore.selectedShapes)
  const selectedTexts = computed(() => editorStore.selectedTexts)
  const selectedAreas = computed(() => editorStore.selectedAreas)
  const hasSelection = computed(() => editorStore.hasSelection)
  // ==================== Return（代理所有旧 API）====================

  return {
    // State
    venue,
    selectedSeatIds: computed(() => editorStore.selectedSeatIds),
    selectedRowIds: computed(() => editorStore.selectedRowIds),
    selectedSectionIds: computed(() => editorStore.selectedSectionIds),
    selectedShapeIds: computed(() => editorStore.selectedShapeIds),
    selectedTextIds: computed(() => editorStore.selectedTextIds),
    selectedAreaIds: computed(() => editorStore.selectedAreaIds),
    focusedSectionId: computed(() => editorStore.focusedSectionId),
    activePathSectionId: computed(() => editorStore.activePathSectionId),
    activePathPointIndex: computed(() => editorStore.activePathPointIndex),
    canvasImages: computed(() => editorStore.canvasImages),
    selectedImageId: computed(() => editorStore.selectedImageId),
    visualConfig: venueDataStore.visualConfig,

    // Getters
    totalSeats,
    availableSeats,
    selectedSeats,
    selectedRows,
    selectedShapes,
    selectedTexts,
    selectedAreas,
    hasSelection,

    // Section
    addSection: venueDataStore.addSection,
    deleteSection: venueDataStore.deleteSection,
    updateSectionBorder: venueDataStore.updateSectionBorder,

    // Row
    addRow: venueDataStore.addRow,
    updateRow: venueDataStore.updateRow,
    updateMultipleRows: venueDataStore.updateMultipleRows,
    updateRowSeatCount: venueDataStore.updateRowSeatCount,
    updateRowCurve: venueDataStore.updateRowCurve,
    updateRowSeatSpacing: venueDataStore.updateRowSeatSpacing,
    deleteRow: venueDataStore.deleteRow,

    // Seat
    updateSeat: venueDataStore.updateSeat,
    updateSeatsCategory: venueDataStore.updateSeatsCategory,
    addSeatAtRowStart: venueDataStore.addSeatAtRowStart,
    addSeatAtRowEnd: venueDataStore.addSeatAtRowEnd,
    removeSeatAtRowStart: venueDataStore.removeSeatAtRowStart,
    removeSeatAtRowEnd: venueDataStore.removeSeatAtRowEnd,
    removeSelectedSeats: () => venueDataStore.removeSelectedSeats(editorStore.selectedSeatIds),

    // Shape / Text / Area
    addShape: venueDataStore.addShape,
    updateShape: venueDataStore.updateShape,
    deleteShape: venueDataStore.deleteShape,
    addText: venueDataStore.addText,
    updateText: venueDataStore.updateText,
    deleteText: venueDataStore.deleteText,
    addArea: venueDataStore.addArea,
    updateArea: venueDataStore.updateArea,
    deleteArea: venueDataStore.deleteArea,

    // Selection
    selectSeat: editorStore.selectSeat,
    selectRow: editorStore.selectRow,
    selectSection: editorStore.selectSection,
    selectShape: editorStore.selectShape,
    selectText: editorStore.selectText,
    selectArea: editorStore.selectArea,
    clearSelection: editorStore.clearSelection,
    setActivePathSegment: editorStore.setActivePathSegment,

    // Images
    addCanvasImage: editorStore.addCanvasImage,
    updateCanvasImage: editorStore.updateCanvasImage,
    removeCanvasImage: editorStore.removeCanvasImage,
    selectCanvasImage: editorStore.selectCanvasImage,
    clearCanvasImageSelection: editorStore.clearCanvasImageSelection,

    // Generic
    updateObjectProperty: venueDataStore.updateObjectProperty,

    // Category
    addCategory: venueDataStore.addCategory,
    updateCategory: venueDataStore.updateCategory,
    deleteCategory: venueDataStore.deleteCategory,

    // Import / Export
    importVenueData: venueDataStore.importVenueData,
    exportVenueData: venueDataStore.exportVenueData,
    importLegacyData: venueDataStore.importLegacyData,
    resetVenue: venueDataStore.resetVenue,
    createSnapshot: venueDataStore.createSnapshot,
    restoreSnapshot: venueDataStore.restoreSnapshot,

    // Undo / Redo
    initHistory: historyStore.initHistory,
    saveHistory: historyStore.saveHistory,
    undo: historyStore.undo,
    redo: historyStore.redo,

    // BaseScale
    initBaseScale: venueDataStore.initBaseScale,
    getBaseScale: venueDataStore.getBaseScale,
    setSectionBaseScale: venueDataStore.setSectionBaseScale,
  }
})
