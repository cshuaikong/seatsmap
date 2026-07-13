import type { Command } from './command'
import type { Section, SeatRow, Seat, ShapeObject, TextObject, AreaObject } from '../types'
import type { useVenueDataStore } from '../stores/venueDataStore'

type VenueDataStore = ReturnType<typeof useVenueDataStore>

/** 查找 row 的工具函数 */
function findRow(sections: Section[], rowId: string): { section: Section; row: SeatRow; index: number } | null {
  for (const section of sections) {
    const index = section.rows.findIndex(r => r.id === rowId)
    if (index !== -1) return { section, row: section.rows[index], index }
  }
  return null
}

/** 查找 seat 的工具函数 */
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

/** 更新 Row 属性的命令 */
export function createUpdateRowCommand(
  store: VenueDataStore,
  rowId: string,
  updates: Partial<SeatRow>,
): Command {
  const location = findRow(store.venue.sections, rowId)
  const before = location ? JSON.parse(JSON.stringify(location.row)) as SeatRow : null
  return {
    name: 'updateRow',
    execute: () => {
      if (!before) return
      store.updateRow(rowId, JSON.parse(JSON.stringify(updates)))
    },
    undo: () => {
      if (!before) return
      store.updateRow(rowId, JSON.parse(JSON.stringify(before)))
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
      store.updateSectionBorder(sectionId, JSON.parse(JSON.stringify(border)))
    },
    undo: () => {
      if (!before || !section) return
      store.updateSectionBorder(sectionId, before as any)
    },
  }
}

/** 删除选中对象的命令（基于当前选择状态执行，undo 需保存被删对象） */
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
  // 深拷贝被删对象，用于撤销
  const capturedSections: Section[] = []
  const capturedRows: { sectionId: string; row: SeatRow; index: number }[] = []
  const capturedSeats: { sectionId: string; rowId: string; seat: Seat; rowIndex: number; seatIndex: number }[] = []
  const capturedShapes: { sectionId: string; shape: ShapeObject; index: number }[] = []
  const capturedTexts: { sectionId: string; text: TextObject; index: number }[] = []
  const capturedAreas: { sectionId: string; area: AreaObject; index: number }[] = []

  selection.sectionIds?.forEach(id => {
    const section = store.venue.sections.find(s => s.id === id)
    if (section) capturedSections.push(JSON.parse(JSON.stringify(section)))
  })

  selection.rowIds?.forEach(id => {
    const loc = findRow(store.venue.sections, id)
    if (loc) capturedRows.push({ sectionId: loc.section.id, row: JSON.parse(JSON.stringify(loc.row)), index: loc.index })
  })

  selection.seatIds?.forEach(id => {
    const loc = findSeat(store.venue.sections, id)
    if (loc) capturedSeats.push({ sectionId: loc.section.id, rowId: loc.row.id, seat: JSON.parse(JSON.stringify(loc.seat)), rowIndex: loc.rowIndex, seatIndex: loc.seatIndex })
  })

  selection.shapeIds?.forEach(id => {
    for (const section of store.venue.sections) {
      const index = section.shapes?.findIndex(s => s.id === id) ?? -1
      if (index !== -1 && section.shapes) {
        capturedShapes.push({ sectionId: section.id, shape: JSON.parse(JSON.stringify(section.shapes[index])), index })
        break
      }
    }
  })

  selection.textIds?.forEach(id => {
    for (const section of store.venue.sections) {
      const index = section.texts?.findIndex(t => t.id === id) ?? -1
      if (index !== -1 && section.texts) {
        capturedTexts.push({ sectionId: section.id, text: JSON.parse(JSON.stringify(section.texts[index])), index })
        break
      }
    }
  })

  selection.areaIds?.forEach(id => {
    for (const section of store.venue.sections) {
      const index = section.areas?.findIndex(a => a.id === id) ?? -1
      if (index !== -1 && section.areas) {
        capturedAreas.push({ sectionId: section.id, area: JSON.parse(JSON.stringify(section.areas[index])), index })
        break
      }
    }
  })

  return {
    name: 'deleteSelectedObjects',
    execute: () => {
      store.deleteSelectedObjects(selection)
    },
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
