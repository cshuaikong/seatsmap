import { ref } from 'vue'
import { Group, Line, Ellipse, Text, PointerEvent } from 'leafer-ui'
import type { LeaferElementMeta } from '../types/leafer-meta'
import type { CanvasContext } from './useCanvasContext'
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
import { setElementMeta } from '../types/leafer-meta'
import { createAddRowsCommand, createAddSectionWithRowsCommand } from '../domain/venueCommands'
import { buildSeatRowsFromDrawData, buildSectionFromRows } from '../domain/rowGeometry'

export interface SeatModuleCtx {
  getCanvasContext: () => CanvasContext
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
  const seatRowGroups: MetaGroup[] = []
  const drawnSeatCount = ref(0)
  const venueDataStore = useVenueDataStore()
  const editorStore = useEditorStore()
  const historyStore = useHistoryStore()

  // ---- 对象池：减少大场馆下 Group / Ellipse / Text 的频繁创建与销毁 ----
  const rowGroupPool: MetaGroup[] = []
  const seatEllipsePool: MetaEllipse[] = []
  const seatLabelPool: MetaText[] = []

  function acquireRowGroup(): MetaGroup {
    if (rowGroupPool.length > 0) {
      const g = rowGroupPool.pop()!
      g.visible = true
      g.hittable = true
      g.editable = true
      g.draggable = true
      return g
    }
    return new Group({
      editable: true,
      hittable: true,
      draggable: true,
      hitChildren: false,
    }) as MetaGroup
  }

  function releaseRowGroup(g: MetaGroup): void {
    g.visible = false
    g.hittable = false
    g.editable = false
    g.draggable = false

    // 回收座位圆点和标签，避免残留到下次复用
    const ellipses = (g.__seatEllipses || []) as MetaEllipse[]
    for (const e of ellipses) {
      const st = e.__labelText as MetaText | undefined
      if (st) releaseSeatLabel(st)
      releaseSeatEllipse(e)
    }
    g.__seatEllipses = []

    // 从父级移除，但不销毁，回收到池中
    try { g.parent?.remove(g) } catch (_) {}

    // 清理动态状态，保留事件监听和基础结构
    g.__seatLocalPositions = []
    g.__rawSeats = []
    g.__labelText = undefined
    g.__rowLabel = ''
    rowGroupPool.push(g)
  }

  function acquireSeatEllipse(): MetaEllipse {
    if (seatEllipsePool.length > 0) {
      const e = seatEllipsePool.pop()!
      e.visible = true
      return e
    }
    return new Ellipse({
      around: 'center',
      hittable: true,
      draggable: false,
    }) as MetaEllipse
  }

  function releaseSeatEllipse(e: MetaEllipse): void {
    e.visible = false
    try { e.remove() } catch (_) {}
    // 清理业务引用
    e.__seatId = undefined
    e.__cat_id = undefined
    e.__sourceSeat = undefined
    e.__labelText = undefined
    seatEllipsePool.push(e)
  }

  function acquireSeatLabel(): MetaText {
    if (seatLabelPool.length > 0) {
      const t = seatLabelPool.pop()!
      t.visible = true
      return t
    }
    return new Text({
      textAlign: 'center',
      verticalAlign: 'middle',
      around: 'center',
      editable: false,
      hittable: false,
    }) as MetaText
  }

  function releaseSeatLabel(t: MetaText): void {
    t.visible = false
    try { t.remove() } catch (_) {}
    t.__seatLabelText = true
    seatLabelPool.push(t)
  }

  function resetSeatEllipsePool(): void {
    seatEllipsePool.length = 0
    seatLabelPool.length = 0
  }

  /** 判断事件路径中是否包含可见的单个座位圆 */
  function isEventOnVisibleSeat(e: any): boolean {
    const path = e.path?.list ?? e.path ?? []
    for (const leaf of path) {
      if (leaf?.__seatId && leaf.visible) return true
    }
    return false
  }

