import { Group, Line, Rect, Ellipse, Text } from 'leafer-ui'
import type { Position } from '../types'
import { defaultSeatMapConfig } from '../types'
import { generateId } from '../utils/id'
import { useVenueStore } from '../stores/venueStore'
import { getUnitVector, calculatePolygonCenter, toRelativePoints } from '../composables/useKonvaDrawing'

const SEAT_SPACING = defaultSeatMapConfig.defaultSeatSpacing
const ROW_SPACING = defaultSeatMapConfig.defaultRowSpacing
const SNAP_TO_START_DISTANCE = 15

// 预览颜色（浅色透明，避免遮挡底层元素）
const PREVIEW_STROKE = 'rgba(59,130,246,0.45)'
const PREVIEW_FILL = 'rgba(59,130,246,0.18)'
const PREVIEW_LABEL = 'rgba(59,130,246,0.55)'
const PREVIEW_MULTI_STROKE = 'rgba(255,152,0,0.50)'
const PREVIEW_MULTI_LABEL = 'rgba(0,0,0,0.50)'

export type DrawStep = 'idle' | 'first' | 'second' | 'third'

export interface DrawingManagerOptions {
  previewGroup: Group
  onRenderAll: () => void
  /** 绘制提交完成后回调，传入新创建元素的 kind 和原始 id */
  onSubmitComplete?: (info: { kind: string; id: string } | null) => void
}

export class DrawingManager {
  readonly previewGroup: Group
  private _onRenderAll: () => void
  private _onSubmitComplete?: (info: { kind: string; id: string } | null) => void

  // 工具状态
  private _currentTool = 'select'
  private _seatDrawStep: DrawStep = 'idle'
  private _seatStartPos: Position | null = null
  private _seatCurrentPos: Position | null = null
  private _polygonPoints: Position[] = []
  private _dragStartPos: Position | null = null
  private _dragEndPos: Position | null = null
  private _previewElements: any[] = []
  private _multiRowStep: DrawStep = 'idle'
  private _multiRowStart: Position | null = null
  private _multiRowEnd: Position | null = null

  constructor(opts: DrawingManagerOptions) {
    this.previewGroup = opts.previewGroup
    this._onRenderAll = opts.onRenderAll
    this._onSubmitComplete = opts.onSubmitComplete
  }

  get currentTool(): string {
    return this._currentTool
  }

  get isDrawing(): boolean {
    const drawingTools = [
      'row-straight', 'section', 'section-diagonal',
      'draw_rect', 'draw_polygon',
      'draw_polyline', 'draw_text', 'draw_area'
    ]
    return drawingTools.includes(this._currentTool)
  }

  setTool(tool: string): void {
    this._currentTool = tool
    this.resetState()
  }

  resetState(): void {
    this._seatDrawStep = 'idle'
    this._seatStartPos = null
    this._seatCurrentPos = null
    this._polygonPoints = []
    this._dragStartPos = null
    this._dragEndPos = null
    this._multiRowStep = 'idle'
    this._multiRowStart = null
    this._multiRowEnd = null
    this._clearPreview()
  }

  // ==================== 事件入口 ====================

  handlePointerDown(pos: Position): void {
    switch (this._currentTool) {
      case 'row-straight':
      case 'section':
        this._onSeatToolDown(pos)
        break
      case 'section-diagonal':
        this._onMultiRowDown(pos)
        break
      case 'draw_rect':
        this._onShapeDragStart(pos)
        break
      case 'draw_polygon':
      case 'draw_polyline':
      case 'draw_area':
        this._onPolygonClick(pos)
        break
      case 'draw_text':
        this._onTextClick(pos)
        break
    }
  }

  handlePointerMove(pos: Position): void {
    switch (this._currentTool) {
      case 'row-straight':
      case 'section':
        this._onSeatToolMove(pos)
        break
      case 'section-diagonal':
        this._onMultiRowMove(pos)
        break
      case 'draw_rect':
        this._onShapeDragMove(pos)
        break
      case 'draw_polygon':
      case 'draw_polyline':
      case 'draw_area':
        this._onPolygonMove(pos)
        break
    }
  }

