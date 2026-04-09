<template>
  <div ref="containerRef" class="seat-map-viewer"></div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue'
import Konva from 'konva'
import type { VenueData, Seat, SeatRow, Section, Category } from '../types'

const props = defineProps<{
  venue: VenueData
  width?: number
  height?: number
  // 是否允许选择座位（预览模式可以设为 false）
  selectable?: boolean
  // 已选中的座位ID列表
  selectedSeatIds?: string[]
}>()

const emit = defineEmits<{
  'seat-click': [seat: Seat, row: SeatRow, section: Section]
  'seat-hover': [seat: Seat | null]
}>()

const containerRef = ref<HTMLDivElement>()
let stage: Konva.Stage | null = null
let layer: Konva.Layer | null = null
let seatNodes: Map<string, Konva.Circle> = new Map()

// 默认座位半径
const SEAT_RADIUS = 6
const SEAT_SPACING = 18

// 初始化舞台
const initStage = () => {
  if (!containerRef.value) return

  const width = props.width || containerRef.value.clientWidth
  const height = props.height || containerRef.value.clientHeight

  stage = new Konva.Stage({
    container: containerRef.value,
    width,
    height,
    draggable: true
  })

  layer = new Konva.Layer()
  stage.add(layer)

  // 鼠标滚轮缩放
  stage.on('wheel', (e) => {
    e.evt.preventDefault()
    const scaleBy = 1.1
    const oldScale = stage!.scaleX()
    const pointer = stage!.getPointerPosition()!
    
    const mousePointTo = {
      x: (pointer.x - stage!.x()) / oldScale,
      y: (pointer.y - stage!.y()) / oldScale
    }
    
    const newScale = e.evt.deltaY > 0 ? oldScale / scaleBy : oldScale * scaleBy
    
    stage!.scale({ x: newScale, y: newScale })
    stage!.position({
      x: pointer.x - mousePointTo.x * newScale,
      y: pointer.y - mousePointTo.y * newScale
    })
  })
}

// 获取分类颜色
const getCategoryColor = (categoryKey: string | number): string => {
  const category = props.venue.categories.find(c => c.key === categoryKey)
  return category?.color || '#9E9E9E'
}

// 渲染座位图
const renderSeatMap = () => {
  if (!layer || !props.venue) return

  layer.destroyChildren()
  seatNodes.clear()

  // 计算边界
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
  let hasSeats = false

  props.venue.sections.forEach(section => {
    section.rows.forEach(row => {
      const rowX = row.x || 0
      const rowY = row.y || 0
      row.seats.forEach(seat => {
        hasSeats = true
        const x = rowX + seat.x
        const y = rowY + seat.y
        minX = Math.min(minX, x - SEAT_RADIUS)
        minY = Math.min(minY, y - SEAT_RADIUS)
        maxX = Math.max(maxX, x + SEAT_RADIUS)
        maxY = Math.max(maxY, y + SEAT_RADIUS)
      })
    })
  })

  if (!hasSeats) return

  // 居中显示
  const stageWidth = stage!.width()
  const stageHeight = stage!.height()
  const contentWidth = maxX - minX
  const contentHeight = maxY - minY
  const scale = Math.min(
    (stageWidth - 40) / contentWidth,
    (stageHeight - 40) / contentHeight,
    1
  )

  const offsetX = (stageWidth - contentWidth * scale) / 2 - minX * scale
  const offsetY = (stageHeight - contentHeight * scale) / 2 - minY * scale

  stage!.scale({ x: scale, y: scale })
  stage!.position({ x: offsetX, y: offsetY })

  // 渲染每个 section
  props.venue.sections.forEach(section => {
    renderSection(section)
  })

  layer.batchDraw()
}

// 渲染单个 section
const renderSection = (section: Section) => {
  section.rows.forEach(row => {
    renderRow(row, section)
  })
}

