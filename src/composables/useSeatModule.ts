import { ref } from 'vue'
import { Group, Line, Ellipse, Text, PointerEvent } from 'leafer-ui'
import type { LeaferElementMeta } from '../types/leafer-meta'
import { useSeatDraw, SEAT_CONFIG } from './useSeatDraw'
import { defaultSeatMapOptions } from '../types'

// 带业务元数据的 Leafer 元素类型
export type MetaGroup = Group & LeaferElementMeta
export type MetaEllipse = Ellipse & LeaferElementMeta
export type MetaText = Text & LeaferElementMeta
import { useVenueDataStore } from '../stores/venueDataStore'
import { useEditorStore } from '../stores/editorStore'
import { useHistoryStore } from '../stores/historyStore'
import type { SeatDrawRowData } from './useSeatDraw'
import type { ToolHandler } from './useEditorMode'
import { calculateCurvedPositions } from '../viewer/geometry'
import { getCategoryColor, darkenColor } from '../utils/color'
import { createAddRowsCommand, createAddSectionWithRowsCommand } from '../domain/venueCommands'
import { buildSeatRowsFromDrawData, buildSectionFromRows } from '../domain/rowGeometry'

export interface SeatModuleCtx {
  getLeafer: () => any
  getEditor: () => any
  getCanvas: () => HTMLCanvasElement | null
  getS: () => number
  setPanEnabled: (v: boolean) => void
  getAllNonSeatPaths: () => any[]
  getSectionGroupMap: () => Map<string, any>
  getFocusedSectionId?: () => string | null
  getCurrentTool?: () => string
  onToolChange: (tool: string) => void
}