  handlePointerUp(_pos: Position): void {
    switch (this._currentTool) {
      case 'draw_rect':
        this._onShapeDragEnd()
        break
    }
  }

  // ==================== 单行座位 / 分段座位 ====================

  private _onSeatToolDown(pos: Position): void {
    if (this._seatDrawStep === 'idle') {
      this._seatDrawStep = 'first'
      this._seatStartPos = pos
      this._showCursorCircle(pos)
      this._seatCurrentPos = pos
    } else if (this._seatDrawStep === 'first') {
      if (this._currentTool === 'section') {
        // 点击最后一个座位附近 → 结束分段绘制
        const distFromLast = this._seatStartPos
          ? Math.hypot(pos.x - this._seatStartPos.x, pos.y - this._seatStartPos.y)
          : Infinity
        if (distFromLast < SNAP_TO_START_DISTANCE) {
          this.resetState()
          this._onRenderAll()
          return
        }
        // 分段模式：提交当前段为新排，下一段起点为上一段最后一个座位中心
        const lastSeatPos = this._submitSectionSegment(pos)
        if (lastSeatPos) {
          this._seatStartPos = lastSeatPos
          this._seatCurrentPos = lastSeatPos
          this._showCursorCircle(lastSeatPos)
        }
      } else {
        // 直排模式：完成排
        this._submitSeatRow()
      }
    }
  }

  private _onSeatToolMove(pos: Position): void {
    if (this._seatDrawStep === 'first') {
      this._seatCurrentPos = pos
      this._showSeatRowPreview()
    }
  }

  private _submitSectionSegment(pos: Position): Position | null {
    const store = useVenueStore()
    if (!this._seatStartPos) return null

    const { ux, uy, dist } = getUnitVector(this._seatStartPos, pos)
    const spacing = SEAT_SPACING / (store.getBaseScale() || 1)
    const count = Math.max(1, Math.round(dist / spacing))
    if (count < 1) return null

    let sectionId: string
    if (store.venue.sections.length === 0) {
      sectionId = store.addSection({ name: '默认区域', rows: [], x: 0, y: 0 })
    } else {
      sectionId = store.venue.sections[0].id
    }

    const seats: any[] = []
    for (let i = 0; i < count; i++) {
      seats.push({
        id: generateId(),
        x: ux * spacing * i,
        y: uy * spacing * i,
        status: 'available',
        categoryKey: 'default',
        label: String(i + 1),
      })
    }

    store.addRow(sectionId, {
      x: this._seatStartPos.x,
      y: this._seatStartPos.y,
      seats,
      seatSpacing: spacing,
      label: `排${store.venue.sections.find(s => s.id === sectionId)?.rows.length ?? 0 + 1}`,
    })

    // 最后一个座位的世界坐标（作为下一段起点）
    const lastIdx = count - 1
    const lastWorldX = this._seatStartPos.x + ux * spacing * lastIdx
    const lastWorldY = this._seatStartPos.y + uy * spacing * lastIdx

    store.saveHistory()
    this._onRenderAll()
    // 不调用 resetState — 保持 'first' 状态继续绘制下一段
    return { x: lastWorldX, y: lastWorldY }
  }

  private _submitSeatRow(): void {
    const store = useVenueStore()
    if (!this._seatStartPos || !this._seatCurrentPos) return

    // 确保有分区
    let sectionId: string
    if (store.venue.sections.length === 0) {
      sectionId = store.addSection({ name: '默认区域', rows: [], x: 0, y: 0 })
    } else {
      sectionId = store.venue.sections[0].id
    }

    const { ux, uy, dist } = getUnitVector(this._seatStartPos, this._seatCurrentPos)
    const spacing = SEAT_SPACING / (store.getBaseScale() || 1)
    const count = Math.max(1, Math.round(dist / spacing))
    const seats: any[] = []

    for (let i = 0; i < count; i++) {
      seats.push({
        id: generateId(),
        // 相对 row origin 的偏移量，与 SeatRenderer 的 rowX + pos.x 约定一致
        x: ux * spacing * i,
        y: uy * spacing * i,
        status: 'available',
        categoryKey: 'default',
        label: String(i + 1),
      })
    }

    const rowId = store.addRow(sectionId, {
      x: this._seatStartPos.x,
      y: this._seatStartPos.y,
      seats,
      seatSpacing: spacing,
      label: `排${store.venue.sections.find(s => s.id === sectionId)?.rows.length ?? 0 + 1}`,
    })

    store.saveHistory()
    this.resetState()
    this._onRenderAll()
    this._onSubmitComplete?.({ kind: 'row', id: rowId! })
  }

