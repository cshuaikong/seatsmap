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

// ==================== 绘制圆形状态 ====================

const isDrawingCircle = ref(false)
const circleCenter = ref<{ x: number; y: number } | null>(null)
let previewEllipse: Konva.Ellipse | null = null

// ==================== 绘制矩形状态 ====================

const isDrawingRect = ref(false)
const rectStartPoint = ref<{ x: number; y: number } | null>(null)
let previewRect: Konva.Rect | null = null

// ==================== 绘制多边形状态 ====================

const isDrawingPolygon = ref(false)
const polygonPoints = ref<{ x: number; y: number }[]>([])
let previewPolygon: Konva.Line | null = null
let previewPolygonFill: Konva.Line | null = null
let polygonLines: Konva.Line[] = []
let startPointMarker: Konva.Circle | null = null
const SNAP_TO_START_DISTANCE = 15 // 吸附到起点的距离阈值

// ==================== 绘制线段（折线）状态 ====================

const isDrawingPolyline = ref(false)
const polylinePoints = ref<{ x: number; y: number }[]>([])
let previewPolyline: Konva.Line | null = null
let polylineLines: Konva.Line[] = []
let polylineMarkers: Konva.Circle[] = []

// ==================== 绘制扇形状态（简化版） ====================

const isDrawingSector = ref(false)
const sectorCenter = ref<{ x: number; y: number } | null>(null)
const sectorRadius = ref(0)
const sectorStartAngle = ref(0)
let previewSector: Konva.Group | null = null
let sectorCenterMarker: Konva.Circle | null = null

// ==================== 选择系统状态 ====================

// 旧的选择状态（兼容现有代码）
const selectedSeatIds = ref<Set<string>>(new Set())
const selectedRowIds = ref<Set<string>>(new Set())

type SelectableType = 'seat' | 'row' | 'rect' | 'ellipse' | 'polygon' | 'sector' | 'polyline'

interface SelectedItem {
  id: string
  type: SelectableType
  node: Konva.Group
  originalPos: { x: number; y: number }
  originalRotation: number
}

const selectedItems = ref<SelectedItem[]>([])
const isDraggingSelection = ref(false)
const isRotating = ref(false)
const dragStartPos = ref<{ x: number; y: number } | null>(null)
const selectionStartPos = ref<{ x: number; y: number } | null>(null)
const selectionRectKonva = ref<Konva.Rect | null>(null)

// 选择装饰层
let selectionDecorationLayer: Konva.Layer | null = null
let selectionBorder: Konva.Rect | null = null
let rotationHandle: Konva.Circle | null = null
let rotationLine: Konva.Line | null = null

// 网格配置
const GRID_SIZE = 20
const SNAP_THRESHOLD = 10

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

  // 选择装饰层（在最上层）
  selectionDecorationLayer = new Konva.Layer()
  stage.add(selectionDecorationLayer)

  // 设置初始视图
  resetView()

  // 添加事件监听
  setupStageEvents()

  emit('ready', stage)

  // 初始化框选功能
  initSelection()
}

// 辅助函数：查找可选中的父节点
const findSelectableParent = (node: Konva.Node): Konva.Group | null => {
  let current: Konva.Node | null = node
  while (current) {
    if (current instanceof Konva.Group) {
      const name = current.name() || ''
      if (name.includes('seat') || name.includes('row') || 
          name.includes('rect') || name.includes('ellipse') || 
          name.includes('polygon') || name.includes('sector') || 
          name.includes('polyline')) {
        return current
      }
    }
    current = current.parent()
  }
  return null
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
    
    // 如果正在旋转，不处理其他事件
    if (isRotating.value) return

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

    // 画圆形/椭圆模式 - 点击任意位置开始绘制
    if (currentTool.value === 'drawCircle') {
      startDrawingCircle(stagePos)
      return
    }

    // 画矩形模式 - 点击任意位置开始绘制
    if (currentTool.value === 'drawRect') {
      startDrawingRect(stagePos)
      return
    }

    // 画多边形模式 - 点击添加顶点
    if (currentTool.value === 'drawPolygon') {
      handlePolygonClick(stagePos)
      return
    }

    // 画扇形模式 - 点击开始绘制
    if (currentTool.value === 'drawSector') {
      handleSectorClick(stagePos)
      return
    }

    // 画线段（折线）模式 - 点击添加顶点
    if (currentTool.value === 'drawPolyline') {
      handlePolylineClick(stagePos)
      return
    }

    // ===== 选择模式 =====
    if (currentTool.value !== 'select') return

    // 点击舞台空白处
    if (e.target === stage) {
      // Shift+点击 = 平移画布
      if (e.evt.shiftKey) {
        isDraggingStage.value = true
        dragStart.value = { x: stage!.x(), y: stage!.y() }
        return
      }

      // 启动框选
      startBoxSelection(stagePos)
      return
    }

    // 点击对象
    const clickedNode = findSelectableParent(e.target)
    console.log('点击对象:', e.target.name(), '找到父节点:', clickedNode?.name())
    
    if (clickedNode) {
      const type = getNodeType(clickedNode)
      console.log('对象类型:', type)
      
      if (type) {
        // 检查是否已经选中
        const isSelected = selectedItems.value.some(item => item.node === clickedNode)
        
        if (isSelected) {
          // 点击已选中对象 = 开始拖拽
          startDragSelection(stagePos)
        } else {
          // 点击未选中对象 = 选中它
          selectItem(clickedNode, type, e.evt.shiftKey)
          // 立即开始拖拽
          startDragSelection(stagePos)
        }
      }
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

    // 处理绘制椭圆预览
    if (isDrawingCircle.value && circleCenter.value) {
      updateCirclePreview(stagePos)
      return
    }

    // 处理绘制矩形预览
    if (isDrawingRect.value && rectStartPoint.value) {
      updateRectPreview(stagePos)
      return
    }

    // 处理多边形鼠标移动预览
    if (isDrawingPolygon.value && polygonPoints.value.length > 0) {
      updatePolygonPreview(stagePos)
      return
    }

    // 处理扇形鼠标移动预览
    if (isDrawingSector.value && sectorCenter.value) {
      updateSectorPreview(stagePos)
      return
    }

    // 处理线段（折线）鼠标移动预览
    if (isDrawingPolyline.value && polylinePoints.value.length > 0) {
      updatePolylinePreview(stagePos)
      return
    }
    
    // 处理选中对象拖拽
    if (isDraggingSelection.value) {
      dragSelection(stagePos)
      return
    }

    // 处理框选
    if (selectionStartPos.value && selectionRectKonva.value?.visible()) {
      updateBoxSelection(stagePos)
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

    // 结束绘制椭圆
    if (isDrawingCircle.value) {
      finishDrawingCircle(stagePos)
      return
    }

    // 结束绘制矩形
    if (isDrawingRect.value) {
      finishDrawingRect(stagePos)
      return
    }

    // 多边形/扇形/折线绘制通过点击完成，不在mouseup中处理

    // 结束选中对象拖拽
    if (isDraggingSelection.value) {
      endDragSelection()
      return
    }

    // 结束框选
    if (selectionStartPos.value) {
      endBoxSelection(e.evt.shiftKey)
      return
    }

    isDraggingStage.value = false
  })

  // 点击空白处取消选择
  stage.on('click', (e) => {
    if (e.target === stage && !e.evt.shiftKey && currentTool.value === 'select') {
      clearSelection()
    }
  })
  
  // 键盘事件 - Delete 删除选中
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Delete' || e.key === 'Backspace') {
      // 如果正在绘制，不处理
      if (isDrawingRow.value || isDrawingCircle.value || isDrawingRect.value || 
          isDrawingPolygon.value || isDrawingSector.value || isDrawingPolyline.value) {
        return
      }
      deleteSelected()
    }
  })
}

