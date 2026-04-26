<template>
  <div ref="containerRef" class="seat-map-viewer"></div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue'
import Konva from 'konva'
import type { VenueData, Seat, SeatRow, Section, PathPoint } from '../types'
import { useVenueStore } from '../stores/venueStore'

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
let isInitialFit = true // 标记是否是初始自适应

// 【修复】座位半径基于 baseScale 计算，与编辑器一致
const getLogicalRadius = () => {
  // 1. 优先从 store 获取配置（与编辑器实时同步）
  const store = useVenueStore()
  const configRadius = store.visualConfig?.radius || 6
  
  // 2. 从 venue 数据中获取 baseScale（预览模式下使用 venue 自己的 baseScale）
  let baseScale = (props.venue as any).baseScale
  if (!baseScale || baseScale === 1) {
    // 如果 venue 没有 baseScale，从 store 获取
    baseScale = store.getBaseScale()
  }
  
  // 3. 计算逻辑半径：和编辑器存坐标时的逻辑一致
  // 坐标存的是 (pos / baseScale)，半径也得 (radius / baseScale)
  const logicalRadius = configRadius / baseScale
  
  return logicalRadius
}

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

  // 以鼠标为中心的滚轮缩放
  stage.on('wheel', (e) => {
    e.evt.preventDefault()
    const scaleBy = 1.1
    const oldScale = stage!.scaleX()
    const newScale = e.evt.deltaY > 0 ? oldScale / scaleBy : oldScale * scaleBy
    
    // 获取鼠标位置
    const pointer = stage!.getPointerPosition()!
    
    // 计算鼠标指向的舞台坐标
    const mousePointTo = {
      x: (pointer.x - stage!.x()) / oldScale,
      y: (pointer.y - stage!.y()) / oldScale
    }
    
    // 设置新缩放
    stage!.scale({ x: newScale, y: newScale })
    
    // 调整舞台位置，使鼠标指向的坐标保持不变
    stage!.position({
      x: pointer.x - mousePointTo.x * newScale,
      y: pointer.y - mousePointTo.y * newScale
    })
    
    // 更新所有 label 的反向缩放
    updateLabelScale()
    updateLOD()  // 缩放后更新 LOD
    
    layer?.batchDraw()
  })

  // 画布拖拽
  let isDragging = false
  let lastPos: { x: number; y: number } | null = null

  stage.on('mousedown', (e) => {
    // 如果点击的是座位，不启动拖拽（座位自己的 mousedown 会处理）
    if (e.target !== stage) return
    
    isDragging = true
    lastPos = { x: e.evt.clientX, y: e.evt.clientY }
    if (stage) stage.container().style.cursor = 'grabbing'
  })

  stage.on('mousemove', (e) => {
    if (!isDragging || !lastPos || !stage) return
    
    const dx = e.evt.clientX - lastPos.x
    const dy = e.evt.clientY - lastPos.y
    
    stage.position({
      x: stage.x() + dx,
      y: stage.y() + dy
    })
    
    lastPos = { x: e.evt.clientX, y: e.evt.clientY }
    layer?.batchDraw()
  })

  stage.on('mouseup', () => {
    isDragging = false
    lastPos = null
    if (stage) stage.container().style.cursor = 'default'
  })

  // 鼠标离开画布时停止拖拽
  stage.on('mouseleave', () => {
    isDragging = false
    lastPos = null
    if (stage) stage.container().style.cursor = 'default'
  })
}

