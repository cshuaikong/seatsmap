<template>
  <div ref="containerRef" class="seat-map-viewer"></div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue'
import Konva from 'konva'
import type { VenueData, Seat, SeatRow, Section } from '../types'

const props = defineProps<{
  venue: VenueData
  width?: number
  height?: number
  selectable?: boolean
  selectedSeatIds?: string[]
}>()

const emit = defineEmits<{
  'seat-click': [seat: Seat, row: SeatRow, section: Section]
  'update:selectedSeatIds': [seatIds: string[]]
}>()

const containerRef = ref<HTMLDivElement>()
let stage: Konva.Stage | null = null
let layer: Konva.Layer | null = null
let seatNodes: Map<string, Konva.Circle> = new Map() // 存储座位节点用于更新状态

const SEAT_RADIUS = 6

// 计算弧形位置
const calculateCurvedPositions = (seats: Seat[], curve: number): Array<{ x: number; y: number }> => {
  if (!curve || curve === 0 || seats.length < 2) {
    return seats.map(seat => ({ x: seat.x, y: seat.y }))
  }

  const count = seats.length
  const firstSeat = seats[0]
  const lastSeat = seats[count - 1]
  
  const dx = lastSeat.x - firstSeat.x
  const dy = lastSeat.y - firstSeat.y
  const length = Math.sqrt(dx * dx + dy * dy)
  const baseAngle = Math.atan2(dy, dx)
  
  const maxCurveAngle = curve * (Math.PI / 180)
  const chordLength = length
  const curveAngle = Math.abs(maxCurveAngle)
  const radius = curveAngle > 0.001 ? chordLength / (2 * Math.sin(curveAngle / 2)) : Infinity
  
  const midX = (firstSeat.x + lastSeat.x) / 2
  const midY = (firstSeat.y + lastSeat.y) / 2
  
  const perpX = -Math.sin(baseAngle) * (curve > 0 ? 1 : -1)
  const perpY = Math.cos(baseAngle) * (curve > 0 ? 1 : -1)
  
  const centerX = midX + perpX * Math.sqrt(Math.max(0, radius * radius - (chordLength / 2) * (chordLength / 2)))
  const centerY = midY + perpY * Math.sqrt(Math.max(0, radius * radius - (chordLength / 2) * (chordLength / 2)))
  
  const startAngle = Math.atan2(firstSeat.y - centerY, firstSeat.x - centerX)
  const endAngle = Math.atan2(lastSeat.y - centerY, lastSeat.x - centerX)
  const angleStep = (endAngle - startAngle) / (count - 1)
  
  return seats.map((_, index) => {
    const angle = startAngle + angleStep * index
    return {
      x: centerX + radius * Math.cos(angle),
      y: centerY + radius * Math.sin(angle)
    }
  })
}

// 获取分类颜色
const getCategoryColor = (categoryKey: string | number): string => {
  if (categoryKey === 0 || categoryKey === '0') return '#BDBDBD'
  const category = props.venue.categories.find(c => String(c.key) === String(categoryKey))
  return category?.color || '#9E9E9E'
}

// 初始化舞台
const initStage = () => {
  if (!containerRef.value) return

  const width = props.width || containerRef.value.clientWidth || 800
  const height = props.height || containerRef.value.clientHeight || 600

  stage = new Konva.Stage({
    container: containerRef.value,
    width,
    height,
    draggable: false // 禁用舞台拖拽，避免影响座位点击
  })

  layer = new Konva.Layer({
    listening: true // 确保层接收事件
  })
  stage.add(layer)

  // 简单的滚轮缩放
  stage.on('wheel', (e) => {
    e.evt.preventDefault()
    const scaleBy = 1.1
    const oldScale = stage!.scaleX()
    const newScale = e.evt.deltaY > 0 ? oldScale / scaleBy : oldScale * scaleBy
    stage!.scale({ x: newScale, y: newScale })
    layer?.batchDraw()
  })
}

// 渲染座位图
const renderSeatMap = () => {
  if (!layer) return

  layer.destroyChildren()
  seatNodes.clear() // 清空座位节点映射

  // 渲染所有 section
  props.venue.sections.forEach(section => {
    // 渲染形状
    section.shapes?.forEach(shape => {
      if (shape.type === 'rect') {
        layer!.add(new Konva.Rect({
          x: shape.x,
          y: shape.y,
          width: shape.width || 100,
          height: shape.height || 100,
          fill: shape.fill || 'rgba(156, 163, 175, 0.6)',
          rotation: shape.rotation || 0
        }))
      } else if (shape.type === 'ellipse') {
        layer!.add(new Konva.Ellipse({
          x: shape.x,
          y: shape.y,
          radiusX: (shape.width || 100) / 2,
          radiusY: (shape.height || 100) / 2,
          fill: shape.fill || 'rgba(156, 163, 175, 0.6)',
          rotation: shape.rotation || 0
        }))
      }
    })

    // 渲染文本
    section.texts?.forEach(text => {
      layer!.add(new Konva.Text({
        x: text.x,
        y: text.y,
        text: text.text || text.caption || '',
        fontSize: text.fontSize || 14,
        fill: text.fill || text.textColor || '#333',
        rotation: text.rotation || 0
      }))
    })

    // 渲染区域
    section.areas?.forEach(area => {
      layer!.add(new Konva.Line({
        points: area.points || [],
        fill: area.fill || 'rgba(100, 100, 100, 0.3)',
        closed: true
      }))
    })

    // 使用 Group 渲染排和座位
    section.rows.forEach(row => {
      renderRowGroup(row, section)
    })
  })

  layer.batchDraw()
}