// ==================== 绘制圆形功能 ====================

const startDrawingCircle = (pos: { x: number; y: number }) => {
  isDrawingCircle.value = true
  circleCenter.value = { x: pos.x, y: pos.y }

  // 创建椭圆预览（使用 Konva.Ellipse 支持椭圆）
  previewEllipse = new Konva.Ellipse({
    x: pos.x,
    y: pos.y,
    radiusX: 0,
    radiusY: 0,
    fill: 'rgba(59, 130, 246, 0.05)',
    stroke: '#3b82f6',
    strokeWidth: 1.5,
    listening: false
  })
  drawingLayer!.add(previewEllipse)

  drawingLayer!.batchDraw()
}

const updateCirclePreview = (pos: { x: number; y: number }) => {
  if (!circleCenter.value || !previewEllipse) return

  // 计算椭圆半径（支持椭圆，不是正圆）
  const radiusX = Math.abs(pos.x - circleCenter.value.x)
  const radiusY = Math.abs(pos.y - circleCenter.value.y)

  // 更新椭圆预览
  previewEllipse.setAttrs({
    radiusX: radiusX,
    radiusY: radiusY
  })

  drawingLayer!.batchDraw()
}

const finishDrawingCircle = (pos: { x: number; y: number }) => {
  if (!circleCenter.value) return

  const radiusX = Math.abs(pos.x - circleCenter.value.x)
  const radiusY = Math.abs(pos.y - circleCenter.value.y)

  // 如果半径太小，取消绘制
  if (radiusX < 5 && radiusY < 5) {
    clearDrawingPreview()
    isDrawingCircle.value = false
    circleCenter.value = null
    return
  }

  // 创建椭圆区域组
  const ellipseId = `ellipse-${Date.now()}`
  const ellipseGroup = createEllipseGroup(
    circleCenter.value.x, 
    circleCenter.value.y, 
    radiusX, 
    radiusY, 
    ellipseId
  )
  
  if (layer) {
    layer.add(ellipseGroup)
    layer.batchDraw()
  }

  // 清除预览
  clearDrawingPreview()
  isDrawingCircle.value = false
  circleCenter.value = null
}

// 创建椭圆区域组
const createEllipseGroup = (centerX: number, centerY: number, radiusX: number, radiusY: number, ellipseId: string) => {
  const group = new Konva.Group({
    x: centerX,
    y: centerY,
    id: `ellipse-group-${ellipseId}`,
    name: 'shape-group ellipse-group'
  })

  // 创建椭圆（灰色填充，无边框）
  const ellipseBoundary = new Konva.Ellipse({
    x: 0,
    y: 0,
    radiusX: radiusX,
    radiusY: radiusY,
    fill: 'rgba(156, 163, 175, 0.6)',
    stroke: null,
    listening: false
  })
  group.add(ellipseBoundary)

  // 添加透明点击区域
  const clickArea = new Konva.Ellipse({
    x: 0,
    y: 0,
    radiusX: radiusX + 10,
    radiusY: radiusY + 10,
    fill: 'transparent',
    listening: true,
    name: `ellipse-click-area ellipse-${ellipseId}`
  })
  clickArea.on('click', (e) => {
    e.cancelBubble = true
    if (currentTool.value !== 'select') return
    selectEllipse(ellipseId, e.evt.shiftKey)
  })
  clickArea.on('mouseenter', () => {
    if (currentTool.value === 'select') {
      document.body.style.cursor = 'pointer'
      ellipseBoundary.fill('rgba(156, 163, 175, 0.8)')
      layer?.batchDraw()
    }
  })
  clickArea.on('mouseleave', () => {
    document.body.style.cursor = 'default'
    ellipseBoundary.fill('rgba(156, 163, 175, 0.6)')
    layer?.batchDraw()
  })
  group.add(clickArea)

  return group
}

// 选择椭圆区域
const selectEllipse = (ellipseId: string, additive = false) => {
  // 椭圆区域只选中边界高亮，不生成座位
  // 可以扩展为选中后显示操作手柄
  console.log('选中椭圆区域:', ellipseId)
}

// ==================== 绘制矩形功能 ====================

const startDrawingRect = (pos: { x: number; y: number }) => {
  isDrawingRect.value = true
  rectStartPoint.value = { x: pos.x, y: pos.y }

  // 创建矩形预览
  previewRect = new Konva.Rect({
    x: pos.x,
    y: pos.y,
    width: 0,
    height: 0,
    fill: 'rgba(156, 163, 175, 0.6)', // 灰色填充
    stroke: null, // 无边框
    cornerRadius: 8, // 圆角
    listening: false
  })
  drawingLayer!.add(previewRect)

  drawingLayer!.batchDraw()
}

const updateRectPreview = (pos: { x: number; y: number }) => {
  if (!rectStartPoint.value || !previewRect) return

  // 计算宽度和高度（支持向任意方向拖拽）
  const width = pos.x - rectStartPoint.value.x
  const height = pos.y - rectStartPoint.value.y

  // 更新矩形预览
  previewRect.setAttrs({
    x: width >= 0 ? rectStartPoint.value.x : pos.x,
    y: height >= 0 ? rectStartPoint.value.y : pos.y,
    width: Math.abs(width),
    height: Math.abs(height)
  })

  drawingLayer!.batchDraw()
}

