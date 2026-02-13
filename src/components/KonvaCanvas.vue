<template>
  <div class="konva-wrapper">
    <div ref="containerRef" class="konva-container"></div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue'
import Konva from 'konva'
import type { ToolMode } from '../composables/useDrawing'

// ==================== 类型定义 ====================

export interface Seat {
  id: string
  label: string
  x: number
  y: number
  status: 'available' | 'sold' | 'reserved' | 'blocked'
  categoryId: string
}

export interface Row {
  id: string
  label: string
  seats: Seat[]
}

export interface Section {
  id: string
  name: string
  rows: Row[]
  x: number
  y: number
}

export interface VenueData {
  sections: Section[]
}

// ==================== Props & Emits ====================

const props = defineProps<{
  width?: number
  height?: number
  showGrid?: boolean
  venueData?: VenueData
}>()

const emit = defineEmits<{
  ready: [stage: Konva.Stage]
  seatClick: [seatId: string]
  seatDrag: [seatId: string, x: number, y: number]
  rowCreated: [seats: Seat[]]
}>()

// ==================== Refs ====================

const containerRef = ref<HTMLDivElement>()
let stage: Konva.Stage | null = null
let layer: Konva.Layer | null = null
let gridGroup: Konva.Group | null = null
let transformLayer: Konva.Layer | null = null
let drawingLayer: Konva.Layer | null = null
const sectionGroups = new Map<string, Konva.Group>()
const seatGroups = new Map<string, Konva.Group>()

// 视图状态
const scale = ref(1)
const offsetX = ref(0)
const offsetY = ref(0)
const isDraggingStage = ref(false)
const dragStart = ref({ x: 0, y: 0 })

// 拖拽起始位置记录
const dragStartPositions = new Map<string, { x: number; y: number }>()

// 颜色映射
const statusColors = {
  available: '#22a559',
  sold: '#ef4444',
  reserved: '#f59e0b',
  blocked: '#9ca3af'
}

// ==================== 绘制座位状态 ====================

const isDrawingRow = ref(false)
const rowStartPoint = ref<{ x: number; y: number } | null>(null)
const rowEndPoint = ref<{ x: number; y: number } | null>(null)
let previewLine: Konva.Line | null = null
let previewSeats: Konva.Node[] = []
let guideLines: Konva.Line[] = []
let cursorPreviewSeat: Konva.Group | null = null  // 鼠标跟随预览座位
let isFirstPointPlaced = false  // 是否已放置起点
const SEAT_SPACING = 22
const SEAT_RADIUS = 9

// ==================== 初始化 ====================

const initKonva = () => {
  if (!containerRef.value) return

  const width = props.width || window.innerWidth
  const height = props.height || window.innerHeight

  stage = new Konva.Stage({
    container: containerRef.value,
    width,
    height
  })

  // 渲染层（用于显示座位等元素）
  layer = new Konva.Layer()
  stage.add(layer)

  // 变换层（用于缩放和平移）
  transformLayer = new Konva.Layer()
  stage.add(transformLayer)

  // 绘制层（用于绘制预览）
  drawingLayer = new Konva.Layer()
  stage.add(drawingLayer)

  // 添加网格背景
  gridGroup = new Konva.Group({ listening: false })
  updateGrid()

  transformLayer.add(gridGroup)

  // 设置初始视图
  resetView()

  // 添加事件监听
  setupStageEvents()

  emit('ready', stage)

  // 初始化框选功能
  initSelection()
}

