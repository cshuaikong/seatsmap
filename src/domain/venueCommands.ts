import type { Command } from './command'
import type { Section, SeatRow, Seat, ShapeObject, TextObject, AreaObject, Category } from '../types'
import type { useVenueDataStore, PasteInput, PasteResult } from '../stores/venueDataStore'

type VenueDataStore = ReturnType<typeof useVenueDataStore>

/** 深拷贝 */
function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value))
}

/** 查找 row */
function findRow(sections: Section[], rowId: string): { section: Section; row: SeatRow; index: number } | null {
  for (const section of sections) {
    const index = section.rows.findIndex(r => r.id === rowId)
    if (index !== -1) return { section, row: section.rows[index], index }
  }
  return null
}

/** 查找 seat */
function findSeat(sections: Section[], seatId: string): { section: Section; row: SeatRow; seat: Seat; rowIndex: number; seatIndex: number } | null {
  for (const section of sections) {
    for (let rowIndex = 0; rowIndex < section.rows.length; rowIndex++) {
      const row = section.rows[rowIndex]
      const seatIndex = row.seats.findIndex(s => s.id === seatId)
      if (seatIndex !== -1) return { section, row, seat: row.seats[seatIndex], rowIndex, seatIndex }
    }
  }
  return null
}

/** 查找 shape/text/area */
function findShape(sections: Section[], shapeId: string): { section: Section; shape: ShapeObject; index: number } | null {
  for (const section of sections) {
    const index = section.shapes?.findIndex(s => s.id === shapeId) ?? -1
    if (index !== -1 && section.shapes) return { section, shape: section.shapes[index], index }
  }
  return null
}

function findText(sections: Section[], textId: string): { section: Section; text: TextObject; index: number } | null {
  for (const section of sections) {
    const index = section.texts?.findIndex(t => t.id === textId) ?? -1
    if (index !== -1 && section.texts) return { section, text: section.texts[index], index }
  }
  return null
}

function findArea(sections: Section[], areaId: string): { section: Section; area: AreaObject; index: number } | null {
  for (const section of sections) {
    const index = section.areas?.findIndex(a => a.id === areaId) ?? -1
    if (index !== -1 && section.areas) return { section, area: section.areas[index], index }
  }
  return null
}

/** 把多个命令打包成一个，undo/redo 原子执行 */
export function createBatchCommand(commands: Command[]): Command {
  return {
    name: `batch(${commands.map(c => c.name).join(',')})`,
    execute: () => commands.forEach(c => c.execute()),
    undo: () => [...commands].reverse().forEach(c => c.undo()),
  }
}

// ==================== Row Commands ====================

/** 向指定 Section 添加若干 Row */
export function createAddRowsCommand(
  store: VenueDataStore,
  sectionId: string,
  rows: Omit<SeatRow, 'id'>[],
): Command {
  const captured = clone(rows) as Omit<SeatRow, 'id'>[]
  let addedIds: string[] = []
  return {
    name: 'addRows',
    execute: () => {
      addedIds = store.addRows(sectionId, clone(captured)) ?? []
    },
    undo: () => {
      addedIds.forEach(id => store.deleteRow(id))
    },
  }
}

/** 更新 Row 属性的命令（全量替换） */
export function createUpdateRowCommand(
  store: VenueDataStore,
  rowId: string,
  updates: Partial<SeatRow>,
): Command {
  const location = findRow(store.venue.sections, rowId)
  const before = location ? clone(location.row) as SeatRow : null
  return {
    name: 'updateRow',
    execute: () => {
      if (!before) return
      store.updateRow(rowId, clone(updates))
    },
    undo: () => {
      if (!before) return
      store.updateRow(rowId, clone(before))
    },
  }
}

/** 批量更新 Row 属性 */
export function createUpdateMultipleRowsCommand(
  store: VenueDataStore,
  rowIds: string[],
  updates: Partial<SeatRow>,
): Command {
  const before = rowIds.map(id => {
    const loc = findRow(store.venue.sections, id)
    return loc ? { id, row: clone(loc.row) as SeatRow } : null
  }).filter(Boolean) as { id: string; row: SeatRow }[]

  return {
    name: 'updateMultipleRows',
    execute: () => store.updateMultipleRows(rowIds, clone(updates)),
    undo: () => before.forEach(({ id, row }) => store.updateRow(id, clone(row))),
  }
}

/** 修改行座位数 */
export function createUpdateRowSeatCountCommand(
  store: VenueDataStore,
  rowId: string,
  newCount: number,
): Command {
  const location = findRow(store.venue.sections, rowId)
  const before = location ? clone(location.row) as SeatRow : null
  return {
    name: 'updateRowSeatCount',
    execute: () => store.updateRowSeatCount(rowId, newCount),
    undo: () => {
      if (!before) return
      store.updateRow(rowId, clone(before))
    },
  }
}