// 渲染排标签
const renderRowLabel = (row: SeatRow, section: Section) => {
  if (!row.label || !layer) return

  const rowX = row.x || 0
  const rowY = row.y || 0

  // 计算排标签位置（排在左侧）
  const firstSeat = row.seats[0]
  if (!firstSeat) return

  const labelX = rowX + firstSeat.x - SEAT_SPACING
  const labelY = rowY + firstSeat.y

  const label = new Konva.Text({
    x: labelX,
    y: labelY - 6,
    text: row.label,
    fontSize: 12,
    fontFamily: 'Inter, sans-serif',
    fill: '#666',
    align: 'right',
    width: SEAT_SPACING - 4
  })

  layer!.add(label)
}

// 渲染单行
const renderRow = (row: SeatRow, section: Section) => {
  const rowX = row.x || 0
  const rowY = row.y || 0

  // 先渲染排标签
  renderRowLabel(row, section)

  // 渲染座位
  row.seats.forEach(seat => {
    renderSeat(seat, row, section)
  })
}

// 渲染单个座位
const renderSeat = (seat: Seat, row: SeatRow, section: Section) => {
  const rowX = row.x || 0
  const rowY = row.y || 0
  const x = rowX + seat.x
  const y = rowY + seat.y

  const isSelected = props.selectedSeatIds?.includes(seat.id)
  const categoryColor = getCategoryColor(seat.categoryKey)

  // 座位圆形
  const circle = new Konva.Circle({
    x,
    y,
    radius: SEAT_RADIUS,
    fill: isSelected ? '#FF5722' : categoryColor,
    stroke: isSelected ? '#FF5722' : '#fff',
    strokeWidth: isSelected ? 2 : 1,
    shadowColor: 'rgba(0,0,0,0.2)',
    shadowBlur: 2,
    shadowOffset: { x: 0, y: 1 },
    cursor: props.selectable !== false ? 'pointer' : 'default'
  })

  // 座位标签（编号）
  if (seat.label) {
    const label = new Konva.Text({
      x: x - SEAT_RADIUS,
      y: y + SEAT_RADIUS + 2,
      text: seat.label,
      fontSize: 9,
      fontFamily: 'Inter, sans-serif',
      fill: '#666',
      align: 'center',
      width: SEAT_RADIUS * 2
    })
    layer!.add(label)
  }

  // 交互事件
  if (props.selectable !== false) {
    circle.on('click tap', () => {
      emit('seat-click', seat, row, section)
    })

    circle.on('mouseenter', () => {
      circle.scale({ x: 1.2, y: 1.2 })
      layer!.batchDraw()
      emit('seat-hover', seat)
    })

    circle.on('mouseleave', () => {
      circle.scale({ x: 1, y: 1 })
      layer!.batchDraw()
      emit('seat-hover', null)
    })
  }

  layer!.add(circle)
  seatNodes.set(seat.id, circle)
}

// 更新座位选中状态
const updateSelection = () => {
  seatNodes.forEach((node, seatId) => {
    const isSelected = props.selectedSeatIds?.includes(seatId)
    const seat = findSeatById(seatId)
    if (seat) {
      const categoryColor = getCategoryColor(seat.categoryKey)
      node.fill(isSelected ? '#FF5722' : categoryColor)
      node.stroke(isSelected ? '#FF5722' : '#fff')
      node.strokeWidth(isSelected ? 2 : 1)
    }
  })
  layer?.batchDraw()
}

// 根据ID查找座位
const findSeatById = (seatId: string): Seat | null => {
  for (const section of props.venue.sections) {
    for (const row of section.rows) {
      const seat = row.seats.find(s => s.id === seatId)
      if (seat) return seat
    }
  }
  return null
}

// 监听数据变化
watch(() => props.venue, () => {
  renderSeatMap()
}, { deep: true })

watch(() => props.selectedSeatIds, () => {
  updateSelection()
}, { deep: true })

onMounted(() => {
  initStage()
  renderSeatMap()
})

onUnmounted(() => {
  if (stage) {
    stage.destroy()
    stage = null
  }
})
</script>

<style scoped>
.seat-map-viewer {
  width: 100%;
  height: 100%;
  background: #fff;
  border-radius: 8px;
  overflow: hidden;
}
</style>