const setupStageEvents = () => {
  if (!stage) return

  // 滚轮缩放
  stage.on('wheel', (e) => {
    e.evt.preventDefault()

    const delta = e.evt.deltaY > 0 ? 0.9 : 1.1
    const newScale = Math.max(0.1, Math.min(5, scale.value * delta))

    // 以鼠标位置为中心缩放
    const pointer = stage!.getPointerPosition()
    if (!pointer) return

    const mousePointTo = {
      x: (pointer.x - stage!.x()) / scale.value,
      y: (pointer.y - stage!.y()) / scale.value
    }

    scale.value = newScale

    const newPos = {
      x: pointer.x - mousePointTo.x * newScale,
      y: pointer.y - mousePointTo.y * newScale
    }

    stage.x(newPos.x)
    stage.y(newPos.y)

    // 使用 batchDraw 优化性能
    layer!.batchDraw()
  })

  // 鼠标按下 - 统一处理框选、平移和绘制
  stage.on('mousedown', (e) => {
    // 只响应左键
    if (e.evt.button !== 0) return

    const pos = stage!.getPointerPosition()
    if (!pos) return

    // 将屏幕坐标转换为舞台坐标
    const transform = stage!.getAbsoluteTransform().copy()
    transform.invert()
    const stagePos = transform.point(pos)

    // 画座位排模式 - 点击任意位置开始绘制
    if (currentTool.value === 'drawRow') {
      startDrawingRow(stagePos)
      return
    }

    // 如果点击的不是舞台（是座位等），不启动框选
    if (e.target !== stage) return

    // Shift+点击 = 平移画布
    if (e.evt.shiftKey) {
      isDraggingStage.value = true
      dragStart.value = { x: stage!.x(), y: stage!.y() }
      return
    }

    // 普通点击 = 启动框选（使用舞台坐标）
    isSelecting.value = true
    selectionStart = { x: stagePos.x, y: stagePos.y }

    if (selectionRect) {
      selectionRect.visible(true)
      selectionRect.x(stagePos.x)
      selectionRect.y(stagePos.y)
      selectionRect.width(0)
      selectionRect.height(0)
    }

    // 如果没有按住 Shift，清空之前的选择
    if (!e.evt.shiftKey) {
      clearSelection()
    }
  })

  // 鼠标移动 - 处理框选、平移和绘制预览
  stage.on('mousemove', (e) => {
    const pos = stage!.getPointerPosition()
    if (!pos) return

    // 将屏幕坐标转换为舞台坐标
    const transform = stage!.getAbsoluteTransform().copy()
    transform.invert()
    const stagePos = transform.point(pos)

    // 处理绘制座位预览
    if (isDrawingRow.value && rowStartPoint.value) {
      updateDrawingPreview(stagePos)
      return
    }

    // 处理框选（使用舞台坐标）
    if (isSelecting.value && selectionStart && selectionRect) {
      const width = stagePos.x - selectionStart.x
      const height = stagePos.y - selectionStart.y

      selectionRect.x(width >= 0 ? selectionStart.x : stagePos.x)
      selectionRect.y(height >= 0 ? selectionStart.y : stagePos.y)
      selectionRect.width(Math.abs(width))
      selectionRect.height(Math.abs(height))

      layer!.batchDraw()
      return
    }

    // 处理画布平移
    if (isDraggingStage.value) {
      stage!.x(stage!.x() + e.evt.movementX)
      stage!.y(stage!.y() + e.evt.movementY)
      layer!.batchDraw()
    }
  })

  // 鼠标释放 - 结束框选、平移或绘制
  stage.on('mouseup', (e) => {
    const pos = stage!.getPointerPosition()
    if (!pos) return

    // 将屏幕坐标转换为舞台坐标
    const transform = stage!.getAbsoluteTransform().copy()
    transform.invert()
    const stagePos = transform.point(pos)

    // 结束绘制座位
    if (isDrawingRow.value) {
      finishDrawingRow(stagePos)
      return
    }

    // 结束框选
    if (isSelecting.value) {
      isSelecting.value = false
      if (selectionRect) {
        selectionRect.visible(false)
      }
      // 执行碰撞检测
      performSelection()
      layer!.batchDraw()
    }

    isDraggingStage.value = false
  })

  // 点击空白处取消选择
  stage.on('click', (e) => {
    if (e.target === stage && !e.evt.shiftKey && currentTool.value === 'select') {
      clearSelection()
    }
  })
}

// ==================== 绘制座位功能 ====================

const startDrawingRow = (pos: { x: number; y: number }) => {
  isDrawingRow.value = true
  rowStartPoint.value = { x: pos.x, y: pos.y }
  rowEndPoint.value = { x: pos.x, y: pos.y }

  // 创建预览线
  previewLine = new Konva.Line({
    points: [pos.x, pos.y, pos.x, pos.y],
    stroke: '#3b82f6',
    strokeWidth: 2,
    dash: [5, 5],
    listening: false
  })
  drawingLayer!.add(previewLine)

  // 创建起点标记
  const startMarker = new Konva.Circle({
    x: pos.x,
    y: pos.y,
    radius: 8,
    fill: '#3b82f6',
    stroke: '#fff',
    strokeWidth: 2,
    listening: false
  })
  drawingLayer!.add(startMarker)
  previewSeats.push(startMarker)

  drawingLayer!.batchDraw()
}