// 【重构】计算内容边界并自动缩放居中
const fitContentToView = () => {
  if (!stage || !layer) return
  
  // 【修复】只在初始渲染时执行自适应，避免和用户手动缩放冲突
  if (!isInitialFit) return
  isInitialFit = false

  // 1. 强制刷新图元，确保 getClientRect 能拿到最新数据
  layer.batchDraw()
  
  // 2. 获取所有图元的总边界
  const box = layer.getClientRect()
  
  // 【调试】打印边界信息
  const store = useVenueStore()
  console.log('[SeatMapViewer] Content bounds:', box)
  
  const padding = 50
  const stageWidth = stage.width()
  const stageHeight = stage.height()
  
  const scale = Math.min(
    (stageWidth - padding) / box.width,
    (stageHeight - padding) / box.height,
    1.5  // 最大不超过 1.5x
  )
  
  stage.scale({ x: scale, y: scale })
  stage.position({
    x: (stageWidth - box.width * scale) / 2 - box.x * scale,
    y: (stageHeight - box.height * scale) / 2 - box.y * scale
  })
  
  layer.batchDraw()
  updateLOD()
}

// 入场动画：平滑缩放到最佳视角
const fitContentWithAnimation = () => {
  if (!stage || !layer) return
  
  if (!isInitialFit) return
  isInitialFit = false
  
  layer.batchDraw()
  const box = layer.getClientRect()
  
  const padding = 50
  const stageWidth = stage.width()
  const stageHeight = stage.height()
  
  const targetScale = Math.min(
    (stageWidth - padding) / box.width,
    (stageHeight - padding) / box.height,
    1.5
  )
  
  const targetX = (stageWidth - box.width * targetScale) / 2 - box.x * targetScale
  const targetY = (stageHeight - box.height * targetScale) / 2 - box.y * targetScale
  
  // 使用 Konva 动画平滑过渡
  stage.to({
    x: targetX,
    y: targetY,
    scaleX: targetScale,
    scaleY: targetScale,
    duration: 0.8,
    easing: Konva.Easings.EaseInOut,
    onFinish: () => {
      updateLOD()
    }
  })
}

// LOD 多级细节渲染
const updateLOD = () => {
  if (!stage || !layer) return
  
  const scale = stage.scaleX()
  
  // LOD 阈值（放宽，让座位更容易显示）
  const SHOW_SEATS_THRESHOLD = 0.1   // 缩放大于 0.1 显示座位
  const SHOW_LABELS_THRESHOLD = 0.8  // 缩放大于 0.8 显示标签
  
  // 更新座位可见性
  layer.find('.seat-node').forEach(node => {
    node.visible(scale > SHOW_SEATS_THRESHOLD)
  })
  
  // 更新标签可见性
  layer.find('Text').forEach(textNode => {
    const text = textNode as Konva.Text
    if (text.name() === 'seat-label') {
      text.visible(scale > SHOW_LABELS_THRESHOLD)
    }
  })
  
  // 更新分区背景透明度
  layer.find('.section-border').forEach(node => {
    if (scale < 0.3) {
      node.opacity(1)
    } else if (scale < 1.0) {
      node.opacity(0.6)
    } else {
      node.opacity(0.3)
    }
  })
  
  layer.batchDraw()
}