  // ==================== 多排座位 (section-diagonal) ====================

  private _onMultiRowDown(pos: Position): void {
    if (this._multiRowStep === 'idle') {
      this._multiRowStep = 'first'
      this._multiRowStart = pos
      this._showCursorCircle(pos)
    } else if (this._multiRowStep === 'first') {
      this._multiRowStep = 'second'
      this._multiRowEnd = pos
      this._showMultiRowPreview(pos)
    } else if (this._multiRowStep === 'second') {
      this._submitMultiRows(pos)
    }
  }

  private _onMultiRowMove(pos: Position): void {
    if (this._multiRowStep === 'first') {
      this._showSeatRowPreviewForMulti(pos)
    } else if (this._multiRowStep === 'second') {
      this._showMultiRowPreview(pos)
    }
  }

  private _showSeatRowPreviewForMulti(pos: Position): void {
    if (!this._multiRowStart) return
    this._seatStartPos = this._multiRowStart
    this._seatCurrentPos = pos
    this._showSeatRowPreview()
  }

  private _showMultiRowPreview(pos: Position): void {
    if (!this._multiRowStart || !this._multiRowEnd) return
    this._clearPreview()

    const store = useVenueStore()
    const baseScale = store.getBaseScale() || 1
    const spacing = SEAT_SPACING / baseScale
    const rowSpacing = ROW_SPACING / baseScale
    const logicalRadius = (store.visualConfig?.radius ?? 6) / baseScale
    const seatSize = logicalRadius * 2

    // 第一排方向
    const { ux, uy, dist } = getUnitVector(this._multiRowStart, this._multiRowEnd)
    const count = Math.max(1, Math.round(dist / spacing))

    // 多排方向（垂直于第一排）
    const perpX = -uy
    const perpY = ux
    const depthX = pos.x - this._multiRowStart.x
    const depthY = pos.y - this._multiRowStart.y
    const depthSign = depthX * perpX + depthY * perpY
    const rowCount = Math.max(1, Math.round(Math.abs(depthSign) / rowSpacing))
    const actualPerpX = depthSign > 0 ? perpX : -perpX
    const actualPerpY = depthSign > 0 ? perpY : -perpY

    for (let r = 0; r < rowCount; r++) {
      const offsetX = actualPerpX * rowSpacing * r
      const offsetY = actualPerpY * rowSpacing * r
      const points: number[] = []

      for (let i = 0; i < count; i++) {
        const sx = this._multiRowStart.x + ux * spacing * i + offsetX
        const sy = this._multiRowStart.y + uy * spacing * i + offsetY
        points.push(sx, sy)

        // 预览座位圆
        const dot = new Ellipse({
          x: sx, y: sy,
          width: seatSize, height: seatSize,
          around: 'center',
          fill: PREVIEW_FILL,
          stroke: PREVIEW_MULTI_STROKE,
          strokeWidth: 1,
        })
        this.previewGroup.add(dot)
        this._previewElements.push(dot)
      }

      // 预览排线
      const line = new Line({
        points,
        stroke: PREVIEW_MULTI_STROKE,
        strokeWidth: seatSize,
        strokeCap: 'round',
        opacity: 0.8,
      })
      this.previewGroup.add(line)
      this._previewElements.push(line)
    }

    // 计数标签
    const total = count * rowCount
    const cx = this._multiRowStart.x + depthX / 2 + actualPerpX * rowSpacing * (rowCount - 1) / 2
    const cy = this._multiRowStart.y + depthY / 2 + actualPerpY * rowSpacing * (rowCount - 1) / 2
    const label = new Text({
      x: cx, y: cy - 7,
      text: `${count}×${rowCount} = ${total}座`,
      fontSize: 14,
      fill: PREVIEW_MULTI_LABEL,
      textAlign: 'center',
    })
    this.previewGroup.add(label)
    this._previewElements.push(label)
  }