const updateDrawingPreview = (pos: { x: number; y: number }) => {
  if (!rowStartPoint.value || !previewLine) return

  // 收集所有已有座位的位置用于对齐
  const existingX: number[] = []
  const existingY: number[] = []
  seatGroups.forEach((group) => {
    const stagePos = group.getAbsolutePosition()
    existingX.push(stagePos.x)
    existingY.push(stagePos.y)
  })

  // 对齐吸附参数
  const SNAP_THRESHOLD = 8
  let snappedX = pos.x
  let snappedY = pos.y
  let alignedX: number | null = null
  let alignedY: number | null = null

  // 检测水平对齐（Y坐标）
  for (const y of existingY) {
    if (Math.abs(pos.y - y) < SNAP_THRESHOLD) {
      snappedY = y
      alignedY = y
      break
    }
  }

  // 检测垂直对齐（X坐标）
  for (const x of existingX) {
    if (Math.abs(pos.x - x) < SNAP_THRESHOLD) {
      snappedX = x
      alignedX = x
      break
    }
  }

  // 检测起点对齐
  for (const x of existingX) {
    if (Math.abs(rowStartPoint.value.x - x) < SNAP_THRESHOLD) {
      // 如果起点接近某列，调整起点
      rowStartPoint.value.x = x
      break
    }
  }
  for (const y of existingY) {
    if (Math.abs(rowStartPoint.value.y - y) < SNAP_THRESHOLD) {
      rowStartPoint.value.y = y
      break
    }
  }

  rowEndPoint.value = { x: snappedX, y: snappedY }

  // 更新预览线（使用吸附后的坐标）
  previewLine.points([rowStartPoint.value.x, rowStartPoint.value.y, snappedX, snappedY])

  // 清除旧的预览座位和辅助线
  previewSeats.forEach(seat => seat.destroy())
  guideLines.forEach(line => line.destroy())
  previewSeats = []
  guideLines = []

  // 计算座位数量和位置
  const dx = snappedX - rowStartPoint.value.x
  const dy = snappedY - rowStartPoint.value.y
  const distance = Math.sqrt(dx * dx + dy * dy)
  const seatCount = Math.max(2, Math.floor(distance / SEAT_SPACING) + 1)

  // 计算单位向量
  const unitX = dx / distance
  const unitY = dy / distance

  // 创建预览座位
  for (let i = 0; i < seatCount; i++) {
    const x = rowStartPoint.value.x + unitX * i * SEAT_SPACING
    const y = rowStartPoint.value.y + unitY * i * SEAT_SPACING

    // 预览座位 - 半透明蓝色填充
    const seatGroup = new Konva.Group({
      x,
      y,
      listening: false
    })
    const seat = new Konva.Circle({
      radius: SEAT_RADIUS,
      fill: 'rgba(59, 130, 246, 0.2)',
      stroke: '#3b82f6',
      strokeWidth: 2,
      listening: false
    })
    seat.cache()
    seatGroup.add(seat)
    drawingLayer!.add(seatGroup)
    previewSeats.push(seatGroup)

    // 添加座位编号（相对于 seatGroup）
    const label = new Konva.Text({
      text: '?',
      fontSize: 9,
      fontFamily: 'Inter',
      fill: '#fff',
      listening: false,
      align: 'center',
      verticalAlign: 'middle'
    })
    label.offsetX(label.width() / 2)
    label.offsetY(label.height() / 2)
    seatGroup.add(label)
  }

  // 判断是否水平或垂直（用于辅助线颜色）
  const isHorizontal = Math.abs(dy) < 5
  const isVertical = Math.abs(dx) < 5
  const guideLineColor = (isHorizontal || isVertical) ? '#22c55e' : 'rgba(59, 130, 246, 0.3)'
  const guideLineWidth = (isHorizontal || isVertical) ? 2 : 1

  // 创建辅助线（水平和垂直）
  // 水平辅助线
  const hLine = new Konva.Line({
    points: [rowStartPoint.value.x, rowStartPoint.value.y, snappedX, rowStartPoint.value.y],
    stroke: guideLineColor,
    strokeWidth: guideLineWidth,
    dash: [3, 3],
    listening: false
  })
  drawingLayer!.add(hLine)
  guideLines.push(hLine)

  // 垂直辅助线
  const vLine = new Konva.Line({
    points: [rowStartPoint.value.x, rowStartPoint.value.y, rowStartPoint.value.x, snappedY],
    stroke: guideLineColor,
    strokeWidth: guideLineWidth,
    dash: [3, 3],
    listening: false
  })
  drawingLayer!.add(vLine)
  guideLines.push(vLine)

  // 如果吸附了对齐线，显示高亮对齐线
  if (alignedY !== null) {
    const alignHLine = new Konva.Line({
      points: [Math.min(rowStartPoint.value.x, snappedX) - 50, alignedY, Math.max(rowStartPoint.value.x, snappedX) + 50, alignedY],
      stroke: '#f59e0b',
      strokeWidth: 2,
      dash: [5, 5],
      listening: false
    })
    drawingLayer!.add(alignHLine)
    guideLines.push(alignHLine)
  }
  if (alignedX !== null) {
    const alignVLine = new Konva.Line({
      points: [alignedX, Math.min(rowStartPoint.value.y, snappedY) - 50, alignedX, Math.max(rowStartPoint.value.y, snappedY) + 50],
      stroke: '#f59e0b',
      strokeWidth: 2,
      dash: [5, 5],
      listening: false
    })
    drawingLayer!.add(alignVLine)
    guideLines.push(alignVLine)
  }

  // 显示距离信息
  const distanceText = new Konva.Text({
    text: `${Math.round(distance)}px (${seatCount}座)`,
    x: (rowStartPoint.value.x + snappedX) / 2 + 10,
    y: (rowStartPoint.value.y + snappedY) / 2 - 10,
    fontSize: 12,
    fontFamily: 'Inter',
    fill: (isHorizontal || isVertical) ? '#22c55e' : '#3b82f6',
    listening: false
  })
  drawingLayer!.add(distanceText)
  previewSeats.push(distanceText)

  drawingLayer!.batchDraw()
}

