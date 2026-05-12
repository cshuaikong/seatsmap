import { Group, Ellipse, Line } from 'leafer-ui'
import type { VenueData, Seat, SeatRow, Section } from '../types'
import { SEAT_STATUS } from '../types'
import { calculateCurvedPositions } from './geometry'

export interface SeatRenderConfig {
  baseScale: number
  radius: number
  gap: number
  rowGap: number
  borderWidth: number
}

interface RowLODGroups {
  lineGroup: Group
  circleGroup: Group
  rowGroup?: Group
}

export class SeatRenderer {
  readonly rootGroup: Group
  readonly seatMap = new Map<string, Ellipse>()
  readonly rowLODMap = new Map<string, RowLODGroups>()

  private venue: VenueData
  private config: SeatRenderConfig
  private getCategoryColor: (key: string | number) => string
  private darkenColor: (color: string, percent: number) => string
  private onSeatClick?: (seat: Seat, row: SeatRow, section: Section) => void
  private editMode: boolean

  constructor(
    venue: VenueData,
    config: SeatRenderConfig,
    getCategoryColor: (key: string | number) => string,
    darkenColor: (color: string, percent: number) => string,
    onSeatClick?: (seat: Seat, row: SeatRow, section: Section) => void,
    editMode?: boolean,
  ) {
    this.venue = venue
    this.config = config
    this.getCategoryColor = getCategoryColor
    this.darkenColor = darkenColor
    this.onSeatClick = onSeatClick
    this.editMode = editMode ?? false
    this.rootGroup = new Group({ id: 'seat-root' })
  }

  /** 全量渲染所有座位，创建 LOD 两级结构 */
  render(): void {
    this.rootGroup.clear()
    this.seatMap.clear()
    this.rowLODMap.clear()

    const { venue, config } = this
    const { baseScale } = config
    const logicalRadius = config.radius / baseScale

    venue.sections.forEach(section => {
      const sectionGroup = new Group({ id: `seats-${section.id}` })

      section.rows.forEach(row => {
        const rowX = row.x ?? 0
        const rowY = row.y ?? 0
        const rotation = row.rotation ?? 0
        const curve = row.curve ?? 0

        const curvedPositions = calculateCurvedPositions(row.seats, curve)

        const lineGroup = new Group({ id: `line-${row.id}`, visible: false })
        const circleGroup = new Group({ id: `circle-${row.id}`, visible: false })

        let rowGroup: Group | undefined
        if (this.editMode) {
          // 编辑模式：rowGroup 承载位置和旋转，内部坐标相对于 rowGroup
          this.createSeatLine(lineGroup, row, curvedPositions, 0)
          this.createSeatCircles(circleGroup, row, section, curvedPositions, 0, logicalRadius)

          rowGroup = new Group({ id: `row-${row.id}`, x: rowX, y: rowY, rotation, editable: true })
          rowGroup.add(lineGroup)
          rowGroup.add(circleGroup)
          sectionGroup.add(rowGroup)
        } else {
          // 预览模式：手动应用偏移和旋转
          this.createSeatLine(lineGroup, row, curvedPositions, rotation, rowX, rowY)
          this.createSeatCircles(circleGroup, row, section, curvedPositions, rotation, logicalRadius, rowX, rowY)

          sectionGroup.add(lineGroup)
          sectionGroup.add(circleGroup)
        }

        this.rowLODMap.set(row.id, { lineGroup, circleGroup, rowGroup: this.editMode ? rowGroup : undefined })
      })

      this.rootGroup.add(sectionGroup)
    })
  }

  /** 创建 LOD Level 1 座位条 */
  private createSeatLine(
    group: Group,
    row: SeatRow,
    positions: Array<{ x: number; y: number }>,
    rotation: number,
    offsetX?: number,
    offsetY?: number,
  ): void {
    if (row.seats.length === 0) return

    const ox = offsetX ?? 0
    const oy = offsetY ?? 0

    const points: number[] = []
    positions.forEach(pos => {
      points.push(ox + pos.x, oy + pos.y)
    })

    const rotatedPoints = rotation
      ? this.applyRotation(points, ox, oy, rotation)
      : points

    const color = row.seats[0]
      ? this.getCategoryColor(row.seats[0].categoryKey)
      : '#9E9E9E'

    const strokeWidth = (this.config.radius * 2) / this.config.baseScale

    const line = new Line({
      points: rotatedPoints,
      stroke: color,
      strokeWidth,
      strokeCap: 'round',
      strokeJoin: 'round',
      opacity: 0.4,
    })

    group.add(line)
  }