  private _submitMultiRows(pos: Position): void {
    if (!this._multiRowStart || !this._multiRowEnd) return
    const store = useVenueStore()
    const baseScale = store.getBaseScale() || 1
    const spacing = SEAT_SPACING / baseScale
    const rowSpacing = ROW_SPACING / baseScale

    const { ux, uy, dist } = getUnitVector(this._multiRowStart, this._multiRowEnd)
    const count = Math.max(1, Math.round(dist / spacing))
    const perpX = -uy, perpY = ux
    const depthX = pos.x - this._multiRowStart.x
    const depthY = pos.y - this._multiRowStart.y
    const depthSign = depthX * perpX + depthY * perpY
    const rowCount = Math.max(1, Math.round(Math.abs(depthSign) / rowSpacing))
    const actualPerpX = depthSign > 0 ? perpX : -perpX
    const actualPerpY = depthSign > 0 ? perpY : -perpY

    let sectionId: string
    if (store.venue.sections.length === 0) {
      sectionId = store.addSection({ name: '默认区域', rows: [], x: 0, y: 0 })
    } else {
      sectionId = store.venue.sections[0].id
    }

    let firstRowId: string | undefined
    for (let r = 0; r < rowCount; r++) {
      const offsetX = actualPerpX * rowSpacing * r
      const offsetY = actualPerpY * rowSpacing * r
      const seats: any[] = []
      for (let i = 0; i < count; i++) {
        seats.push({
          id: generateId(),
          // 相对 row origin 的偏移量
          x: ux * spacing * i,
          y: uy * spacing * i,
          status: 'available',
          categoryKey: 'default',
          label: String(i + 1),
        })
      }
      const rid = store.addRow(sectionId, {
        x: this._multiRowStart.x + offsetX,
        y: this._multiRowStart.y + offsetY,
        seats,
        seatSpacing: spacing,
        label: `排${r + 1}`,
      })
      if (r === 0) firstRowId = rid
    }

    store.saveHistory()
    this.resetState()
    this._onRenderAll()
    this._onSubmitComplete?.({ kind: 'row', id: firstRowId! })
  }

  // ==================== 矩形 / 椭圆 ====================

  private _onShapeDragStart(pos: Position): void {
    this._dragStartPos = pos
  }

  private _onShapeDragMove(pos: Position): void {
    if (!this._dragStartPos) return
    this._dragEndPos = pos
    this._clearPreview()

    const x = Math.min(this._dragStartPos.x, pos.x)
    const y = Math.min(this._dragStartPos.y, pos.y)
    const w = Math.abs(pos.x - this._dragStartPos.x)
    const h = Math.abs(pos.y - this._dragStartPos.y)

    if (w < 5 && h < 5) return

    if (this._currentTool === 'draw_rect') {
      const rect = new Rect({
        x, y, width: w, height: h,
        fill: PREVIEW_FILL,
        stroke: PREVIEW_STROKE,
        strokeWidth: 2,
      })
      this.previewGroup.add(rect)
      this._previewElements.push(rect)
    }
  }

  private _onShapeDragEnd(): void {
    if (!this._dragStartPos || !this._dragEndPos) return
    this._clearPreview()

    const store = useVenueStore()
    const x = Math.min(this._dragStartPos.x, this._dragEndPos.x)
    const y = Math.min(this._dragStartPos.y, this._dragEndPos.y)
    const w = Math.abs(this._dragEndPos.x - this._dragStartPos.x)
    const h = Math.abs(this._dragEndPos.y - this._dragStartPos.y)

    if (w < 5 && h < 5) {
      this._dragStartPos = null
      this._dragEndPos = null
      return
    }

    let sectionId: string
    if (store.venue.sections.length === 0) {
      sectionId = store.addSection({ name: '默认区域', rows: [], x: 0, y: 0 })
    } else {
      sectionId = store.venue.sections[0].id
    }

    let shapeId: string | undefined
    if (this._currentTool === 'draw_rect') {
      // Rect 原点为左上角，直接存左上角坐标，与 SectionRenderer 一致
      shapeId = store.addShape(sectionId, {
        type: 'rect',
        x,
        y,
        width: w,
        height: h,
        rotation: 0,
        fill: 'rgba(59,130,246,0.15)',
        stroke: '#3b82f6',
        strokeWidth: 2,
      })
    }

    store.saveHistory()
    this._dragStartPos = null
    this._dragEndPos = null
    this._onRenderAll()
    if (shapeId) this._onSubmitComplete?.({ kind: 'shape', id: shapeId })
  }