const finishDrawingRow = (pos: { x: number; y: number }) => {
  if (!rowStartPoint.value) return

  const dx = pos.x - rowStartPoint.value.x
  const dy = pos.y - rowStartPoint.value.y
  const distance = Math.sqrt(dx * dx + dy * dy)

  // 如果距离太短，取消绘制
  if (distance < SEAT_SPACING) {
    clearDrawingPreview()
    isDrawingRow.value = false
    rowStartPoint.value = null
    rowEndPoint.value = null
    return
  }

  // 计算座位数量和位置
  const seatCount = Math.max(2, Math.floor(distance / SEAT_SPACING) + 1)
  const unitX = dx / distance
  const unitY = dy / distance

  // 创建座位数据
  const seats: Seat[] = []
  for (let i = 0; i < seatCount; i++) {
    const x = rowStartPoint.value.x + unitX * i * SEAT_SPACING
    const y = rowStartPoint.value.y + unitY * i * SEAT_SPACING

    seats.push({
      id: `seat-${Date.now()}-${i}`,
      label: String(i + 1),
      x,
      y,
      status: 'available',
      categoryId: 'custom'
    })
  }

  // 创建实际的座位排并渲染
  const rowId = `row-${Date.now()}`
  const rowGroup = createRowGroup(seats, rowStartPoint.value.x, rowStartPoint.value.y, 
    Math.atan2(dy, dx) * 180 / Math.PI, rowId)
  
  if (layer) {
    layer.add(rowGroup)
    layer.batchDraw()
  }

  // 清除预览
  clearDrawingPreview()
  isDrawingRow.value = false
  rowStartPoint.value = null
  rowEndPoint.value = null
}

const clearDrawingPreview = () => {
  previewSeats.forEach(seat => seat.destroy())
  guideLines.forEach(line => line.destroy())
  if (previewLine) {
    previewLine.destroy()
    previewLine = null
  }
  previewSeats = []
  guideLines = []
}