const finishDrawingRect = (pos: { x: number; y: number }) => {
  if (!rectStartPoint.value) return

  // 计算最终宽度和高度
  const width = pos.x - rectStartPoint.value.x
  const height = pos.y - rectStartPoint.value.y
  const finalWidth = Math.abs(width)
  const finalHeight = Math.abs(height)

  // 如果尺寸太小，取消绘制
  if (finalWidth < 10 || finalHeight < 10) {
    clearDrawingPreview()
    isDrawingRect.value = false
    rectStartPoint.value = null
    return
  }

  // 计算矩形左上角位置
  const x = width >= 0 ? rectStartPoint.value.x : pos.x
  const y = height >= 0 ? rectStartPoint.value.y : pos.y

  // 创建矩形区域组
  const rectId = `rect-${Date.now()}`
  const rectGroup = createRectGroup(x, y, finalWidth, finalHeight, rectId)
  
  if (layer) {
    layer.add(rectGroup)
    layer.batchDraw()
  }

  // 清除预览
  clearDrawingPreview()
  isDrawingRect.value = false
  rectStartPoint.value = null
}

// 创建矩形区域组
const createRectGroup = (x: number, y: number, width: number, height: number, rectId: string) => {
  const group = new Konva.Group({
    x: x,
    y: y,
    id: `rect-group-${rectId}`,
    name: 'shape-group rect-group'
  })

  // 创建矩形（灰色填充，无边框，圆角）
  const rect = new Konva.Rect({
    x: 0,
    y: 0,
    width: width,
    height: height,
    fill: 'rgba(156, 163, 175, 0.6)', // 灰色填充
    stroke: null, // 无边框
    cornerRadius: 8, // 圆角效果
    listening: false
  })
  group.add(rect)

  // 添加透明点击区域（比实际矩形大一些，方便选中）
  const clickArea = new Konva.Rect({
    x: -5,
    y: -5,
    width: width + 10,
    height: height + 10,
    fill: 'transparent',
    listening: true,
    name: `rect-click-area rect-${rectId}`
  })
  clickArea.on('click', (e) => {
    e.cancelBubble = true
    if (currentTool.value !== 'select') return
    selectRect(rectId, e.evt.shiftKey)
  })
  clickArea.on('mouseenter', () => {
    if (currentTool.value === 'select') {
      document.body.style.cursor = 'pointer'
      rect.fill('rgba(156, 163, 175, 0.8)') // 悬停时加深颜色
      layer?.batchDraw()
    }
  })
  clickArea.on('mouseleave', () => {
    document.body.style.cursor = 'default'
    rect.fill('rgba(156, 163, 175, 0.6)') // 恢复原始颜色
    layer?.batchDraw()
  })
  group.add(clickArea)

  return group
}

// 选择矩形区域
const selectRect = (rectId: string, additive = false) => {
  // 矩形区域选中时高亮显示
  console.log('选中矩形区域:', rectId)
}

// ==================== 绘制多边形功能 ====================

const handlePolygonClick = (pos: { x: number; y: number }) => {
  // 如果是第一个点，开始绘制
  if (polygonPoints.value.length === 0) {
    isDrawingPolygon.value = true
    polygonPoints.value.push({ x: pos.x, y: pos.y })
    
    // 创建起点标记（小一点）
    startPointMarker = new Konva.Circle({
      x: pos.x,
      y: pos.y,
      radius: 4,
      fill: '#3b82f6',
      stroke: '#fff',
      strokeWidth: 2,
      listening: false
    })
    drawingLayer!.add(startPointMarker)
    drawingLayer!.batchDraw()
    return
  }

  // 检查是否点击了起点（闭合多边形）
  const startPoint = polygonPoints.value[0]
  const distanceToStart = Math.sqrt(
    Math.pow(pos.x - startPoint.x, 2) + Math.pow(pos.y - startPoint.y, 2)
  )

  // 如果至少3个点且点击了起点附近，闭合多边形
  if (polygonPoints.value.length >= 3 && distanceToStart < SNAP_TO_START_DISTANCE) {
    finishDrawingPolygon()
    return
  }

  // 检查是否点击了已存在的点（避免重复）
  for (const point of polygonPoints.value) {
    const distance = Math.sqrt(
      Math.pow(pos.x - point.x, 2) + Math.pow(pos.y - point.y, 2)
    )
    if (distance < 5) return // 点击了已存在的点，忽略
  }

  // 添加新点
  polygonPoints.value.push({ x: pos.x, y: pos.y })

  // 创建顶点标记（小点）
  const vertexMarker = new Konva.Circle({
    x: pos.x,
    y: pos.y,
    radius: 3,
    fill: '#60a5fa',
    stroke: '#fff',
    strokeWidth: 1,
    listening: false
  })
  drawingLayer!.add(vertexMarker)
  polygonLines.push(vertexMarker as any)

  // 创建固定线条连接上一个点和当前点
  const prevPoint = polygonPoints.value[polygonPoints.value.length - 2]
  const line = new Konva.Line({
    points: [prevPoint.x, prevPoint.y, pos.x, pos.y],
    stroke: '#3b82f6',
    strokeWidth: 2,
    listening: false
  })
  drawingLayer!.add(line)
  polygonLines.push(line)

  drawingLayer!.batchDraw()
}

const updatePolygonPreview = (pos: { x: number; y: number }) => {
  if (!isDrawingPolygon.value || polygonPoints.value.length === 0) return

  const lastPoint = polygonPoints.value[polygonPoints.value.length - 1]
  const startPoint = polygonPoints.value[0]

  // 检查是否靠近起点（显示吸附效果）
  const distanceToStart = Math.sqrt(
    Math.pow(pos.x - startPoint.x, 2) + Math.pow(pos.y - startPoint.y, 2)
  )
  const isNearStart = polygonPoints.value.length >= 3 && distanceToStart < SNAP_TO_START_DISTANCE

  // 清除旧的预览线条
  if (previewPolygon) {
    previewPolygon.destroy()
    previewPolygon = null
  }
  if (previewPolygonFill) {
    previewPolygonFill.destroy()
    previewPolygonFill = null
  }

  // 创建预览填充（如果靠近起点，显示闭合预览）
  if (isNearStart) {
    const fillPoints = polygonPoints.value.flatMap(p => [p.x, p.y])
    fillPoints.push(startPoint.x, startPoint.y) // 闭合
    
    previewPolygonFill = new Konva.Line({
      points: fillPoints,
      fill: 'rgba(156, 163, 175, 0.4)',
      stroke: null,
      closed: true,
      listening: false
    })
    drawingLayer!.add(previewPolygonFill)

    // 高亮起点
    if (startPointMarker) {
      startPointMarker.fill('#22c55e')
      startPointMarker.radius(6)
    }
  } else {
    // 恢复起点样式
    if (startPointMarker) {
      startPointMarker.fill('#3b82f6')
      startPointMarker.radius(4)
    }
  }

  // 创建从最后一个点到鼠标位置的预览线
  const targetPoint = isNearStart ? startPoint : pos
  previewPolygon = new Konva.Line({
    points: [lastPoint.x, lastPoint.y, targetPoint.x, targetPoint.y],
    stroke: isNearStart ? '#22c55e' : '#3b82f6',
    strokeWidth: 2,
    dash: isNearStart ? [] : [5, 5],
    listening: false
  })
  drawingLayer!.add(previewPolygon)

  drawingLayer!.batchDraw()
}