  // ==================== 多边形 ====================

  private _onPolygonClick(pos: Position): void {
    // draw_polyline: 双击完成（由外部处理），不闭合
    // draw_polygon / draw_area: 点击起点附近闭合
    if (this._currentTool !== 'draw_polyline') {
      if (this._polygonPoints.length >= 3) {
        const start = this._polygonPoints[0]
        const dx = pos.x - start.x
        const dy = pos.y - start.y
        if (Math.hypot(dx, dy) < SNAP_TO_START_DISTANCE) {
          this._submitPolygon()
          return
        }
      }
    } else if (this._polygonPoints.length >= 2) {
      // polyline: double-click to finish (detected by rapid clicks near last point)
      const last = this._polygonPoints[this._polygonPoints.length - 1]
      if (Math.hypot(pos.x - last.x, pos.y - last.y) < SNAP_TO_START_DISTANCE) {
        this._submitPolygon()
        return
      }
    }
    this._polygonPoints.push({ ...pos })
    this._showPolygonPreview()
  }

  private _onPolygonMove(pos: Position): void {
    if (this._polygonPoints.length > 0) {
      this._showPolygonPreview(pos)
    }
  }

  private _showPolygonPreview(currentPos?: Position): void {
    this._clearPreview()

    if (this._polygonPoints.length < 2 && !currentPos) return

    const allPoints = [...this._polygonPoints]
    if (currentPos) allPoints.push(currentPos)
    const flatPoints = allPoints.flatMap(p => [p.x, p.y])

    const line = new Line({
      points: flatPoints,
      stroke: PREVIEW_STROKE,
      strokeWidth: 2,
      strokeCap: 'round',
      strokeJoin: 'round',
      closed: false,
    })
    this.previewGroup.add(line)
    this._previewElements.push(line)

    // 顶点圆（around: 'center' 确保圆心在顶点坐标上）
    this._polygonPoints.forEach(p => {
      const dot = new Ellipse({
        x: p.x, y: p.y,
        width: 10, height: 10,
        around: 'center',
        fill: '#ffffff',
        stroke: PREVIEW_STROKE,
        strokeWidth: 2,
        hitFill: 'all',
      })
      this.previewGroup.add(dot)
      this._previewElements.push(dot)
    })
  }

  private _submitPolygon(): void {
    const store = useVenueStore()

    if (this._currentTool === 'draw_polyline') {
      if (this._polygonPoints.length < 2) return
      let sectionId: string
      if (store.venue.sections.length === 0) {
        sectionId = store.addSection({ name: '默认区域', rows: [], x: 0, y: 0 })
      } else {
        sectionId = store.venue.sections[0].id
      }
      const center = calculatePolygonCenter(this._polygonPoints)
      const relativePoints = toRelativePoints(this._polygonPoints, center)
      const polylineId = store.addShape(sectionId, {
        type: 'polyline',
        x: center.x,
        y: center.y,
        rotation: 0,
        points: relativePoints,
        fill: 'transparent',
        stroke: '#3b82f6',
        strokeWidth: 2,
      })
      store.saveHistory()
      this.resetState()
      this._onRenderAll()
      this._onSubmitComplete?.({ kind: 'shape', id: polylineId! })
      return
    }

    if (this._currentTool === 'draw_area') {
      if (this._polygonPoints.length < 3) return
      let sectionId: string
      if (store.venue.sections.length === 0) {
        sectionId = store.addSection({ name: '默认区域', rows: [], x: 0, y: 0 })
      } else {
        sectionId = store.venue.sections[0].id
      }
      // 存绝对坐标，因为 createArea 渲染时 Polygon 无 x/y 偏移
      const flatPoints = this._polygonPoints.flatMap(p => [p.x, p.y])
      const areaId = store.addArea(sectionId, {
        type: 'area',
        label: `区域${store.venue.sections.find(s => s.id === sectionId)?.areas?.length ?? 0 + 1}`,
        points: flatPoints,
        fill: 'rgba(59,130,246,0.15)',
      })
      store.saveHistory()
      this.resetState()
      this._onRenderAll()
      this._onSubmitComplete?.({ kind: 'area', id: areaId! })
      return
    }

    // draw_polygon: 创建分区
    if (this._polygonPoints.length < 3) return
    const center = calculatePolygonCenter(this._polygonPoints)
    const relativePoints = toRelativePoints(this._polygonPoints, center)

    const sectionId = store.addSection({
      name: `分区${store.venue.sections.length + 1}`,
      rows: [],
      borderType: 'polygon',
      borderX: center.x,
      borderY: center.y,
      borderPoints: relativePoints,
    })

    store.saveHistory()
    this.resetState()
    this._onRenderAll()
    this._onSubmitComplete?.({ kind: 'section', id: sectionId })
  }