// 创建座位排组
const createRowGroup = (seats: Seat[], x: number, y: number, rotation: number, rowId: string) => {
  const group = new Konva.Group({
    x: x,
    y: y,
    rotation: rotation,
    id: `row-group-${rowId}`
  })

  // 创建座位（沿着 Group 的 X 轴排列，因为 Group 已经旋转了）
  seats.forEach((seat, index) => {
    // 座位沿着 Group 的本地 X 轴排列，Y 保持为 0
    const relativeX = index * SEAT_SPACING
    const relativeY = 0
    
    const seatGroup = new Konva.Group({
      x: relativeX,
      y: relativeY,
      draggable: false,
      id: seat.id,
      name: `seat row-${rowId}`
    })

    // 新绘制的座位 - 红色填充和边框（无边框视觉差）
    const circle = new Konva.Circle({
      radius: SEAT_RADIUS,
      fill: '#ef4444',
      stroke: '#ef4444',
      strokeWidth: 1,
      name: 'seatCircle'
    })
    circle.cache()

    // 新绘制的座位 - 编号显示 ?
    const text = new Konva.Text({
      text: '?',
      fontSize: 9,
      fontFamily: 'Inter',
      fill: '#fff',
      x: 0,
      y: 0,
      offsetX: 0,
      offsetY: 0,
      align: 'center',
      verticalAlign: 'middle'
    })
    // 文字居中定位
    text.offsetX(text.width() / 2)
    text.offsetY(text.height() / 2)

    seatGroup.add(circle)
    seatGroup.add(text)

    // 座位点击事件
    seatGroup.on('click', (e) => {
      e.cancelBubble = true
      if (currentTool.value !== 'select') return

      if (selectedSeatIds.value.has(seat.id)) {
        deselectSeat(seat.id)
      } else {
        selectSeat(seat.id, e.evt.shiftKey)
      }
      emit('seatClick', seat.id)
    })

    group.add(seatGroup)
    seatGroups.set(seat.id, seatGroup)
  })

  return group
}

// ==================== 网格 ====================

const updateGrid = () => {
  if (!gridGroup || !props.showGrid || !stage) return

  gridGroup.destroyChildren()
  const gridSize = 20
  const width = stage.width()
  const height = stage.height()

  for (let x = 0; x <= width; x += gridSize) {
    const line = new Konva.Line({
      points: [x, 0, x, height],
      stroke: '#d4d0c8',
      strokeWidth: 0.5,
      opacity: 0.6
    })
    gridGroup.add(line)
  }

  for (let y = 0; y <= height; y += gridSize) {
    const line = new Konva.Line({
      points: [0, y, width, y],
      stroke: '#d4d0c8',
      strokeWidth: 0.5,
      opacity: 0.6
    })
    gridGroup.add(line)
  }
}

// ==================== 视图控制 ====================

const resetView = () => {
  if (!stage) return

  scale.value = 1
  offsetX.value = 0
  offsetY.value = 0
  stage.x(0)
  stage.y(0)

  layer.batchDraw()
}

const zoomTo = (zoomLevel: number, centerX?: number, centerY?: number) => {
  if (!stage) return

  const newScale = Math.max(0.1, Math.min(5, zoomLevel))

  if (centerX !== undefined && centerY !== undefined) {
    const mousePointTo = {
      x: (centerX - stage.x()) / scale.value,
      y: (centerY - stage.y()) / scale.value
    }

    scale.value = newScale

    stage.x(centerX - mousePointTo.x * newScale)
    stage.y(centerY - mousePointTo.y * newScale)
  } else {
    scale.value = newScale
  }

  layer.batchDraw()
}

// ==================== 渲染座位 ====================

const createSeat = (seat: Seat, rowLabel: string, rowId: string) => {
  const group = new Konva.Group({
    x: seat.x,
    y: seat.y,
    draggable: false,
    id: seat.id,
    name: `seat row-${rowId}`
  })

  const circle = new Konva.Circle({
    radius: SEAT_RADIUS,
    fill: statusColors[seat.status],
    stroke: statusColors[seat.status],
    strokeWidth: 1,
    name: 'seatCircle'
  })

  circle.cache()

  const text = new Konva.Text({
    text: seat.label,
    fontSize: 9,
    fontFamily: 'Inter',
    fill: '#fff',
    offsetX: -4,
    offsetY: -5
  })

  group.add(circle)
  group.add(text)

  group.on('click', (e) => {
    e.cancelBubble = true

    if (currentTool.value !== 'select') return

    if (selectedSeatIds.value.has(seat.id)) {
      deselectSeat(seat.id)
    } else {
      selectSeat(seat.id, e.evt.shiftKey)
    }
    emit('seatClick', seat.id)
  })

  group.on('dragstart', () => {
    dragStartPositions.clear()
    selectedSeatIds.value.forEach(id => {
      const g = seatGroups.get(id)
      if (g) {
        dragStartPositions.set(id, { x: g.x(), y: g.y() })
      }
    })
  })

  group.on('dragmove', () => {
    if (!selectedSeatIds.value.has(seat.id)) return
    
    const startPos = dragStartPositions.get(seat.id)
    if (!startPos) return
    
    const dx = group.x() - startPos.x
    const dy = group.y() - startPos.y
    
    selectedSeatIds.value.forEach(id => {
      if (id === seat.id) return
      
      const g = seatGroups.get(id)
      const pos = dragStartPositions.get(id)
      if (g && pos) {
        g.x(pos.x + dx)
        g.y(pos.y + dy)
      }
    })
    
    if (transformer) {
      transformer.forceUpdate()
    }
    
    layer?.batchDraw()
  })

  group.on('dragend', () => {
    selectedSeatIds.value.forEach(id => {
      const g = seatGroups.get(id)
      if (g) {
        emit('seatDrag', id, g.x(), g.y())
      }
    })
    
    dragStartPositions.clear()
  })

  return group
}