export function useSeatModule(ctx: SeatModuleCtx) {
  const seatRowGroups: any[] = []
  const drawnSeatCount = ref(0)
  const venueDataStore = useVenueDataStore()
  const editorStore = useEditorStore()
  const historyStore = useHistoryStore()

  /** 判断事件路径中是否包含可见的单个座位圆 */
  function isEventOnVisibleSeat(e: any): boolean {
    const path = e.path?.list ?? e.path ?? []
    for (const leaf of path) {
      if (leaf?.__seatId && leaf.visible) return true
    }
    return false
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
      }) as MetaGroup
      ;group.__seatRow = true
      if (sectionId) group.__sectionId = sectionId
      // 单击选中（移动/旋转交给 Leafer Editor 的 editBox）
      group.on(PointerEvent.BEFORE_DOWN, (e: any) => {
        const ed = ctx.getEditor()
        if (!ed || !ctx.getFocusedSectionId?.()) return
        // 如果点击的是可见的单个座位圆，交给 selector 处理单座选择，不归一到排
        if (isEventOnVisibleSeat(e)) return
        if (ed.hasItem(group)) return
        if (e.shiftKey) {
          ed.hasItem(group) ? ed.removeItem(group) : ed.addItem(group)
        } else {
          ed.target = group
        }
        e.stop()
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
        }) as MetaEllipse
        ;ell.__originalStroke = '#81C784'
        ;ell.editConfig = { moveable: false, rotateable: false, resizeable: false }
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
        }) as MetaText
        ;st.__seatLabelText = true
        group.add(ell)
        group.add(st)
        ;ell.__labelText = st
        ellipses.push(ell)
      }

      ;group.__seatRadius = radius
      ;group.__seatEllipses = ellipses
      ;group.__bar = bar
      ;group.__seatRowData = { ...row }
      ;group.__seatSpacing = row.spacing

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
    const spacing = group.__seatSpacing ?? (group.__seatRowData?.spacing ?? defaultSeatMapOptions.seats.spacing)
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
    }) as MetaText
    ;labelText.__rowLabelText = true
    group.add(labelText)
    ;group.__labelText = labelText
  }

  /** 为排 Group 创建座位圆点和标签（延迟创建，用于分区编辑模式） */
  function buildSeatEllipsesForGroup(
    group: any,
    sortedSeats: any[],
    localPositions: { x: number; y: number }[],
    categories?: any[],
  ): void {
    if (group.__seatEllipses && group.__seatEllipses.length > 0) return

    const bs = seatDraw.getBaseScale()
    const radius = SEAT_CONFIG.radius / Math.max(bs, 0.02)
    const size = radius * 2
    const sw = 1 / Math.max(bs, 0.02)

    const ellipses: any[] = []
    for (let i = 0; i < sortedSeats.length; i++) {
      const seat = sortedSeats[i]
      const pos = localPositions[i]
      const ck = seat.cat_id
      const color = categories ? getCategoryColor(ck, categories) : '#A5D6A7'

      const ell = new Ellipse({
        x: pos.x, y: pos.y,
        width: size, height: size,
        fill: color,
        stroke: darkenColor(color, 30),
        strokeWidth: sw,
        around: 'center',
        hittable: true,
        draggable: false,
        visible: false,
      }) as MetaEllipse
      ;ell.__originalStroke = darkenColor(color, 30)
      ;ell.editConfig = { moveable: false, rotateable: false, resizeable: false }
      ;ell.__seatId = seat.id
      ;ell.__cat_id = ck
      ;ell.__sourceSeat = seat
      group.add(ell)
      ellipses.push(ell)
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
      }) as MetaText
      ;st.__seatLabelText = true
      group.add(st)
      ;ell.__labelText = st
    }

    ;group.__seatRadius = radius
    ;group.__seatEllipses = ellipses
  }

  /** 为指定分区下的所有排延迟创建座位圆点 */
  function ensureSeatEllipses(sectionId: string, categories?: any[]): void {
    for (const g of seatRowGroups) {
      if (g.__sectionId !== sectionId) continue
      if (g.__seatEllipses && g.__seatEllipses.length > 0) continue
      const rawSeats = g.__rawSeats as any[] | undefined
      const localPositions = g.__seatLocalPositions as { x: number; y: number }[] | undefined
      if (!rawSeats || !localPositions || rawSeats.length !== localPositions.length) continue
      buildSeatEllipsesForGroup(g, rawSeats, localPositions, categories)
    }
  }

  /** 销毁所有座位圆点和标签，回退到排线模式 */
  function clearSeatEllipses(): void {
    for (const g of seatRowGroups) {
      const ellipses = g.__seatEllipses as any[] | undefined
      if (!ellipses || ellipses.length === 0) continue
      for (const e of ellipses) {
        const st = e.__labelText
        try { st?.remove() } catch (_) {}
        try { e.remove() } catch (_) {}
      }
      g.__seatEllipses = []
    }
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
    // 初始化 baseScale 到 store（仅在未设置时），避免渲染过程中反复写 store 触发循环更新
    if ((venueDataStore.venue.baseScale == null || venueDataStore.venue.baseScale === undefined) && bs != null) {
      venueDataStore.setSectionBaseScale(bs)
    }
    const radius = SEAT_CONFIG.radius / Math.max(bs, 0.02)
    const size = radius * 2
    const lineWidth = size
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
          editable: true,
          hittable: true,
          draggable: true,
          hitChildren: false,
        }) as MetaGroup
        ;group.__seatRow = true
        ;group.__isVenueDataSeat = true
        ;group.__sectionId = section.id
        group.on(PointerEvent.BEFORE_DOWN, (e: any) => {
          const ed = ctx.getEditor()
          if (!ed || !ctx.getFocusedSectionId?.()) return
          // 如果点击的是可见的单个座位圆，交给 selector 处理单座选择，不归一到排
          if (isEventOnVisibleSeat(e)) return
          if (ed.hasItem(group)) return
          if (e.shiftKey) {
            ed.hasItem(group) ? ed.removeItem(group) : ed.addItem(group)
          } else {
            ed.target = group
          }
          e.stop()
        })
        ;group.__rowId = row.id
        ;group.__rowLabel = row.label || ''
        // 保留弧度和旋转参数，供编辑/导出使用
        ;group.__curve = curve
        ;group.__rotation = row.rotation ?? 0
        ;group.__rowOriginX = rowX
        ;group.__rowOriginY = rowY
        ;group.__rawSeats = sortedSeats

        const barPts: number[] = []
        for (const wp of worldPositions) { barPts.push(wp.x, wp.y) }
        const bar = new Line({
          points: barPts,
          stroke: '#81C784',
          strokeWidth: lineWidth,
          strokeCap: 'round',
          opacity: 0.25,
          hittable: true,
          draggable: false,
        })
        group.add(bar)

        ;group.__bar = bar

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

        let localPositions = worldPositions

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
          localPositions = []
          for (let i = 0; i < worldPositions.length; i++) {
            const lp = w2l(worldPositions[i].x, worldPositions[i].y)
            barLocalPts.push(lp.x, lp.y)
            localPositions.push(lp)
          }
          bar.points = barLocalPts
        }

        // 保存座位局部坐标，供后续进入分区编辑时延迟创建 Ellipse
        ;group.__seatLocalPositions = localPositions

        // 仅聚焦分区初始创建座位圆；其他分区按排线显示以提升性能
        const focusedSectionId = ctx.getFocusedSectionId?.()
        if (focusedSectionId && focusedSectionId === section.id) {
          buildSeatEllipsesForGroup(group, sortedSeats, localPositions, categories)
        } else {
          ;group.__seatRadius = radius
          ;group.__seatEllipses = []
        }

        const ldx = localLastX - localFirstX
        const ldy = localLastY - localFirstY
        const ldist = Math.hypot(ldx, ldy)


        ;group.__seatRowData = {
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
        ;group.__seatSpacing = group.__seatRowData.spacing

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
    const bar = group.__bar
    const ellipses = group.__seatEllipses as any[] | undefined

    const bs = seatDraw.getBaseScale()
    const radius = SEAT_CONFIG.radius / Math.max(bs, 0.02)
    const size = radius * 2
    const sw = 1 / Math.max(bs, 0.02)
    const { x, y, ux, uy, count, spacing } = newData

    if (ellipses) {
      const groupCurve = group.__curve ?? 0
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
          }) as MetaEllipse
          ;ell.__originalStroke = '#81C784'
          ;ell.editConfig = { moveable: false, rotateable: false, resizeable: false }
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

        const prevFromEnd = group.__anchorFromEnd
        if (anchorFromEnd !== prevFromEnd && prevFromEnd !== undefined) {
          ellipses.reverse()
        }
        ;group.__anchorFromEnd = anchorFromEnd

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
          }) as MetaEllipse
          ;ell.__originalStroke = '#81C784'
          ;ell.editConfig = { moveable: false, rotateable: false, resizeable: false }
          group.add(ell)
          ellipses.push(ell)
        }
      }
    }

    ;group.__seatRowData = { ...newData }
    ;group.__seatRadius = radius

    // 更新排标签文本位置/旋转
    const labelText = group.__labelText
    if (ellipses && ellipses.length > 1) {
      if (labelText) {
        const barPts = bar?.points ?? []
        if (barPts.length >= 4) {
          const fx2 = barPts[0], fy2 = barPts[1], lx2 = barPts[2], ly2 = barPts[3]
          const dx2 = lx2 - fx2, dy2 = ly2 - fy2
          const len2 = Math.hypot(dx2, dy2) || 1
          const ux2 = dx2 / len2, uy2 = dy2 / len2
          const sp = group.__seatSpacing ?? (group.__seatRowData?.spacing ?? defaultSeatMapOptions.seats.spacing)
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
    const selectedSeatSet = new Set(editorStore.selectedSeatIds)
    for (const g of seatRowGroups) {
      const r = g.__seatRadius as number | undefined
      const bar = g.__bar as any
      const ellipses = g.__seatEllipses as any[] | undefined
      if (r == null || !bar) continue
      const sel = selectedSet.has(g)
      const hasEllipses = ellipses && ellipses.length > 0
      const detail = hasEllipses && (r * s >= threshold)
      if (hasEllipses) {
        for (const e of ellipses) {
          e.visible = detail
          const seatSelected = selectedSeatSet.has(e.__seatId)
          e.stroke = seatSelected ? defaultSeatMapOptions.colors.selectionStroke : (e.__originalStroke ?? '#81C784')
          e.strokeWidth = seatSelected ? (1 / Math.max(seatDraw.getBaseScale(), 0.02)) * 2 : (1 / Math.max(seatDraw.getBaseScale(), 0.02))
          const st = e.__labelText
          if (st) {
            const hasSeatLabel = String(e.__sourceSeat?.label || '').length > 0
            st.visible = detail && hasSeatLabel
            if (detail) st.fontSize = r
          }
        }
      }
      // 座位条和座位圆互斥：没有座位圆时始终显示排线
      bar.visible = !detail
      const labelText = g.__labelText
      if (labelText) {
        const hasLabel = String(g.__rowLabel || '').length > 0
        // 只有座位圆出现时才显示排标签
        labelText.visible = detail && hasLabel && ellipses && ellipses.length > 1
        if (detail) labelText.fontSize = r * 1.3
      }
      bar.stroke = sel ? defaultSeatMapOptions.colors.selectionStroke : '#81C784'
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
      if (targetGroup && focusedId) {
        // Phase C：聚焦分区模式下，座位排直接写入 store，canvas 由 watcher 渲染
        const section = venueDataStore.venue.sections.find(s => s.id === focusedId)
        if (!section) {
          // fallback：section 不存在时仍走 canvas-first
          createSeatElements(data.rows, targetGroup, focusedId)
          return
        }
        const seatRows = buildSeatRowsFromDrawData(data.rows, {
          section,
          categories: venueDataStore.venue.categories,
        })
        if (seatRows.length) {
          historyStore.execute(createAddRowsCommand(venueDataStore, focusedId, seatRows))
        }
      } else {
        // 无聚焦分区：自动创建一个包围这些排的 section，然后写入 store
        const seatRows = buildSeatRowsFromDrawData(data.rows, {
          section: venueDataStore.venue.sections[0],
          categories: venueDataStore.venue.categories,
        })
        if (seatRows.length) {
          const section = buildSectionFromRows(data.rows, {
            name: `分区 ${venueDataStore.venue.sections.length + 1}`,
            fill: '#d1d5db',
          })
          historyStore.execute(createAddSectionWithRowsCommand(venueDataStore, section, seatRows))
        }
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
    ensureSeatEllipses,
    clearSeatEllipses,
    modeHandlers,
    getBaseScale: seatDraw.getBaseScale,
  }
}