  // ==================== 文字 ====================

  private _onTextClick(pos: Position): void {
    const store = useVenueStore()
    let sectionId: string
    if (store.venue.sections.length === 0) {
      sectionId = store.addSection({ name: '默认区域', rows: [], x: 0, y: 0 })
    } else {
      sectionId = store.venue.sections[0].id
    }

    const textId = store.addText(sectionId, {
      type: 'text',
      x: pos.x,
      y: pos.y,
      text: '文字',
      fontSize: 16,
      fill: '#333',
      align: 'center',
    })

    store.saveHistory()
    this.resetState()
    this._onRenderAll()
    this._onSubmitComplete?.({ kind: 'text', id: textId! })
  }

  // ==================== Preview Helpers ====================

  private _clearPreview(): void {
    this.previewGroup.clear()
    this._previewElements = []
  }

  private _showCursorCircle(pos: Position): void {
    this._clearPreview()
    const dot = new Ellipse({
      x: pos.x, y: pos.y,
      width: 8, height: 8,
      around: 'center',
      fill: PREVIEW_STROKE,
    })
    this.previewGroup.add(dot)
    this._previewElements.push(dot)
  }

  private _showSeatRowPreview(): void {
    if (!this._seatStartPos || !this._seatCurrentPos) return
    this._clearPreview()

    const store = useVenueStore()
    const baseScale = store.getBaseScale() || 1
    const spacing = SEAT_SPACING / baseScale
    const logicalRadius = (store.visualConfig?.radius ?? 6) / baseScale
    const seatSize = logicalRadius * 2

    const { ux, uy, dist } = getUnitVector(this._seatStartPos, this._seatCurrentPos)
    const count = Math.max(1, Math.round(dist / spacing))
    const points: number[] = []

    for (let i = 0; i < count; i++) {
      points.push(
        this._seatStartPos.x + ux * spacing * i,
        this._seatStartPos.y + uy * spacing * i
      )
    }

    // 预览线
    const line = new Line({
      points,
      stroke: PREVIEW_STROKE,
      strokeWidth: seatSize,
      strokeCap: 'round',
      opacity: 0.8,
    })
    this.previewGroup.add(line)
    this._previewElements.push(line)

    // 预览座位圆
    for (let i = 0; i < count; i++) {
      const x = this._seatStartPos.x + ux * spacing * i
      const y = this._seatStartPos.y + uy * spacing * i
      const dot = new Ellipse({
        x, y,
        width: seatSize, height: seatSize,
        around: 'center',
        fill: PREVIEW_FILL,
        stroke: PREVIEW_STROKE,
        strokeWidth: 1,
      })
      this.previewGroup.add(dot)
      this._previewElements.push(dot)
    }

    // 数量标签
    const midX = this._seatStartPos.x + (this._seatCurrentPos.x - this._seatStartPos.x) / 2
    const midY = this._seatStartPos.y + (this._seatCurrentPos.y - this._seatStartPos.y) / 2
    const label = new Text({
      x: midX, y: midY - 7,
      text: String(count),
      fontSize: 14,
      fill: PREVIEW_LABEL,
      textAlign: 'center',
    })
    this.previewGroup.add(label)
    this._previewElements.push(label)
  }
}