const createSection = (section: Section) => {
  const sectionGroup = new Konva.Group({
    x: section.x,
    y: section.y,
    id: `section-${section.id}`
  })

  let minX = Infinity, minY = Infinity
  let maxX = -Infinity, maxY = -Infinity

  section.rows.forEach((row, rowIndex) => {
    const rowGroup = new Konva.Group({
      y: 30 + rowIndex * 35
    })

    const rowLabel = new Konva.Text({
      text: row.label,
      fontSize: 14,
      fontFamily: 'Inter',
      fill: '#666',
      offsetY: -5
    })
    rowGroup.add(rowLabel)

    row.seats.forEach((seat) => {
      const seatGroup = createSeat(seat, row.label, row.id)
      rowGroup.add(seatGroup)
      seatGroups.set(seat.id, seatGroup)

      const seatAbsX = seat.x
      const seatAbsY = 30 + rowIndex * 35 + seat.y
      minX = Math.min(minX, seatAbsX - 15)
      minY = Math.min(minY, seatAbsY - 15)
      maxX = Math.max(maxX, seatAbsX + 15)
      maxY = Math.max(maxY, seatAbsY + 15)
    })

    sectionGroup.add(rowGroup)
  })

  const padding = 20
  const rect = new Konva.Rect({
    x: minX - padding,
    y: minY - padding,
    width: maxX - minX + padding * 2,
    height: maxY - minY + padding * 2,
    stroke: '#d4d0c8',
    strokeWidth: 2,
    cornerRadius: 8,
    listening: false
  })
  sectionGroup.add(rect)

  const title = new Konva.Text({
    text: section.name,
    x: minX,
    y: minY - 25,
    fontSize: 14,
    fontFamily: 'Inter',
    fill: '#5c5854',
    fontWeight: '600'
  })
  sectionGroup.add(title)

  sectionGroup.cache()

  return sectionGroup
}

// ==================== 渲染场地数据 ====================

const renderVenueData = (data: VenueData) => {
  if (!layer) return

  clearSelection()

  const children = [...layer.getChildren()]
  children.forEach(child => {
    if (child !== selectionRect && child !== transformer) {
      child.destroy()
    }
  })

  seatGroups.clear()
  sectionGroups.clear()

  data.sections.forEach(section => {
    const sectionGroup = createSection(section)
    layer!.add(sectionGroup)
    sectionGroups.set(section.id, sectionGroup)
  })

  layer.batchDraw()
}

// ==================== 生成测试数据 ====================