// 渲染座位图
const renderSeatMap = () => {
  if (!stage || !layer) return

  // 【修复】重置 Stage 状态，避免多次重绘导致位移叠加
  stage.scale({ x: 1, y: 1 })
  stage.position({ x: 0, y: 0 })

  layer.destroyChildren()
  seatNodes.clear() // 清空座位节点映射

  // 渲染所有 section
  props.venue.sections.forEach(section => {
    // 渲染分区边框（如果有）
    if (section.borderType && section.borderType !== 'none') {
      renderSectionBorder(section)
    }

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
  
  // 【修复】渲染完成后自适应缩放
  requestAnimationFrame(() => {
    fitContentToView()
  })
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
  const logicalRadius = getLogicalRadius()
  
  // 【调试】打印第一排的信息
  if (row.seats.length > 1) {
    const seat0 = row.seats[0]
    const seat1 = row.seats[1]
    const dist = Math.sqrt(Math.pow(seat1.x - seat0.x, 2) + Math.pow(seat1.y - seat0.y, 2))
    const store = useVenueStore()
    console.log(`[SeatMapViewer] Row ${row.label}: seats=${row.seats.length}, logicalRadius=${logicalRadius.toFixed(2)}, seatDist=${dist.toFixed(2)}, overlap=${(logicalRadius * 2 > dist).toString()}, storeBaseScale=${store.getBaseScale()}`)
  }
  
  // 【修复】排标签精确定位
  if (row.label && row.seats.length > 0) {
    const firstPos = curvedPositions[0]
    // 标签位置：第一个座位左侧，垂直居中
    const labelOffsetX = logicalRadius * 2.5  // 座位左侧偏移
    let labelX = rowX + firstPos.x - labelOffsetX
    let labelY = rowY + firstPos.y
    
    // 考虑旋转
    if (rotation) {
      const rad = rotation * Math.PI / 180
      const relX = labelX - rowX
      const relY = labelY - rowY
      labelX = rowX + relX * Math.cos(rad) - relY * Math.sin(rad)
      labelY = rowY + relX * Math.sin(rad) + relY * Math.cos(rad)
    }
    
    // 精确居中：创建后计算文本宽高
    const rowLabelText = new Konva.Text({
      x: labelX,
      y: labelY,
      text: row.label,
      fontSize: 12,
      fill: '#666',
      align: 'center',
      verticalAlign: 'middle',
      listening: false
    })
    // 设置 offset 让文本居中
    rowLabelText.offsetX(rowLabelText.width() / 2)
    rowLabelText.offsetY(rowLabelText.height() / 2)
    layer.add(rowLabelText)
  }

  // 座位（直接添加到 layer，不使用 Group）
  row.seats.forEach((seat, index) => {
    const pos = curvedPositions[index]
    
    // 【修复】座位位置直接使用 pos.x, pos.y，不再减去 SEAT_RADIUS
    // pos.x, pos.y 已经是相对于 row 原点的正确位置
    let x = rowX + pos.x
    let y = rowY + pos.y
    
    if (rotation) {
      const rad = rotation * Math.PI / 180
      const relX = x - rowX
      const relY = y - rowY
      x = rowX + relX * Math.cos(rad) - relY * Math.sin(rad)
      y = rowY + relX * Math.sin(rad) + relY * Math.cos(rad)
    }
    
    const isSelected = props.selectedSeatIds?.includes(seat.id)
    const color = getCategoryColor(seat.categoryKey)
    
    // 【修复】移除视觉恒定缩放，座位随舞台缩放
    // 这样预览时座位大小与实际绘制一致

    // 座位圆形
    const store = useVenueStore()
    const borderWidth = store.visualConfig?.borderWidth || 2
    
    const circle = new Konva.Circle({
      x,
      y,
      radius: logicalRadius,
      fill: isSelected ? '#FF5722' : color,
      stroke: '#fff',
      strokeWidth: borderWidth / (stage?.scaleX() || 1),  // 边框跟随缩放
      name: 'seat-node'  // 用于 LOD 控制
    })

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
    
    // 【修复】座位编号在座位圆形之后添加，确保显示在上层
    // 根据当前舞台缩放决定是否显示标签
    const currentStageScale = stage?.scaleX() || 1
    if (seat.label && layer && currentStageScale >= 0.8) {
      // 字体大小等于逻辑半径，随座位一起缩放
      const fontSize = logicalRadius
      
      // 精确居中：创建后计算文本宽高
      const text = new Konva.Text({
        x: x,
        y: y,
        text: String(seat.label),
        fontSize: fontSize,
        fill: '#333',
        align: 'center',
        verticalAlign: 'middle',
        listening: false,
        name: 'seat-label'  // 标记为座位标签，用于缩放时更新
      })
      // 设置 offset 让文本真正居中
      text.offsetX(text.width() / 2)
      text.offsetY(text.height() / 2)
      layer.add(text)
    }
  })
}

// 更新座位选中状态（当 selectedSeatIds 变化时调用）
const updateSelection = () => {
  const store = useVenueStore()
  const borderWidth = store.visualConfig?.borderWidth || 2
  const currentScale = stage?.scaleX() || 1
  
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
    circle.strokeWidth(isSelected ? 3 / currentScale : borderWidth / currentScale)
  })
  layer?.batchDraw()
}