const finishDrawingPolygon = () => {
  if (polygonPoints.value.length < 3) return

  const points = polygonPoints.value
  const polygonId = `polygon-${Date.now()}`

  // 创建多边形组
  const polygonGroup = createPolygonGroup(points, polygonId)
  
  if (layer) {
    layer.add(polygonGroup)
    layer.batchDraw()
  }

  // 清除预览和状态
  clearDrawingPreview()
  isDrawingPolygon.value = false
  polygonPoints.value = []
}

// 创建多边形组
const createPolygonGroup = (points: { x: number; y: number }[], polygonId: string) => {
  // 计算多边形的边界框
  let minX = Infinity, minY = Infinity
  let maxX = -Infinity, maxY = -Infinity
  points.forEach(p => {
    minX = Math.min(minX, p.x)
    minY = Math.min(minY, p.y)
    maxX = Math.max(maxX, p.x)
    maxY = Math.max(maxY, p.y)
  })

  const centerX = (minX + maxX) / 2
  const centerY = (minY + maxY) / 2

  const group = new Konva.Group({
    x: centerX,
    y: centerY,
    id: `polygon-group-${polygonId}`,
    name: 'shape-group polygon-group'
  })

  // 将点转换为相对于中心的坐标
  const relativePoints = points.flatMap(p => [p.x - centerX, p.y - centerY])

  // 创建多边形（灰色填充，无边框）
  const polygon = new Konva.Line({
    points: relativePoints,
    fill: 'rgba(156, 163, 175, 0.6)', // 灰色填充
    stroke: null, // 无边框
    closed: true,
    listening: false
  })
  group.add(polygon)

  // 添加透明点击区域
  const clickArea = new Konva.Line({
    points: relativePoints.map((p, i) => i % 2 === 0 ? p * 1.1 : p * 1.1), // 稍微放大一点
    fill: 'transparent',
    closed: true,
    listening: true,
    name: `polygon-click-area polygon-${polygonId}`
  })
  clickArea.on('click', (e) => {
    e.cancelBubble = true
    if (currentTool.value !== 'select') return
    selectPolygon(polygonId, e.evt.shiftKey)
  })
  clickArea.on('mouseenter', () => {
    if (currentTool.value === 'select') {
      document.body.style.cursor = 'pointer'
      polygon.fill('rgba(156, 163, 175, 0.8)')
      layer?.batchDraw()
    }
  })
  clickArea.on('mouseleave', () => {
    document.body.style.cursor = 'default'
    polygon.fill('rgba(156, 163, 175, 0.6)')
    layer?.batchDraw()
  })
  group.add(clickArea)

  return group
}

// 选择多边形区域
const selectPolygon = (polygonId: string, additive = false) => {
  console.log('选中多边形区域:', polygonId)
}

// ==================== 绘制线段（折线）功能 ====================

// 点击处理：添加点或结束绘制
const handlePolylineClick = (pos: { x: number; y: number }) => {
  // 如果至少有一个点，检查是否点击了最后一个点（结束绘制）
  if (polylinePoints.value.length >= 2) {
    const lastPoint = polylinePoints.value[polylinePoints.value.length - 1]
    const distanceToLast = Math.sqrt(
      Math.pow(pos.x - lastPoint.x, 2) + Math.pow(pos.y - lastPoint.y, 2)
    )
    
    // 如果点击最后一个点附近，结束绘制
    if (distanceToLast < 10) {
      finishDrawingPolyline()
      return
    }
  }
  
  // 检查是否点击了已存在的点（避免重复）
  for (const point of polylinePoints.value) {
    const distance = Math.sqrt(
      Math.pow(pos.x - point.x, 2) + Math.pow(pos.y - point.y, 2)
    )
    if (distance < 5) return
  }
  
  // 第一个点：开始绘制
  if (polylinePoints.value.length === 0) {
    isDrawingPolyline.value = true
  }
  
  // 添加新点
  polylinePoints.value.push({ x: pos.x, y: pos.y })
  
  // 创建顶点标记
  const marker = new Konva.Circle({
    x: pos.x,
    y: pos.y,
    radius: polylinePoints.value.length === 1 ? 4 : 3,
    fill: '#3b82f6',
    stroke: '#fff',
    strokeWidth: 1,
    listening: false
  })
  drawingLayer!.add(marker)
  polylineMarkers.push(marker)
  
  // 创建固定线条连接上一个点和当前点
  if (polylinePoints.value.length >= 2) {
    const prevPoint = polylinePoints.value[polylinePoints.value.length - 2]
    const line = new Konva.Line({
      points: [prevPoint.x, prevPoint.y, pos.x, pos.y],
      stroke: '#3b82f6',
      strokeWidth: 2,
      listening: false
    })
    drawingLayer!.add(line)
    polylineLines.push(line)
  }
  
  drawingLayer!.batchDraw()
}

// 鼠标移动预览
const updatePolylinePreview = (pos: { x: number; y: number }) => {
  if (!isDrawingPolyline.value || polylinePoints.value.length === 0) return
  
  const lastPoint = polylinePoints.value[polylinePoints.value.length - 1]
  
  // 清除旧的预览线
  if (previewPolyline) {
    previewPolyline.destroy()
    previewPolyline = null
  }
  
  // 创建从最后一个点到鼠标位置的预览线（虚线）
  previewPolyline = new Konva.Line({
    points: [lastPoint.x, lastPoint.y, pos.x, pos.y],
    stroke: '#3b82f6',
    strokeWidth: 2,
    dash: [5, 5],
    listening: false
  })
  drawingLayer!.add(previewPolyline)
  
  drawingLayer!.batchDraw()
}

