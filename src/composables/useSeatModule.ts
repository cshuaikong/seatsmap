import { ref } from 'vue'
import { Group, Line, Ellipse } from 'leafer-ui'
import { useSeatDraw, SEAT_CONFIG } from './useSeatDraw'
import type { SeatDrawRowData } from './useSeatDraw'
import type { ToolHandler } from './useEditorMode'
import { calculateCurvedPositions } from '../viewer/geometry'
import { getCategoryColor, darkenColor } from '../utils/color'

export interface SeatModuleCtx {
  getLeafer: () => any
  getEditor: () => any
  getCanvas: () => HTMLCanvasElement | null
  getS: () => number
  setPanEnabled: (v: boolean) => void
  getAllNonSeatPaths: () => any[]
  onToolChange: (tool: string) => void
}

export function useSeatModule(ctx: SeatModuleCtx) {
  const seatRowGroups: any[] = []
  const drawnSeatCount = ref(0)

  // ---- 创建座位元素 ----

  function createSeatElements(rows: SeatDrawRowData[]): void {
    const bs = seatDraw.getBaseScale()
    const radius = SEAT_CONFIG.radius / Math.max(bs, 0.02)
    const size = radius * 2
    const sw = 1 / Math.max(bs, 0.02)
    let totalSeats = 0

    rows.forEach(row => {
      const group = new Group({
        editable: true,
        hittable: true,
      })
      ;(group as any).__seatRow = true

      const lastIdx = row.count - 1
      const bar = new Line({
        points: [
          row.x, row.y,
          row.x + row.ux * row.spacing * lastIdx,
          row.y + row.uy * row.spacing * lastIdx,
        ],
        stroke: '#81C784',
        strokeWidth: size,
        strokeCap: 'round',
        opacity: 0.25,
        hittable: true,
        draggable: false,
      })
      group.add(bar)

      const ellipses: any[] = []
      for (let i = 0; i < row.count; i++) {
        const cx = +(row.x + row.ux * row.spacing * i).toFixed(2)
        const cy = +(row.y + row.uy * row.spacing * i).toFixed(2)
        const ell = new Ellipse({
          x: cx, y: cy,
          width: size, height: size,
          fill: '#A5D6A7',
          stroke: '#81C784',
          strokeWidth: sw,
          around: 'center',
          hittable: true,
          draggable: false,
        })
        group.add(ell)
        ellipses.push(ell)
      }

      ;(group as any).__seatRadius = radius
      ;(group as any).__seatEllipses = ellipses
      ;(group as any).__bar = bar
      ;(group as any).__seatRowData = { ...row }

      ctx.getLeafer()!.add(group)
      seatRowGroups.push(group)
      totalSeats += row.count
    })
    drawnSeatCount.value = totalSeats
    updateSeatLOD()
  }

  function clearSeatElements(): void {
    seatRowGroups.forEach(g => { try { g.remove() } catch (_) {} })
    seatRowGroups.length = 0
    drawnSeatCount.value = 0
    seatDraw.resetBaseScale()
  }

  /** 从 venue data 的 sections[].rows[].seats[] 渲染座位排
   *  将 rotation/curve 烘焙到 seat.x/y，然后按独立 Ellipse 绘制
   */
  function createSeatsFromVenueData(sections: any[], venueBaseScale?: number | null, categories?: any[]): void {
    if (venueBaseScale != null) {
      seatDraw.setBaseScale(venueBaseScale)
    } else {
      seatDraw.lockBaseScale()
    }
    const bs = seatDraw.getBaseScale()
    const radius = SEAT_CONFIG.radius / Math.max(bs, 0.02)
    const size = radius * 2
    const lineWidth = size
    const sw = 1 / Math.max(bs, 0.02)
    let totalSeats = 0

    for (const section of sections) {
      if (!section.rows || section.rows.length === 0) continue

      for (const row of section.rows) {
        if (!row.seats || row.seats.length === 0) continue

        const rowX = row.x ?? 0
        const rowY = row.y ?? 0
        const rot = (row.rotation ?? 0) * Math.PI / 180
        const cos = Math.cos(rot)
        const sin = Math.sin(rot)
        const curve = row.curve ?? 0

        // ---- 烘焙：curve + rotation → seat.x/y，第一个座位固定在 (0,0) ----
        const curved = calculateCurvedPositions(row.seats, curve)
        const worldPositions: { x: number; y: number }[] = []
        for (let i = 0; i < row.seats.length; i++) {
          const pos = curved[i]
          worldPositions.push({
            x: pos.x * cos - pos.y * sin,
            y: pos.x * sin + pos.y * cos,
          })
        }

        // 第一个座位的世界位置作为新的排原点
        const firstWX = worldPositions[0].x
        const firstWY = worldPositions[0].y
        row.x = +(rowX + firstWX).toFixed(2)
        row.y = +(rowY + firstWY).toFixed(2)

        // 所有座位相对于第一个座位
        for (let i = 0; i < row.seats.length; i++) {
          row.seats[i].x = +(worldPositions[i].x - firstWX).toFixed(2)
          row.seats[i].y = +(worldPositions[i].y - firstWY).toFixed(2)
        }
        row.rotation = 0
        row.curve = 0

        // ---- 渲染 ----
        const newRowX = row.x!
        const newRowY = row.y!
        let firstSX = 0, firstSY = 0, lastSX = 0, lastSY = 0

        const group = new Group({
          editable: false,
          hittable: false,
        })
        ;(group as any).__seatRow = true
        ;(group as any).__isVenueDataSeat = true
        ;(group as any).__sectionId = section.id

        const ellipses: any[] = []
        for (let i = 0; i < row.seats.length; i++) {
          const seat = row.seats[i]
          const sx = +(newRowX + seat.x).toFixed(2)
          const sy = +(newRowY + seat.y).toFixed(2)

          if (i === 0) { firstSX = sx; firstSY = sy }
          if (i === row.seats.length - 1) { lastSX = sx; lastSY = sy }

          const color = categories
            ? getCategoryColor(seat.categoryKey, categories)
            : '#A5D6A7'

          const ell = new Ellipse({
            x: sx, y: sy,
            width: size, height: size,
            fill: color,
            stroke: darkenColor(color, 30),
            strokeWidth: sw,
            around: 'center',
            hittable: true,
            draggable: false,
            visible: false,
          })
          ;(ell as any).__seatId = seat.id
          ;(ell as any).__categoryKey = seat.categoryKey
          group.add(ell)
          ellipses.push(ell)
        }

        const bar = new Line({
          points: [firstSX, firstSY, lastSX, lastSY],
          stroke: '#81C784',
          strokeWidth: lineWidth,
          strokeCap: 'round',
          opacity: 0.25,
          hittable: false,
          draggable: false,
        })
        group.add(bar)

        ;(group as any).__seatRadius = radius
        ;(group as any).__seatEllipses = ellipses
        ;(group as any).__bar = bar
        ;(group as any).__seatRowData = {
          x: firstSX, y: firstSY,
          ux: lastSX !== firstSX || lastSY !== firstSY
            ? (lastSX - firstSX) / Math.hypot(lastSX - firstSX, lastSY - firstSY)
            : 1,
          uy: lastSX !== firstSX || lastSY !== firstSY
            ? (lastSY - firstSY) / Math.hypot(lastSX - firstSX, lastSY - firstSY)
            : 0,
          count: row.seats.length,
          spacing: row.seats.length > 1
            ? Math.hypot(lastSX - firstSX, lastSY - firstSY) / (row.seats.length - 1)
            : SEAT_CONFIG.spacing / Math.max(bs, 0.02),
        } as SeatDrawRowData

        ctx.getLeafer()!.add(group)
        seatRowGroups.push(group)
        totalSeats += row.seats.length
      }
    }
    drawnSeatCount.value = totalSeats
    updateSeatLOD()
  }

  function rebuildSeatRow(group: any, newData: SeatDrawRowData, endCenter?: { x: number; y: number }, anchorFromEnd?: boolean): void {
    const bar = (group as any).__bar
    const ellipses = (group as any).__seatEllipses as any[] | undefined

    const bs = seatDraw.getBaseScale()
    const radius = SEAT_CONFIG.radius / Math.max(bs, 0.02)
    const size = radius * 2
    const sw = 1 / Math.max(bs, 0.02)
    const { x, y, ux, uy, count, spacing } = newData

    const barEndX = endCenter ? endCenter.x : x + ux * spacing * (count - 1)
    const barEndY = endCenter ? endCenter.y : y + uy * spacing * (count - 1)

    if (bar) {
      bar.points = [x, y, barEndX, barEndY]
      bar.strokeWidth = size
    }

    if (ellipses) {
      const anchorX = anchorFromEnd && endCenter ? endCenter.x : x
      const anchorY = anchorFromEnd && endCenter ? endCenter.y : y
      const dir = anchorFromEnd ? -1 : 1

      for (let i = 0; i < count; i++) {
        const cx = +(anchorX + ux * dir * spacing * i).toFixed(2)
        const cy = +(anchorY + uy * dir * spacing * i).toFixed(2)
        if (ellipses[i]) {
          ellipses[i].x = cx
          ellipses[i].y = cy
          ellipses[i].width = size
          ellipses[i].height = size
        }
      }
      // 增减 Ellipse
      while (ellipses.length > count) {
        const e = ellipses.pop()
        try { e?.remove() } catch (_) {}
      }
      while (ellipses.length < count) {
        const i = ellipses.length
        const cx = +(anchorX + ux * dir * spacing * i).toFixed(2)
        const cy = +(anchorY + uy * dir * spacing * i).toFixed(2)
        const ell = new Ellipse({
          x: cx, y: cy,
          width: size, height: size,
          fill: '#A5D6A7', stroke: '#81C784',
          strokeWidth: sw, around: 'center',
          hittable: true, draggable: false,
        })
        group.add(ell)
        ellipses.push(ell)
      }
    }

    ;(group as any).__seatRowData = { ...newData }
    ;(group as any).__seatRadius = radius

    updateSeatLOD()
  }

  // ---- LOD 切换 ----

  function updateSeatLOD(): void {
    const s = ctx.getS()
    const threshold = 3
    const selectedSet = new Set((ctx.getEditor() as any)?.list ?? [])
    for (const g of seatRowGroups) {
      const r = (g as any).__seatRadius as number | undefined
      const bar = (g as any).__bar as any
      const ellipses = (g as any).__seatEllipses as any[] | undefined
      if (r == null || !bar) continue
      const sel = selectedSet.has(g)
      const detail = r * s > threshold
      if (ellipses && ellipses.length > 0) {
        for (const e of ellipses) e.visible = detail
        bar.visible = !detail || sel
      } else {
        bar.visible = true
      }
      bar.stroke = sel ? '#3b82f6' : '#81C784'
      bar.opacity = sel ? 0.6 : 0.25
    }
  }

  // ---- 座位绘制工具 ----

  const seatDraw = useSeatDraw({
    getLeafer: ctx.getLeafer,
    getEditor: ctx.getEditor,
    getCanvas: ctx.getCanvas,
    getAllPaths: () => [...ctx.getAllNonSeatPaths(), ...seatRowGroups],
    getS: ctx.getS,
    setPanEnabled: ctx.setPanEnabled,
    onFinish: (data) => createSeatElements(data.rows),
    onToolChange: ctx.onToolChange,
  })

  // ---- 模式 handlers ----

  const modeHandlers: Record<string, ToolHandler> = {
    'seat-row': {
      enter: () => seatDraw.seatRow.enter(),
      exit: () => seatDraw.seatRow.exit(),
      onClick: (x, y) => { seatDraw.seatRow.onClick(x, y); return true },
      onMove: (x, y) => seatDraw.seatRow.onMove(x, y),
      isActive: () => seatDraw.seatRow.isActive(),
    },
    'seat-section': {
      enter: () => seatDraw.seatSection.enter(),
      exit: () => seatDraw.seatSection.exit(),
      onClick: (x, y) => { seatDraw.seatSection.onClick(x, y); return true },
      onMove: (x, y) => seatDraw.seatSection.onMove(x, y),
      isActive: () => seatDraw.seatSection.isActive(),
    },
    'seat-diagonal': {
      enter: () => seatDraw.seatDiagonal.enter(),
      exit: () => seatDraw.seatDiagonal.exit(),
      onClick: (x, y) => { seatDraw.seatDiagonal.onClick(x, y); return true },
      onMove: (x, y) => seatDraw.seatDiagonal.onMove(x, y),
      isActive: () => seatDraw.seatDiagonal.isActive(),
    },
  }

  return {
    seatRowGroups,
    drawnSeatCount,
    createSeatElements,
    createSeatsFromVenueData,
    clearSeatElements,
    rebuildSeatRow,
    updateSeatLOD,
    modeHandlers,
  }
}