onMounted(() => {
  initStage()
  // 先渲染，再自适应
  renderSeatMap()
  // 使用 requestAnimationFrame 确保渲染完成
  requestAnimationFrame(() => {
    // 入场动画：平滑缩放到最佳视角
    fitContentWithAnimation()
  })
})

// 监听选中状态变化，更新座位颜色
watch(() => props.selectedSeatIds, () => {
  updateSelection()
}, { deep: true })

// 【修复】监听 venue 的 sections 变化，重新渲染并自适应
watch(() => props.venue.sections, (newSections, oldSections) => {
  // 只在 sections 真正变化时重新渲染（比较引用或长度）
  if (newSections !== oldSections || newSections.length !== oldSections?.length) {
    isInitialFit = true // 重置标志，允许重新自适应
    renderSeatMap()
    requestAnimationFrame(() => {
      fitContentToView()
    })
  }
})

onUnmounted(() => {
  if (stage) {
    stage.destroy()
    stage = null
  }
})

// 判断是否是弯曲边
const isCurvedEdge = (point: PathPoint) => point.type === 'arc' && Math.abs(point.arcDepth ?? 0) > 0.0001

// 创建圆弧段（SVG Arc）
const createArcSegment = (start: PathPoint, end: PathPoint, depth: number): string => {
  const dx = end.x - start.x
  const dy = end.y - start.y
  const length = Math.sqrt(dx * dx + dy * dy) || 1
  
  const sagitta = length * Math.abs(depth) * 0.5
  const halfChord = length / 2
  let radius = (sagitta * sagitta + halfChord * halfChord) / (2 * Math.max(sagitta, 0.001))
  radius = Math.max(radius, halfChord)
  
  const sweepFlag = depth > 0 ? 1 : 0
  
  return `M ${start.x} ${start.y} A ${radius} ${radius} 0 0 ${sweepFlag} ${end.x} ${end.y}`
}

// 将路径点转换为 SVG Path 数据
const pathPointsToSvgPath = (points: PathPoint[]): string => {
  if (points.length < 2) return ''
  
  let path = `M ${points[0].x} ${points[0].y}`

  points.forEach((start, index) => {
    const end = points[(index + 1) % points.length]

    if (isCurvedEdge(start)) {
      path += ' ' + createArcSegment(start, end, start.arcDepth ?? 0).replace(`M ${start.x} ${start.y} `, '')
    } else {
      path += ` L ${end.x} ${end.y}`
    }
  })
  
  path += ' Z'
  return path
}