// 完成绘制
const finishDrawingPolyline = () => {
  if (polylinePoints.value.length < 2) {
    clearDrawingPreview()
    return
  }
  
  const points = polylinePoints.value
  const polylineId = `polyline-${Date.now()}`
  
  // 创建折线组
  const polylineGroup = createPolylineGroup(points, polylineId)
  
  if (layer) {
    layer.add(polylineGroup)
    layer.batchDraw()
  }
  
  // 清除预览和状态
  clearDrawingPreview()
  isDrawingPolyline.value = false
  polylinePoints.value = []
}

// 创建折线组
const createPolylineGroup = (points: { x: number; y: number }[], polylineId: string) => {
  const group = new Konva.Group({
    id: `polyline-group-${polylineId}`,
    name: 'shape-group polyline-group'
  })
  
  // 将点转换为 flat 数组
  const flatPoints = points.flatMap(p => [p.x, p.y])
  
  // 创建折线（灰色线条）
  const polyline = new Konva.Line({
    points: flatPoints,
    stroke: 'rgba(156, 163, 175, 0.8)',
    strokeWidth: 2,
    listening: false
  })
  group.add(polyline)
  
  // 添加透明点击区域（稍宽一点）
  const clickArea = new Konva.Line({
    points: flatPoints,
    stroke: 'transparent',
    strokeWidth: 10,
    listening: true,
    name: `polyline-click-area polyline-${polylineId}`
  })
  clickArea.on('click', (e) => {
    e.cancelBubble = true
    if (currentTool.value !== 'select') return
    selectPolyline(polylineId, e.evt.shiftKey)
  })
  clickArea.on('mouseenter', () => {
    if (currentTool.value === 'select') {
      document.body.style.cursor = 'pointer'
      polyline.stroke('rgba(156, 163, 175, 1)')
      polyline.strokeWidth(3)
      layer?.batchDraw()
    }
  })
  clickArea.on('mouseleave', () => {
    document.body.style.cursor = 'default'
    polyline.stroke('rgba(156, 163, 175, 0.8)')
    polyline.strokeWidth(2)
    layer?.batchDraw()
  })
  group.add(clickArea)
  
  return group
}

// 选择折线
const selectPolyline = (polylineId: string, additive = false) => {
  console.log('选中折线:', polylineId)
}

// ==================== 绘制扇形功能 ====================

// 简单的辅助函数：画圆弧上的点
const getArcPoints = (radius: number, startAngle: number, endAngle: number, steps = 20) => {
  const points: number[] = []
  const sweep = endAngle - startAngle
  for (let i = 0; i <= steps; i++) {
    const angle = (startAngle + (sweep * i / steps)) * Math.PI / 180
    points.push(Math.cos(angle) * radius, Math.sin(angle) * radius)
  }
  return points
}

// 第一步/第二步/第三步点击处理
const handleSectorClick = (pos: { x: number; y: number }) => {
  const cx = sectorCenter.value?.x ?? pos.x
  const cy = sectorCenter.value?.y ?? pos.y
  
  // 第一步：确定圆心
  if (!sectorCenter.value) {
    sectorCenter.value = { x: pos.x, y: pos.y }
    // 画圆心点
    sectorCenterMarker = new Konva.Circle({
      x: pos.x, y: pos.y, radius: 4, fill: '#3b82f6', listening: false
    })
    drawingLayer!.add(sectorCenterMarker)
    drawingLayer!.batchDraw()
    return
  }
  
  // 第二步：确定半径和起始角度
  if (sectorRadius.value === 0) {
    const dx = pos.x - cx
    const dy = pos.y - cy
    sectorRadius.value = Math.sqrt(dx * dx + dy * dy)
    sectorStartAngle.value = Math.atan2(dy, dx) * 180 / Math.PI
    if (sectorRadius.value < 10) {
      clearDrawingPreview()
      return
    }
    isDrawingSector.value = true
    return
  }
  
  // 第三步：完成绘制
  finishDrawingSector()
}

// 鼠标移动时更新预览
const updateSectorPreview = (pos: { x: number; y: number }) => {
  if (!sectorCenter.value) return
  const cx = sectorCenter.value.x
  const cy = sectorCenter.value.y
  const dx = pos.x - cx
  const dy = pos.y - cy
  
  previewSector?.destroy()
  previewSector = new Konva.Group({ x: cx, y: cy, listening: false })
  
  // 第一步：只画半径线
  if (sectorRadius.value === 0) {
    const radius = Math.sqrt(dx * dx + dy * dy)
    const angle = Math.atan2(dy, dx) * 180 / Math.PI
    const rad = angle * Math.PI / 180
    previewSector.add(new Konva.Line({
      points: [0, 0, Math.cos(rad) * radius, Math.sin(rad) * radius],
      stroke: '#3b82f6', strokeWidth: 2
    }))
    drawingLayer!.add(previewSector)
    drawingLayer!.batchDraw()
    return
  }
  
  // 第二步：画完整扇形（弧线 + 两条半径）
  const currentAngle = Math.atan2(dy, dx) * 180 / Math.PI
  let sweepAngle = currentAngle - sectorStartAngle.value
  // 标准化到 -360~360
  if (sweepAngle > 180) sweepAngle -= 360
  if (sweepAngle < -180) sweepAngle += 360
  
  const startAngle = sectorStartAngle.value
  const endAngle = startAngle + sweepAngle
  const r = sectorRadius.value
  
  // 弧线
  const arcPoints = getArcPoints(r, Math.min(startAngle, endAngle), Math.max(startAngle, endAngle))
  previewSector.add(new Konva.Line({
    points: arcPoints, stroke: '#3b82f6', strokeWidth: 2
  }))
  
  // 两条半径
  const startRad = startAngle * Math.PI / 180
  const endRad = endAngle * Math.PI / 180
  previewSector.add(new Konva.Line({
    points: [0, 0, Math.cos(startRad) * r, Math.sin(startRad) * r],
    stroke: '#3b82f6', strokeWidth: 2
  }))
  previewSector.add(new Konva.Line({
    points: [0, 0, Math.cos(endRad) * r, Math.sin(endRad) * r],
    stroke: '#3b82f6', strokeWidth: 2
  }))
  
  // 保存当前角度供完成时使用
  previewSector.setAttr('startAngle', startAngle)
  previewSector.setAttr('endAngle', endAngle)
  
  drawingLayer!.add(previewSector)
  drawingLayer!.batchDraw()
}