  // ---- 绑定座位排 Group 的交互事件 ----
  function bindSeatRowEvents(group: MetaGroup): void {
    // 避免重复绑定：Leafer 元素可以重复监听同名事件，这里简单移除再添加不现实，
    // 复用 Group 时事件处理器闭包引用的是旧的 ctx，但 ctx 是稳定的函数引用，安全。
    if ((group as any).__eventsBound) return
    group.on(PointerEvent.BEFORE_DOWN, (e: any) => {
      const ed = ctx.getEditor()
      if (!ed || !ctx.getFocusedSectionId?.()) return
      if (isEventOnVisibleSeat(e)) return
      if (ed.hasItem(group)) return
      if (e.shiftKey) {
        ed.hasItem(group) ? ed.removeItem(group) : ed.addItem(group)
      } else {
        ed.select([group])
      }
      e.stop()
    })
    ;(group as any).__eventsBound = true
  }

  // ---- 创建座位元素（绘制工具直接落座，无 venueData 关联）----

  function createSeatElements(rows: SeatDrawRowData[], targetGroup?: any, sectionId?: string | null): void {
    const bs = seatDraw.getBaseScale()
    const radius = SEAT_CONFIG.radius / Math.max(bs, 0.02)
    const size = radius * 2
    const sw = 1 / Math.max(bs, 0.02)
    let totalSeats = 0

    rows.forEach(row => {
      const group = acquireRowGroup()
      bindSeatRowEvents(group)
      ;group.__seatRow = true
      if (sectionId) {
        group.__sectionId = sectionId
        setElementMeta(group, { id: `draw-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, type: 'seatRow', sectionId })
      }

      const lastIdx = row.count - 1
      let bar = group.__bar as Line | undefined
      if (!bar) {
        bar = new Line({
          stroke: '#81C784',
          strokeCap: 'round',
          opacity: 0.25,
          hittable: true,
          draggable: false,
        })
        group.add(bar)
      }
      bar.set({
        points: [
          row.x, row.y,
          row.x + row.ux * row.spacing * lastIdx,
          row.y + row.uy * row.spacing * lastIdx,
        ],
        strokeWidth: size,
      })

      const ellipses: MetaEllipse[] = []
      for (let i = 0; i < row.count; i++) {
        const cx = +(row.x + row.ux * row.spacing * i).toFixed(2)
        const cy = +(row.y + row.uy * row.spacing * i).toFixed(2)
        const ell = acquireSeatEllipse()
        ell.set({
          x: cx, y: cy,
          width: size, height: size,
          fill: '#A5D6A7',
          stroke: '#81C784',
          strokeWidth: sw,
        })
        ;ell.__originalStroke = '#81C784'
        ;ell.editConfig = { moveable: false, rotateable: false, resizeable: false }

        const st = acquireSeatLabel()
        st.set({
          text: '',
          x: cx, y: cy,
          fontSize: radius,
          fill: '#1F2937',
        })
        ;st.__seatLabelText = true

        if (!ell.parent) group.add(ell)
        if (!st.parent) group.add(st)
        ;ell.__labelText = st
        ellipses.push(ell)
      }

      ;group.__seatRadius = radius
      ;group.__seatEllipses = ellipses
      ;group.__bar = bar
      ;group.__seatRowData = { ...row }
      ;group.__seatSpacing = row.spacing

      addRowLabelText(group)

      const addTarget = targetGroup || ctx.getCanvasContext().tree
      addTarget.add(group)
      seatRowGroups.push(group)
      totalSeats += row.count
    })
    drawnSeatCount.value = totalSeats
    updateSeatLOD()
  }

  function clearSeatElements(): void {
    while (seatRowGroups.length > 0) {
      const g = seatRowGroups.pop()!
      releaseRowGroup(g)
    }
    drawnSeatCount.value = 0
    seatDraw.resetBaseScale()
    // 清空座位圆点池，避免颜色/分类状态残留
    resetSeatEllipsePool()
  }

  /** 为排 Group 添加标签文本（排起点前移一个座位间距） */
  function addRowLabelText(group: MetaGroup): void {
    const ellipses = (group.__seatEllipses || []) as MetaEllipse[]
    if (ellipses.length <= 1) {
      if (group.__labelText) group.__labelText.visible = false
      return
    }
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

    let labelText = group.__labelText
    if (!labelText) {
      labelText = new Text({
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
    labelText.set({
      text: group.__rowLabel || '',
      x: fx - ux * spacing * 0.8,
      y: fy - uy * spacing * 0.8,
      rotation: angle,
      fontSize: seatR * 1.3,
      fill: '#6B7280',
      visible: true,
    })
  }

  /** 为排 Group 创建座位圆点和标签（延迟创建，用于分区编辑模式），使用对象池 */
  function buildSeatEllipsesForGroup(
    group: MetaGroup,
    sortedSeats: any[],
    localPositions: { x: number; y: number }[],
    categories?: any[],
  ): void {
    if (!group.__seatEllipses) group.__seatEllipses = []
    const ellipses = group.__seatEllipses as MetaEllipse[]

    const bs = seatDraw.getBaseScale()
    const radius = SEAT_CONFIG.radius / Math.max(bs, 0.02)
    const size = radius * 2
    const sw = 1 / Math.max(bs, 0.02)

    // 复用已有 Ellipse，不足则从池获取
    for (let i = 0; i < sortedSeats.length; i++) {
      const seat = sortedSeats[i]
      const pos = localPositions[i]
      const ck = seat.cat_id
      const color = categories ? getCategoryColor(ck, categories) : '#A5D6A7'

      let ell = ellipses[i]
      if (!ell) {
        ell = acquireSeatEllipse()
        ell.set({
          around: 'center',
          hittable: true,
          draggable: false,
        })
        ;ell.editConfig = { moveable: false, rotateable: false, resizeable: false }
        if (!ell.parent) group.add(ell)
        ellipses.push(ell)
      }
      ell.set({
        x: pos.x, y: pos.y,
        width: size, height: size,
        fill: color,
        stroke: darkenColor(color, 30),
        strokeWidth: sw,
        visible: false,
      })
      ;ell.__originalStroke = darkenColor(color, 30)
      ;ell.__seatId = seat.id
      ;ell.__cat_id = ck
      ;ell.__sourceSeat = seat
      setElementMeta(ell, { id: seat.id, type: 'seat', catId: ck })
    }

    // 复用/创建标签文本
    for (let i = 0; i < ellipses.length; i++) {
      const ell = ellipses[i]
      const seat = sortedSeats[i]
      let st = ell.__labelText as MetaText | undefined
      if (!st) {
        st = acquireSeatLabel()
        if (!st.parent) group.add(st)
        ;ell.__labelText = st
      }
      st.set({
        text: seat.label || '',
        x: ell.x, y: ell.y,
        fontSize: radius,
        fill: '#1F2937',
        visible: false,
      })
      ;st.__seatLabelText = true
    }

    // 多余 Ellipse 回收到池
    while (ellipses.length > sortedSeats.length) {
      const ell = ellipses.pop()!
      const st = ell.__labelText as MetaText | undefined
      if (st) releaseSeatLabel(st)
      releaseSeatEllipse(ell)
    }

    ;group.__seatRadius = radius
  }

  /** 为指定分区下的所有排延迟创建座位圆点 */
  function ensureSeatEllipses(sectionId: string, categories?: any[]): void {
    for (const g of seatRowGroups) {
      if (g.__sectionId !== sectionId) continue
      if (!g.__rawSeats || !g.__seatLocalPositions) continue
      if (g.__rawSeats.length !== g.__seatLocalPositions.length) continue
      buildSeatEllipsesForGroup(g, g.__rawSeats, g.__seatLocalPositions, categories)
    }
  }

  /** 回收所有座位圆点和标签，回退到排线模式 */
  function clearSeatEllipses(): void {
    for (const g of seatRowGroups) {
      const ellipses = g.__seatEllipses as MetaEllipse[] | undefined
      if (!ellipses || ellipses.length === 0) continue
      for (const e of ellipses) {
        const st = e.__labelText as MetaText | undefined
        if (st) releaseSeatLabel(st)
        releaseSeatEllipse(e)
      }
      g.__seatEllipses = []
    }
  }

  /** 从 venue data 的 sections[].rows[].seats[] 增量渲染座位排 */
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

    // 本次需要处理的 row 集合
    const targetRows = new Map<string, { section: any; row: any }>()
    for (const section of sections) {
      if (!section.rows || section.rows.length === 0) continue
      for (const row of section.rows) {
        if (!row.seats || row.seats.length === 0) continue
        targetRows.set(row.id, { section, row })
      }
    }

    // 当前已渲染的 row 分组，按 section 归类
    const sectionIds = new Set(sections.map(s => s.id))
    const existingByRow = new Map<string, MetaGroup>()
    for (const g of seatRowGroups) {
      if (g.__rowId && sectionIds.has(g.__sectionId || '')) {
        existingByRow.set(g.__rowId, g)
      }
    }

    // 1) 移除本次传入 sections 中已不存在的 row
    for (const [rowId, g] of existingByRow) {
      if (!targetRows.has(rowId)) {
        releaseRowGroup(g)
      }
    }
    // 清理 seatRowGroups 中已被回收的项
    for (let i = seatRowGroups.length - 1; i >= 0; i--) {
      if (seatRowGroups[i].visible === false) seatRowGroups.splice(i, 1)
    }

    // 2) 创建或更新 row
    let totalSeats = 0
    for (const [rowId, { section, row }] of targetRows) {
      const existing = existingByRow.get(rowId)
      if (existing) {
        updateSeatRowFromVenueData(existing, section, row, categories)
      } else {
        createSeatRowFromVenueData(section, row, categories)
      }
      totalSeats += row.seats.length
    }

    drawnSeatCount.value = totalSeats
    updateSeatLOD()
  }

  /** 创建新的座位排 Group（从 venue data） */
  function createSeatRowFromVenueData(section: any, row: any, categories?: any[]): MetaGroup {
    const bs = seatDraw.getBaseScale()
    const radius = SEAT_CONFIG.radius / Math.max(bs, 0.02)
    const size = radius * 2
    const lineWidth = size

    const rowX = (row.x ?? 0)
    const rowY = (row.y ?? 0)
    const rot = (row.rotation ?? 0) * Math.PI / 180
    const cos = Math.cos(rot)
    const sin = Math.sin(rot)
    const curve = row.curve ?? 0

    const sortedSeats = [...row.seats].sort((a: any, b: any) => {
      const ax = typeof a.x === 'string' ? parseFloat(a.x) : (a.x || 0)
      const bx = typeof b.x === 'string' ? parseFloat(b.x) : (b.x || 0)
      return ax - bx
    })

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

    const group = acquireRowGroup()
    bindSeatRowEvents(group)
    ;group.__seatRow = true
    ;group.__isVenueDataSeat = true
    ;group.__sectionId = section.id
    ;group.__rowId = row.id
    ;group.__rowLabel = row.label || ''
    setElementMeta(group, { id: row.id, type: 'seatRow', sectionId: section.id, label: row.label })
    ;group.__curve = curve
    ;group.__rotation = row.rotation ?? 0
    ;group.__rowOriginX = rowX
    ;group.__rowOriginY = rowY
    ;group.__rawSeats = sortedSeats

    let bar = group.__bar as Line | undefined
    if (!bar) {
      bar = new Line({
        stroke: '#81C784',
        strokeCap: 'round',
        opacity: 0.25,
        hittable: true,
        draggable: false,
      })
      group.add(bar)
    }
    const barPts: number[] = []
    for (const wp of worldPositions) { barPts.push(wp.x, wp.y) }
    bar.set({ points: barPts, strokeWidth: lineWidth })
    ;group.__bar = bar

    // 确定归属 SectionGroup 并转局部坐标
    const parentGroup = ctx.getSectionGroupMap().get(section.id)
    const sx = section.x ?? 0
    const sy = section.y ?? 0

    const dataIsLocal = parentGroup
      && (sx === 0 || Math.abs(firstW.x) < Math.abs(firstW.x - sx))
      && (sy === 0 || Math.abs(firstW.y) < Math.abs(firstW.y - sy))
    const needConvert = parentGroup && (sx !== 0 || sy !== 0) && !dataIsLocal

    let localPositions = worldPositions
    if (needConvert) {
      const pgRot = (parentGroup.rotation ?? 0) * Math.PI / 180
      const cosR = Math.cos(-pgRot), sinR = Math.sin(-pgRot)
      const w2l = (wx: number, wy: number) => ({
        x: +((wx - sx) * cosR - (wy - sy) * sinR).toFixed(2),
        y: +((wx - sx) * sinR + (wy - sy) * cosR).toFixed(2),
      })
      const barLocalPts: number[] = []
      localPositions = []
      for (const wp of worldPositions) {
        const lp = w2l(wp.x, wp.y)
        barLocalPts.push(lp.x, lp.y)
        localPositions.push(lp)
      }
      bar.points = barLocalPts
    }

    ;group.__seatLocalPositions = localPositions

    const focusedSectionId = ctx.getFocusedSectionId?.()
    if (focusedSectionId && focusedSectionId === section.id) {
      buildSeatEllipsesForGroup(group, sortedSeats, localPositions, categories)
    } else {
      ;group.__seatRadius = radius
      ;group.__seatEllipses = []
    }

    const firstSX = localPositions[0].x
    const firstSY = localPositions[0].y
    const lastSX = localPositions[localPositions.length - 1].x
    const lastSY = localPositions[localPositions.length - 1].y
    const ldx = lastSX - firstSX
    const ldy = lastSY - firstSY
    const ldist = Math.hypot(ldx, ldy)

    ;group.__seatRowData = {
      x: firstSX,
      y: firstSY,
      ux: ldist > 0.001 ? ldx / ldist : 1,
      uy: ldist > 0.001 ? ldy / ldist : 0,
      count: sortedSeats.length,
      spacing: sortedSeats.length > 1 ? ldist / (sortedSeats.length - 1) : SEAT_CONFIG.spacing / Math.max(bs, 0.02),
    } as SeatDrawRowData
    ;group.__seatSpacing = group.__seatRowData.spacing

    addRowLabelText(group)

    const addTarget = parentGroup || ctx.getCanvasContext().tree
    addTarget.add(group)
    seatRowGroups.push(group)
    return group
  }

  /** 复用已有 Group 更新座位排数据 */
  function updateSeatRowFromVenueData(group: MetaGroup, section: any, row: any, categories?: any[]): void {
    // 基础元数据更新
    ;group.__sectionId = section.id
    ;group.__rowLabel = row.label || ''
    ;group.__curve = row.curve ?? 0
    ;group.__rotation = row.rotation ?? 0
    ;group.__rowOriginX = row.x ?? 0
    ;group.__rowOriginY = row.y ?? 0

    const bs = seatDraw.getBaseScale()
    const radius = SEAT_CONFIG.radius / Math.max(bs, 0.02)
    const size = radius * 2
    const lineWidth = size

    const rowX = (row.x ?? 0)
    const rowY = (row.y ?? 0)
    const rot = (row.rotation ?? 0) * Math.PI / 180
    const cos = Math.cos(rot)
    const sin = Math.sin(rot)
    const curve = row.curve ?? 0

    const sortedSeats = [...row.seats].sort((a: any, b: any) => {
      const ax = typeof a.x === 'string' ? parseFloat(a.x) : (a.x || 0)
      const bx = typeof b.x === 'string' ? parseFloat(b.x) : (b.x || 0)
      return ax - bx
    })

    const curved = calculateCurvedPositions(sortedSeats, curve)
    const worldPositions: { x: number; y: number }[] = []
    for (let i = 0; i < sortedSeats.length; i++) {
      const pos = curved[i]
      worldPositions.push({
        x: +(rowX + pos.x * cos - pos.y * sin).toFixed(2),
        y: +(rowY + pos.x * sin + pos.y * cos).toFixed(2),
      })
    }

    ;group.__rawSeats = sortedSeats

    const parentGroup = ctx.getSectionGroupMap().get(section.id)
    const sx = section.x ?? 0
    const sy = section.y ?? 0
    const dataIsLocal = parentGroup
      && (sx === 0 || Math.abs(worldPositions[0].x) < Math.abs(worldPositions[0].x - sx))
      && (sy === 0 || Math.abs(worldPositions[0].y) < Math.abs(worldPositions[0].y - sy))
    const needConvert = parentGroup && (sx !== 0 || sy !== 0) && !dataIsLocal

    let localPositions = worldPositions
    const bar = group.__bar as Line
    if (bar) {
      const barPts: number[] = []
      for (const wp of worldPositions) { barPts.push(wp.x, wp.y) }
      bar.set({ points: barPts, strokeWidth: lineWidth })

      if (needConvert) {
        const pgRot = (parentGroup.rotation ?? 0) * Math.PI / 180
        const cosR = Math.cos(-pgRot), sinR = Math.sin(-pgRot)
        const w2l = (wx: number, wy: number) => ({
          x: +((wx - sx) * cosR - (wy - sy) * sinR).toFixed(2),
          y: +((wx - sx) * sinR + (wy - sy) * cosR).toFixed(2),
        })
        const barLocalPts: number[] = []
        localPositions = []
        for (const wp of worldPositions) {
          const lp = w2l(wp.x, wp.y)
          barLocalPts.push(lp.x, lp.y)
          localPositions.push(lp)
        }
        bar.points = barLocalPts
      }
    }

    ;group.__seatLocalPositions = localPositions

    const firstSX = localPositions[0].x
    const firstSY = localPositions[0].y
    const lastSX = localPositions[localPositions.length - 1].x
    const lastSY = localPositions[localPositions.length - 1].y
    const ldx = lastSX - firstSX
    const ldy = lastSY - firstSY
    const ldist = Math.hypot(ldx, ldy)

    ;group.__seatRowData = {
      x: firstSX,
      y: firstSY,
      ux: ldist > 0.001 ? ldx / ldist : 1,
      uy: ldist > 0.001 ? ldy / ldist : 0,
      count: sortedSeats.length,
      spacing: sortedSeats.length > 1 ? ldist / (sortedSeats.length - 1) : SEAT_CONFIG.spacing / Math.max(bs, 0.02),
    } as SeatDrawRowData
    ;group.__seatSpacing = group.__seatRowData.spacing
    ;group.__seatRadius = radius

    // 聚焦模式下重建座位圆点，否则清空
    const focusedSectionId = ctx.getFocusedSectionId?.()
    if (focusedSectionId && focusedSectionId === section.id) {
      buildSeatEllipsesForGroup(group, sortedSeats, localPositions, categories)
    } else {
      // 回收已有的座位圆点
      const ellipses = (group.__seatEllipses || []) as MetaEllipse[]
      for (const e of ellipses) {
        const st = e.__labelText as MetaText | undefined
        if (st) releaseSeatLabel(st)
        releaseSeatEllipse(e)
      }
      ;group.__seatEllipses = []
    }

    addRowLabelText(group)
  }

  function rebuildSeatRow(group: MetaGroup, newData: SeatDrawRowData, endCenter?: { x: number; y: number }, anchorFromEnd?: boolean): void {
    const bar = group.__bar as Line | undefined
    const ellipses = (group.__seatEllipses || []) as MetaEllipse[]

    const bs = seatDraw.getBaseScale()
    const radius = SEAT_CONFIG.radius / Math.max(bs, 0.02)
    const size = radius * 2
    const sw = 1 / Math.max(bs, 0.02)
    const { x, y, ux, uy, count, spacing } = newData

    const groupCurve = group.__curve ?? 0
    const isCurved = Math.abs(groupCurve) > 0.001

    let positions: Array<{ x: number; y: number }> = []

    if (isCurved) {
      const anchorX = anchorFromEnd && endCenter ? endCenter.x : x
      const anchorY = anchorFromEnd && endCenter ? endCenter.y : y
      const dir = anchorFromEnd ? -1 : 1
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

      if (bar) {
        const barPts: number[] = []
        for (const p of positions) { barPts.push(p.x, p.y) }
        bar.set({ points: barPts, strokeWidth: size })
      }
    } else {
      const effEndX = endCenter ? endCenter.x : x + ux * spacing * (count - 1)
      const effEndY = endCenter ? endCenter.y : y + uy * spacing * (count - 1)
      const anchorX = anchorFromEnd ? effEndX : x
      const anchorY = anchorFromEnd ? effEndY : y
      const dir = anchorFromEnd ? -1 : 1

      for (let i = 0; i < count; i++) {
        positions.push({
          x: +(anchorX + ux * dir * spacing * i).toFixed(2),
          y: +(anchorY + uy * dir * spacing * i).toFixed(2),
        })
      }

      if (bar) {
        bar.set({ points: [x, y, effEndX, effEndY], strokeWidth: size })
      }

      const prevFromEnd = group.__anchorFromEnd
      if (anchorFromEnd !== prevFromEnd && prevFromEnd !== undefined) {
        positions.reverse()
      }
      ;group.__anchorFromEnd = anchorFromEnd
    }

    // 复用/回收 Ellipse
    for (let i = 0; i < count; i++) {
      let ell = ellipses[i]
      if (!ell) {
        ell = acquireSeatEllipse()
        ell.set({
          fill: '#A5D6A7',
          stroke: '#81C784',
          strokeWidth: sw,
          around: 'center',
          hittable: true,
          draggable: false,
        })
        ;ell.__originalStroke = '#81C784'
        ;ell.editConfig = { moveable: false, rotateable: false, resizeable: false }
        if (!ell.parent) group.add(ell)
        ellipses.push(ell)
      }
      ell.set({
        x: positions[i].x,
        y: positions[i].y,
        width: size,
        height: size,
      })
    }
    while (ellipses.length > count) {
      const e = ellipses.pop()!
      const st = e.__labelText as MetaText | undefined
      if (st) releaseSeatLabel(st)
      releaseSeatEllipse(e)
    }

    ;group.__seatRowData = { ...newData }
    ;group.__seatRadius = radius

    // 更新排标签文本位置/旋转
    addRowLabelText(group)

    updateSeatLOD()
  }

  // ---- LOD 切换 ----

  function updateSeatLOD(): void {
    const s = ctx.getS()
    const threshold = SEAT_CONFIG.radius
    const selectedSet = new Set((ctx.getEditor() as any)?.list ?? [])
    const selectedSeatSet = new Set(editorStore.selectedSeatIds)
    // 分区聚焦模式下只更新当前分区，减少大量座位时的遍历开销
    const focusedId = ctx.getFocusedSectionId?.()
    const groups = focusedId ? seatRowGroups.filter(g => g.__sectionId === focusedId) : seatRowGroups
    for (const g of groups) {
      const r = g.__seatRadius as number | undefined
      const bar = g.__bar as any
      const ellipses = g.__seatEllipses as MetaEllipse[] | undefined
      if (r == null || !bar) continue
      const sel = selectedSet.has(g)
      const hasEllipses = ellipses && ellipses.length > 0
      const detail = hasEllipses && (r * s >= threshold)
      if (hasEllipses) {
        for (const e of ellipses) {
          e.visible = detail
          const seatSelected = e.__seatId ? selectedSeatSet.has(e.__seatId) : false
          e.stroke = seatSelected ? defaultSeatMapOptions.colors.selectionStroke : (e.__originalStroke ?? '#81C784')
          e.strokeWidth = seatSelected ? (1 / Math.max(seatDraw.getBaseScale(), 0.02)) * 2 : (1 / Math.max(seatDraw.getBaseScale(), 0.02))
          const st = e.__labelText as MetaText | undefined
          if (st) {
            const hasSeatLabel = String(e.__sourceSeat?.label || '').length > 0
            st.visible = detail && hasSeatLabel
            if (detail) st.fontSize = r
          }
        }
      }
      bar.visible = !detail
      const labelText = g.__labelText
      if (labelText) {
        const hasLabel = String(g.__rowLabel || '').length > 0
        labelText.visible = detail && hasLabel && ellipses && ellipses.length > 1
        if (detail) labelText.fontSize = r * 1.3
      }
      bar.stroke = sel ? defaultSeatMapOptions.colors.selectionStroke : '#81C784'
      bar.opacity = sel ? 0.6 : 0.25
    }
  }

  // ---- 座位绘制工具 ----

  const seatDraw = useSeatDraw({
    getLeafer: () => ctx.getCanvasContext().tree,
    getEditor: ctx.getEditor,
    getCanvas: ctx.getCanvas,
    getAllPaths: () => [...ctx.getAllNonSeatPaths(), ...seatRowGroups],
    getS: ctx.getS,
    setPanEnabled: ctx.setPanEnabled,
    onFinish: (data) => {
      const focusedId = ctx.getFocusedSectionId?.()
      const targetGroup = focusedId ? ctx.getSectionGroupMap().get(focusedId) : undefined
      if (targetGroup && focusedId) {
        const section = venueDataStore.venue.sections.find(s => s.id === focusedId)
        if (!section) {
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