// 渲染排 Group
const renderRowGroup = (row: SeatRow, section: Section) => {
  if (!layer) return

  const rowX = row.x || 0
  const rowY = row.y || 0
  const rotation = row.rotation || 0
  const curve = row.curve || 0
  
  const curvedPositions = calculateCurvedPositions(row.seats, curve)

  // 排标签
  if (row.label && row.seats.length > 0) {
    const firstPos = curvedPositions[0]
    let labelX = rowX - SEAT_RADIUS * 3
    let labelY = rowY - SEAT_RADIUS + firstPos.y - 6
    
    // 考虑旋转
    if (rotation) {
      const rad = rotation * Math.PI / 180
      const relX = labelX - rowX
      const relY = labelY - rowY
      labelX = rowX + relX * Math.cos(rad) - relY * Math.sin(rad)
      labelY = rowY + relX * Math.sin(rad) + relY * Math.cos(rad)
    }
    
    layer.add(new Konva.Text({
      x: labelX,
      y: labelY,
      text: row.label,
      fontSize: 12,
      fill: '#666',
      align: 'left',
      listening: false
    }))
  }

  // 座位（直接添加到 layer，不使用 Group）
  row.seats.forEach((seat, index) => {
    const pos = curvedPositions[index]
    
    // 计算座位位置（考虑 offset 和旋转）
    let x = rowX - SEAT_RADIUS + pos.x
    let y = rowY - SEAT_RADIUS + pos.y
    
    if (rotation) {
      const rad = rotation * Math.PI / 180
      const relX = x - rowX
      const relY = y - rowY
      x = rowX + relX * Math.cos(rad) - relY * Math.sin(rad)
      y = rowY + relX * Math.sin(rad) + relY * Math.cos(rad)
    }
    
    const isSelected = props.selectedSeatIds?.includes(seat.id)
    const color = getCategoryColor(seat.categoryKey)

    // 座位圆形
    const circle = new Konva.Circle({
      x,
      y,
      radius: SEAT_RADIUS,
      fill: isSelected ? '#FF5722' : color,
      stroke: '#fff',
      strokeWidth: 1
    })

    // 座位编号（居中）
    if (seat.label && layer) {
      layer.add(new Konva.Text({
        x: x - SEAT_RADIUS,
        y: y - 4,
        text: seat.label,
        fontSize: 8,
        fill: '#fff',
        align: 'center',
        width: SEAT_RADIUS * 2,
        listening: false
      }))
    }

  // 点击事件 - 切换选择状态
    if (props.selectable !== false) {
      // 使用 mousedown 代替 click，更可靠
      circle.on('mousedown', (e) => {
        console.log('座位点击:', seat.id, seat.label)
        e.cancelBubble = true
        const currentSelected = new Set(props.selectedSeatIds || [])
        if (currentSelected.has(seat.id)) {
          currentSelected.delete(seat.id)
          console.log('取消选择:', seat.id)
        } else {
          currentSelected.add(seat.id)
          console.log('选择:', seat.id)
        }
        emit('update:selectedSeatIds', Array.from(currentSelected))
        emit('seat-click', seat, row, section)
      })
      
      // 鼠标样式
      circle.on('mouseenter', () => {
        if (stage) {
          stage.container().style.cursor = 'pointer'
        }
      })
      circle.on('mouseleave', () => {
        if (stage) {
          stage.container().style.cursor = 'default'
        }
      })
    }

    if (layer) {
      layer.add(circle)
    }
    seatNodes.set(seat.id, circle) // 存储节点用于后续更新
  })
}

// 更新座位选中状态（当 selectedSeatIds 变化时调用）
const updateSelection = () => {
  seatNodes.forEach((circle, seatId) => {
    const isSelected = props.selectedSeatIds?.includes(seatId)
    // 从 seat 对象获取颜色
    let categoryKey: string | number = 1
    for (const section of props.venue.sections) {
      for (const row of section.rows) {
        const seat = row.seats.find(s => s.id === seatId)
        if (seat) {
          categoryKey = seat.categoryKey
          break
        }
      }
    }
    const color = getCategoryColor(categoryKey)
    circle.fill(isSelected ? '#FF5722' : color)
    circle.stroke(isSelected ? '#FF5722' : '#fff')
    circle.strokeWidth(isSelected ? 2 : 1)
  })
  layer?.batchDraw()
}

onMounted(() => {
  initStage()
  setTimeout(renderSeatMap, 50)
})

// 监听选中状态变化，更新座位颜色
watch(() => props.selectedSeatIds, () => {
  updateSelection()
}, { deep: true })

onUnmounted(() => {
  if (stage) {
    stage.destroy()
    stage = null
  }
})

defineExpose({ refresh: renderSeatMap, updateSelection })
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