/** 修改行弯曲度 */
export function createUpdateRowCurveCommand(
  store: VenueDataStore,
  rowId: string,
  newCurve: number,
): Command {
  const location = findRow(store.venue.sections, rowId)
  const before = location?.row.curve ?? 0
  return {
    name: 'updateRowCurve',
    execute: () => store.updateRowCurve(rowId, newCurve),
    undo: () => store.updateRowCurve(rowId, before),
  }
}

/** 修改行座位间距 */
export function createUpdateRowSeatSpacingCommand(
  store: VenueDataStore,
  rowId: string,
  newSpacing: number,
  resetCurve = false,
): Command {
  const location = findRow(store.venue.sections, rowId)
  const before = location ? clone(location.row) as SeatRow : null
  return {
    name: 'updateRowSeatSpacing',
    execute: () => store.updateRowSeatSpacing(rowId, newSpacing, resetCurve),
    undo: () => {
      if (!before) return
      store.updateRow(rowId, clone(before))
    },
  }
}

/** 在行首添加座位 */
export function createAddSeatAtRowStartCommand(store: VenueDataStore, rowId: string): Command {
  const location = findRow(store.venue.sections, rowId)
  const before = location ? clone(location.row) as SeatRow : null
  return {
    name: 'addSeatAtRowStart',
    execute: () => store.addSeatAtRowStart(rowId),
    undo: () => {
      if (!before) return
      store.updateRow(rowId, clone(before))
    },
  }
}

/** 在行尾添加座位 */
export function createAddSeatAtRowEndCommand(store: VenueDataStore, rowId: string): Command {
  const location = findRow(store.venue.sections, rowId)
  const before = location ? clone(location.row) as SeatRow : null
  return {
    name: 'addSeatAtRowEnd',
    execute: () => store.addSeatAtRowEnd(rowId),
    undo: () => {
      if (!before) return
      store.updateRow(rowId, clone(before))
    },
  }
}

/** 移除行首座位 */
export function createRemoveSeatAtRowStartCommand(store: VenueDataStore, rowId: string): Command {
  const location = findRow(store.venue.sections, rowId)
  const before = location ? clone(location.row) as SeatRow : null
  return {
    name: 'removeSeatAtRowStart',
    execute: () => store.removeSeatAtRowStart(rowId),
    undo: () => {
      if (!before) return
      store.updateRow(rowId, clone(before))
    },
  }
}

/** 移除行尾座位 */
export function createRemoveSeatAtRowEndCommand(store: VenueDataStore, rowId: string): Command {
  const location = findRow(store.venue.sections, rowId)
  const before = location ? clone(location.row) as SeatRow : null
  return {
    name: 'removeSeatAtRowEnd',
    execute: () => store.removeSeatAtRowEnd(rowId),
    undo: () => {
      if (!before) return
      store.updateRow(rowId, clone(before))
    },
  }
}

// ==================== Seat Commands ====================

/** 更新单个座位属性 */
export function createUpdateSeatCommand(
  store: VenueDataStore,
  seatId: string,
  updates: Partial<Seat>,
): Command {
  const location = findSeat(store.venue.sections, seatId)
  const before = location ? clone(location.seat) as Seat : null
  return {
    name: 'updateSeat',
    execute: () => {
      if (!before) return
      store.updateSeat(seatId, clone(updates))
    },
    undo: () => {
      if (!before) return
      store.updateSeat(seatId, clone(before))
    },
  }
}

/** 批量更新座位分类 */
export function createUpdateSeatsCategoryCommand(
  store: VenueDataStore,
  seatIds: string[],
  categoryKey: string | number,
): Command {
  const normalizedKey = String(categoryKey)
  const before = seatIds.map(id => {
    const loc = findSeat(store.venue.sections, id)
    return loc ? { id, key: loc.seat.categoryKey } : null
  }).filter(Boolean) as { id: string; key: string | number }[]

  return {
    name: 'updateSeatsCategory',
    execute: () => store.updateSeatsCategory(seatIds, normalizedKey),
    undo: () => before.forEach(({ id, key }) => store.updateSeat(id, { categoryKey: key })),
  }
}

// ==================== Section Commands ====================