// 渲染分区边框
const renderSectionBorder = (section: Section) => {
  if (!layer || !section.borderType || section.borderType === 'none') return

  const fillColor = section.borderFill || 'rgba(128,128,128,0.15)'
  const strokeColor = section.borderStroke || '#808080'

  if (section.borderType === 'rect') {
    layer.add(new Konva.Rect({
      x: section.borderX || 0,
      y: section.borderY || 0,
      width: section.borderWidth || 100,
      height: section.borderHeight || 100,
      fill: fillColor,
      stroke: strokeColor,
      strokeWidth: 1,
      name: 'section-border'  // 用于 LOD 控制
    }))
  } else if (section.borderType === 'ellipse') {
    layer.add(new Konva.Ellipse({
      x: section.borderX || 0,
      y: section.borderY || 0,
      radiusX: section.borderRadiusX || 50,
      radiusY: section.borderRadiusY || 50,
      fill: fillColor,
      stroke: strokeColor,
      strokeWidth: 1,
      name: 'section-border'
    }))
  } else if (section.borderType === 'polygon' && section.borderPoints) {
    layer.add(new Konva.Line({
      x: section.borderX || 0,
      y: section.borderY || 0,
      points: section.borderPoints,
      closed: true,
      fill: fillColor,
      stroke: strokeColor,
      strokeWidth: 1,
      name: 'section-border'
    }))
  } else if (section.borderType === 'path' && section.borderPathPoints) {
    // 使用 SVG Path 渲染带弧度的路径
    const pathData = pathPointsToSvgPath(section.borderPathPoints)
    layer.add(new Konva.Path({
      x: section.borderX || 0,
      y: section.borderY || 0,
      data: pathData,
      fill: fillColor,
      stroke: strokeColor,
      strokeWidth: 1,
      name: 'section-border'
    }))
  }

  // 渲染分区标签 - 计算分区中心位置
  if (section.name) {
    let labelX = section.borderX || 0
    let labelY = section.borderY || 0
    
    // 根据不同类型计算中心点
    if (section.borderType === 'rect') {
      labelX += (section.borderWidth || 100) / 2
      labelY += (section.borderHeight || 100) / 2
    } else if (section.borderType === 'ellipse') {
      labelX += (section.borderRadiusX || 50) / 2
      labelY += (section.borderRadiusY || 50) / 2
    } else if (section.borderType === 'polygon' && section.borderPoints) {
      // 计算多边形中心
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
      for (let i = 0; i < section.borderPoints.length; i += 2) {
        minX = Math.min(minX, section.borderPoints[i])
        minY = Math.min(minY, section.borderPoints[i + 1])
        maxX = Math.max(maxX, section.borderPoints[i])
        maxY = Math.max(maxY, section.borderPoints[i + 1])
      }
      labelX += (minX + maxX) / 2
      labelY += (minY + maxY) / 2
    } else if (section.borderType === 'path' && section.borderPathPoints) {
      // 计算路径中心
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
      section.borderPathPoints.forEach(p => {
        minX = Math.min(minX, p.x)
        minY = Math.min(minY, p.y)
        maxX = Math.max(maxX, p.x)
        maxY = Math.max(maxY, p.y)
      })
      labelX += (minX + maxX) / 2
      labelY += (minY + maxY) / 2
    }
    
    // 获取舞台缩放比例，用于反向缩放保持视觉大小恒定
    const stageScale = stage?.scaleX() || 1
    const visualScale = 1 / stageScale
    
    const text = new Konva.Text({
      x: labelX,
      y: labelY,
      text: section.name,
      fontSize: 10,  // 固定字体大小
      fontStyle: 'bold',
      fill: '#666',
      align: 'center',
      verticalAlign: 'middle'
    })
    
    // 居中显示
    text.offsetX(text.width() / 2)
    text.offsetY(text.height() / 2)
    
    // 设置缩放变换，保持视觉大小恒定
    text.scaleX(visualScale)
    text.scaleY(visualScale)
    
    layer.add(text)
  }
}

// 更新所有 label 的缩放
const updateLabelScale = () => {
  if (!stage || !layer) return
  
  const stageScale = stage.scaleX()
  const visualScale = 1 / stageScale
  
  // 获取逻辑半径用于计算座位标签字体大小
  const logicalRadius = getLogicalRadius()
  
  layer.find('Text').forEach((textNode) => {
    const text = textNode as Konva.Text
    const textName = text.name()
    
    if (textName === 'seat-label') {
      // 座位标签：字体大小等于逻辑半径，随座位一起缩放
      if (stageScale >= 0.8) {
        text.fontSize(logicalRadius)
        // 不需要设置 offset，Konva 的 align 和 verticalAlign 会自动居中
        text.visible(true)
      } else {
        text.visible(false)
      }
    } else {
      // 分区/排标签：应用反向缩放保持视觉大小恒定
      text.scaleX(visualScale)
      text.scaleY(visualScale)
    }
  })
  
  layer.batchDraw()
}

defineExpose({ refresh: renderSeatMap, updateSelection })
</script>

<style scoped>
.seat-map-viewer {
  width: 100%;
  height: 100%;
  background: white;
  border-radius: 12px;
  overflow: hidden;
}
</style>
