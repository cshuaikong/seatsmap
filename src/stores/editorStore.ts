import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import { useVenueDataStore } from './venueDataStore'
import type {
  Seat,
  SeatRow,
  ShapeObject,
  TextObject,
  AreaObject,
  CanvasImage,
  Section,
} from '../types'

/**
 * 编辑器会话状态 Store
 *
 * 职责：管理与当前编辑会话相关的临时状态。
 * 这些状态不需要随场馆数据一起持久化。
 */
export const useEditorStore = defineStore('editor', () => {
  // ==================== State ====================

  // 各类选中对象的 ID 列表
  const selectedSeatIds = ref<string[]>([])
  const selectedRowIds = ref<string[]>([])
  const selectedSectionIds = ref<string[]>([])
  const selectedShapeIds = ref<string[]>([])
  const selectedTextIds = ref<string[]>([])
  const selectedAreaIds = ref<string[]>([])

  // 当前聚焦的 Section id（进入分区编辑时设置）
  const focusedSectionId = ref<string | null>(null)

  // 当前激活的 path 边段（用于画布与右侧面板联动）
  const activePathSectionId = ref<string | null>(null)
  const activePathPointIndex = ref<number | null>(null)

  // 画布上的图片（支持多张）
  const canvasImages = ref<CanvasImage[]>([])
  const selectedImageId = ref<string | null>(null)

  // 剪贴板（复制/粘贴）
  const clipboard = ref<{
    sections: Section[]
    rows: SeatRow[]
    seats: Seat[]
    shapes: ShapeObject[]
    texts: TextObject[]
    areas: AreaObject[]
  } | null>(null)

  // ==================== Getters ====================

  const venueDataStore = useVenueDataStore()

  const selectedSeats = computed(() => {
    const seats: Seat[] = []
    venueDataStore.venue.sections.forEach(section => {
      section.rows.forEach(row => {
        row.seats.forEach(seat => {
          if (selectedSeatIds.value.includes(seat.id)) seats.push(seat)
        })
      })
    })
    return seats
  })

  const selectedRows = computed(() => {
    const rows: SeatRow[] = []
    venueDataStore.venue.sections.forEach(section => {
      section.rows.forEach(row => {
        if (selectedRowIds.value.includes(row.id)) rows.push(row)
      })
    })
    return rows
  })

  const selectedShapes = computed(() => {
    const shapes: ShapeObject[] = []
    venueDataStore.venue.sections.forEach(section => {
      section.shapes?.forEach(shape => {
        if (selectedShapeIds.value.includes(shape.id)) shapes.push(shape)
      })
    })
    return shapes
  })

  const selectedTexts = computed(() => {
    const texts: TextObject[] = []
    venueDataStore.venue.sections.forEach(section => {
      section.texts?.forEach(text => {
        if (selectedTextIds.value.includes(text.id)) texts.push(text)
      })
    })
    return texts
  })

  const selectedAreas = computed(() => {
    const areas: AreaObject[] = []
    venueDataStore.venue.sections.forEach(section => {
      section.areas?.forEach(area => {
        if (selectedAreaIds.value.includes(area.id)) areas.push(area)
      })
    })
    return areas
  })

  const hasSelection = computed(() =>
    selectedSeatIds.value.length > 0 ||
    selectedRowIds.value.length > 0 ||
    selectedSectionIds.value.length > 0 ||
    selectedShapeIds.value.length > 0 ||
    selectedTextIds.value.length > 0 ||
    selectedAreaIds.value.length > 0
  )

  // ==================== Selection Actions ====================

  function selectSeat(seatId: string, additive = false) {
    if (additive) {
      if (selectedSeatIds.value.includes(seatId)) {
        selectedSeatIds.value = selectedSeatIds.value.filter(id => id !== seatId)
      } else {
        selectedSeatIds.value.push(seatId)
      }
    } else {
      clearSelection()
      selectedSeatIds.value = [seatId]
    }
  }

  function selectRow(rowId: string, additive = false) {
    if (additive) {
      if (selectedRowIds.value.includes(rowId)) {
        selectedRowIds.value = selectedRowIds.value.filter(id => id !== rowId)
      } else {
        selectedRowIds.value.push(rowId)
      }
    } else {
      clearSelection()
      selectedRowIds.value = [rowId]
    }
  }

  function selectSection(sectionId: string, additive = false) {
    // 如果 Section 被设为只读，则不允许选中
    const section = venueDataStore.venue.sections.find(s => s.id === sectionId)
    if (section?.readonly) return

    if (additive) {
      if (selectedSectionIds.value.includes(sectionId)) {
        selectedSectionIds.value = selectedSectionIds.value.filter(id => id !== sectionId)
      } else {
        selectedSectionIds.value.push(sectionId)
      }
    } else {
      clearSelection()
      selectedSectionIds.value = [sectionId]
    }
  }

  function selectShape(shapeId: string, additive = false) {
    if (additive) {
      if (selectedShapeIds.value.includes(shapeId)) {
        selectedShapeIds.value = selectedShapeIds.value.filter(id => id !== shapeId)
      } else {
        selectedShapeIds.value.push(shapeId)
      }
    } else {
      clearSelection()
      selectedShapeIds.value = [shapeId]
    }
  }

  function selectText(textId: string, additive = false) {
    if (additive) {
      if (selectedTextIds.value.includes(textId)) {
        selectedTextIds.value = selectedTextIds.value.filter(id => id !== textId)
      } else {
        selectedTextIds.value.push(textId)
      }
    } else {
      clearSelection()
      selectedTextIds.value = [textId]
    }
  }

  function selectArea(areaId: string, additive = false) {
    if (additive) {
      if (selectedAreaIds.value.includes(areaId)) {
        selectedAreaIds.value = selectedAreaIds.value.filter(id => id !== areaId)
      } else {
        selectedAreaIds.value.push(areaId)
      }
    } else {
      clearSelection()
      selectedAreaIds.value = [areaId]
    }
  }

  function clearSelection() {
    selectedSeatIds.value = []
    selectedRowIds.value = []
    selectedSectionIds.value = []
    selectedShapeIds.value = []
    selectedTextIds.value = []
    selectedAreaIds.value = []
  }

  function setActivePathSegment(sectionId: string | null, pointIndex: number | null) {
    activePathSectionId.value = sectionId
    activePathPointIndex.value = pointIndex
  }

  // ==================== Canvas Image Actions ====================

  function addCanvasImage(image: CanvasImage) {
    canvasImages.value.push(image)
  }

  function updateCanvasImage(id: string, updates: Partial<CanvasImage>) {
    const index = canvasImages.value.findIndex(img => img.id === id)
    if (index !== -1) {
      Object.assign(canvasImages.value[index], updates)
    }
  }

  function removeCanvasImage(id: string) {
    canvasImages.value = canvasImages.value.filter(img => img.id !== id)
    if (selectedImageId.value === id) selectedImageId.value = null
  }

  function selectCanvasImage(id: string, additive = false) {
    if (additive) {
      selectedImageId.value = selectedImageId.value === id ? null : id
    } else {
      selectedImageId.value = id
    }
  }

  function clearCanvasImageSelection() {
    selectedImageId.value = null
  }

  /** 删除当前所有选中的对象并清空选择 */
  function deleteSelected() {
    venueDataStore.deleteSelectedObjects({
      seatIds: selectedSeatIds.value,
      rowIds: selectedRowIds.value,
      sectionIds: selectedSectionIds.value,
      shapeIds: selectedShapeIds.value,
      textIds: selectedTextIds.value,
      areaIds: selectedAreaIds.value,
    })
    clearSelection()
  }

  /** 深拷贝当前选中的对象到剪贴板 */
  function copySelected() {
    const sectionIdSet = new Set(selectedSectionIds.value)
    const rowIdSet = new Set(selectedRowIds.value)

    const sections: Section[] = []
    const rows: SeatRow[] = []
    const seats: Seat[] = []
    const shapes: ShapeObject[] = []
    const texts: TextObject[] = []
    const areas: AreaObject[] = []

    selectedSectionIds.value.forEach(id => {
      const section = venueDataStore.venue.sections.find(s => s.id === id)
      if (section) sections.push(JSON.parse(JSON.stringify(section)))
    })

    selectedRowIds.value.forEach(id => {
      for (const section of venueDataStore.venue.sections) {
        const row = section.rows.find(r => r.id === id)
        if (row && !sectionIdSet.has(section.id)) {
          rows.push(JSON.parse(JSON.stringify(row)))
          break
        }
      }
    })

    selectedSeatIds.value.forEach(id => {
      for (const section of venueDataStore.venue.sections) {
        for (const row of section.rows) {
          const seat = row.seats.find(s => s.id === id)
          if (seat && !sectionIdSet.has(section.id) && !rowIdSet.has(row.id)) {
            seats.push(JSON.parse(JSON.stringify(seat)))
            break
          }
        }
      }
    })

    selectedShapeIds.value.forEach(id => {
      for (const section of venueDataStore.venue.sections) {
        const shape = section.shapes?.find(s => s.id === id)
        if (shape && !sectionIdSet.has(section.id)) {
          shapes.push(JSON.parse(JSON.stringify(shape)))
          break
        }
      }
    })

    selectedTextIds.value.forEach(id => {
      for (const section of venueDataStore.venue.sections) {
        const text = section.texts?.find(t => t.id === id)
        if (text && !sectionIdSet.has(section.id)) {
          texts.push(JSON.parse(JSON.stringify(text)))
          break
        }
      }
    })

    selectedAreaIds.value.forEach(id => {
      for (const section of venueDataStore.venue.sections) {
        const area = section.areas?.find(a => a.id === id)
        if (area && !sectionIdSet.has(section.id)) {
          areas.push(JSON.parse(JSON.stringify(area)))
          break
        }
      }
    })

    clipboard.value = { sections, rows, seats, shapes, texts, areas }
  }

  /** 粘贴剪贴板内容并选中新对象 */
  function paste() {
    if (!clipboard.value) return
    const result = venueDataStore.pasteObjects(clipboard.value)
    clearSelection()
    result.sectionIds.forEach(id => selectSection(id, true))
    result.rowIds.forEach(id => selectRow(id, true))
    result.seatIds.forEach(id => selectSeat(id, true))
    result.shapeIds.forEach(id => selectShape(id, true))
    result.textIds.forEach(id => selectText(id, true))
    result.areaIds.forEach(id => selectArea(id, true))
  }

  // ==================== Return ====================

  return {
    // State
    selectedSeatIds,
    selectedRowIds,
    selectedSectionIds,
    selectedShapeIds,
    selectedTextIds,
    selectedAreaIds,
    focusedSectionId,
    activePathSectionId,
    activePathPointIndex,
    canvasImages,
    selectedImageId,

    // Getters
    selectedSeats,
    selectedRows,
    selectedShapes,
    selectedTexts,
    selectedAreas,
    hasSelection,

    // Selection
    selectSeat,
    selectRow,
    selectSection,
    selectShape,
    selectText,
    selectArea,
    clearSelection,
    setActivePathSegment,

    // Canvas Images
    addCanvasImage,
    updateCanvasImage,
    removeCanvasImage,
    selectCanvasImage,
    clearCanvasImageSelection,

    // Deletion
    deleteSelected,

    // Clipboard
    clipboard,
    copySelected,
    paste,
  }
})
