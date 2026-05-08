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

  constructor(
    venue: VenueData,
    config: SeatRenderConfig,
    getCategoryColor: (key: string | number) => string,
    darkenColor: (color: string, percent: number) => string,
    onSeatClick?: (seat: Seat, row: SeatRow, section: Section) => void
  ) {
    this.venue = venue
    this.config = config
    this.getCategoryColor = getCategoryColor
    this.darkenColor = darkenColor
    this.onSeatClick = onSeatClick
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

        // LOD Level 1: 座位条（连续线条）
        const lineGroup = new Group({ id: `line-${row.id}`, visible: false })
        this.createSeatLine(lineGroup, row, curvedPositions, rowX, rowY, rotation)

        // LOD Level 2: 圆形座位
        const circleGroup = new Group({ id: `circle-${row.id}`, visible: false })
        this.createSeatCircles(circleGroup, row, section, curvedPositions, rowX, rowY, rotation, logicalRadius)

        this.rowLODMap.set(row.id, { lineGroup, circleGroup })
        sectionGroup.add(lineGroup)
        sectionGroup.add(circleGroup)
      })

      this.rootGroup.add(sectionGroup)
    })
  }

  /** 创建 LOD Level 1 座位条 */
  private createSeatLine(
    group: Group,
    row: SeatRow,
    positions: Array<{ x: number; y: number }>,
    rowX: number,
    rowY: number,
    rotation: number
  ): void {
    if (row.seats.length === 0) return

    const points: number[] = []
    positions.forEach(pos => {
      points.push(rowX + pos.x, rowY + pos.y)
    })

    const rotatedPoints = rotation
      ? this.applyRotation(points, rowX, rowY, rotation)
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
    rowX: number,
    rowY: number,
    rotation: number,
    logicalRadius: number
  ): void {
    const { borderWidth, baseScale } = this.config

    row.seats.forEach((seat, index) => {
      const pos = positions[index]
      let x = rowX + pos.x
      let y = rowY + pos.y

      if (rotation) {
        const rad = rotation * Math.PI / 180
        const relX = x - rowX
        const relY = y - rowY
        x = rowX + relX * Math.cos(rad) - relY * Math.sin(rad)
        y = rowY + relX * Math.sin(rad) + relY * Math.cos(rad)
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
          fill: color,
        })

        const outer = new Ellipse({
          id: `seat-${seat.id}-outer`,
          x, y,
          width: (logicalRadius + 1 / baseScale + strokeW / 2) * 2,
          height: (logicalRadius + 1 / baseScale + strokeW / 2) * 2,
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

  /** 更新 LOD 可见性 */
  updateLOD(currentScale: number): void {
    const { baseScale } = this.config
    const relativeScale = currentScale / baseScale

    // 降低阈值：fitContent 后 scale 可能只有 0.2~0.3，确保初始就能看到座位条
    const showLevel1 = relativeScale >= 0.15 && relativeScale < 0.6
    const showLevel2 = relativeScale >= 0.6

    this.rowLODMap.forEach(({ lineGroup, circleGroup }) => {
      lineGroup.visible = showLevel1
      circleGroup.visible = showLevel2
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
