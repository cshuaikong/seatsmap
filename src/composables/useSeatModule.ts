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
  getSectionGroupMap: () => Map<string, any>
  getFocusedSectionId?: () => string | null
  onToolChange: (tool: string) => void
}

export function useSeatModule(ctx: SeatModuleCtx) {
  const seatRowGroups: any[] = []
  const drawnSeatCount = ref(0)

  // ---- 创建座位元素 ----

  function createSeatElements(rows: SeatDrawRowData[], targetGroup?: any): void {
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

      const addTarget = targetGroup || ctx.getLeafer()!
      addTarget.add(group)
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
   *  动态计算 rotation/curve 的世界位置，不修改原始数据，按独立 Ellipse 绘制
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

        // 排序副本用于计算弦端点，不修改原始 seats
        const sortedSeats = [...row.seats].sort((a: any, b: any) => {
          const ax = typeof a.x === 'string' ? parseFloat(a.x) : (a.x || 0)
          const bx = typeof b.x === 'string' ? parseFloat(b.x) : (b.x || 0)
          return ax - bx
        })

        // 动态计算弧线世界位置（不烘焙到 seat.x/y，保留原始 curve/rotation）
        const curved = calculateCurvedPositions(sortedSeats, curve)
        const worldPositions: { x: number; y: number }[] = []
        for (let i = 0; i < sortedSeats.length; i++) {
          const pos = curved[i]
          worldPositions.push({
            x: +(rowX + pos.x * cos - pos.y * sin).toFixed(2),
            y: +(rowY + pos.x * sin + pos.y * cos).toFixed(2),
          })
        }

        const firstW = worldPositions[0]
        const lastW = worldPositions[worldPositions.length - 1]
        const firstSX = firstW.x, firstSY = firstW.y
        const lastSX = lastW.x, lastSY = lastW.y

        // ---- 渲染 ----
        const group = new Group({
          editable: false,
          hittable: false,
        })
        ;(group as any).__seatRow = true
        ;(group as any).__isVenueDataSeat = true
        ;(group as any).__sectionId = section.id
        ;(group as any).__rowId = row.id
        ;(group as any).__rowLabel = row.label || ''
        // 保留弧度和旋转参数，供编辑/导出使用
        ;(group as any).__curve = curve
        ;(group as any).__rotation = row.rotation ?? 0
        ;(group as any).__rowOriginX = rowX
        ;(group as any).__rowOriginY = rowY
        ;(group as any).__rawSeats = sortedSeats

        const ellipses: any[] = []
        for (let i = 0; i < sortedSeats.length; i++) {
          const seat = sortedSeats[i]
          const sx = worldPositions[i].x
          const sy = worldPositions[i].y

          const ck = seat.cat_id ?? seat.categoryKey
          const color = categories
            ? getCategoryColor(ck, categories)
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
          ;(ell as any).__categoryKey = ck
          ;(ell as any).__sourceSeat = seat
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

        // 确定归属 SectionGroup 并转局部坐标
        const parentGroup = ctx.getSectionGroupMap().get(section.id)
        const sx = section.x ?? 0
        const sy = section.y ?? 0

        if (parentGroup && (sx !== 0 || sy !== 0)) {
          // 将世界坐标转为相对 Group 的局部坐标
          bar.points = [firstSX - sx, firstSY - sy, lastSX - sx, lastSY - sy]
          for (const ell of ellipses) { ell.x -= sx; ell.y -= sy }
        }

        ;(group as any).__seatRowData = {
          x: (parentGroup ? firstSX - sx : firstSX),
          y: (parentGroup ? firstSY - sy : firstSY),
          ux: lastSX !== firstSX || lastSY !== firstSY
            ? (lastSX - firstSX) / Math.hypot(lastSX - firstSX, lastSY - firstSY)
            : 1,
          uy: lastSX !== firstSX || lastSY !== firstSY
            ? (lastSY - firstSY) / Math.hypot(lastSX - firstSX, lastSY - firstSY)
            : 0,
          count: sortedSeats.length,
          spacing: sortedSeats.length > 1
            ? Math.hypot(lastSX - firstSX, lastSY - firstSY) / (sortedSeats.length - 1)
            : SEAT_CONFIG.spacing / Math.max(bs, 0.02),
        } as SeatDrawRowData

        // 也转 __rowOriginX/Y
        if ((group as any).__rowOriginX != null && parentGroup) (group as any).__rowOriginX -= sx
        if ((group as any).__rowOriginY != null && parentGroup) (group as any).__rowOriginY -= sy

        const addTarget = parentGroup || ctx.getLeafer()!
        addTarget.add(group)
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
      const groupCurve = (group as any).__curve ?? 0

      // 动态计算每个座位沿弦/弧的位置（支持 rowData 和 itemX/itemY 两种模式）
      const positions: Array<{ x: number; y: number }> = []
      if (Math.abs(groupCurve) > 0.001) {
        // 弧线排：沿弦创建等间距虚拟座位点，映射到弧线
        const virtualSeats: Array<{ x: number; y: number }> = []
        for (let i = 0; i < count; i++) {
          virtualSeats.push({
            x: anchorX + ux * dir * spacing * i,
            y: anchorY + uy * dir * spacing * i,
          })
        }
        const curved = calculateCurvedPositions(virtualSeats as any[], groupCurve)
        for (let i = 0; i < count; i++) {
          positions.push({ x: +curved[i].x.toFixed(2), y: +curved[i].y.toFixed(2) })
        }
      } else {
        for (let i = 0; i < count; i++) {
          positions.push({
            x: +(anchorX + ux * dir * spacing * i).toFixed(2),
            y: +(anchorY + uy * dir * spacing * i).toFixed(2),
          })
        }
      }

      for (let i = 0; i < count; i++) {
        if (ellipses[i]) {
          ellipses[i].x = positions[i].x
          ellipses[i].y = positions[i].y
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
        const px = positions[i]?.x ?? +(anchorX + ux * dir * spacing * i).toFixed(2)
        const py = positions[i]?.y ?? +(anchorY + uy * dir * spacing * i).toFixed(2)
        const ell = new Ellipse({
          x: px, y: py,
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
    onFinish: (data) => {
      const focusedId = ctx.getFocusedSectionId?.()
      const targetGroup = focusedId ? ctx.getSectionGroupMap().get(focusedId) : undefined
      if (targetGroup) {
        // 绘图工具产生世界坐标，需转 Group 局部坐标
        const sx = targetGroup.x ?? 0
        const sy = targetGroup.y ?? 0
        const adjusted = data.rows.map(row => ({
          ...row,
          x: row.x - sx,
          y: row.y - sy,
        }))
        createSeatElements(adjusted, targetGroup)
      } else {
        createSeatElements(data.rows)
      }
    },
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