// 完成绘制
const finishDrawingSector = () => {
  if (!sectorCenter.value || !previewSector) return
  
  const cx = sectorCenter.value.x
  const cy = sectorCenter.value.y
  const r = sectorRadius.value
  const startAngle = previewSector.getAttr('startAngle') ?? sectorStartAngle.value
  const endAngle = previewSector.getAttr('endAngle') ?? sectorStartAngle.value
  const angle = Math.abs(endAngle - startAngle)
  const rotation = Math.min(startAngle, endAngle)
  
  if (angle < 5) {
    clearDrawingPreview()
    return
  }
  
  // 创建扇形组
  const group = new Konva.Group({ x: cx, y: cy })
  
  // 弧线
  const arcPoints = getArcPoints(r, Math.min(startAngle, endAngle), Math.max(startAngle, endAngle))
  group.add(new Konva.Line({
    points: arcPoints, stroke: 'rgba(156, 163, 175, 0.8)', strokeWidth: 2, listening: false
  }))
  
  // 两条半径
  const startRad = startAngle * Math.PI / 180
  const endRad = endAngle * Math.PI / 180
  group.add(new Konva.Line({
    points: [0, 0, Math.cos(startRad) * r, Math.sin(startRad) * r],
    stroke: 'rgba(156, 163, 175, 0.8)', strokeWidth: 2, listening: false
  }))
  group.add(new Konva.Line({
    points: [0, 0, Math.cos(endRad) * r, Math.sin(endRad) * r],
    stroke: 'rgba(156, 163, 175, 0.8)', strokeWidth: 2, listening: false
  }))
  
  layer?.add(group)
  layer?.batchDraw()
  
  clearDrawingPreview()
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
  
  // 清除椭圆预览
  if (previewEllipse) {
    previewEllipse.destroy()
    previewEllipse = null
  }
  
  // 清除矩形预览
  if (previewRect) {
    previewRect.destroy()
    previewRect = null
  }
  
  // 清除多边形预览
  polygonLines.forEach(line => line.destroy())
  polygonLines = []
  if (previewPolygon) {
    previewPolygon.destroy()
    previewPolygon = null
  }
  if (previewPolygonFill) {
    previewPolygonFill.destroy()
    previewPolygonFill = null
  }
  if (startPointMarker) {
    startPointMarker.destroy()
    startPointMarker = null
  }
  
  // 重置多边形状态
  isDrawingPolygon.value = false
  polygonPoints.value = []
  
  // 清除扇形预览
  if (previewSector) {
    previewSector.destroy()
    previewSector = null
  }
  if (sectorCenterMarker) {
    sectorCenterMarker.destroy()
    sectorCenterMarker = null
  }
  
  // 重置扇形状态
  isDrawingSector.value = false
  sectorCenter.value = null
  sectorRadius.value = 0
  sectorStartAngle.value = 0
  
  // 清除线段（折线）预览
  if (previewPolyline) {
    previewPolyline.destroy()
    previewPolyline = null
  }
  polylineLines.forEach(line => line.destroy())
  polylineLines = []
  polylineMarkers.forEach(marker => marker.destroy())
  polylineMarkers = []
  
  // 重置线段状态
  isDrawingPolyline.value = false
  polylinePoints.value = []
}

