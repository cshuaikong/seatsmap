import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import { generateId } from '../utils/id'
import type {
  VenueData,
  Section,
  SeatRow,
  Seat,
  Category,
  ShapeObject,
  TextObject,
  AreaObject,
  SelectedObjectType,
} from '../types'

export interface PasteInput {
  sections?: Section[]
  rows?: SeatRow[]
  seats?: Seat[]
  shapes?: ShapeObject[]
  texts?: TextObject[]
  areas?: AreaObject[]
}

export interface PasteResult {
  sectionIds: string[]
  rowIds: string[]
  seatIds: string[]
  shapeIds: string[]
  textIds: string[]
  areaIds: string[]
}

/**
 * 纯场馆数据 Store
 *
 * 职责：只管理 VenueData 的 CRUD，不包含任何 UI 状态、选中状态、历史记录。
 * 它是整个应用的唯一持久化数据来源。
 */
export const useVenueDataStore = defineStore('venueData', () => {
  // ==================== State ====================

  const venue = ref<VenueData>(createDefaultVenue())

  // 默认的座位视觉配置（用户在屏幕上期望看到的像素大小）
  // TODO: 后续应移到配置层或编辑器 Store，不属于场馆持久化数据
  const visualConfig = {
    radius: 6,      // 期望在屏幕上看到的半径 6px
    gap: 18,        // 期望在屏幕上看到的间距 18px
    rowGap: 24,     // 期望在屏幕上看到的行距 24px
    width: 2        // 期望在屏幕上看到的边框宽度 2px
  }

  // ==================== Getters ====================

  const totalSeats = computed(() => {
    let count = 0
    venue.value.sections.forEach(section => {
      section.rows.forEach(row => {
        count += row.seats.length
      })
    })
    return count
  })

  const availableSeats = computed(() => {
    let count = 0
    venue.value.sections.forEach(section => {
      section.rows.forEach(row => {
        row.seats.forEach(seat => {
          if (seat.status === 'available') count++
        })
      })
    })
    return count
  })

  // ==================== Section CRUD ====================

  function addSection(section: Omit<Section, 'id'>) {
    const newSection: Section = { ...section, id: generateId() }
    venue.value.sections.push(newSection)
    return newSection.id
  }

  function deleteSection(sectionId: string) {
    venue.value.sections = venue.value.sections.filter(s => s.id !== sectionId)
  }

  function updateSectionBorder(
    sectionId: string,
    border: Partial<Pick<Section,
      | 'name' | 'rotation' | 'type' | 'x' | 'y' | 'width' | 'height'
      | 'radiusX' | 'radiusY' | 'pathPoints' | 'fill' | 'stroke'
      | 'opacity' | 'zIndex' | 'readonly'
    >>
  ) {
    const section = venue.value.sections.find(s => s.id === sectionId)
    if (!section) return
    Object.assign(section, border)
  }

  // ==================== Row CRUD ====================

  function addRow(sectionId: string, row: Omit<SeatRow, 'id'>) {
    const section = venue.value.sections.find(s => s.id === sectionId)
    if (!section) return
    const newRow: SeatRow = { ...row, id: generateId() }
    section.rows.push(newRow)
    return newRow.id
  }

  function updateRow(rowId: string, updates: Partial<SeatRow>) {
    venue.value.sections.forEach(section => {
      const row = section.rows.find(r => r.id === rowId)
      if (!row) return
      Object.assign(row, updates)

      // 面板层传的是 categoryId，但实际含义就是 categoryKey
      const categoryKey = (updates as any).categoryId
      if (categoryKey !== undefined) {
        const normalizedKey = String(categoryKey)
        row.seats.forEach(seat => {
          seat.categoryKey = normalizedKey
        })
      }
    })
  }

  function updateMultipleRows(rowIds: string[], updates: Partial<SeatRow>) {
    venue.value.sections.forEach(section => {
      section.rows.forEach(row => {
        if (!rowIds.includes(row.id)) return
        Object.assign(row, updates)

        const categoryKey = (updates as any).categoryId
        if (categoryKey !== undefined) {
          const normalizedKey = String(categoryKey)
          row.seats.forEach(seat => {
            seat.categoryKey = normalizedKey
          })
        }
      })
    })
  }

  function deleteRow(rowId: string) {
    venue.value.sections.forEach(section => {
      section.rows = section.rows.filter(r => r.id !== rowId)
    })
  }

  // ==================== Row Geometry ====================

  function updateRowSeatCount(rowId: string, newSeatCount: number) {
    venue.value.sections.forEach(section => {
      const row = section.rows.find(r => r.id === rowId)
      if (!row || row.seats.length === newSeatCount) return

      const currentCount = row.seats.length
      const currentSpacing = row.seatSpacing || 18
      const totalLength = (currentCount - 1) * currentSpacing
      const newSpacing = newSeatCount > 1 ? totalLength / (newSeatCount - 1) : currentSpacing

      const firstSeat = row.seats[0]
      const lastSeat = row.seats[currentCount - 1]
      const angle = Math.atan2(lastSeat.y - firstSeat.y, lastSeat.x - firstSeat.x)

      row.seats = Array.from({ length: newSeatCount }, (_, i) => ({
        id: i < currentCount ? row.seats[i].id : generateId(),
        label: i < currentCount ? row.seats[i].label : '',
        x: firstSeat.x + Math.cos(angle) * (newSpacing * i),
        y: firstSeat.y + Math.sin(angle) * (newSpacing * i),
        categoryKey: i < currentCount ? row.seats[i].categoryKey : firstSeat.categoryKey,
        status: i < currentCount ? row.seats[i].status : 'available',
        objectType: 'seat' as const
      }))
      row.seatSpacing = newSpacing
    })
  }

  function updateRowCurve(rowId: string, newCurve: number) {
    venue.value.sections.forEach(section => {
      const row = section.rows.find(r => r.id === rowId)
      if (row) row.curve = newCurve
    })
  }

  function updateRowSeatSpacing(rowId: string, newSpacing: number, resetCurve: boolean = false) {
    venue.value.sections.forEach(section => {
      const row = section.rows.find(r => r.id === rowId)
      if (!row) return

      const oldSpacing = row.seatSpacing || 18
      const seatCount = row.seats.length
      if (seatCount < 2 || oldSpacing === newSpacing) return

      const firstSeat = row.seats[0]
      const lastSeat = row.seats[seatCount - 1]
      const angle = Math.atan2(lastSeat.y - firstSeat.y, lastSeat.x - firstSeat.x)

      row.seats = row.seats.map((seat, i) => ({
        ...seat,
        x: firstSeat.x + Math.cos(angle) * (newSpacing * i),
        y: firstSeat.y + Math.sin(angle) * (newSpacing * i),
      }))
      row.seatSpacing = newSpacing

      if (resetCurve) row.curve = 0
    })
  }

  // ==================== Seat CRUD ====================

  function updateSeat(seatId: string, updates: Partial<Seat>) {
    venue.value.sections.forEach(section => {
      section.rows.forEach(row => {
        const seat = row.seats.find(s => s.id === seatId)
        if (seat) Object.assign(seat, updates)
      })
    })
  }

  function updateSeatsCategory(seatIds: string[], categoryKey: string | number) {
    const normalizedKey = String(categoryKey)
    const idSet = new Set(seatIds)
    venue.value.sections.forEach(section => {
      section.rows.forEach(row => {
        row.seats.forEach(seat => {
          if (idSet.has(seat.id)) seat.categoryKey = normalizedKey
        })
      })
    })
  }

  function removeSelectedSeats(seatIds: string[]) {
    if (seatIds.length === 0) return
    const toDelete = new Set(seatIds)
    venue.value.sections.forEach(section => {
      section.rows.forEach(row => {
        const before = row.seats.length
        row.seats = row.seats.filter(s => !toDelete.has(s.id))
        if (row.seats.length !== before) renumberRowSeats(row)
      })
    })
  }

  function addSeatAtRowStart(rowId: string) {
    mutateRow(rowId, row => {
      if (row.seats.length === 0) return false
      const firstSeat = row.seats[0]
      const secondSeat = row.seats[1]
      const spacing = row.seats.length > 1 ? secondSeat.x - firstSeat.x : (row.seatSpacing || 28)
      row.seats.unshift({
        id: generateId(),
        label: '',
        x: firstSeat.x - spacing,
        y: firstSeat.y,
        categoryKey: firstSeat.categoryKey,
        status: 'available',
        objectType: 'seat'
      })
      renumberRowSeats(row)
      return true
    })
  }

  function addSeatAtRowEnd(rowId: string) {
    mutateRow(rowId, row => {
      if (row.seats.length === 0) return false
      const lastSeat = row.seats[row.seats.length - 1]
      const secondLastSeat = row.seats[row.seats.length - 2]
      const spacing = row.seats.length > 1
        ? lastSeat.x - secondLastSeat.x
        : (row.seatSpacing || 28)
      row.seats.push({
        id: generateId(),
        label: '',
        x: lastSeat.x + spacing,
        y: lastSeat.y,
        categoryKey: lastSeat.categoryKey,
        status: 'available',
        objectType: 'seat'
      })
      renumberRowSeats(row)
      return true
    })
  }

  function removeSeatAtRowStart(rowId: string) {
    mutateRow(rowId, row => {
      if (row.seats.length <= 1) return false
      row.seats.shift()
      renumberRowSeats(row)
      return true
    })
  }

  function removeSeatAtRowEnd(rowId: string) {
    mutateRow(rowId, row => {
      if (row.seats.length <= 1) return false
      row.seats.pop()
      renumberRowSeats(row)
      return true
    })
  }

  function renumberRowSeats(row: SeatRow) {
    row.seats.forEach((seat, index) => {
      seat.label = String(index + 1)
    })
  }

  function mutateRow(rowId: string, mutator: (row: SeatRow) => boolean) {
    for (const section of venue.value.sections) {
      const row = section.rows.find(r => r.id === rowId)
      if (row) return mutator(row)
    }
    return false
  }

  /** 根据编辑器当前选中的 ID 批量删除对象 */
  function deleteSelectedObjects(selection: {
    seatIds?: string[]
    rowIds?: string[]
    sectionIds?: string[]
    shapeIds?: string[]
    textIds?: string[]
    areaIds?: string[]
  }) {
    const { seatIds = [], rowIds = [], sectionIds = [], shapeIds = [], textIds = [], areaIds = [] } = selection

    if (seatIds.length > 0) removeSelectedSeats(seatIds)
    if (rowIds.length > 0) rowIds.forEach(deleteRow)
    if (sectionIds.length > 0) sectionIds.forEach(deleteSection)
    if (shapeIds.length > 0) shapeIds.forEach(deleteShape)
    if (textIds.length > 0) textIds.forEach(deleteText)
    if (areaIds.length > 0) areaIds.forEach(deleteArea)
  }

  // ==================== Copy / Paste ====================

  function cloneSection(section: Section, dx: number, dy: number): Section {
    return {
      ...section,
      id: generateId(),
      name: `${section.name || '分区'} 副本`,
      x: (section.x ?? 0) + dx,
      y: (section.y ?? 0) + dy,
      rows: section.rows.map(row => cloneRow(row, dx, dy)),
      shapes: section.shapes?.map(shape => cloneShape(shape, dx, dy)),
      texts: section.texts?.map(text => cloneText(text, dx, dy)),
      areas: section.areas?.map(area => cloneArea(area)),
    }
  }

  function cloneRow(row: SeatRow, dx: number, dy: number): SeatRow {
    return {
      ...row,
      id: generateId(),
      label: '',
      x: (row.x ?? 0) + dx,
      y: (row.y ?? 0) + dy,
      seats: row.seats.map(seat => cloneSeat(seat, dx, dy)),
    }
  }

  function cloneSeat(seat: Seat, dx: number, dy: number): Seat {
    return {
      ...seat,
      id: generateId(),
      label: '',
      x: seat.x + dx,
      y: seat.y + dy,
    }
  }

  function cloneShape(shape: ShapeObject, dx: number, dy: number): ShapeObject {
    return { ...shape, id: generateId(), x: shape.x + dx, y: shape.y + dy }
  }

  function cloneText(text: TextObject, dx: number, dy: number): TextObject {
    return { ...text, id: generateId(), x: text.x + dx, y: text.y + dy }
  }

  function cloneArea(area: AreaObject): AreaObject {
    return { ...area, id: generateId() }
  }

  function findSectionByRowId(rowId: string): Section | undefined {
    return venue.value.sections.find(s => s.rows.some(r => r.id === rowId))
  }

  function findRowBySeatId(seatId: string): SeatRow | undefined {
    for (const section of venue.value.sections) {
      const row = section.rows.find(r => r.seats.some(s => s.id === seatId))
      if (row) return row
    }
    return undefined
  }

  function pasteObjects(data: PasteInput, offset: { x: number; y: number } = { x: 20, y: 20 }): PasteResult {
    const result: PasteResult = {
      sectionIds: [],
      rowIds: [],
      seatIds: [],
      shapeIds: [],
      textIds: [],
      areaIds: [],
    }

    // 1) 复制整个 Section
    data.sections?.forEach(section => {
      const cloned = cloneSection(section, offset.x, offset.y)
      venue.value.sections.push(cloned)
      result.sectionIds.push(cloned.id)
      cloned.rows.forEach(r => result.rowIds.push(r.id))
      cloned.rows.forEach(r => r.seats.forEach(s => result.seatIds.push(s.id)))
      cloned.shapes?.forEach(s => result.shapeIds.push(s.id))
      cloned.texts?.forEach(t => result.textIds.push(t.id))
      cloned.areas?.forEach(a => result.areaIds.push(a.id))
    })

    // 2) 复制 Row（粘贴到原属 Section）
    data.rows?.forEach(row => {
      const section = findSectionByRowId(row.id)
      if (!section) return
      const cloned = cloneRow(row, offset.x, offset.y)
      section.rows.push(cloned)
      result.rowIds.push(cloned.id)
      cloned.seats.forEach(s => result.seatIds.push(s.id))
    })

    // 3) 复制 Seat -> 新建一个 Row 容纳它们
    if (data.seats && data.seats.length > 0) {
      const row = findRowBySeatId(data.seats[0].id)
      const section = row ? findSectionByRowId(row.id) : venue.value.sections[0]
      if (section) {
        const avgX = data.seats.reduce((sum, s) => sum + s.x, 0) / data.seats.length
        const avgY = data.seats.reduce((sum, s) => sum + s.y, 0) / data.seats.length
        const newRow: SeatRow = {
          id: generateId(),
          label: '',
          x: avgX + offset.x,
          y: avgY + offset.y,
          seats: data.seats.map(seat => cloneSeat(seat, offset.x, offset.y)),
        }
        section.rows.push(newRow)
        result.rowIds.push(newRow.id)
        newRow.seats.forEach(s => result.seatIds.push(s.id))
      }
    }

    // 4) 复制独立 Shape / Text / Area（粘贴到第一个 Section，若无可容纳则忽略）
    const firstSection = venue.value.sections[0]
    if (firstSection) {
      data.shapes?.forEach(shape => {
        const cloned = cloneShape(shape, offset.x, offset.y)
        if (!firstSection.shapes) firstSection.shapes = []
        firstSection.shapes.push(cloned)
        result.shapeIds.push(cloned.id)
      })
      data.texts?.forEach(text => {
        const cloned = cloneText(text, offset.x, offset.y)
        if (!firstSection.texts) firstSection.texts = []
        firstSection.texts.push(cloned)
        result.textIds.push(cloned.id)
      })
      data.areas?.forEach(area => {
        const cloned = cloneArea(area)
        if (!firstSection.areas) firstSection.areas = []
        firstSection.areas.push(cloned)
        result.areaIds.push(cloned.id)
      })
    }

    return result
  }

  // ==================== Shape / Text / Area CRUD ====================

  function addShape(sectionId: string, shape: Omit<ShapeObject, 'id'>) {
    const section = venue.value.sections.find(s => s.id === sectionId)
    if (!section) return
    if (!section.shapes) section.shapes = []
    const newShape: ShapeObject = { ...shape, id: generateId() }
    section.shapes.push(newShape)
    return newShape.id
  }

  function updateShape(shapeId: string, updates: Partial<ShapeObject>) {
    venue.value.sections.forEach(section => {
      const shape = section.shapes?.find(s => s.id === shapeId)
      if (shape) Object.assign(shape, updates)
    })
  }

  function deleteShape(shapeId: string) {
    venue.value.sections.forEach(section => {
      if (section.shapes) section.shapes = section.shapes.filter(s => s.id !== shapeId)
    })
  }

  function addText(sectionId: string, text: Omit<TextObject, 'id'>) {
    const section = venue.value.sections.find(s => s.id === sectionId)
    if (!section) return
    if (!section.texts) section.texts = []
    const newText: TextObject = { ...text, id: generateId() }
    section.texts.push(newText)
    return newText.id
  }

  function updateText(textId: string, updates: Partial<TextObject>) {
    venue.value.sections.forEach(section => {
      const text = section.texts?.find(t => t.id === textId)
      if (text) Object.assign(text, updates)
    })
  }

  function deleteText(textId: string) {
    venue.value.sections.forEach(section => {
      if (section.texts) section.texts = section.texts.filter(t => t.id !== textId)
    })
  }

  function addArea(sectionId: string, area: Omit<AreaObject, 'id'>) {
    const section = venue.value.sections.find(s => s.id === sectionId)
    if (!section) return
    if (!section.areas) section.areas = []
    const newArea: AreaObject = { ...area, id: generateId() }
    section.areas.push(newArea)
    return newArea.id
  }

  function updateArea(areaId: string, updates: Partial<AreaObject>) {
    venue.value.sections.forEach(section => {
      const area = section.areas?.find(a => a.id === areaId)
      if (area) Object.assign(area, updates)
    })
  }

  function deleteArea(areaId: string) {
    venue.value.sections.forEach(section => {
      if (section.areas) section.areas = section.areas.filter(a => a.id !== areaId)
    })
  }

  // ==================== Category CRUD ====================

  function addCategory(category: Omit<Category, 'key'>) {
    const newCategory: Category = { ...category, key: generateId() }
    venue.value.categories.push(newCategory)
    return newCategory.key
  }

  function updateCategory(key: string | number, updates: Partial<Category>) {
    const category = venue.value.categories.find(c => String(c.key) === String(key))
    if (category) Object.assign(category, updates)
  }

  function deleteCategory(key: string | number) {
    venue.value.categories = venue.value.categories.filter(
      c => String(c.key) !== String(key)
    )
  }

  // ==================== Generic Object Update ====================

  function updateObjectProperty(type: SelectedObjectType, id: string, updates: Record<string, any>) {
    switch (type) {
      case 'seat':
        updateSeat(id, updates)
        break
      case 'row':
        updateRow(id, updates)
        break
      case 'rect':
      case 'ellipse':
      case 'polygon':
      case 'sector':
      case 'polyline':
        updateShape(id, updates)
        break
      case 'text':
        updateText(id, updates)
        break
      case 'area':
        updateArea(id, updates)
        break
    }
  }

  // ==================== Import / Export ====================

  function exportVenueData(): VenueData {
    return JSON.parse(JSON.stringify(venue.value))
  }

  function importVenueData(data: VenueData) {
    if (!data) {
      console.error('导入失败: 数据为空')
      return
    }
    if (!Array.isArray(data.sections)) {
      console.error('导入失败: sections 必须是数组')
      return
    }
    if (!Array.isArray(data.categories)) {
      console.error('导入失败: categories 必须是数组')
      return
    }

    const normalizedSections: Section[] = data.sections.map(section => ({
      ...section,
      type: (section as any).type || (section as any).borderType || undefined,
      readonly: false,
      rows: Array.isArray(section.rows) ? section.rows : []
    }))

    normalizedSections.forEach(section => {
      section.rows = section.rows.map(row => ({
        ...row,
        seats: Array.isArray(row.seats)
          ? row.seats.map(seat => ({
              ...seat,
              categoryKey: seat.categoryKey ?? (seat as any).cat_id ?? (seat as any).category ?? 1
            }))
          : []
      }))
    })

    venue.value = {
      id: data.id || generateId(),
      name: data.name || '未命名座位图',
      type: data.type || 'SIMPLE',
      categories: data.categories.length > 0 ? data.categories : defaultCategories(),
      sections: normalizedSections,
      baseScale: (data as any).baseScale ?? (data as any).scale ?? null
    }
  }

  function importLegacyData(data: any): VenueData {
    if (!data) {
      console.error('导入失败: 数据为空')
      return createDefaultVenue()
    }

    const categories: Category[] = []
    if (Array.isArray(data.categories)) {
      data.categories.forEach((cat: any, index: number) => {
        categories.push({
          key: cat.id || index + 1,
          label: cat.name || '',
          color: cat.color || '',
          accessible: cat.accessible || false
        })
      })
    }

    const sections: Section[] = []
    if (Array.isArray(data.sections)) {
      data.sections.forEach((sec: any) => {
        const section: Section = {
          id: sec.id || generateId(),
          name: sec.name || '',
          x: sec.x || 0,
          y: sec.y || 0,
          rotation: sec.rotation || 0,
          rows: [],
        }
        if (Array.isArray(sec.rows)) {
          sec.rows.forEach((row: any) => {
            const seatRow: SeatRow = {
              id: row.id || generateId(),
              label: row.label || '',
              x: row.x || 0,
              y: row.y || 0,
              rotation: row.rotation || 0,
              seats: []
            }
            if (Array.isArray(row.seats)) {
              row.seats.forEach((seat: any) => {
                seatRow.seats.push({
                  id: seat.id || generateId(),
                  label: seat.label || '',
                  x: seat.x || 0,
                  y: seat.y || 0,
                  categoryKey: seat.categoryId || seat.category || 1,
                  status: seat.status || 'available',
                  objectType: seat.isWheelchair ? 'wheelchair' : 'seat',
                  radius: seat.radius,
                  rowId: row.id,
                  sectionId: sec.id,
                  isAccessible: seat.isWheelchair || false,
                  isCompanionSeat: seat.isCompanion || false
                })
              })
            }
            section.rows.push(seatRow)
          })
        }
        sections.push(section)
      })
    }

    return {
      id: generateId(),
      name: data.name || '未命名座位图',
      type: data.type || 'SIMPLE',
      categories: categories.length > 0 ? categories : defaultCategories(),
      sections,
      baseScale: (data as any).baseScale ?? (data as any).scale ?? null
    }
  }

  function resetVenue() {
    venue.value = createDefaultVenue()
  }

  function createSnapshot(): string {
    return JSON.stringify({ venue: exportVenueData() })
  }

  function restoreSnapshot(snapshot: string) {
    try {
      const data = JSON.parse(snapshot) as { venue: VenueData }
      if (data.venue) importVenueData(data.venue)
    } catch (error) {
      console.error('恢复快照失败:', error)
    }
  }

  // ==================== BaseScale ====================

  function initBaseScale(currentScale: number) {
    if (venue.value.baseScale === undefined || venue.value.baseScale === null) {
      venue.value.baseScale = Math.round(currentScale * 100) / 100
    }
  }

  function getBaseScale() {
    return venue.value.baseScale ?? 1
  }

  function setSectionBaseScale(scale: number) {
    venue.value.baseScale = Math.round(scale * 100) / 100
  }

  // ==================== Helpers ====================

  function createDefaultVenue(): VenueData {
    return {
      id: generateId(),
      name: '未命名座位图',
      type: 'SIMPLE',
      categories: defaultCategories(),
      sections: []
    }
  }

  function defaultCategories(): Category[] {
    return [
      { key: 1, label: '普通区', color: '#A5D6A7', accessible: false },
      { key: 2, label: 'VIP区', color: '#FF8A80', accessible: false },
      { key: 3, label: '轮椅区', color: '#90CAF9', accessible: true }
    ]
  }

  // ==================== Return ====================

  return {
    // State
    venue,
    visualConfig,

    // Getters
    totalSeats,
    availableSeats,

    // Section
    addSection,
    deleteSection,
    updateSectionBorder,

    // Row
    addRow,
    updateRow,
    updateMultipleRows,
    deleteRow,
    updateRowSeatCount,
    updateRowCurve,
    updateRowSeatSpacing,

    // Seat
    updateSeat,
    updateSeatsCategory,
    addSeatAtRowStart,
    addSeatAtRowEnd,
    removeSeatAtRowStart,
    removeSeatAtRowEnd,
    removeSelectedSeats,

    // Batch deletion / copy-paste
    deleteSelectedObjects,
    pasteObjects,

    // Shape / Text / Area
    addShape,
    updateShape,
    deleteShape,
    addText,
    updateText,
    deleteText,
    addArea,
    updateArea,
    deleteArea,

    // Category
    addCategory,
    updateCategory,
    deleteCategory,

    // Generic
    updateObjectProperty,

    // Import / Export / Reset
    exportVenueData,
    importVenueData,
    importLegacyData,
    resetVenue,
    createSnapshot,
    restoreSnapshot,

    // BaseScale
    initBaseScale,
    getBaseScale,
    setSectionBaseScale,
  }
})