/** 添加一个 Section 并放入若干 Row（原子操作） */
export function createAddSectionWithRowsCommand(
  store: VenueDataStore,
  section: Omit<Section, 'id' | 'rows'>,
  rows: Omit<SeatRow, 'id'>[],
): Command {
  const capturedSection = clone(section)
  const capturedRows = clone(rows) as Omit<SeatRow, 'id'>[]
  let sectionId: string = ''
  let rowIds: string[] = []
  return {
    name: 'addSectionWithRows',
    execute: () => {
      sectionId = store.addSection({ ...capturedSection, rows: [] }) || ''
      if (sectionId) {
        rowIds = store.addRows(sectionId, capturedRows) ?? []
      }
    },
    undo: () => {
      rowIds.forEach(id => store.deleteRow(id))
      if (sectionId) store.deleteSection(sectionId)
    },
  }
}

/** 更新 Section 边框/属性的命令 */
export function createUpdateSectionBorderCommand(
  store: VenueDataStore,
  sectionId: string,
  border: Partial<Section>,
): Command {
  const section = store.venue.sections.find(s => s.id === sectionId)
  const keys = Object.keys(border)
  const before = section
    ? Object.fromEntries(keys.map(k => [k, (section as any)[k]]))
    : null
  return {
    name: 'updateSectionBorder',
    execute: () => {
      if (!section) return
      store.updateSectionBorder(sectionId, clone(border))
    },
    undo: () => {
      if (!before || !section) return
      store.updateSectionBorder(sectionId, before as any)
    },
  }
}

// ==================== Shape / Text / Area Commands ====================

export function createUpdateShapeCommand(
  store: VenueDataStore,
  shapeId: string,
  updates: Partial<ShapeObject>,
): Command {
  const location = findShape(store.venue.sections, shapeId)
  const before = location ? clone(location.shape) as ShapeObject : null
  return {
    name: 'updateShape',
    execute: () => {
      if (!before) return
      store.updateShape(shapeId, clone(updates))
    },
    undo: () => {
      if (!before) return
      store.updateShape(shapeId, clone(before))
    },
  }
}

export function createUpdateTextCommand(
  store: VenueDataStore,
  textId: string,
  updates: Partial<TextObject>,
): Command {
  const location = findText(store.venue.sections, textId)
  const before = location ? clone(location.text) as TextObject : null
  return {
    name: 'updateText',
    execute: () => {
      if (!before) return
      store.updateText(textId, clone(updates))
    },
    undo: () => {
      if (!before) return
      store.updateText(textId, clone(before))
    },
  }
}

export function createUpdateAreaCommand(
  store: VenueDataStore,
  areaId: string,
  updates: Partial<AreaObject>,
): Command {
  const location = findArea(store.venue.sections, areaId)
  const before = location ? clone(location.area) as AreaObject : null
  return {
    name: 'updateArea',
    execute: () => {
      if (!before) return
      store.updateArea(areaId, clone(updates))
    },
    undo: () => {
      if (!before) return
      store.updateArea(areaId, clone(before))
    },
  }
}

// ==================== Category Commands ====================

export function createAddCategoryCommand(
  store: VenueDataStore,
  category: Omit<Category, 'key'>,
): Command {
  let createdKey: string | number = ''
  return {
    name: 'addCategory',
    execute: () => {
      createdKey = store.addCategory(clone(category)) || ''
    },
    undo: () => {
      if (createdKey) store.deleteCategory(createdKey)
    },
  }
}

export function createUpdateCategoryCommand(
  store: VenueDataStore,
  key: string | number,
  updates: Partial<Category>,
): Command {
  const category = store.venue.categories.find(c => String(c.key) === String(key))
  const before = category ? clone(category) as Category : null
  return {
    name: 'updateCategory',
    execute: () => {
      if (!before) return
      store.updateCategory(key, clone(updates))
    },
    undo: () => {
      if (!before) return
      const idx = store.venue.categories.findIndex(c => String(c.key) === String(key))
      if (idx !== -1) store.venue.categories[idx] = clone(before)
    },
  }
}

export function createDeleteCategoryCommand(
  store: VenueDataStore,
  key: string | number,
): Command {
  const category = store.venue.categories.find(c => String(c.key) === String(key))
  const before = category ? clone(category) as Category : null
  return {
    name: 'deleteCategory',
    execute: () => {
      if (!before) return
      store.deleteCategory(key)
    },
    undo: () => {
      if (!before) return
      if (!store.venue.categories.some(c => String(c.key) === String(key))) {
        store.venue.categories.push(clone(before))
      }
    },
  }
}

// ==================== Paste Command ====================

