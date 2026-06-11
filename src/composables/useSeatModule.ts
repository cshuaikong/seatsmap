import { ref } from 'vue'
import { Group, Line, Path } from 'leafer-ui'
import { useSeatDraw, SEAT_CONFIG } from './useSeatDraw'
import type { SeatDrawRowData } from './useSeatDraw'
import type { ToolHandler } from './useEditorMode'

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
    const r = +radius.toFixed(2)
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

      let d = ''
      for (let i = 0; i < row.count; i++) {
        const cx = +(row.x + row.ux * row.spacing * i).toFixed(2)
        const cy = +(row.y + row.uy * row.spacing * i).toFixed(2)
        d += `M${cx - r},${cy} A${r},${r} 0 1,0 ${cx + r},${cy} A${r},${r} 0 1,0 ${cx - r},${cy} `
      }
      const circles = new Path({
        path: d,
        fill: '#A5D6A7',
        stroke: '#81C784',
        strokeWidth: sw,
        strokeAlign: 'inside',
        hittable: true,
        draggable: false,
      })
      group.add(circles)

      ;(group as any).__seatRadius = radius
      ;(group as any).__circles = circles
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

  /** 从 venue data 的 sections[].rows[].seats[] 渲染座位排 */
  function createSeatsFromVenueData(sections: any[], venueBaseScale?: number | null): void {
    // 优先使用数据中携带的 baseScale
    if (venueBaseScale != null) {
      seatDraw.setBaseScale(venueBaseScale)
    } else {
      seatDraw.lockBaseScale()
    }
    const bs = seatDraw.getBaseScale()
    const lineWidth = (SEAT_CONFIG.radius * 2) / Math.max(bs, 0.02)
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

        // 首个和最后一个座位世界坐标 + 生成所有圆圈 path
        let firstSX = 0, firstSY = 0, lastSX = 0, lastSY = 0
        let circlesD = ''
        const radius = SEAT_CONFIG.radius / Math.max(bs, 0.02)
        const r = +radius.toFixed(2)
        const sw = 1 / Math.max(bs, 0.02)

        for (let i = 0; i < row.seats.length; i++) {
          const seat = row.seats[i]
          const sx = rowX + seat.x * cos - seat.y * sin
          const sy = rowY + seat.x * sin + seat.y * cos
          if (i === 0) { firstSX = sx; firstSY = sy }
          if (i === row.seats.length - 1) { lastSX = sx; lastSY = sy }
          circlesD += `M${+(sx - r).toFixed(2)},${+sy.toFixed(2)} A${r},${r} 0 1,0 ${+(sx + r).toFixed(2)},${+sy.toFixed(2)} A${r},${r} 0 1,0 ${+(sx - r).toFixed(2)},${+sy.toFixed(2)} `
        }

        const group = new Group({
          editable: false,
          hittable: false,
        })
        ;(group as any).__seatRow = true
        ;(group as any).__isVenueDataSeat = true
        ;(group as any).__sectionId = section.id

        const circles = new Path({
          path: circlesD,
          fill: '#A5D6A7',
          stroke: '#81C784',
          strokeWidth: sw,
          strokeAlign: 'inside',
          hittable: true,
          draggable: false,
        })
        circles.visible = false  // 初始由 LOD bar 模式决定
        group.add(circles)

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
        ;(group as any).__circles = circles
        ;(group as any).__bar = bar
        ;(group as any).__seatRowData = {
          x: firstSX, y: firstSY,
          ux: cos, uy: sin,
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
    const circles = (group as any).__circles

    const bs = seatDraw.getBaseScale()
    const radius = SEAT_CONFIG.radius / Math.max(bs, 0.02)
    const size = radius * 2
    const r = +radius.toFixed(2)
    const sw = 1 / Math.max(bs, 0.02)
    const { x, y, ux, uy, count, spacing } = newData

    // bar 末端：优先使用连续坐标(endCenter)，避免离散 count 造成的跳动
    const barEndX = endCenter ? endCenter.x : x + ux * spacing * (count - 1)
    const barEndY = endCenter ? endCenter.y : y + uy * spacing * (count - 1)

    if (bar) {
      bar.points = [x, y, barEndX, barEndY]
      bar.strokeWidth = size
    }

    // circles：锚定方向决定从哪端对齐
    if (circles) {
      let d = ''
      if (anchorFromEnd && endCenter) {
        // 拖首端手柄 → 末端固定 → 圆从末端反向排列
        for (let i = count - 1; i >= 0; i--) {
          const cx = +(endCenter.x - ux * spacing * i).toFixed(2)
          const cy = +(endCenter.y - uy * spacing * i).toFixed(2)
          d += `M${cx - r},${cy} A${r},${r} 0 1,0 ${cx + r},${cy} A${r},${r} 0 1,0 ${cx - r},${cy} `
        }
      } else {
        // 拖尾端手柄或最终状态 → 首端固定 → 圆从首端正向排列
        for (let i = 0; i < count; i++) {
          const cx = +(x + ux * spacing * i).toFixed(2)
          const cy = +(y + uy * spacing * i).toFixed(2)
          d += `M${cx - r},${cy} A${r},${r} 0 1,0 ${cx + r},${cy} A${r},${r} 0 1,0 ${cx - r},${cy} `
        }
      }
      circles.path = d
      circles.strokeWidth = sw
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
      const circles = (g as any).__circles as any
      const bar = (g as any).__bar as any
      if (r == null || !bar) continue
      const sel = selectedSet.has(g)
      if (circles) {
        const detail = r * s > threshold
        circles.visible = detail
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