  /** 创建 LOD Level 2 圆形座位 */
  private createSeatCircles(
    group: Group,
    row: SeatRow,
    section: Section,
    positions: Array<{ x: number; y: number }>,
    rotation: number,
    logicalRadius: number,
    offsetX?: number,
    offsetY?: number,
  ): void {
    const { borderWidth, baseScale } = this.config
    const ox = offsetX ?? 0
    const oy = offsetY ?? 0

    row.seats.forEach((seat, index) => {
      const pos = positions[index]
      let x = ox + pos.x
      let y = oy + pos.y

      if (rotation) {
        const rad = rotation * Math.PI / 180
        const relX = x - ox
        const relY = y - oy
        x = ox + relX * Math.cos(rad) - relY * Math.sin(rad)
        y = oy + relX * Math.sin(rad) + relY * Math.cos(rad)
      }

      const color = this.getCategoryColor(seat.categoryKey)
      const borderColor = this.darkenColor(color, 50)
      const isSelected = seat.status === SEAT_STATUS.SELECTED
      const strokeW = borderWidth / baseScale

      if (isSelected) {
        // 选中态：双层同心圆
        const inner = new Ellipse({
          id: `seat-${seat.id}-inner`,
          x, y,
          width: logicalRadius * 2,
          height: logicalRadius * 2,
          around: 'center',
          fill: color,
        })

        const outer = new Ellipse({
          id: `seat-${seat.id}-outer`,
          x, y,
          width: (logicalRadius + 1 / baseScale + strokeW / 2) * 2,
          height: (logicalRadius + 1 / baseScale + strokeW / 2) * 2,
          around: 'center',
          stroke: borderColor,
          strokeWidth: strokeW,
          fill: 'transparent',
        })

        group.add(outer)
        group.add(inner)

        // 存 inner 以便选中切换时定位
        this.seatMap.set(seat.id, inner as Ellipse)
      } else {
        // 未选中态
        const ellipse = new Ellipse({
          id: `seat-${seat.id}`,
          x, y,
          width: logicalRadius * 2,
          height: logicalRadius * 2,
          around: 'center',
          fill: color,
          stroke: borderColor,
          strokeWidth: strokeW,
        })

        group.add(ellipse)
        this.seatMap.set(seat.id, ellipse as Ellipse)
      }

      // 绑定点击事件
      const el = this.seatMap.get(seat.id)
      if (el && this.onSeatClick) {
        el.on('tap', () => this.onSeatClick!(seat, row, section))
        el.cursor = 'pointer'
      }
    })
  }

  /** 应用旋转到坐标数组 */
  private applyRotation(
    points: number[],
    cx: number,
    cy: number,
    rotationDeg: number
  ): number[] {
    const rad = rotationDeg * Math.PI / 180
    const cos = Math.cos(rad)
    const sin = Math.sin(rad)
    const result: number[] = []

    for (let i = 0; i < points.length; i += 2) {
      const relX = points[i] - cx
      const relY = points[i + 1] - cy
      result.push(cx + relX * cos - relY * sin)
      result.push(cy + relX * sin + relY * cos)
    }

    return result
  }

  /** 更新 LOD 可见性 + 动态线宽补偿 */
  updateLOD(currentScale: number): void {
    const { baseScale, radius } = this.config
    const relativeScale = currentScale / baseScale

    // Level 1 (座位条): relativeScale < 0.5  即 zoom < 50% 设计比例
    // Level 2 (圆形座): relativeScale >= 0.5 即 zoom >= 50% 设计比例
    const showLevel1 = relativeScale < 0.5
    const showLevel2 = !showLevel1

    const baseLineWidth = (radius * 2) / baseScale
    const MIN_SCREEN_PX = 1.5

    this.rowLODMap.forEach(({ lineGroup, circleGroup, rowGroup }) => {
      lineGroup.visible = showLevel1
      circleGroup.visible = showLevel2
      // 横条状态下排不可选中
      if (rowGroup) rowGroup.editable = showLevel2

      if (showLevel1) {
        const line = lineGroup.children[0]
        if (line) {
          const scaleForCalc = Math.max(currentScale, 0.01)
          const adjusted = Math.max(baseLineWidth, MIN_SCREEN_PX / scaleForCalc)
          if (line.strokeWidth !== adjusted) {
            line.strokeWidth = adjusted
          }
        }
      }
    })
  }

  /** 更新单个座位的外观（选中/取消选中） */
  updateSeatAppearance(seat: Seat): void {
    const el = this.seatMap.get(seat.id)
    if (!el) return

    const color = this.getCategoryColor(seat.categoryKey)
    const borderColor = this.darkenColor(color, 50)
    const isSelected = seat.status === SEAT_STATUS.SELECTED
    const newStrokeWidth = isSelected
      ? (this.config.borderWidth / this.config.baseScale) + 1
      : this.config.borderWidth / this.config.baseScale

    // 只在值实际变化时才更新，避免不必要的重绘闪烁
    if (el.fill !== color) el.fill = color
    if (el.stroke !== borderColor) el.stroke = borderColor
    if (el.strokeWidth !== newStrokeWidth) el.strokeWidth = newStrokeWidth
  }

  /** 批量同步选中状态 */
  syncSelection(selectedIds: Set<string>): void {
    this.seatMap.forEach((_el, seatId) => {
      const isSelected = selectedIds.has(seatId)
      const seat = this.findSeat(seatId)
      if (!seat) return

      const expectedStatus = isSelected ? SEAT_STATUS.SELECTED : SEAT_STATUS.AVAILABLE
      if (seat.status !== expectedStatus) {
        seat.status = expectedStatus
        this.updateSeatAppearance(seat)
      }
    })
  }

  /** 查找座位数据 */
  private findSeat(seatId: string): Seat | null {
    for (const section of this.venue.sections) {
      for (const row of section.rows) {
        const seat = row.seats.find(s => s.id === seatId)
        if (seat) return seat
      }
    }
    return null
  }
}
