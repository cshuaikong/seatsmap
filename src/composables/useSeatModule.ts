import { ref } from 'vue'
import { Group, Line, Ellipse, Text, PointerEvent, DragEvent } from 'leafer-ui'
import { useSeatDraw, SEAT_CONFIG } from './useSeatDraw'
import type { SeatDrawRowData } from './useSeatDraw'
import type { ToolHandler } from './useEditorMode'
import { calculateCurvedPositions } from '../viewer/geometry'
import { getCategoryColor, darkenColor } from '../utils/color'
import { useVenueStore } from '../stores/venueStore'

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

  // 座位排拖拽/旋转状态（Alt+拖拽=旋转，普通拖拽=移动）
  let seatDragState: {
    group: any
    startX: number; startY: number
    startGroupX: number; startGroupY: number
    startRotation: number
    isRotate: boolean
    hasMoved: boolean
  } | null = null
  const DRAG_THRESHOLD = 3

  // 全局 MOVE/UP 监听（拖拽时更新位置 + editBox）
  const leafer = ctx.getLeafer()
  if (leafer) {
    leafer.on(PointerEvent.MOVE, (e: any) => {
      if (!seatDragState) return
      const s = seatDragState
      const dx = e.x - s.startX
      const dy = e.y - s.startY

      if (!s.hasMoved && Math.abs(dx) < DRAG_THRESHOLD && Math.abs(dy) < DRAG_THRESHOLD) return
      s.hasMoved = true

      if (s.isRotate) {
        const lb = s.group.getBounds?.('local') || { x: 0, y: 0, width: 100, height: 20 }
        const cx = s.startGroupX + (lb.x || 0) + (lb.width || 0) / 2
        const cy = s.startGroupY + (lb.y || 0) + (lb.height || 0) / 2
        const sa = Math.atan2(s.startY - cy, s.startX - cx)
        const ca = Math.atan2(e.y - cy, e.x - cx)
        s.group.rotation = s.startRotation + (ca - sa) * 180 / Math.PI
      } else {
        s.group.x = s.startGroupX + dx
        s.group.y = s.startGroupY + dy
      }

      const editBox = (ctx.getEditor() as any)?.editBox
      if (editBox) editBox.update()
    })

    leafer.on(PointerEvent.UP, () => {
      if (!seatDragState) return
      // TODO: 移动/旋转结束后保存到 store
      seatDragState = null
    })
  }

  // ---- 创建座位元素 ----

  function createSeatElements(rows: SeatDrawRowData[], targetGroup?: any, sectionId?: string | null): void {
    const bs = seatDraw.getBaseScale()
    const radius = SEAT_CONFIG.radius / Math.max(bs, 0.02)
    const size = radius * 2
    const sw = 1 / Math.max(bs, 0.02)
    let totalSeats = 0

    rows.forEach(row => {
      const group = new Group({
        editable: true,
        hittable: true,
        draggable: true,
        hitChildren: false,
      })
      ;(group as any).__seatRow = true
      if (sectionId) (group as any).__sectionId = sectionId
      // 单击选中 / Alt+拖拽旋转 / 普通拖拽移动
      group.on(PointerEvent.BEFORE_DOWN, (e: any) => {
        const ed = ctx.getEditor()
        if (ed && ctx.getFocusedSectionId?.()) {
          if (ed.hasItem(group)) {
            // 已选中 → 启动拖拽/旋转
            seatDragState = {
              group,
              startX: e.x, startY: e.y,
              startGroupX: group.x || 0, startGroupY: group.y || 0,
              startRotation: group.rotation || 0,
              isRotate: !!e.altKey,
              hasMoved: false,
            }
            return
          }
          if (e.shiftKey) {
            ed.hasItem(group) ? ed.removeItem(group) : ed.addItem(group)
          } else {
            ed.target = group
          }
          e.stop()
        }
      })

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
        // 座位标签文本（正中间）
        const st = new Text({
          text: '',
          x: cx, y: cy,
          fontSize: radius,
          fill: '#1F2937',
          textAlign: 'center',
          verticalAlign: 'middle',
          around: 'center',
          editable: false,
          hittable: false,
        })
        ;(st as any).__seatLabelText = true
        group.add(ell)
        group.add(st)
        ;(ell as any).__labelText = st
        ellipses.push(ell)
      }

      ;(group as any).__seatRadius = radius
      ;(group as any).__seatEllipses = ellipses
      ;(group as any).__bar = bar
      ;(group as any).__seatRowData = { ...row }
      ;(group as any).__seatSpacing = row.spacing

      addRowLabelText(group)

      const addTarget = targetGroup || ctx.getLeafer()!
      addTarget.add(group)
      seatRowGroups.push(group)
      totalSeats += row.count
    })
    drawnSeatCount.value = totalSeats
    updateSeatLOD()
  }

  function clearSeatElements(): void {
    seatDragState = null
    seatRowGroups.forEach(g => { try { g.remove() } catch (_) {} })
    seatRowGroups.length = 0
    drawnSeatCount.value = 0
    seatDraw.resetBaseScale()
  }

  /** 为排 Group 添加标签文本（排起点前移一个座位间距） */
  function addRowLabelText(group: any): void {
    const ellipses = (group.__seatEllipses || []) as any[]
    if (ellipses.length <= 1) return
    const bar = group.__bar as any
    const pts: number[] = bar?.points ?? []
    if (pts.length < 4) return
    const fx = pts[0], fy = pts[1], lx = pts[2], ly = pts[3]
    const dx = lx - fx
    const dy = ly - fy
    const len = Math.hypot(dx, dy) || 1
    const ux = dx / len
    const uy = dy / len
    const angle = Math.atan2(dy, dx) * 180 / Math.PI
    const spacing = group.__seatSpacing ?? (group.__seatRowData?.spacing ?? 18)
    const bs = seatDraw.getBaseScale()
    const seatR = SEAT_CONFIG.radius / Math.max(bs, 0.02)
    const labelText = new Text({
      text: group.__rowLabel || '',
      x: fx - ux * spacing * 0.8,
      y: fy - uy * spacing * 0.8,
      rotation: angle,
      fontSize: seatR * 1.3,
      fill: '#6B7280',
      textAlign: 'center',
      verticalAlign: 'middle',
      around: 'center',
      editable: false,
      hittable: false,
    })
    ;(labelText as any).__rowLabelText = true
    group.add(labelText)
    ;(group as any).__labelText = labelText
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
    // 同步 baseScale 到 store，确保预览端的座位比例与编辑器一致
    try {
      const store = useVenueStore()
      if (store.venue.baseScale !== bs) {
        store.setSectionBaseScale(bs)
      }
    } catch (_) {}
    const radius = SEAT_CONFIG.radius / Math.max(bs, 0.02)
    const size = radius * 2
    const lineWidth = size
    const sw = 1 / Math.max(bs, 0.02)
    let totalSeats = 0

    for (const section of sections) {
      if (!section.rows || section.rows.length === 0) continue

      for (const row of section.rows) {
        if (!row.seats || row.seats.length === 0) continue

        const rowX = (row.x ?? 0) 
        const rowY = (row.y ?? 0) 
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
          draggable: false,
          hitChildren: false,
        })
        ;(group as any).__seatRow = true
        ;(group as any).__isVenueDataSeat = true
        ;(group as any).__sectionId = section.id
        group.on(PointerEvent.BEFORE_DOWN, (e: any) => {
          const ed = ctx.getEditor()
          if (ed && ctx.getFocusedSectionId?.()) {
            if (ed.hasItem(group)) {
              seatDragState = {
                group,
                startX: e.x, startY: e.y,
                startGroupX: group.x || 0, startGroupY: group.y || 0,
                startRotation: group.rotation || 0,
                isRotate: !!e.altKey,
                hasMoved: false,
              }
              return
            }
            if (e.shiftKey) {
              ed.hasItem(group) ? ed.removeItem(group) : ed.addItem(group)
            } else {
              ed.target = group
            }
            e.stop()
          }
        })
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

        const barPts: number[] = []
        for (const wp of worldPositions) { barPts.push(wp.x, wp.y) }
        const bar = new Line({
          points: barPts,
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

        // 自动检测：row 比 section 更靠近原点 → 已是局部坐标，无需再转
        const dataIsLocal = parentGroup
          && (sx === 0 || Math.abs(firstSX) < Math.abs(firstSX - sx))
          && (sy === 0 || Math.abs(firstSY) < Math.abs(firstSY - sy))
        const needConvert = parentGroup && (sx !== 0 || sy !== 0) && !dataIsLocal

        // 局部坐标（默认用世界坐标，needConvert 时做旋转感知转换）
        let localFirstX = firstSX, localFirstY = firstSY
        let localLastX = lastSX, localLastY = lastSY

        console.log(`[import] sec=${section.id} row=${row.id} data: rowXY=(${rowX},${rowY}) rot=${row.rotation??0}deg curve=${curve} seats=${row.seats.length}`)
        console.log(`[import] secGroup=(${sx},${sy}) rot=${parentGroup?.rotation??0}deg firstWorld=(${firstSX},${firstSY}) dataIsLocal=${dataIsLocal} needConvert=${needConvert}`)

        if (needConvert) {
          // 世界→局部：考虑父 Group 的平移+旋转（之前只做了减法，旋转时手柄偏移）
          const pgRot = (parentGroup.rotation ?? 0) * Math.PI / 180
          const cosR = Math.cos(-pgRot), sinR = Math.sin(-pgRot)
          const w2l = (wx: number, wy: number) => ({
            x: +((wx - sx) * cosR - (wy - sy) * sinR).toFixed(2),
            y: +((wx - sx) * sinR + (wy - sy) * cosR).toFixed(2),
          })
          const lf = w2l(firstSX, firstSY)
          const ll = w2l(lastSX, lastSY)
          localFirstX = lf.x; localFirstY = lf.y
          localLastX = ll.x; localLastY = ll.y

          const barLocalPts: number[] = []
          for (let i = 0; i < worldPositions.length; i++) {
            const lp = w2l(worldPositions[i].x, worldPositions[i].y)
            barLocalPts.push(lp.x, lp.y)
          }
          bar.points = barLocalPts
          for (let i = 0; i < ellipses.length; i++) {
            const lp = w2l(worldPositions[i].x, worldPositions[i].y)
            ellipses[i].x = lp.x
            ellipses[i].y = lp.y
          }
        }

        // 座位标签文本（正中间）
        for (let i = 0; i < ellipses.length; i++) {
          const ell = ellipses[i]
          const seat = sortedSeats[i]
          const st = new Text({
            text: seat.label || '',
            x: ell.x, y: ell.y,
            fontSize: radius,
            fill: '#1F2937',
            textAlign: 'center',
            verticalAlign: 'middle',
            around: 'center',
            editable: false,
            hittable: false,
          })
          ;(st as any).__seatLabelText = true
          group.add(st)
          ;(ell as any).__labelText = st
        }

        const ldx = localLastX - localFirstX
        const ldy = localLastY - localFirstY
        const ldist = Math.hypot(ldx, ldy)

        console.log(`[import] row=${row.id} final: localFirst=(${localFirstX},${localFirstY}) localLast=(${localLastX},${localLastY}) ldist=${ldist.toFixed(1)} ux=${(ldist>0.001?ldx/ldist:1).toFixed(4)} uy=${(ldist>0.001?ldy/ldist:0).toFixed(4)} count=${sortedSeats.length}`)

        ;(group as any).__seatRowData = {
          x: localFirstX,
          y: localFirstY,
          ux: ldist > 0.001 ? ldx / ldist : 1,
          uy: ldist > 0.001 ? ldy / ldist : 0,
          count: sortedSeats.length,
          spacing: sortedSeats.length > 1
            ? ldist / (sortedSeats.length - 1)
            : SEAT_CONFIG.spacing / Math.max(bs, 0.02),
        } as SeatDrawRowData

        // __seatSpacing 取 rowData.spacing 保证与 rebuildSeatRow 的 compare 一致
        ;(group as any).__seatSpacing = (group as any).__seatRowData.spacing

        // __rowOriginX/Y 保留世界坐标（导出时直接使用），不转局部

        addRowLabelText(group)

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

    if (ellipses) {
      const groupCurve = (group as any).__curve ?? 0
      const isCurved = Math.abs(groupCurve) > 0.001

      if (isCurved) {
        // === 弧线排 ===
        const anchorX = anchorFromEnd && endCenter ? endCenter.x : x
        const anchorY = anchorFromEnd && endCenter ? endCenter.y : y
        const dir = anchorFromEnd ? -1 : 1

        const positions: Array<{ x: number; y: number }> = []
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

        // bar 也跟随弧线
        if (bar) {
          const barPts: number[] = []
          for (const p of positions) { barPts.push(p.x, p.y) }
          bar.points = barPts
          bar.strokeWidth = size
        }

        for (let i = 0; i < count; i++) {
          if (ellipses[i]) {
            ellipses[i].x = positions[i].x
            ellipses[i].y = positions[i].y
            ellipses[i].width = size
            ellipses[i].height = size
          }
        }
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
      } else {
        // === 直线排 ===
        const effEndX = endCenter ? endCenter.x : x + ux * spacing * (count - 1)
        const effEndY = endCenter ? endCenter.y : y + uy * spacing * (count - 1)
        const anchorX = anchorFromEnd ? effEndX : x
        const anchorY = anchorFromEnd ? effEndY : y
        const dir = anchorFromEnd ? -1 : 1

        const positions: Array<{ x: number; y: number }> = []
        for (let i = 0; i < count; i++) {
          positions.push({
            x: +(anchorX + ux * dir * spacing * i).toFixed(2),
            y: +(anchorY + uy * dir * spacing * i).toFixed(2),
          })
        }

        if (bar) {
          bar.points = [x, y, effEndX, effEndY]
          bar.strokeWidth = size
        }

        const prevFromEnd = (group as any).__anchorFromEnd
        if (anchorFromEnd !== prevFromEnd && prevFromEnd !== undefined) {
          ellipses.reverse()
        }
        ;(group as any).__anchorFromEnd = anchorFromEnd

        for (let i = 0; i < count; i++) {
          if (ellipses[i]) {
            ellipses[i].x = positions[i].x
            ellipses[i].y = positions[i].y
            ellipses[i].width = size
            ellipses[i].height = size
          }
        }
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
    }

    ;(group as any).__seatRowData = { ...newData }
    ;(group as any).__seatRadius = radius

    // 更新排标签文本位置/旋转
    const labelText = (group as any).__labelText
    if (ellipses && ellipses.length > 1) {
      if (labelText) {
        const barPts = bar?.points ?? []
        if (barPts.length >= 4) {
          const fx2 = barPts[0], fy2 = barPts[1], lx2 = barPts[2], ly2 = barPts[3]
          const dx2 = lx2 - fx2, dy2 = ly2 - fy2
          const len2 = Math.hypot(dx2, dy2) || 1
          const ux2 = dx2 / len2, uy2 = dy2 / len2
          const sp = (group as any).__seatSpacing ?? ((group as any).__seatRowData?.spacing ?? 18)
          labelText.x = fx2 - ux2 * sp * 0.8
          labelText.y = fy2 - uy2 * sp * 0.8
          labelText.rotation = Math.atan2(dy2, dx2) * 180 / Math.PI
        }
      } else {
        addRowLabelText(group)
      }
    } else if (labelText) {
      labelText.visible = false
    }

    updateSeatLOD()
  }

  // ---- LOD 切换 ----

  function updateSeatLOD(): void {
    const s = ctx.getS()
    const threshold = SEAT_CONFIG.radius // 座位圆在 currentScale >= baseScale 时显示
    const selectedSet = new Set((ctx.getEditor() as any)?.list ?? [])
    for (const g of seatRowGroups) {
      const r = (g as any).__seatRadius as number | undefined
      const bar = (g as any).__bar as any
      const ellipses = (g as any).__seatEllipses as any[] | undefined
      if (r == null || !bar) continue
      const sel = selectedSet.has(g)
      const detail = r * s > threshold
      if (ellipses && ellipses.length > 0) {
        for (const e of ellipses) {
          e.visible = detail
          const st = (e as any).__labelText
          if (st) {
            const hasSeatLabel = String((e as any).__sourceSeat?.label || '').length > 0
            st.visible = detail && hasSeatLabel
            if (detail) st.fontSize = r
          }
        }
        bar.visible = false
      } else {
        bar.visible = false
      }
      const labelText = (g as any).__labelText
      if (labelText) {
        const hasLabel = String(g.__rowLabel || '').length > 0
        labelText.visible = hasLabel && ellipses && ellipses.length > 1
        if (detail) labelText.fontSize = r * 1.3
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
        // 绘图工具产生世界坐标，需转 Group 局部坐标（含旋转）
        const sx = targetGroup.x ?? 0
        const sy = targetGroup.y ?? 0
        const pgRot = (targetGroup.rotation ?? 0) * Math.PI / 180
        const cosR = Math.cos(-pgRot)
        const sinR = Math.sin(-pgRot)
        const adjusted = data.rows.map(row => ({
          ...row,
          x: +((row.x - sx) * cosR - (row.y - sy) * sinR).toFixed(2),
          y: +((row.x - sx) * sinR + (row.y - sy) * cosR).toFixed(2),
          ux: +(row.ux * cosR - row.uy * sinR).toFixed(4),
          uy: +(row.ux * sinR + row.uy * cosR).toFixed(4),
        }))
        createSeatElements(adjusted, targetGroup, focusedId)
      } else {
        createSeatElements(data.rows, undefined, undefined)
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