export function createPasteObjectsCommand(
  store: VenueDataStore,
  data: PasteInput,
  offset: { x: number; y: number },
): Command {
  let result: PasteResult | null = null
  return {
    name: 'pasteObjects',
    execute: () => {
      result = store.pasteObjects(clone(data), offset)
    },
    undo: () => {
      if (!result) return
      result.sectionIds.forEach(id => store.deleteSection(id))
      result.rowIds.forEach(id => store.deleteRow(id))
      // seat 随 row 删除；shape/text/area 需要单独删除
      result.shapeIds.forEach(id => store.deleteShape(id))
      result.textIds.forEach(id => store.deleteText(id))
      result.areaIds.forEach(id => store.deleteArea(id))
      // 单独复制 seat 时生成了新 row，rowIds 已覆盖
    },
  }
}

// ==================== Delete Selected Objects ====================

export function createDeleteSelectedObjectsCommand(
  store: VenueDataStore,
  selection: {
    seatIds?: string[]
    rowIds?: string[]
    sectionIds?: string[]
    shapeIds?: string[]
    textIds?: string[]
    areaIds?: string[]
  },
): Command {
  const capturedSections: Section[] = []
  const capturedRows: { sectionId: string; row: SeatRow; index: number }[] = []
  const capturedSeats: { sectionId: string; rowId: string; seat: Seat; rowIndex: number; seatIndex: number }[] = []
  const capturedShapes: { sectionId: string; shape: ShapeObject; index: number }[] = []
  const capturedTexts: { sectionId: string; text: TextObject; index: number }[] = []
  const capturedAreas: { sectionId: string; area: AreaObject; index: number }[] = []

  selection.sectionIds?.forEach(id => {
    const section = store.venue.sections.find(s => s.id === id)
    if (section) capturedSections.push(clone(section))
  })

  selection.rowIds?.forEach(id => {
    const loc = findRow(store.venue.sections, id)
    if (loc) capturedRows.push({ sectionId: loc.section.id, row: clone(loc.row), index: loc.index })
  })

  selection.seatIds?.forEach(id => {
    const loc = findSeat(store.venue.sections, id)
    if (loc) capturedSeats.push({ sectionId: loc.section.id, rowId: loc.row.id, seat: clone(loc.seat), rowIndex: loc.rowIndex, seatIndex: loc.seatIndex })
  })

  selection.shapeIds?.forEach(id => {
    const loc = findShape(store.venue.sections, id)
    if (loc) capturedShapes.push({ sectionId: loc.section.id, shape: clone(loc.shape), index: loc.index })
  })

  selection.textIds?.forEach(id => {
    const loc = findText(store.venue.sections, id)
    if (loc) capturedTexts.push({ sectionId: loc.section.id, text: clone(loc.text), index: loc.index })
  })

  selection.areaIds?.forEach(id => {
    const loc = findArea(store.venue.sections, id)
    if (loc) capturedAreas.push({ sectionId: loc.section.id, area: clone(loc.area), index: loc.index })
  })

  return {
    name: 'deleteSelectedObjects',
    execute: () => store.deleteSelectedObjects(selection),
    undo: () => {
      capturedSections.forEach(section => {
        if (!store.venue.sections.some(s => s.id === section.id)) {
          store.venue.sections.push(section)
        }
      })
      capturedRows.forEach(({ sectionId, row, index }) => {
        const section = store.venue.sections.find(s => s.id === sectionId)
        if (section && !section.rows.some(r => r.id === row.id)) {
          section.rows.splice(index, 0, row)
        }
      })
      capturedSeats.forEach(({ sectionId, rowId, seat, rowIndex, seatIndex }) => {
        const section = store.venue.sections.find(s => s.id === sectionId)
        const row = section?.rows[rowIndex]
        if (row && row.id === rowId && !row.seats.some(s => s.id === seat.id)) {
          row.seats.splice(seatIndex, 0, seat)
        }
      })
      capturedShapes.forEach(({ sectionId, shape, index }) => {
        const section = store.venue.sections.find(s => s.id === sectionId)
        if (section) {
          if (!section.shapes) section.shapes = []
          if (!section.shapes.some(s => s.id === shape.id)) {
            section.shapes.splice(index, 0, shape)
          }
        }
      })
      capturedTexts.forEach(({ sectionId, text, index }) => {
        const section = store.venue.sections.find(s => s.id === sectionId)
        if (section) {
          if (!section.texts) section.texts = []
          if (!section.texts.some(t => t.id === text.id)) {
            section.texts.splice(index, 0, text)
          }
        }
      })
      capturedAreas.forEach(({ sectionId, area, index }) => {
        const section = store.venue.sections.find(s => s.id === sectionId)
        if (section) {
          if (!section.areas) section.areas = []
          if (!section.areas.some(a => a.id === area.id)) {
            section.areas.splice(index, 0, area)
          }
        }
      })
    },
  }
}