const generateTestData = (seatCount: number = 300) => {
  const sections: Section[] = []

  const leftRows: Row[] = []
  for (let r = 0; r < 8; r++) {
    const seats: Seat[] = []
    const rowLabel = String.fromCharCode(65 + r)

    for (let c = 0; c < 8; c++) {
      const status: Seat['status'] =
        Math.random() < 0.2 ? 'sold' :
        Math.random() < 0.3 ? 'reserved' : 'available'

      seats.push({
        id: `seat-left-${r}-${c}`,
        label: String(c + 1),
        x: 0,
        y: 30 + c * 28,
        status,
        categoryId: 'left'
      })
    }

    leftRows.push({
      id: `row-left-${r}`,
      label: rowLabel,
      seats
    })
  }

  sections.push({
    id: 'section-left',
    name: '左侧区域',
    rows: leftRows,
    x: 80,
    y: 100
  })

  const centerRows: Row[] = []
  for (let r = 0; r < 12; r++) {
    const seats: Seat[] = []
    const rowLabel = String.fromCharCode(65 + r)

    for (let c = 0; c < 12; c++) {
      const status: Seat['status'] =
        Math.random() < 0.2 ? 'sold' :
        Math.random() < 0.3 ? 'reserved' : 'available'

      seats.push({
        id: `seat-center-${r}-${c}`,
        label: String(c + 1),
        x: 30 + c * 28,
        y: 0,
        status,
        categoryId: 'center'
      })
    }

    centerRows.push({
      id: `row-center-${r}`,
      label: rowLabel,
      seats
    })
  }

  sections.push({
    id: 'section-center',
    name: '中间区域',
    rows: centerRows,
    x: 350,
    y: 150
  })

  const rightRows: Row[] = []
  for (let r = 0; r < 8; r++) {
    const seats: Seat[] = []
    const rowLabel = String.fromCharCode(65 + r)

    for (let c = 0; c < 8; c++) {
      const status: Seat['status'] =
        Math.random() < 0.2 ? 'sold' :
        Math.random() < 0.3 ? 'reserved' : 'available'

      seats.push({
        id: `seat-right-${r}-${c}`,
        label: String(c + 1),
        x: 0,
        y: 30 + c * 28,
        status,
        categoryId: 'right'
      })
    }

    rightRows.push({
      id: `row-right-${r}`,
      label: rowLabel,
      seats
    })
  }

  sections.push({
    id: 'section-right',
    name: '右侧区域',
    rows: rightRows,
    x: 750,
    y: 100
  })

  const vipRows: Row[] = []
  for (let r = 0; r < 3; r++) {
    const seats: Seat[] = []
    const rowLabel = `VIP${r + 1}`

    for (let c = 0; c < 10; c++) {
      const status: Seat['status'] =
        Math.random() < 0.3 ? 'sold' :
        Math.random() < 0.4 ? 'reserved' : 'available'

      seats.push({
        id: `seat-vip-${r}-${c}`,
        label: String(c + 1),
        x: 30 + c * 28,
        y: c * 8,
        status,
        categoryId: 'vip'
      })
    }

    vipRows.push({
      id: `row-vip-${r}`,
      label: rowLabel,
      seats
    })
  }

  sections.push({
    id: 'section-vip',
    name: 'VIP区域',
    rows: vipRows,
    x: 380,
    y: 520
  })

  return { sections }
}

// ==================== 清空画布 ====================

const clearCanvas = () => {
  if (!layer) return

  selectedSeatIds.value.clear()
  if (transformer) {
    transformer.nodes([])
    transformer.visible(false)
  }

  layer.destroyChildren()
  sectionGroups.clear()
  seatGroups.clear()
  layer.batchDraw()
}

// ==================== 更新座位状态 ====================

const updateSeatStatus = (seatId: string, status: Seat['status']) => {
  const seatGroup = seatGroups.get(seatId)
  if (!seatGroup) return

  const circle = seatGroup.findOne<Konva.Circle>('.seatCircle')
  if (circle) {
    circle.fill(statusColors[status])
    layer?.batchDraw()
  }
}

// ==================== 监听变化 ====================

watch(() => props.showGrid, () => {
  updateGrid()
})

watch(() => props.venueData, (data) => {
  if (data) {
    renderVenueData(data)
  }
})

onMounted(() => {
  initKonva()
})

onUnmounted(() => {
  if (stage) {
    stage.destroy()
  }
})

// ==================== 工具状态 ====================

const currentTool = ref<ToolMode>('select')
const setTool = (tool: ToolMode) => {
  currentTool.value = tool
  // 清除选择状态
  clearSelection()
  // 清除绘制预览
  clearDrawingPreview()
  // 更新鼠标样式
  updateCursor()
}

// 黑色十字准星光标 (base64 SVG)
const blackCrosshairCursor = 'data:image/svg+xml;base64,' + btoa(`<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20"><path d="M9 0h2v20H9zM0 9h20v2H0z" fill="#000"/></svg>`)

const updateCursor = () => {
  if (!stage) return
  const container = stage.container()
  
  switch (currentTool.value) {
    case 'select':
      container.style.cursor = 'default'
      break
    case 'drawRow':
    case 'drawCircle':
    case 'drawTable':
      // 使用黑色十字准星
      container.style.cursor = `url("${blackCrosshairCursor}") 10 10, crosshair`
      break
    case 'text':
      container.style.cursor = 'text'
      break
    default:
      container.style.cursor = 'default'
  }
}

// ==================== 框选功能 ====================

let selectionRect: Konva.Rect | null = null
let selectionStart: { x: number; y: number } | null = null
let isSelecting = ref(false)
const selectedSeatIds = ref<Set<string>>(new Set())
const selectedRowIds = ref<Set<string>>(new Set())
let transformer: Konva.Transformer | null = null

