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

  // ---- LOD 切换 ----

  function updateSeatLOD(): void {
    const s = ctx.getS()
    const threshold = 3
    const selectedSet = new Set((ctx.getEditor() as any)?.list ?? [])
    for (const g of seatRowGroups) {
      const r = (g as any).__seatRadius as number | undefined
      const circles = (g as any).__circles as any
      const bar = (g as any).__bar as any
      if (r == null || !circles || !bar) continue
      const sel = selectedSet.has(g)
      const detail = r * s > threshold
      circles.visible = detail
      bar.visible = !detail || sel
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
    clearSeatElements,
    updateSeatLOD,
    modeHandlers,
  }
}