// 创建座位排组
const createRowGroup = (seats: Seat[], startX: number, startY: number, rotation: number, rowId: string) => {
  const group = new Konva.Group({
    x: startX,
    y: startY,
    rotation: rotation,
    id: `row-group-${rowId}`,
    name: 'row-group'
  })

  // 计算旋转角度的弧度
  const angleRad = (rotation * Math.PI) / 180
  const cos = Math.cos(angleRad)
  const sin = Math.sin(angleRad)

  // 创建座位（使用传入的世界坐标，转换为相对于 Group 起点的本地坐标）
  seats.forEach((seat) => {
    // 将世界坐标转换为相对于 Group 起点的本地坐标
    // 世界坐标 = Group起点 + 本地X * cos - 本地Y * sin
    // 所以：本地X = (世界X - Group起点X) * cos + (世界Y - Group起点Y) * sin
    //       本地Y = -(世界X - Group起点X) * sin + (世界Y - Group起点Y) * cos
    const dx = seat.x - startX
    const dy = seat.y - startY
    const relativeX = dx * cos + dy * sin
    const relativeY = -dx * sin + dy * cos
    
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

    // 拖拽事件 - 支持多选整体移动
    seatGroup.on('dragstart', (e) => {
      // 如果没有被选中，先选中这个座位
      if (!selectedSeatIds.value.has(seat.id)) {
        selectSeat(seat.id, e.evt.shiftKey)
      }
      
      dragStartPositions.clear()
      selectedSeatIds.value.forEach(id => {
        const g = seatGroups.get(id)
        if (g) {
          dragStartPositions.set(id, { x: g.x(), y: g.y() })
        }
      })
    })

    seatGroup.on('dragmove', (e) => {
      const currentSeatId = seat.id
      if (!selectedSeatIds.value.has(currentSeatId)) return
      
      const currentGroup = seatGroups.get(currentSeatId)
      const startPos = dragStartPositions.get(currentSeatId)
      if (!startPos || !currentGroup) return
      
      // 计算当前拖拽的偏移量
      const dx = currentGroup.x() - startPos.x
      const dy = currentGroup.y() - startPos.y
      
      // 应用到所有选中的座位（除了当前正在拖拽的）
      selectedSeatIds.value.forEach(id => {
        if (id === currentSeatId) return
        
        const g = seatGroups.get(id)
        const pos = dragStartPositions.get(id)
        if (g && pos) {
          g.x(pos.x + dx)
          g.y(pos.y + dy)
        }
      })
      
      // 更新transformer
      if (transformer) {
        transformer.forceUpdate()
      }
      
      layer?.batchDraw()
    })

    seatGroup.on('dragend', () => {
      selectedSeatIds.value.forEach(id => {
        const g = seatGroups.get(id)
        if (g) {
          emit('seatDrag', id, g.x(), g.y())
        }
      })
      
      dragStartPositions.clear()
    })

    group.add(seatGroup)
    seatGroups.set(seat.id, seatGroup)
  })

  // 添加点击区域 - 用于点击排时选中整排
  // 计算排的边界
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
  if (seats.length > 0) {
    seats.forEach((seat) => {
      const dx = seat.x - startX
      const dy = seat.y - startY
      const relativeX = dx * cos + dy * sin
      const relativeY = -dx * sin + dy * cos
      minX = Math.min(minX, relativeX - SEAT_RADIUS)
      minY = Math.min(minY, relativeY - SEAT_RADIUS)
      maxX = Math.max(maxX, relativeX + SEAT_RADIUS)
      maxY = Math.max(maxY, relativeY + SEAT_RADIUS)
    })
    // 添加一些padding，使点击区域更大
    const padding = 8
    minX -= padding
    minY -= padding
    maxX += padding
    maxY += padding
  }

  // 创建透明点击区域
  const clickArea = new Konva.Rect({
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY,
    fill: 'transparent',
    listening: true,
    name: `row-click-area row-${rowId}`
  })
  clickArea.on('click', (e) => {
    e.cancelBubble = true
    if (currentTool.value !== 'select') return

    // 点击排背景时，选中整排
    if (selectedRowIds.value.has(rowId)) {
      // 如果已选中，取消选中（除非按住Shift）
      if (!e.evt.shiftKey) {
        // 检查是否点击在座位之外（即排背景）
        // 如果座位已经被选中，并且点击背景，则保持选中状态
        // 只有在单独点击背景时才切换
      }
    }
    selectRow(rowId, e.evt.shiftKey)
  })
  // 鼠标悬停效果
  clickArea.on('mouseenter', () => {
    if (currentTool.value === 'select') {
      document.body.style.cursor = 'pointer'
    }
  })
  clickArea.on('mouseleave', () => {
    document.body.style.cursor = 'default'
  })
  group.add(clickArea)

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

  group.on('dragstart', (e) => {
    // 如果没有被选中，先选中这个座位
    if (!selectedSeatIds.value.has(seat.id)) {
      selectSeat(seat.id, e.evt.shiftKey)
    }
    
    dragStartPositions.clear()
    selectedSeatIds.value.forEach(id => {
      const g = seatGroups.get(id)
      if (g) {
        dragStartPositions.set(id, { x: g.x(), y: g.y() })
      }
    })
  })

  group.on('dragmove', () => {
    const currentSeatId = seat.id
    if (!selectedSeatIds.value.has(currentSeatId)) return
    
    const currentGroup = seatGroups.get(currentSeatId)
    const startPos = dragStartPositions.get(currentSeatId)
    if (!startPos || !currentGroup) return
    
    const dx = currentGroup.x() - startPos.x
    const dy = currentGroup.y() - startPos.y
    
    selectedSeatIds.value.forEach(id => {
      if (id === currentSeatId) return
      
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
    case 'drawRect':
    case 'drawPolygon':
    case 'drawPolyline':
    case 'drawSector':
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

// ==================== 新的选择系统 ====================

const initSelection = () => {
  // 初始化选择框（用于框选）
  selectionRectKonva.value = new Konva.Rect({
    visible: false,
    fill: 'rgba(59, 130, 246, 0.1)',
    stroke: '#3b82f6',
    strokeWidth: 1,
    dash: [4, 4],
    listening: false
  })
  selectionDecorationLayer?.add(selectionRectKonva.value)
  
  // 初始化选择边框
  selectionBorder = new Konva.Rect({
    visible: false,
    stroke: '#3b82f6',
    strokeWidth: 1,
    dash: [4, 4],
    listening: false
  })
  
  // 初始化旋转手柄
  rotationHandle = new Konva.Circle({
    radius: 6,
    fill: '#fff',
    stroke: '#3b82f6',
    strokeWidth: 2,
    visible: false,
    listening: true,
    name: 'rotation-handle'
  })
  
  // 初始化旋转连线
  rotationLine = new Konva.Line({
    stroke: '#3b82f6',
    strokeWidth: 1,
    dash: [4, 4],
    visible: false,
    listening: false
  })
  
  selectionDecorationLayer?.add(selectionBorder)
  selectionDecorationLayer?.add(rotationLine)
  selectionDecorationLayer?.add(rotationHandle)
  
  // 绑定旋转手柄事件
  rotationHandle.on('mousedown', (e) => {
    e.cancelBubble = true
    startRotation(e.evt)
  })
}

// 网格对齐辅助函数
const snapToGrid = (value: number): number => {
  return Math.round(value / GRID_SIZE) * GRID_SIZE
}

// 获取所有可选中对象
const getAllSelectableNodes = (): Konva.Group[] => {
  const nodes: Konva.Group[] = []
  
  // 收集所有座位
  seatGroups.forEach((group) => {
    nodes.push(group)
  })
  
  // 收集所有形状（矩形、椭圆、多边形、扇形、折线）
  layer?.find('.shape-group').forEach((node) => {
    if (node instanceof Konva.Group) {
      nodes.push(node)
    }
  })
  
  return nodes
}

// 更新选择装饰（边框、旋转手柄）
const updateSelectionDecoration = () => {
  if (!selectionDecorationLayer || selectedItems.value.length === 0) {
    selectionBorder?.visible(false)
    rotationHandle?.visible(false)
    rotationLine?.visible(false)
    selectionDecorationLayer?.batchDraw()
    return
  }
  
  // 计算选中对象的边界框
  let minX = Infinity, minY = Infinity
  let maxX = -Infinity, maxY = -Infinity
  
  selectedItems.value.forEach(item => {
    const box = item.node.getClientRect()
    minX = Math.min(minX, box.x)
    minY = Math.min(minY, box.y)
    maxX = Math.max(maxX, box.x + box.width)
    maxY = Math.max(maxY, box.y + box.height)
  })
  
  // 更新选择边框
  selectionBorder?.setAttrs({
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY,
    visible: true
  })
  
  // 更新旋转手柄位置（边框上方中心）
  const centerX = (minX + maxX) / 2
  rotationHandle?.setAttrs({
    x: centerX,
    y: minY - 20,
    visible: true
  })
  
  // 更新旋转连线
  rotationLine?.setAttrs({
    points: [centerX, minY, centerX, minY - 14],
    visible: true
  })
  
  selectionDecorationLayer.batchDraw()
}

// 选择对象
const selectItem = (node: Konva.Group, type: SelectableType, additive = false) => {
  if (!additive) {
    clearSelection()
  }
  
  // 检查是否已选中
  const exists = selectedItems.value.find(item => item.id === node.id())
  if (exists) {
    // 如果已选中且是additive模式，则取消选中
    if (additive) {
      deselectItem(node.id())
    }
    return
  }
  
  // 保存原始位置和旋转
  selectedItems.value.push({
    id: node.id(),
    type,
    node,
    originalPos: { x: node.x(), y: node.y() },
    originalRotation: node.rotation()
  })
  
  // 添加选中视觉反馈
  node.setAttr('selected', true)
  
  updateSelectionDecoration()
}

// 取消选择
const deselectItem = (id: string) => {
  const item = selectedItems.value.find(i => i.id === id)
  if (item) {
    item.node.setAttr('selected', false)
    selectedItems.value = selectedItems.value.filter(i => i.id !== id)
  }
  updateSelectionDecoration()
}

// 清空选择
const clearSelection = () => {
  selectedItems.value.forEach(item => {
    item.node.setAttr('selected', false)
  })
  selectedItems.value = []
  updateSelectionDecoration()
}

// 开始拖拽选中对象
const startDragSelection = (pos: { x: number; y: number }) => {
  if (selectedItems.value.length === 0) return
  
  isDraggingSelection.value = true
  dragStartPos.value = pos
  
  // 保存原始位置
  selectedItems.value.forEach(item => {
    item.originalPos = { x: item.node.x(), y: item.node.y() }
  })
}

// 拖拽移动
const dragSelection = (pos: { x: number; y: number }) => {
  if (!isDraggingSelection.value || !dragStartPos.value) return
  
  const dx = pos.x - dragStartPos.value.x
  const dy = pos.y - dragStartPos.value.y
  
  selectedItems.value.forEach(item => {
    // 计算新位置（带网格对齐）
    const newX = item.originalPos.x + dx
    const newY = item.originalPos.y + dy
    
    // 网格对齐
    const snappedX = snapToGrid(newX)
    const snappedY = snapToGrid(newY)
    
    item.node.x(snappedX)
    item.node.y(snappedY)
  })
  
  updateSelectionDecoration()
  layer?.batchDraw()
}

// 结束拖拽
const endDragSelection = () => {
  isDraggingSelection.value = false
  dragStartPos.value = null
}

// 开始旋转
const startRotation = (e: MouseEvent) => {
  if (selectedItems.value.length === 0) return
  
  isRotating.value = true
  
  // 计算整体中心点
  let minX = Infinity, minY = Infinity
  let maxX = -Infinity, maxY = -Infinity
  
  selectedItems.value.forEach(item => {
    const box = item.node.getClientRect()
    minX = Math.min(minX, box.x)
    minY = Math.min(minY, box.y)
    maxX = Math.max(maxX, box.x + box.width)
    maxY = Math.max(maxY, box.y + box.height)
  })
  
  const centerX = (minX + maxX) / 2
  const centerY = (minY + maxY) / 2
  
  // 保存原始旋转
  selectedItems.value.forEach(item => {
    item.originalRotation = item.node.rotation()
  })
  
  // 计算起始角度
  const startAngle = Math.atan2(e.offsetY - centerY, e.offsetX - centerX)
  
  // 绑定全局鼠标移动事件
  const handleRotateMove = (moveE: MouseEvent) => {
    if (!isRotating.value) return
    
    const currentAngle = Math.atan2(moveE.offsetY - centerY, moveE.offsetX - centerX)
    const rotationDelta = (currentAngle - startAngle) * 180 / Math.PI
    
    selectedItems.value.forEach(item => {
      // 围绕整体中心旋转每个对象
      const box = item.node.getClientRect()
      const itemCenterX = box.x + box.width / 2
      const itemCenterY = box.y + box.height / 2
      
      // 计算相对于整体中心的偏移
      const dx = itemCenterX - centerX
      const dy = itemCenterY - centerY
      
      // 旋转偏移
      const rad = rotationDelta * Math.PI / 180
      const newDx = dx * Math.cos(rad) - dy * Math.sin(rad)
      const newDy = dx * Math.sin(rad) + dy * Math.cos(rad)
      
      // 应用新位置
      item.node.x(item.node.x() + (newDx - dx))
      item.node.y(item.node.y() + (newDy - dy))
      
      // 应用旋转（保持相对旋转）
      item.node.rotation(item.originalRotation + rotationDelta)
    })
    
    updateSelectionDecoration()
    layer?.batchDraw()
  }
  
  const handleRotateEnd = () => {
    isRotating.value = false
    window.removeEventListener('mousemove', handleRotateMove)
    window.removeEventListener('mouseup', handleRotateEnd)
  }
  
  window.addEventListener('mousemove', handleRotateMove)
  window.addEventListener('mouseup', handleRotateEnd)
}

// 开始框选
const startBoxSelection = (pos: { x: number; y: number }) => {
  selectionStartPos.value = pos
  selectionRectKonva.value?.setAttrs({
    x: pos.x,
    y: pos.y,
    width: 0,
    height: 0,
    visible: true
  })
}

// 更新框选框
const updateBoxSelection = (pos: { x: number; y: number }) => {
  if (!selectionStartPos.value || !selectionRectKonva.value) return
  
  const x = Math.min(selectionStartPos.value.x, pos.x)
  const y = Math.min(selectionStartPos.value.y, pos.y)
  const width = Math.abs(pos.x - selectionStartPos.value.x)
  const height = Math.abs(pos.y - selectionStartPos.value.y)
  
  selectionRectKonva.value.setAttrs({ x, y, width, height })
  selectionDecorationLayer?.batchDraw()
}

// 结束框选
const endBoxSelection = (additive: boolean) => {
  if (!selectionRectKonva.value || !selectionStartPos.value) return
  
  const box = selectionRectKonva.value.getClientRect()
  
  // 获取所有可选中对象
  const allNodes = getAllSelectableNodes()
  
  // 找到与框选区域相交的对象
  const intersectingNodes = allNodes.filter(node => {
    const nodeBox = node.getClientRect()
    return Konva.Util.haveIntersection(box, nodeBox)
  })
  
  if (!additive) {
    clearSelection()
  }
  
  // 选中相交的对象
  intersectingNodes.forEach(node => {
    const type = getNodeType(node)
    if (type) {
      selectItem(node, type, true)
    }
  })
  
  // 隐藏选择框
  selectionRectKonva.value.visible(false)
  selectionStartPos.value = null
  selectionDecorationLayer?.batchDraw()
}

// 获取节点类型
const getNodeType = (node: Konva.Group): SelectableType | null => {
  const name = node.name() || ''
  if (name.includes('seat')) return 'seat'
  if (name.includes('row')) return 'row'
  if (name.includes('rect')) return 'rect'
  if (name.includes('ellipse')) return 'ellipse'
  if (name.includes('polygon')) return 'polygon'
  if (name.includes('sector')) return 'sector'
  if (name.includes('polyline')) return 'polyline'
  return null
}

// 删除选中对象
const deleteSelected = () => {
  selectedItems.value.forEach(item => {
    item.node.destroy()
  })
  clearSelection()
  layer?.batchDraw()
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