const initSelection = () => {
  if (!stage || !layer) return

  selectionRect = new Konva.Rect({
    visible: false,
    fill: 'rgba(59, 130, 246, 0.1)',
    stroke: '#3b82f6',
    strokeWidth: 1,
    dash: [4, 4]
  })
  layer.add(selectionRect)

  transformer = new Konva.Transformer({
    rotateEnabled: true,
    enabledAnchors: ['top-left', 'top-right', 'bottom-left', 'bottom-right'],
    borderStroke: '#3b82f6',
    anchorStroke: '#3b82f6',
    anchorFill: '#fff',
    anchorSize: 8,
    borderDash: [4, 4]
  })
  layer.add(transformer)
}

const performSelection = () => {
  if (!selectionRect || !stage) return

  const rect = {
    x: selectionRect.x(),
    y: selectionRect.y(),
    width: selectionRect.width(),
    height: selectionRect.height()
  }

  seatGroups.forEach((group, seatId) => {
    // 获取座位在舞台坐标系中的位置
    const seatPos = group.position()
    const seatX = seatPos.x
    const seatY = seatPos.y

    const isInside =
      seatX >= rect.x &&
      seatX <= rect.x + rect.width &&
      seatY >= rect.y &&
      seatY <= rect.y + rect.height

    if (isInside) {
      selectSeat(seatId, true)
    }
  })

  updateTransformer()
}

const selectSeat = (seatId: string, additive = false) => {
  if (!additive) {
    clearSelection()
  }

  selectedSeatIds.value.add(seatId)

  const seatGroup = seatGroups.get(seatId)
  if (seatGroup) {
    const circle = seatGroup.findOne<Konva.Circle>('.seatCircle')
    if (circle) {
      circle.stroke('#3b82f6')
      circle.strokeWidth(3)
    }
    seatGroup.draggable(true)
  }

  updateTransformer()
}

const selectRow = (rowId: string, additive = false) => {
  if (!additive) {
    clearSelection()
  }

  selectedRowIds.value.add(rowId)

  seatGroups.forEach((group, seatId) => {
    if (group.name().includes(`row-${rowId}`)) {
      selectedSeatIds.value.add(seatId)

      const circle = group.findOne<Konva.Circle>('.seatCircle')
      if (circle) {
        circle.stroke('#3b82f6')
        circle.strokeWidth(3)
      }
      group.draggable(true)
    }
  })

  updateTransformer()
}

const deselectSeat = (seatId: string) => {
  selectedSeatIds.value.delete(seatId)

  const seatGroup = seatGroups.get(seatId)
  if (seatGroup) {
    const circle = seatGroup.findOne<Konva.Circle>('.seatCircle')
    if (circle) {
      circle.stroke('white')
      circle.strokeWidth(2)
    }
    seatGroup.draggable(false)
  }

  updateTransformer()
}

const clearSelection = () => {
  selectedSeatIds.value.forEach(seatId => {
    const seatGroup = seatGroups.get(seatId)
    if (seatGroup) {
      const circle = seatGroup.findOne<Konva.Circle>('.seatCircle')
      if (circle) {
        circle.stroke('white')
        circle.strokeWidth(2)
      }
      seatGroup.draggable(false)
    }
  })

  selectedSeatIds.value.clear()
  selectedRowIds.value.clear()
  updateTransformer()
}

const updateTransformer = () => {
  if (!transformer || !layer) return

  const selectedNodes: Konva.Node[] = []
  selectedSeatIds.value.forEach(seatId => {
    const seatGroup = seatGroups.get(seatId)
    if (seatGroup) {
      selectedNodes.push(seatGroup)
    }
  })

  if (selectedNodes.length > 0) {
    transformer.nodes(selectedNodes)
    transformer.visible(true)
    if (transformer.getParent()) {
      transformer.moveToTop()
    }
  } else {
    transformer.nodes([])
    transformer.visible(false)
  }

  layer!.batchDraw()
}

// ==================== 暴露方法 ====================

defineExpose({
  renderVenueData,
  generateTestData,
  clearCanvas,
  resetView,
  zoomTo,
  updateSeatStatus,
  clearSelection,
  setTool,
  selectedSeatIds,
  stage,
  layer
})
</script>

<style scoped>
.konva-wrapper {
  width: 100%;
  height: 100%;
  overflow: hidden;
}

.konva-container {
  width: 100%;
  height: 100%;
}
</style>