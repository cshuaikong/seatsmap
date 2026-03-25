<template>
  <div class="konva-wrapper">
    <div ref="containerRef" class="konva-container"></div>
    <!-- 性能监控面板已禁用（避免 Vue 重渲染影响性能） -->
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue'
import Konva from 'konva'
import type { ToolMode, DrawStep } from '../composables/useDrawing'
import { defaultSeatMapConfig, type SeatStatus, type SeatStatus as SeatStatusType, type SeatType } from '../types'

// ==================== 类型定义 ====================

export interface Seat {
  id: string
  label: string
  x: number
  y: number
  status: 'available' | 'booked' | 'reserved' | 'disabled'
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

// 分层策略：StaticLayer 放静态座位，ActiveLayer 放操作中座位
let staticLayer: Konva.Layer | null = null
let activeLayer: Konva.Layer | null = null

// 兼容旧代码的别名（后续逐步替换）
let layer: Konva.Layer | null = null

let transformLayer: Konva.Layer | null = null
let drawingLayer: Konva.Layer | null = null

// 拖拽时使用的临时 layer（只包含选中节点，优化400+节点性能）
let dragLayer: Konva.Layer | null = null

// 拖拽预览矩形（轻量级，只显示拖拽位置）
let dragPreviewRect: Konva.Rect | null = null

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

// 使用统一配置（来自 defaultSeatMapConfig）
const SEAT_RADIUS = defaultSeatMapConfig.defaultSeatRadius
const SEAT_SPACING = defaultSeatMapConfig.defaultSeatSpacing
const ROW_SPACING = defaultSeatMapConfig.defaultRowSpacing

// 状态颜色（使用统一配置）
const statusColors: Record<SeatStatus, string> = defaultSeatMapConfig.statusColors

// 分类颜色（使用统一配置）
const categoryColors: Record<string, string> = defaultSeatMapConfig.categoryColors

// ==================== 绘制座位状态 ====================

const isDrawingRow = ref(false)
const rowStartPoint = ref<{ x: number; y: number } | null>(null)
const rowEndPoint = ref<{ x: number; y: number } | null>(null)
let previewLine: Konva.Line | null = null
let previewSeats: Konva.Node[] = []
let guideLines: Konva.Line[] = []
let cursorPreviewSeat: Konva.Group | null = null  // 鼠标跟随预览座位
let isFirstPointPlaced = false  // 是否已放置起点

// ==================== 三点式绘制状态（section、section-diagonal）====================

// 绘制步骤：'idle' | 'first' | 'second' | 'third'
const drawStep = ref<DrawStep>('idle')

// 三点式绘制的三个关键点
const drawPoints = ref<{
  first: { x: number; y: number } | null
  second: { x: number; y: number } | null
  third: { x: number; y: number } | null
}>({
  first: null,
  second: null,
  third: null
})

// 三点式预览元素
let sectionPreviewLines: Konva.Line[] = []
let sectionPreviewSeats: Konva.Shape | null = null

// 行号计数器（自动递增）
let rowCounter = 0
const getNextRowLabel = () => String.fromCharCode(65 + (rowCounter++ % 26))

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
  node: Konva.Node
  originalPos: { x: number; y: number }
  originalRotation: number
}

// 注意：拖拽时使用非响应式的 dragState，避免 Vue 响应式开销
const selectedItems = ref<SelectedItem[]>([])

// 拖拽状态 - 完全非响应式
interface DragState {
  isDragging: boolean
  nodeId: string | null
  nodes: Map<string, { node: Konva.Group; startX: number; startY: number }>
}
const dragState: DragState = {
  isDragging: false,
  nodeId: null,
  nodes: new Map()
}
const selectionStartPos = ref<{ x: number; y: number } | null>(null)
const isBoxSelecting = ref(false)  // 是否正在框选

// 拖拽完成标志 - 用于区分拖拽和点击
let justDragged = false

// 选择装饰层
let selectionDecorationLayer: Konva.Layer | null = null

// Transformer 用于变换（移动、旋转）
let transformer: Konva.Transformer | null = null

// 光标状态缓存（避免重复写 DOM）
let currentCursor = 'default'
const setCursor = (cursor: string) => {
  if (currentCursor === cursor) return
  currentCursor = cursor
  if (stage) stage.container().style.cursor = cursor
}

// 统一拖拽状态（非响应式，避免 Vue 开销）
interface DragAllItem {
  node: Konva.Node
  startX: number
  startY: number
}
interface UnifiedDragState {
  active: boolean
  startScreenX: number
  startScreenY: number
  currentX: number
  currentY: number
  items: DragAllItem[]
}
const unifiedDragState: UnifiedDragState = {
  active: false,
  startScreenX: 0,
  startScreenY: 0,
  currentX: 0,
  currentY: 0,
  items: []
}

const startDragAll = (screenPos: { x: number; y: number }) => {
  unifiedDragState.active = true
  unifiedDragState.startScreenX = screenPos.x
  unifiedDragState.startScreenY = screenPos.y
  unifiedDragState.items = selectedItems.value.map(item => ({
    node: item.node as Konva.Group,
    startX: item.node.x(),
    startY: item.node.y()
  }))
  
  // 官方优化方案：拖拽时将 Group 移到 dragLayer，并优化变换计算
  if (dragLayer && staticLayer) {
    unifiedDragState.items.forEach(item => {
      const group = item.node as Konva.Group
      // 只启用位置变换，禁用缩放/旋转（提升性能）
      group.transformsEnabled('position')
      group.moveTo(dragLayer)
    })
    dragLayer.visible(true)
    dragLayer.listening(false)
    dragLayer.batchDraw()
  }
  
  setCursor('grabbing')
  document.body.style.cursor = 'grabbing'
}

let dragRafId = 0
let lastDragRenderTime = 0
let lastTransformerUpdateTime = 0
const DRAG_RENDER_INTERVAL = 16 // ~60fps

// ==================== 性能监控（非响应式，避免 Vue 重渲染）====================
let perfFps = 0
let perfFrameTime = 0
let perfLastTime = 0
let perfFrameCount = 0
let perfFpsTimer = 0

const updateDragAll = (screenPos: { x: number; y: number }) => {
  if (!unifiedDragState.active || !stage) return
  
  // 记录当前鼠标位置（用于拖拽结束时计算最终位置）
  unifiedDragState.currentX = screenPos.x
  unifiedDragState.currentY = screenPos.y
  
  const frameStart = performance.now()
  
  // 1. 坐标计算时间
  const t1 = performance.now()
  const scaleVal = stage.scaleX()
  const dx = (screenPos.x - unifiedDragState.startScreenX) / scaleVal
  const dy = (screenPos.y - unifiedDragState.startScreenY) / scaleVal
  const calcTime = Math.round(performance.now() - t1)
  
  // 2. 节点更新时间（直接设置 attrs，避免 setter 开销）
  const t2 = performance.now()
  const now = performance.now()
  if (now - lastDragRenderTime > 50) { // 20fps
    lastDragRenderTime = now
    unifiedDragState.items.forEach(item => {
      // 直接设置 attrs，不触发 setter 副作用
      item.node.setAttr('x', item.startX + dx)
      item.node.setAttr('y', item.startY + dy)
    })
  }
  const updateTime = Math.round(performance.now() - t2)
  
  // 3. 渲染时间（只渲染 dragLayer）
  const t3 = performance.now()
  dragLayer?.batchDraw()
  const renderTime = Math.round(performance.now() - t3)
  
  // 4. 总帧时
  const totalTime = Math.round(performance.now() - frameStart)
  
  // 每 500ms 打印一次详细数据
  perfFrameCount++
  if (frameStart - perfFpsTimer >= 500) {
    perfFps = Math.round(perfFrameCount * 1000 / (frameStart - perfFpsTimer))
    perfFrameCount = 0
    perfFpsTimer = frameStart
    console.log(`[拖拽性能] FPS:${perfFps} 总:${totalTime}ms | 坐标:${calcTime}ms 更新:${updateTime}ms 渲染:${renderTime}ms | 节点:${unifiedDragState.items.length}排`)
  }
}

const endDragAll = () => {
  if (!unifiedDragState.active) return
  // 取消未执行的渲染帧
  if (dragRafId) {
    cancelAnimationFrame(dragRafId)
    dragRafId = 0
  }
  
  // 拖拽结束：将 Group 移回 staticLayer，恢复变换设置
  if (dragLayer && staticLayer) {
    unifiedDragState.items.forEach(item => {
      const group = item.node as Konva.Group
      // 恢复所有变换
      group.transformsEnabled('all')
      group.moveTo(staticLayer)
    })
    dragLayer.visible(false)
  }
  
  // 只有真正移动了才设 justDragged，防止误取消选中
  const moved = unifiedDragState.items.some(item =>
    Math.abs(item.node.x() + item.node.offsetX() - item.startX) > 2 ||
    Math.abs(item.node.y() + item.node.offsetY() - item.startY) > 2
  )
  justDragged = moved
  unifiedDragState.active = false
  document.body.style.cursor = ''
  // 更新 originalPos
  selectedItems.value.forEach(item => {
    item.originalPos = { x: item.node.x(), y: item.node.y() }
  })
  unifiedDragState.items = []
  // 最终重绘
  staticLayer?.batchDraw()
}

// 网格配置
const GRID_SIZE = 20
const SNAP_THRESHOLD = 10

// ==================== 初始化 ====================

const initKonva = () => {
  if (!containerRef.value) return

  // 获取父容器实际大小
  const containerParent = containerRef.value.parentElement
  const width = props.width || containerParent?.clientWidth || window.innerWidth
  const height = props.height || containerParent?.clientHeight || window.innerHeight

  stage = new Konva.Stage({
    container: containerRef.value,
    width,
    height
  })

  // 分层策略：StaticLayer 放静态座位（缓存，高性能）
  staticLayer = new Konva.Layer({
    listening: true,
    hitGraphEnabled: true
  })
  stage.add(staticLayer)
  layer = staticLayer // 兼容旧代码

  // ActiveLayer 放操作中座位（实时渲染）
  activeLayer = new Konva.Layer({
    listening: true,
    hitGraphEnabled: true
  })
  stage.add(activeLayer)

  // 变换层（用于缩放和平移）
  transformLayer = new Konva.Layer()
  stage.add(transformLayer)

  // 绘制层（用于绘制预览）
  drawingLayer = new Konva.Layer()
  stage.add(drawingLayer)

  // 网格背景已移除（性能优化）

  // 选择装饰层（在最上层）
  selectionDecorationLayer = new Konva.Layer()
  stage.add(selectionDecorationLayer)

  // 拖拽临时层（只包含选中节点，优化400+节点性能）
  dragLayer = new Konva.Layer({
    listening: false,
    visible: false
  })
  stage.add(dragLayer)

  // 设置初始视图
  resetView()

  // 添加事件监听
  setupStageEvents()

  // 初始化 Transformer
  initTransformer()

  emit('ready', stage)

  // 初始化框选功能
  initSelection()
}

// 辅助函数：查找可选中的父节点
const findSelectableParent = (node: Konva.Node): Konva.Node | null => {
  let current: Konva.Node | null = node
  while (current) {
    const name = current.name() || ''
    const id = current.id() || ''
    // 支持 Konva.Shape（row-shape-xxx）和 Konva.Group
    if (current instanceof Konva.Shape || current instanceof Konva.Group) {
      // rowShape 是基础选中单位（id 格式：row-shape-xxx）
      if (id.startsWith('row-shape-') && name.includes('row-shape')) {
        return current
      }
      // 兼容旧的 row-group
      if (id.startsWith('row-group-') && name.includes('row-group')) {
        return current
      }
      // 其他形状类型
      if (name.includes('rect') || name.includes('ellipse') || 
          name.includes('polygon') || name.includes('sector') || 
          name.includes('polyline') || name.includes('shape-group')) {
        return current
      }
    }
    const parentNode: Konva.Node | null = current.getParent ? current.getParent() : null
    current = parentNode
  }
  return null
}

const setupStageEvents = () => {
  if (!stage) return

  // 滚轮缩放（已禁用，避免与页面滚动冲突）
  // stage.on('wheel', (e) => {
  //   e.evt.preventDefault()
  //   ...缩放逻辑...
  // })

  // 鼠标按下 - 统一处理框选、平移和绘制
  stage.on('mousedown', (e) => {
    // 只响应左键 (buttons & 1 表示左键按下)
    if (!(e.evt.buttons & 1)) return

    const pos = stage!.getPointerPosition()
    if (!pos) return

    // 将屏幕坐标转换为舞台坐标
    const transform = stage!.getAbsoluteTransform().copy()
    transform.invert()
    const stagePos = transform.point(pos)

    // 旧版画座位排模式（拖拽式）
    if (currentTool.value === 'drawRow') {
      startDrawingRow(stagePos)
      return
    }

    // 单座位模式 - 点击创建单个座位
    if (currentTool.value === 'single-seat') {
      createSingleSeat(stagePos)
      return
    }

    // 直行模式（两点式点击）
    if (currentTool.value === 'row-straight') {
      handleRowStraightClick(stagePos)
      return
    }

    // 三点式折线行模式
    if (currentTool.value === 'section') {
      handleSectionClick(stagePos)
      return
    }

    // 对角区块模式
    if (currentTool.value === 'section-diagonal') {
      handleSectionDiagonalClick(stagePos)
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

    // 检查是否在 Transformer 框内 → 进入统一拖拽模式
    if (transformer && transformer.visible() && selectedItems.value.length > 0) {
      const trRect = transformer.getClientRect()
      const insideTr = (
        pos.x >= trRect.x &&
        pos.x <= trRect.x + trRect.width &&
        pos.y >= trRect.y &&
        pos.y <= trRect.y + trRect.height
      )
      if (insideTr) {
        startDragAll(pos)
        return  // 不触发框选或其他逻辑
      }
    }

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
    
    // 检查是否点击了已选中的节点或其子元素
    // 如果是，让 Transformer 处理拖拽，不启动框选
    const clickedNode = findSelectableParent(e.target)
    if (clickedNode) {
      const isAlreadySelected = selectedItems.value.some(item => item.node === clickedNode)
      if (isAlreadySelected) {
        // 已选中，让 Transformer 处理拖拽，不干预
        return
      }
    }

    // 点击未选中的对象，不在这里处理（交给 click 事件）
    // 但也不启动框选
  })

// 点击事件处理选中
  stage.on('click', (e) => {
    if (currentTool.value !== 'select') return
    
    // 如果刚刚完成拖拽，忽略这次点击（避免拖拽结束后误触发取消选中）
    if (justDragged) {
      justDragged = false
      return
    }
    
    // 如果刚刚完成框选，忽略这次点击
    if (isBoxSelecting.value) {
      isBoxSelecting.value = false
      return
    }
    
    // 点击空白处取消选择
    if (e.target === stage) {
      if (!e.evt.shiftKey) {
        clearSelection()
      }
      return
    }
    
    // 点击对象 - 处理选中
    const clickedNode = findSelectableParent(e.target)
    if (!clickedNode) return
    
    const type = getNodeType(clickedNode)
    if (!type) return
    
    const isSelected = selectedItems.value.some(item => item.node === clickedNode)
    
    if (isSelected) {
      // 已选中且没有按住 shift = 取消选中（如果是唯一选中的）
      if (!e.evt.shiftKey && selectedItems.value.length === 1) {
        deselectItem(clickedNode.id())
      }
    } else {
      // 未选中：选中它
      selectItem(clickedNode, type, e.evt.shiftKey)
    }
  })

  // 鼠标移动 - 处理框选、平移和绘制预览
  // mousemove 节流：最多 30fps，减少 CPU 占用
  let lastMouseMoveTime = 0
  stage.on('mousemove', (e) => {
    const now = performance.now()
    if (now - lastMouseMoveTime < 33) return // 30fps 节流
    lastMouseMoveTime = now
    
    const pos = stage!.getPointerPosition()
    if (!pos) return

    // 统一拖拽模式优先处理
    if (unifiedDragState.active) {
      updateDragAll(pos)
      return
    }

    // 将屏幕坐标转换为舞台坐标
    const transform = stage!.getAbsoluteTransform().copy()
    transform.invert()
    const stagePos = transform.point(pos)

    // 处理绘制座位预览（旧版拖拽式 drawRow）
    if (isDrawingRow.value && rowStartPoint.value && currentTool.value === 'drawRow') {
      updateDrawingPreview(stagePos)
      return
    }

    // 直行模式/三点式模式预览
    if ((currentTool.value === 'row-straight' || currentTool.value === 'section' || currentTool.value === 'section-diagonal') && drawStep.value !== 'idle') {
      updateMultiPointPreview(stagePos)
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

    // 处理框选
    if (selectionStartPos.value && dragSelectRect?.visible()) {
      updateBoxSelection(stagePos)
      return
    }

    // 处理画布平移
    if (isDraggingStage.value) {
      stage!.x(stage!.x() + e.evt.movementX)
      stage!.y(stage!.y() + e.evt.movementY)
      staticLayer!.batchDraw()
      return
    }

    // 选择模式下：判断鼠标是否在 Transformer 框内，控制光标
    if (currentTool.value === 'select' && transformer && transformer.visible() && selectedItems.value.length > 0) {
      const trRect = transformer.getClientRect()
      const insideTr = (
        pos.x >= trRect.x &&
        pos.x <= trRect.x + trRect.width &&
        pos.y >= trRect.y &&
        pos.y <= trRect.y + trRect.height
      )
      setCursor(insideTr ? 'move' : 'default')
    }
  })

  // 鼠标释放 - 结束框选、平移或绘制
  stage.on('mouseup', (e) => {
    const pos = stage!.getPointerPosition()
    if (!pos) return

    // 统一拖拽结束优先处理
    if (unifiedDragState.active) {
      endDragAll()
      return
    }
    // 将屏幕坐标转换为舞台坐标
    const transform = stage!.getAbsoluteTransform().copy()
    transform.invert()
    const stagePos = transform.point(pos)

    // 结束绘制座位（仅旧版拖拽式 drawRow 工具）
    if (isDrawingRow.value && currentTool.value === 'drawRow') {
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

    // 结束框选
    if (selectionStartPos.value) {
      endBoxSelection(e.evt.shiftKey)
    }

    // 重置状态
    isDraggingStage.value = false
  })
  
  // 键盘事件 - Delete 删除选中 / ESC 取消绘制
  window.addEventListener('keydown', (e) => {
    // ESC - 取消当前绘制
    if (e.key === 'Escape') {
      cancelMultiPointDraw()
      clearDrawingPreview()
      isDrawingRow.value = false
      rowStartPoint.value = null
      rowEndPoint.value = null
      return
    }
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
  
  if (staticLayer) {
    staticLayer.add(ellipseGroup)
    staticLayer.batchDraw()
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
    listening: false
  })
  group.add(ellipseBoundary)

  // 添加透明点击区域（与椭圆大小一致，不扩展）
  const clickArea = new Konva.Ellipse({
    x: 0,
    y: 0,
    radiusX: radiusX,
    radiusY: radiusY,
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
      setCursor('move')
      ellipseBoundary.fill('rgba(156, 163, 175, 0.8)')
      staticLayer?.batchDraw()
    }
  })
  clickArea.on('mouseleave', () => {
    setCursor('default')
    ellipseBoundary.fill('rgba(156, 163, 175, 0.6)')
    staticLayer?.batchDraw()
  })
  group.add(clickArea)

  return group
}

// 选择椭圆区域
const selectEllipse = (ellipseId: string, additive = false) => {
  const group = staticLayer?.findOne(`#ellipse-group-${ellipseId}`) as Konva.Group
  if (group) {
    selectItem(group, 'ellipse', additive)
  }
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
  
  if (staticLayer) {
    staticLayer.add(rectGroup)
    staticLayer.batchDraw()
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
    cornerRadius: 8, // 圆角效果
    listening: false
  })
  group.add(rect)

  // 添加透明点击区域（与实际矩形大小一致）
  const clickArea = new Konva.Rect({
    x: 0,
    y: 0,
    width: width,
    height: height,
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
      setCursor('move')
      rect.fill('rgba(156, 163, 175, 0.8)') // 悬停时加深颜色
      staticLayer?.batchDraw()
    }
  })
  clickArea.on('mouseleave', () => {
    setCursor('default')
    rect.fill('rgba(156, 163, 175, 0.6)') // 恢复原始颜色
    staticLayer?.batchDraw()
  })
  group.add(clickArea)

  return group
}

// 选择矩形区域
const selectRect = (rectId: string, additive = false) => {
  const group = staticLayer?.findOne(`#rect-group-${rectId}`) as Konva.Group
  if (group) {
    selectItem(group, 'rect', additive)
  }
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
  
  if (staticLayer) {
    staticLayer.add(polygonGroup)
    staticLayer.batchDraw()
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
    closed: true,
    listening: false
  })
  group.add(polygon)

  // 添加透明点击区域（与多边形大小一致）
  const clickArea = new Konva.Line({
    points: relativePoints,
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
      setCursor('move')
      polygon.fill('rgba(156, 163, 175, 0.8)')
      staticLayer?.batchDraw()
    }
  })
  clickArea.on('mouseleave', () => {
    setCursor('default')
    polygon.fill('rgba(156, 163, 175, 0.6)')
    staticLayer?.batchDraw()
  })
  group.add(clickArea)

  return group
}

// 选择多边形区域
const selectPolygon = (polygonId: string, additive = false) => {
  const group = staticLayer?.findOne(`#polygon-group-${polygonId}`) as Konva.Group
  if (group) {
    selectItem(group, 'polygon', additive)
  }
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
  
  if (staticLayer) {
    staticLayer.add(polylineGroup)
    staticLayer.batchDraw()
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
  
  // 添加透明点击区域（与折线宽度一致）
  const clickArea = new Konva.Line({
    points: flatPoints,
    stroke: 'transparent',
    strokeWidth: 4,
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
      setCursor('move')
      polyline.stroke('rgba(156, 163, 175, 1)')
      polyline.strokeWidth(3)
      staticLayer?.batchDraw()
    }
  })
  clickArea.on('mouseleave', () => {
    setCursor('default')
    polyline.stroke('rgba(156, 163, 175, 0.8)')
    polyline.strokeWidth(2)
    staticLayer?.batchDraw()
  })
  group.add(clickArea)
  
  return group
}

// 选择折线
const selectPolyline = (polylineId: string, additive = false) => {
  const group = staticLayer?.findOne(`#polyline-group-${polylineId}`) as Konva.Group
  if (group) {
    selectItem(group, 'polyline', additive)
  }
}

// 选择座位（使用新的选择系统）
const selectSeat = (seatId: string, additive = false) => {
  const group = seatGroups.get(seatId)
  if (group) {
    selectItem(group, 'seat', additive)
  }
}

// 取消选择座位
const deselectSeat = (seatId: string) => {
  deselectItem(seatId)
}

// 选择排（使用新的选择系统）
const selectRow = (rowId: string, additive = false) => {
  // 优先查找新的 row-shape
  const shape = staticLayer?.findOne(`#row-shape-${rowId}`) as Konva.Shape
  if (shape) {
    selectItem(shape, 'row', additive)
    return
  }
  // 兼容旧的 row-group
  const group = staticLayer?.findOne(`#row-group-${rowId}`) as Konva.Group
  if (group) {
    selectItem(group, 'row', additive)
  }
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
  
  staticLayer?.add(group)
  staticLayer?.batchDraw()
  
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

  // 无吸附效果，直接使用鼠标位置
  rowEndPoint.value = { x: pos.x, y: pos.y }

  // 更新预览线
  previewLine.points([rowStartPoint.value.x, rowStartPoint.value.y, pos.x, pos.y])

  // 清除旧的预览座位
  previewSeats.forEach(seat => seat.destroy())
  previewSeats = []

  // 计算座位数量和位置
  const dx = pos.x - rowStartPoint.value.x
  const dy = pos.y - rowStartPoint.value.y
  const distance = Math.sqrt(dx * dx + dy * dy)
  
  // 如果距离太小，不创建预览
  if (distance < 1) {
    drawingLayer!.batchDraw()
    return
  }
  
  const seatCount = Math.max(2, Math.floor(distance / SEAT_SPACING) + 1)

  // 计算单位向量（避免除以0）
  const unitX = distance > 0 ? dx / distance : 0
  const unitY = distance > 0 ? dy / distance : 0

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

  drawingLayer!.batchDraw()
}

const finishDrawingRow = (pos: { x: number; y: number }) => {
  if (!rowStartPoint.value) return

  // 使用传入的终点位置（鼠标释放位置）
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

  // 创建座位数据（本地坐标，相对于排起点）
  const seats: Seat[] = []
  for (let i = 0; i < seatCount; i++) {
    // 本地坐标：相对于排起点的偏移
    const localX = unitX * i * SEAT_SPACING
    const localY = unitY * i * SEAT_SPACING

    seats.push({
      id: `seat-${Date.now()}-${i}`,
      label: String(i + 1),
      x: localX,
      y: localY,
      status: 'available',
      categoryId: 'custom'
    })
  }

  // 创建实际的座位排并渲染
  const rowId = `row-${Date.now()}`
  const rowShape = createRowShape(seats, rowStartPoint.value.x, rowStartPoint.value.y, 
    Math.atan2(dy, dx) * 180 / Math.PI, rowId)
  
  if (staticLayer) {
    staticLayer.add(rowShape)
    staticLayer.batchDraw()
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

// 创建座位排 Shape - 高性能批次绘制
// startX/startY 对应第一个座位的绝对坐标（也是旋转原点）
// seats 中每个座位的 x/y 是相对于 startX/startY 的局部偏移
const createRowShape = (seats: Seat[], startX: number, startY: number, rotation: number, rowId: string) => {
  // 计算排的局部边界
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
  seats.forEach((seat) => {
    minX = Math.min(minX, seat.x - SEAT_RADIUS)
    minY = Math.min(minY, seat.y - SEAT_RADIUS)
    maxX = Math.max(maxX, seat.x + SEAT_RADIUS)
    maxY = Math.max(maxY, seat.y + SEAT_RADIUS)
  })

  const width = maxX - minX
  const height = maxY - minY

  // 座位坐标减去 minX/minY 偏移，使内容从 (0,0) 开始
  const adjustedSeats = seats.map(s => ({
    ...s,
    x: s.x - minX,
    y: s.y - minY,
  }))
  
  // 旋转原点设在形状中心，旋转时不变形
  const centerX = width / 2
  const centerY = height / 2
  const shapeX = startX + minX + centerX  // x/y 对应中心点
  const shapeY = startY + minY + centerY

  const shape = new Konva.Shape({
    x: shapeX,
    y: shapeY,
    rotation: rotation,
    offsetX: centerX,  // 旋转原点在中心
    offsetY: centerY,
    id: `row-shape-${rowId}`,
    name: 'row-shape',
    width: width,
    height: height,
    perfectDrawEnabled: false,
    transformsEnabled: 'all',
    seatsData: adjustedSeats,
    hitMinX: 0,
    hitMinY: 0,
    hitMaxX: width,
    hitMaxY: height,
  })

  // sceneFunc: 批次绘制所有座位
  shape.sceneFunc((context, shape) => {
    const seatsData = shape.getAttr('seatsData') as Seat[]
    const isSelected = shape.getAttr('selected')
    const radius = SEAT_RADIUS
    
    // 按状态分组，减少 fillStyle 切换
    const statusGroups: Record<string, Seat[]> = {
      available: [],
      booked: [],
      reserved: [],
      disabled: []
    }
    
    seatsData.forEach(seat => {
      if (statusGroups[seat.status]) {
        statusGroups[seat.status].push(seat)
      }
    })

    // 批次绘制每个状态的座位
    Object.entries(statusGroups).forEach(([status, groupSeats]) => {
      if (groupSeats.length === 0) return
      
      context.beginPath()
      const baseColor = statusColors[status as keyof typeof statusColors]
      // 选中时加粗边框效果
      context.fillStyle = baseColor
      
      groupSeats.forEach(seat => {
        context.moveTo(seat.x + radius, seat.y)
        context.arc(seat.x, seat.y, radius, 0, Math.PI * 2)
      })
      
      context.fill()
      
      // 选中时绘制蓝色边框
      if (isSelected) {
        context.save()
        context.strokeStyle = '#3b82f6'
        context.lineWidth = 3
        groupSeats.forEach(seat => {
          context.beginPath()
          context.arc(seat.x, seat.y, radius, 0, Math.PI * 2)
          context.stroke()
        })
        context.restore()
      } else {
        // 默认细边框
        context.save()
        context.strokeStyle = baseColor
        context.lineWidth = 1
        groupSeats.forEach(seat => {
          context.beginPath()
          context.arc(seat.x, seat.y, radius, 0, Math.PI * 2)
          context.stroke()
        })
        context.restore()
      }
    })
  })

  // hitFunc: 自定义点击检测区域
  shape.hitFunc((context, shape) => {
    const minX = shape.getAttr('hitMinX')
    const minY = shape.getAttr('hitMinY')
    const maxX = shape.getAttr('hitMaxX')
    const maxY = shape.getAttr('hitMaxY')
    
    context.beginPath()
    context.rect(minX, minY, maxX - minX, maxY - minY)
    context.fillStrokeShape(shape)
  })

  // 鼠标事件
  shape.on('mouseenter', () => {
    if (currentTool.value !== 'select') return
    setTimeout(() => {
      if (shape.getAttr('selected')) {
        document.body.style.cursor = 'grabbing'
      } else {
        document.body.style.cursor = 'grab'
      }
    }, 0)
  })
  
  shape.on('mouseleave', () => {
    document.body.style.cursor = 'default'
  })

  shape.on('click', (e) => {
    if (currentTool.value !== 'select') return
    if (shape.getAttr('selected')) return
    e.cancelBubble = true
    selectRow(rowId, e.evt.shiftKey)
  })

  // 存储座位映射（兼容旧代码）
  seats.forEach(seat => {
    seatGroups.set(seat.id, shape as any)
  })

  return shape
}

// ==================== 新绘制模式（single-seat / row-straight / section / section-diagonal）====================

// ---------- 辅助函数 ----------

/** 根据两点计算方向单位向量 */
const getUnitVec = (from: { x: number; y: number }, to: { x: number; y: number }) => {
  const dx = to.x - from.x
  const dy = to.y - from.y
  const dist = Math.sqrt(dx * dx + dy * dy)
  if (dist < 0.001) return { ux: 1, uy: 0, dist }
  return { ux: dx / dist, uy: dy / dist, dist }
}

/** 沿方向生成座位坐标列表（起点相对 shape 自身，旋转 0） */
const genSeatsAlongLine = (
  count: number,
  startIdOffset = 0
): Seat[] => {
  const seats: Seat[] = []
  for (let i = 0; i < count; i++) {
    seats.push({
      id: `seat-${Date.now()}-${startIdOffset + i}`,
      label: String(startIdOffset + i + 1),
      x: i * SEAT_SPACING,
      y: 0,
      status: 'available',
      categoryId: 'custom'
    })
  }
  return seats
}

/** 清理三点式/直行预览元素 */
const clearMultiPointPreview = () => {
  sectionPreviewLines.forEach(l => l.destroy())
  sectionPreviewLines = []
  if (sectionPreviewSeats) {
    sectionPreviewSeats.destroy()
    sectionPreviewSeats = null
  }
  drawingLayer?.batchDraw()
}

/** 重置三点式绘制状态 */
const cancelMultiPointDraw = () => {
  clearMultiPointPreview()
  drawStep.value = 'idle'
  drawPoints.value = { first: null, second: null, third: null }
}

/** 绘制预览座位 Shape（绘制层，不可交互） */
const buildPreviewSeatShape = (
  positions: { x: number; y: number }[],
): Konva.Shape => {
  const shape = new Konva.Shape({
    listening: false,
    perfectDrawEnabled: false,
  })
  shape.sceneFunc((ctx) => {
    ctx.beginPath()
    positions.forEach(p => {
      ctx.moveTo(p.x + SEAT_RADIUS, p.y)
      ctx.arc(p.x, p.y, SEAT_RADIUS, 0, Math.PI * 2)
    })
    ctx.fillStyle = 'rgba(59,130,246,0.25)'
    ctx.fill()
    ctx.strokeStyle = '#3b82f6'
    ctx.lineWidth = 1.5
    positions.forEach(p => {
      ctx.beginPath()
      ctx.arc(p.x, p.y, SEAT_RADIUS, 0, Math.PI * 2)
      ctx.stroke()
    })
  })
  return shape
}

/** 在绘制层添加辅助线 */
const addPreviewLine = (
  points: number[],
  dash = true
): Konva.Line => {
  const line = new Konva.Line({
    points,
    stroke: '#3b82f6',
    strokeWidth: 1.5,
    dash: dash ? [5, 4] : undefined,
    listening: false,
  })
  drawingLayer!.add(line)
  return line
}

/** 在绘制层添加点位标记 */
const addPreviewDot = (
  x: number, y: number,
  color = '#3b82f6'
): Konva.Circle => {
  const dot = new Konva.Circle({
    x, y,
    radius: 5,
    fill: color,
    stroke: '#fff',
    strokeWidth: 1.5,
    listening: false,
  })
  drawingLayer!.add(dot)
  return dot as unknown as Konva.Circle
}

// ---------- 单座位 ----------

const createSingleSeat = (pos: { x: number; y: number }) => {
  const rowId = `row-${Date.now()}`
  const seats: Seat[] = [{
    id: `seat-${Date.now()}-0`,
    label: '1',
    x: 0,
    y: 0,
    status: 'available',
    categoryId: 'custom',
  }]
  const shape = createRowShape(seats, pos.x, pos.y, 0, rowId)
  staticLayer?.add(shape)
  staticLayer?.batchDraw()
}

// ---------- 直行模式（两点式点击）----------

const handleRowStraightClick = (pos: { x: number; y: number }) => {
  if (drawStep.value === 'idle') {
    // 第一点：记录起点
    drawStep.value = 'first'
    drawPoints.value.first = { ...pos }

    clearMultiPointPreview()
    const dot = addPreviewDot(pos.x, pos.y)
    sectionPreviewLines.push(dot as unknown as Konva.Line)
    drawingLayer?.batchDraw()
  } else if (drawStep.value === 'first') {
    // 第二点：创建整行座位
    drawPoints.value.second = { ...pos }
    const from = drawPoints.value.first!
    const to = pos
    const { ux, uy, dist } = getUnitVec(from, to)

    if (dist >= SEAT_SPACING) {
      const count = Math.max(2, Math.floor(dist / SEAT_SPACING) + 1)
      const seats: Seat[] = []
      for (let i = 0; i < count; i++) {
        seats.push({
          id: `seat-${Date.now()}-${i}`,
          label: String(i + 1),
          x: i * SEAT_SPACING,
          y: 0,
          status: 'available',
          categoryId: 'custom',
        })
      }
      const angle = Math.atan2(uy, ux) * 180 / Math.PI
      const rowId = `row-${Date.now()}`
      const shape = createRowShape(seats, from.x, from.y, angle, rowId)
      staticLayer?.add(shape)
      staticLayer?.batchDraw()
    }

    // 重置状态
    cancelMultiPointDraw()
  }
}

// ---------- 三点式折线行 (section) ----------

const handleSectionClick = (pos: { x: number; y: number }) => {
  if (drawStep.value === 'idle') {
    // 第一点：起点
    drawStep.value = 'first'
    drawPoints.value.first = { ...pos }

    clearMultiPointPreview()
    const dot = addPreviewDot(pos.x, pos.y)
    sectionPreviewLines.push(dot as unknown as Konva.Line)
    drawingLayer?.batchDraw()

  } else if (drawStep.value === 'first') {
    // 第二点：第一段终点/转折点
    drawStep.value = 'second'
    drawPoints.value.second = { ...pos }

    // 绘制第一段座位预览（固定）
    const from = drawPoints.value.first!
    const { ux, uy, dist } = getUnitVec(from, pos)
    if (dist >= SEAT_SPACING) {
      const count = Math.floor(dist / SEAT_SPACING) + 1
      const positions = Array.from({ length: count }, (_, i) => ({
        x: from.x + ux * i * SEAT_SPACING,
        y: from.y + uy * i * SEAT_SPACING,
      }))
      clearMultiPointPreview()
      // 点1标记
      sectionPreviewLines.push(addPreviewDot(from.x, from.y) as unknown as Konva.Line)
      // 点2标记
      sectionPreviewLines.push(addPreviewDot(pos.x, pos.y, '#22c55e') as unknown as Konva.Line)
      // 第一段辅助线
      sectionPreviewLines.push(addPreviewLine([from.x, from.y, pos.x, pos.y]))
      // 第一段座位预览
      if (sectionPreviewSeats) sectionPreviewSeats.destroy()
      sectionPreviewSeats = buildPreviewSeatShape(positions)
      drawingLayer!.add(sectionPreviewSeats)
    }
    drawingLayer?.batchDraw()

  } else if (drawStep.value === 'second') {
    // 第三点：第二段方向，创建折线行
    drawPoints.value.third = { ...pos }
    const p1 = drawPoints.value.first!
    const p2 = drawPoints.value.second!
    const p3 = pos

    const { ux: ux1, uy: uy1, dist: dist1 } = getUnitVec(p1, p2)
    const { ux: ux2, uy: uy2, dist: dist2 } = getUnitVec(p2, p3)

    const count1 = dist1 >= SEAT_SPACING ? Math.floor(dist1 / SEAT_SPACING) + 1 : 0
    const count2 = dist2 >= SEAT_SPACING ? Math.floor(dist2 / SEAT_SPACING) : 0

    // 第一段（以 p1 为 shape 原点，旋转 = 第一段角度）
    if (count1 > 0) {
      const angle1 = Math.atan2(uy1, ux1) * 180 / Math.PI
      const seats1 = genSeatsAlongLine(count1, 0)
      const rowId1 = `row-${Date.now()}-1`
      const shape1 = createRowShape(seats1, p1.x, p1.y, angle1, rowId1)
      staticLayer?.add(shape1)
    }

    // 第二段：从第一段最后一个座位位置出发
    if (count2 > 0 && count1 > 0) {
      const lastSeatX = p1.x + ux1 * (count1 - 1) * SEAT_SPACING
      const lastSeatY = p1.y + uy1 * (count1 - 1) * SEAT_SPACING
      const angle2 = Math.atan2(uy2, ux2) * 180 / Math.PI
      // 第二段从最后座位 + 一个间距开始，生成新座位
      const startX = lastSeatX + ux2 * SEAT_SPACING
      const startY = lastSeatY + uy2 * SEAT_SPACING
      const seats2 = genSeatsAlongLine(count2, count1)
      const rowId2 = `row-${Date.now()}-2`
      const shape2 = createRowShape(seats2, startX, startY, angle2, rowId2)
      staticLayer?.add(shape2)
    }

    staticLayer?.batchDraw()
    cancelMultiPointDraw()
  }
}

// ---------- 对角区块模式 (section-diagonal) ----------

const handleSectionDiagonalClick = (pos: { x: number; y: number }) => {
  if (drawStep.value === 'idle') {
    // 第一点：区块起点
    drawStep.value = 'first'
    drawPoints.value.first = { ...pos }

    clearMultiPointPreview()
    sectionPreviewLines.push(addPreviewDot(pos.x, pos.y) as unknown as Konva.Line)
    drawingLayer?.batchDraw()

  } else if (drawStep.value === 'first') {
    // 第二点：第一行方向/长度
    drawStep.value = 'second'
    drawPoints.value.second = { ...pos }

    const from = drawPoints.value.first!
    const { dist } = getUnitVec(from, pos)
    if (dist >= SEAT_SPACING) {
      clearMultiPointPreview()
      sectionPreviewLines.push(addPreviewDot(from.x, from.y) as unknown as Konva.Line)
      sectionPreviewLines.push(addPreviewDot(pos.x, pos.y, '#22c55e') as unknown as Konva.Line)
      sectionPreviewLines.push(addPreviewLine([from.x, from.y, pos.x, pos.y]))
      drawingLayer?.batchDraw()
    }

  } else if (drawStep.value === 'second') {
    // 第三点：行排列方向/行数
    drawPoints.value.third = { ...pos }
    const p1 = drawPoints.value.first!
    const p2 = drawPoints.value.second!
    const p3 = pos

    // 行方向（每行座位方向）
    const { ux: rowUx, uy: rowUy, dist: rowDist } = getUnitVec(p1, p2)
    // 行排列方向（行与行之间的偏移方向）
    const { ux: colUx, uy: colUy, dist: colDist } = getUnitVec(p2, p3)

    const seatsPerRow = Math.max(1, Math.floor(rowDist / SEAT_SPACING) + 1)
    const rowCount = Math.max(1, Math.floor(colDist / ROW_SPACING) + 1)
    const rowAngle = Math.atan2(rowUy, rowUx) * 180 / Math.PI

    for (let r = 0; r < rowCount; r++) {
      // 每行起点：沿行排列方向偏移 r * ROW_SPACING
      const startX = p1.x + colUx * r * ROW_SPACING
      const startY = p1.y + colUy * r * ROW_SPACING

      const seats = genSeatsAlongLine(seatsPerRow, r * seatsPerRow)
      const rowId = `row-${Date.now()}-${r}`
      const shape = createRowShape(seats, startX, startY, rowAngle, rowId)
      staticLayer?.add(shape)
    }

    staticLayer?.batchDraw()
    cancelMultiPointDraw()
  }
}

// ---------- mousemove 预览更新（直行/三点式/对角）----------

const updateMultiPointPreview = (pos: { x: number; y: number }) => {
  const tool = currentTool.value
  const step = drawStep.value

  if (tool === 'row-straight' && step === 'first') {
    // 预览：起点到当前鼠标的直行座位
    const from = drawPoints.value.first!
    const { ux, uy, dist } = getUnitVec(from, pos)
    clearMultiPointPreview()
    sectionPreviewLines.push(addPreviewDot(from.x, from.y) as unknown as Konva.Line)
    sectionPreviewLines.push(addPreviewLine([from.x, from.y, pos.x, pos.y]))
    if (dist >= SEAT_SPACING) {
      const count = Math.max(2, Math.floor(dist / SEAT_SPACING) + 1)
      const positions = Array.from({ length: count }, (_, i) => ({
        x: from.x + ux * i * SEAT_SPACING,
        y: from.y + uy * i * SEAT_SPACING,
      }))
      sectionPreviewSeats = buildPreviewSeatShape(positions)
      drawingLayer!.add(sectionPreviewSeats)
    }
    drawingLayer?.batchDraw()

  } else if (tool === 'section' && step === 'first') {
    // 第一段预览
    const from = drawPoints.value.first!
    const { ux, uy, dist } = getUnitVec(from, pos)
    clearMultiPointPreview()
    sectionPreviewLines.push(addPreviewDot(from.x, from.y) as unknown as Konva.Line)
    sectionPreviewLines.push(addPreviewLine([from.x, from.y, pos.x, pos.y]))
    if (dist >= SEAT_SPACING) {
      const count = Math.floor(dist / SEAT_SPACING) + 1
      const positions = Array.from({ length: count }, (_, i) => ({
        x: from.x + ux * i * SEAT_SPACING,
        y: from.y + uy * i * SEAT_SPACING,
      }))
      sectionPreviewSeats = buildPreviewSeatShape(positions)
      drawingLayer!.add(sectionPreviewSeats)
    }
    drawingLayer?.batchDraw()

  } else if (tool === 'section' && step === 'second') {
    // 第二段预览（叠加在已固定的第一段上）
    const p1 = drawPoints.value.first!
    const p2 = drawPoints.value.second!
    const { ux: ux1, uy: uy1, dist: dist1 } = getUnitVec(p1, p2)
    const { ux: ux2, uy: uy2, dist: dist2 } = getUnitVec(p2, pos)

    const count1 = dist1 >= SEAT_SPACING ? Math.floor(dist1 / SEAT_SPACING) + 1 : 0
    const lastX = p1.x + ux1 * (count1 - 1) * SEAT_SPACING
    const lastY = p1.y + uy1 * (count1 - 1) * SEAT_SPACING

    const pos1Array = Array.from({ length: count1 }, (_, i) => ({
      x: p1.x + ux1 * i * SEAT_SPACING,
      y: p1.y + uy1 * i * SEAT_SPACING,
    }))
    const startX2 = lastX + ux2 * SEAT_SPACING
    const startY2 = lastY + uy2 * SEAT_SPACING
    const count2 = dist2 >= SEAT_SPACING ? Math.floor(dist2 / SEAT_SPACING) : 0
    const pos2Array = Array.from({ length: count2 }, (_, i) => ({
      x: startX2 + ux2 * i * SEAT_SPACING,
      y: startY2 + uy2 * i * SEAT_SPACING,
    }))

    clearMultiPointPreview()
    sectionPreviewLines.push(addPreviewDot(p1.x, p1.y) as unknown as Konva.Line)
    sectionPreviewLines.push(addPreviewDot(p2.x, p2.y, '#22c55e') as unknown as Konva.Line)
    sectionPreviewLines.push(addPreviewLine([p1.x, p1.y, p2.x, p2.y], false))
    sectionPreviewLines.push(addPreviewLine([p2.x, p2.y, pos.x, pos.y]))
    sectionPreviewSeats = buildPreviewSeatShape([...pos1Array, ...pos2Array])
    drawingLayer!.add(sectionPreviewSeats)
    drawingLayer?.batchDraw()

  } else if (tool === 'section-diagonal' && step === 'first') {
    // 预览第一行
    const from = drawPoints.value.first!
    const { ux, uy, dist } = getUnitVec(from, pos)
    clearMultiPointPreview()
    sectionPreviewLines.push(addPreviewDot(from.x, from.y) as unknown as Konva.Line)
    sectionPreviewLines.push(addPreviewLine([from.x, from.y, pos.x, pos.y]))
    if (dist >= SEAT_SPACING) {
      const count = Math.floor(dist / SEAT_SPACING) + 1
      const positions = Array.from({ length: count }, (_, i) => ({
        x: from.x + ux * i * SEAT_SPACING,
        y: from.y + uy * i * SEAT_SPACING,
      }))
      sectionPreviewSeats = buildPreviewSeatShape(positions)
      drawingLayer!.add(sectionPreviewSeats)
    }
    drawingLayer?.batchDraw()

  } else if (tool === 'section-diagonal' && step === 'second') {
    // 预览整个区块
    const p1 = drawPoints.value.first!
    const p2 = drawPoints.value.second!
    const { ux: rowUx, uy: rowUy, dist: rowDist } = getUnitVec(p1, p2)
    const { ux: colUx, uy: colUy, dist: colDist } = getUnitVec(p2, pos)

    const seatsPerRow = Math.max(1, Math.floor(rowDist / SEAT_SPACING) + 1)
    const rowCount = Math.max(1, Math.floor(colDist / ROW_SPACING) + 1)

    const allPositions: { x: number; y: number }[] = []
    for (let r = 0; r < rowCount; r++) {
      for (let s = 0; s < seatsPerRow; s++) {
        allPositions.push({
          x: p1.x + colUx * r * ROW_SPACING + rowUx * s * SEAT_SPACING,
          y: p1.y + colUy * r * ROW_SPACING + rowUy * s * SEAT_SPACING,
        })
      }
    }

    clearMultiPointPreview()
    sectionPreviewLines.push(addPreviewDot(p1.x, p1.y) as unknown as Konva.Line)
    sectionPreviewLines.push(addPreviewDot(p2.x, p2.y, '#22c55e') as unknown as Konva.Line)
    sectionPreviewLines.push(addPreviewLine([p1.x, p1.y, p2.x, p2.y], false))
    sectionPreviewLines.push(addPreviewLine([p2.x, p2.y, pos.x, pos.y]))
    sectionPreviewSeats = buildPreviewSeatShape(allPositions)
    drawingLayer!.add(sectionPreviewSeats)
    drawingLayer?.batchDraw()
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

  staticLayer?.batchDraw()
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

  staticLayer?.batchDraw()
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
    name: 'seatCircle',
    listening: false // 关键：不拦截事件，让事件穿透到 Group
  })

  group.add(circle)

  // 点击事件（仅用于选中）
  group.on('click tap', (e) => {
    if (currentTool.value !== 'select') return
    e.cancelBubble = true

    if (selectedSeatIds.value.has(seat.id)) {
      deselectSeat(seat.id)
    } else {
      selectSeat(seat.id, e.evt.shiftKey)
    }
    emit('seatClick', seat.id)
  })

  return group
}

// 去掉 sectionGroup，直接返回 rowShape 数组（平铺结构，减少嵌套）
const createSection = (section: Section): Konva.Shape[] => {
  return section.rows.map((row, rowIndex) => {
    // 统一调用 createRowShape，与手动绘制逻辑一致
    // 加上 section 的偏移量，使用全局配置的行间距
    return createRowShape(
      row.seats,
      section.x + 0,
      section.y + 30 + rowIndex * ROW_SPACING,
      0,
      row.id
    )
  })
}

// ==================== 渲染场地数据 ====================

const renderVenueData = (data: VenueData) => {
  if (!staticLayer) return

  const startTime = performance.now()
  let seatCount = 0

  clearSelection()

  const children = [...staticLayer.getChildren()]
  children.forEach(child => {
    child.destroy()
  })

  seatGroups.clear()
  sectionGroups.clear()

  data.sections.forEach(section => {
    // 去掉 sectionGroup，直接添加 rowGroup 到 staticLayer
    const rowGroups = createSection(section)
    rowGroups.forEach(rowGroup => {
      staticLayer!.add(rowGroup)
    })
    // 统计座位数
    section.rows.forEach(row => {
      seatCount += row.seats.length
    })
  })

  staticLayer?.batchDraw()
  
  const endTime = performance.now()
  console.log(`[性能] 渲染 ${seatCount} 个座位耗时: ${(endTime - startTime).toFixed(2)}ms`)
}

// ==================== 生成测试数据 ====================

const generateTestData = (seatCount: number = 400) => {
  const startTime = performance.now()
  const sections: Section[] = []
  
  // 使用全局配置（如果需要覆盖可以在函数内重新定义）
  const SEATS_PER_ROW = defaultSeatMapConfig.sectionConfig.seatsPerRow
  
  // 计算需要的排数
  const rowCount = Math.ceil(seatCount / SEATS_PER_ROW)
  const rows: Row[] = []
  let seatIdCounter = 0
  
  for (let r = 0; r < rowCount && seatIdCounter < seatCount; r++) {
    const seats: Seat[] = []
    const rowLabel = String.fromCharCode(65 + r)
    
    // 每排座位数（最后一排可能不足）
    const seatsInThisRow = Math.min(SEATS_PER_ROW, seatCount - seatIdCounter)
    
    for (let c = 0; c < seatsInThisRow; c++) {
      const status: Seat['status'] =
        Math.random() < 0.2 ? 'booked' :
        Math.random() < 0.3 ? 'reserved' : 'available'

      seats.push({
        id: `seat-test-${seatIdCounter}`,
        label: String(c + 1),
        x: c * SEAT_SPACING,
        y: 0,
        status,
        categoryId: 'default'
      })
      seatIdCounter++
    }

    rows.push({
      id: `row-test-${r}`,
      label: rowLabel,
      seats
    })
  }

  sections.push({
    id: 'section-test',
    name: '测试区域',
    rows: rows,
    x: 50 + Math.random() * 100,  // 50-150 随机
    y: 50 + Math.random() * 100   // 50-150 随机
  })

  const endTime = performance.now()
  console.log(`[性能] 生成 ${seatCount} 个座位数据耗时: ${(endTime - startTime).toFixed(2)}ms`)

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

  staticLayer?.destroyChildren()
  sectionGroups.clear()
  seatGroups.clear()
  staticLayer?.batchDraw()
}

// ==================== 更新座位状态 ====================

const updateSeatStatus = (seatId: string, status: Seat['status']) => {
  const seatGroup = seatGroups.get(seatId)
  if (!seatGroup) return

  const circle = seatGroup.findOne<Konva.Circle>('.seatCircle')
  if (circle) {
    circle.fill(statusColors[status])
    staticLayer?.batchDraw()
  }
}

// ==================== 监听变化 ====================

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

// ==================== Transformer ====================

// 初始化 Transformer
const initTransformer = () => {
  if (!selectionDecorationLayer) return
  
  transformer = new Konva.Transformer({
    resizeEnabled: false,
    rotateEnabled: true,
    rotateAnchorOffset: 20,
    rotationSnaps: [0, 45, 90, 135, 180, 225, 270, 315],
    visible: false,
    borderStroke: '#3b82f6',
    borderStrokeWidth: 1,
    anchorStroke: '#3b82f6',
    anchorFill: '#fff',
    anchorSize: 8,
    padding: 0,
    ignoreStroke: true,
    keepRatio: false,
    centeredScaling: false,
    boundBoxFunc: (oldBox, newBox) => newBox,
    // Transformer 不处理拖拽，只显示边框和旋转锚点
    draggable: false,
    listening: true,
  })

  // 点击 Transformer 框内空白区域 → 取消选中
  transformer.on('click', (e) => {
    if (currentTool.value !== 'select') return
    if (justDragged) return
    // 只有点击到 Transformer 背景（非锚点）才取消选中
    const targetName = (e.target as any)?.name?.() || ''
    const isAnchor = targetName.includes('anchor') || targetName.includes('rotater')
    if (!isAnchor && !e.evt.shiftKey) {
      clearSelection()
    }
  })
  
  // 绑定旋转事件
  transformer.on('transform', (e: any) => {
    // 更新原始旋转记录
    selectedItems.value.forEach(item => {
      item.originalRotation = item.node.rotation()
    })
    // 实时绘制，确保旋转过程中座位跟随旋转
    staticLayer?.draw()
  })
  
  selectionDecorationLayer.add(transformer)
}

// 更新 Transformer 的节点（使用节流）
let transformerUpdateQueued = false
const updateTransformer = (forceFullUpdate = false) => {
  if (!transformer || !selectionDecorationLayer) return
  
  if (transformerUpdateQueued && !forceFullUpdate) return
  transformerUpdateQueued = true
  
  requestAnimationFrame(() => {
    transformerUpdateQueued = false
    
    if (!transformer) return
    
    if (selectedItems.value.length === 0) {
      transformer.nodes([])
      transformer.visible(false)
    } else {
      const currentNodes = transformer.nodes()
      const newNodes = selectedItems.value.map(item => item.node) as Konva.Node[]
      
      // 只有在节点列表变化时才重新设置 nodes（昂贵操作）
      if (forceFullUpdate || currentNodes.length !== newNodes.length || 
          !currentNodes.every((node, i) => node === newNodes[i])) {
        transformer.nodes(newNodes)
        transformer.visible(true)
      } else {
        // 拖拽时只更新位置和边框
        transformer.forceUpdate()
      }
    }
    
    selectionDecorationLayer?.batchDraw()
  })
}

// ==================== 框选功能 ====================

// ==================== 新的选择系统 ====================

// 框选矩形（灰色半透明，绘制在 selectionDecorationLayer 上）
let dragSelectRect: Konva.Rect | null = null

const initSelection = () => {
  dragSelectRect = new Konva.Rect({
    visible: false,
    fill: 'rgba(180, 180, 180, 0.15)',
    stroke: '#aaaaaa',
    strokeWidth: 1,
    dash: [4, 3],
    listening: false,
  })
  selectionDecorationLayer?.add(dragSelectRect as unknown as Konva.Shape)
}

// 网格对齐辅助函数
const snapToGrid = (value: number): number => {
  return Math.round(value / GRID_SIZE) * GRID_SIZE
}

// 获取所有可选中对象
const getAllSelectableNodes = (): Konva.Node[] => {
  const nodes: Konva.Node[] = []
  
  // 收集所有排 Shape（rowShape 是基础选中单位，id 格式：row-shape-xxx）
  staticLayer?.find('Shape').forEach((node) => {
    if (node.name() === 'row-shape' && node.id().startsWith('row-shape-')) {
      nodes.push(node)
    }
  })
  
  // 兼容旧的 row-group
  staticLayer?.find('Group').forEach((node) => {
    if (node.name() === 'row-group' && node.id().startsWith('row-group-')) {
      nodes.push(node)
    }
  })
  
  // 收集所有形状（矩形、椭圆、多边形、扇形、折线）
  staticLayer?.find('.shape-group').forEach((node) => {
    if (node instanceof Konva.Group) {
      nodes.push(node)
    }
  })
  
  return nodes
}

// 更新选择装饰 - 使用 Transformer
const updateSelectionDecoration = () => {
  updateTransformer()
}

// 轻量级拖拽更新 - 使用 100ms 节流（约 10fps，边框不需要流畅）
let dragUpdateQueued = false
let lastDragUpdateTime = 0
const DRAG_UPDATE_THROTTLE = 100 // 10fps 足够

const updateSelectionDecorationOnDrag = () => {
  if (!transformer || !selectionDecorationLayer) return
  if (dragUpdateQueued) return
  
  const now = performance.now()
  if (now - lastDragUpdateTime < DRAG_UPDATE_THROTTLE) return
  
  dragUpdateQueued = true
  requestAnimationFrame(() => {
    dragUpdateQueued = false
    lastDragUpdateTime = performance.now()
    // 拖拽时更新 transformer
    if (selectedItems.value.length > 1) {
      transformer.anchorSize(0) // 拖拽时隐藏锚点
      transformer.forceUpdate()
      selectionDecorationLayer.batchDraw()
    }
  })
}

// 选择对象
const selectItem = (node: Konva.Node, type: SelectableType, additive = false, skipUpdate = false) => {
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
  
  // 确保节点不可单独拖拽（由统一拖拽系统接管）
  node.draggable(false)
  node.off('dragstart')
  node.off('dragmove')
  node.off('dragend')
  node.off('mouseenter.select')
  node.off('mouseleave.select')
  
  // 保存选中项
  selectedItems.value.push({
    id: node.id(),
    type,
    node,
    originalPos: { x: node.x(), y: node.y() },
    originalRotation: node.rotation()
  })
  
  // 添加选中视觉反馈
  node.setAttr('selected', true)
  
  // 应用选中高亮效果
  applySelectionHighlight(node, true)
  
  // 除非跳过更新（批量选中时使用），否则更新装饰
  if (!skipUpdate) {
    updateSelectionDecoration()
  }
}

// 取消选择
const deselectItem = (id: string) => {
  const item = selectedItems.value.find(i => i.id === id)
  if (item) {
    item.node.setAttr('selected', false)
    item.node.off('mouseenter.select')
    item.node.off('mouseleave.select')
    // 移除选中高亮效果
    applySelectionHighlight(item.node, false)
    selectedItems.value = selectedItems.value.filter(i => i.id !== id)
  }
  updateSelectionDecoration()
}

// 清空选择
const clearSelection = () => {
  selectedItems.value.forEach(item => {
    item.node.setAttr('selected', false)
    item.node.off('mouseenter.select')
    item.node.off('mouseleave.select')
    // 移除选中高亮效果
    applySelectionHighlight(item.node, false)
  })
  selectedItems.value = []
  updateSelectionDecoration()
  // 恢复默认光标
  setCursor('default')
}

// 手动拖拽已由 Transformer 处理，这些函数保留供兼容
const startDragSelection = (pos: { x: number; y: number }) => {
  // Transformer 会自动处理拖拽，这里不需要额外逻辑
}

const dragSelection = (pos: { x: number; y: number }) => {
  // Transformer 会自动处理拖拽
}

const endDragSelection = () => {
  // Transformer 会自动处理拖拽结束
}

// 旋转已由 Transformer 处理
const startRotation = (e: MouseEvent) => {
  // Transformer 会自动处理旋转
}

// 开始框选
const startBoxSelection = (pos: { x: number; y: number }) => {
  if (!stage || !dragSelectRect) return
  
  const pointer = stage.getPointerPosition()
  if (!pointer) return
  
  // 将屏幕坐标转为 layer 坐标（框选矩形在 selectionDecorationLayer，用屏幕坐标即可）
  isBoxSelecting.value = true
  selectionStartPos.value = pointer  // 存屏幕坐标

  dragSelectRect.setAttrs({
    x: pointer.x,
    y: pointer.y,
    width: 0,
    height: 0,
    visible: true,
  })
  selectionDecorationLayer?.batchDraw()
}

// 更新框选框
const updateBoxSelection = (pos: { x: number; y: number }) => {
  if (!selectionStartPos.value || !dragSelectRect || !stage) return
  
  const pointer = stage.getPointerPosition()
  if (!pointer) return
  
  const x = Math.min(selectionStartPos.value.x, pointer.x)
  const y = Math.min(selectionStartPos.value.y, pointer.y)
  const width = Math.abs(pointer.x - selectionStartPos.value.x)
  const height = Math.abs(pointer.y - selectionStartPos.value.y)
  
  dragSelectRect.setAttrs({ x, y, width, height })
  selectionDecorationLayer?.batchDraw()
}

// 结束框选
const endBoxSelection = (additive: boolean) => {
  if (!dragSelectRect || !selectionStartPos.value || !stage || !layer || !transformer) return
  
  // 框选矩形在屏幕坐标，转为 layer 坐标做命中检测
  const layerTransformInv = layer.getAbsoluteTransform().copy().invert()
  const p1 = layerTransformInv.point({ x: dragSelectRect.x(), y: dragSelectRect.y() })
  const p2 = layerTransformInv.point({ x: dragSelectRect.x() + dragSelectRect.width(), y: dragSelectRect.y() + dragSelectRect.height() })
  const selX = Math.min(p1.x, p2.x)
  const selY = Math.min(p1.y, p2.y)
  const selW = Math.abs(p2.x - p1.x)
  const selH = Math.abs(p2.y - p1.y)
  
  // 框选区域太小，忽略
  if (selW < 5 || selH < 5) {
    dragSelectRect.visible(false)
    selectionStartPos.value = null
    selectionDecorationLayer?.batchDraw()
    return
  }
  
  const allNodes = getAllSelectableNodes()
  
  const intersectingNodes = allNodes.filter(node => {
    let nodeRect: { x: number; y: number; width: number; height: number }
    if (node.name() === 'row-shape') {
      const hitMinX = node.getAttr('hitMinX') as number
      const hitMinY = node.getAttr('hitMinY') as number
      const hitMaxX = node.getAttr('hitMaxX') as number
      const hitMaxY = node.getAttr('hitMaxY') as number
      const nodeTransform = node.getAbsoluteTransform()
      const layerInvTransform = layer ? layer.getAbsoluteTransform().copy().invert() : null
      const toLayerPoint = (p: { x: number; y: number }) => {
        const abs = nodeTransform.point(p)
        return layerInvTransform ? layerInvTransform.point(abs) : abs
      }
      const corners = [
        toLayerPoint({ x: hitMinX, y: hitMinY }),
        toLayerPoint({ x: hitMaxX, y: hitMinY }),
        toLayerPoint({ x: hitMaxX, y: hitMaxY }),
        toLayerPoint({ x: hitMinX, y: hitMaxY }),
      ]
      const xs = corners.map(p => p.x)
      const ys = corners.map(p => p.y)
      nodeRect = { x: Math.min(...xs), y: Math.min(...ys), width: Math.max(...xs) - Math.min(...xs), height: Math.max(...ys) - Math.min(...ys) }
    } else {
      nodeRect = node.getClientRect({ relativeTo: layer || undefined })
    }
    
    // AABB 完全包含检测
    return (
      nodeRect.x >= selX &&
      nodeRect.x + nodeRect.width <= selX + selW &&
      nodeRect.y >= selY &&
      nodeRect.y + nodeRect.height <= selY + selH
    )
  })

  dragSelectRect.visible(false)
  selectionStartPos.value = null
  
  if (!additive) {
    clearSelection()
  }
  
  intersectingNodes.forEach((node, index) => {
    const type = getNodeType(node)
    if (type) {
      const isLast = index === intersectingNodes.length - 1
      selectItem(node, type, true, !isLast)
    }
  })
  
  staticLayer?.batchDraw()
  selectionDecorationLayer?.batchDraw()
  
  // 框选结束后若有选中对象，判断光标
  if (intersectingNodes.length > 0 && stage && transformer) {
    const pointerPos = stage.getPointerPosition()
    if (pointerPos) {
      const trRect = transformer.getClientRect()
      const insideTr = (
        pointerPos.x >= trRect.x &&
        pointerPos.x <= trRect.x + trRect.width &&
        pointerPos.y >= trRect.y &&
        pointerPos.y <= trRect.y + trRect.height
      )
      if (insideTr) {
        stage.container().style.cursor = 'move'
      }
    }
  }
  isBoxSelecting.value = true
}

// 应用选中高亮效果
const applySelectionHighlight = (node: Konva.Node, isSelected: boolean) => {
  const name = node.name() || ''
  
  // 处理排 Shape（新方案）
  if (name.includes('row-shape') && node instanceof Konva.Shape) {
    node.setAttr('selected', isSelected)
    // Shape 会在下次绘制时根据 selected 状态自动渲染边框
  }
  // 处理排组（旧方案兼容）
  else if (name.includes('row-group') && node instanceof Konva.Group) {
    if (isSelected) {
      node.find('Circle').forEach((c) => {
        (c as Konva.Circle).stroke('#3b82f6')
        ;(c as Konva.Circle).strokeWidth(3)
      })
    } else {
      node.find('Circle').forEach((c) => {
        (c as Konva.Circle).stroke('#ef4444')
        ;(c as Konva.Circle).strokeWidth(1)
      })
    }
  }
  // 处理座位组（旧代码兼容）
  else if (name.includes('seat') && node instanceof Konva.Group) {
    const circle = node.findOne<Konva.Circle>('.seatCircle')
    if (circle) {
      if (isSelected) {
        circle.stroke('#3b82f6')
        circle.strokeWidth(3)
      } else {
        circle.stroke('#ef4444')
        circle.strokeWidth(1)
      }
    }
  }
  // 处理形状组（矩形、椭圆、多边形等）
  else if (node instanceof Konva.Group && (name.includes('shape-group') || name.includes('rect-group') || 
           name.includes('ellipse-group') || name.includes('polygon-group'))) {
    const shapes = node.getChildren((child) => {
      const childName = child.name() || ''
      return !childName.includes('click-area') && child instanceof Konva.Shape
    })
    shapes.forEach((shape) => {
      const konvaShape = shape as Konva.Shape
      if (isSelected) {
        konvaShape.stroke('#3b82f6')
        konvaShape.strokeWidth(2)
      } else {
        konvaShape.stroke(undefined)
        konvaShape.strokeWidth(0)
      }
    })
  }
  
  staticLayer?.batchDraw()
}

// 获取节点类型
const getNodeType = (node: Konva.Node): SelectableType | null => {
  const name = node.name() || ''
  const id = node.id() || ''
  if (name.includes('seat')) return 'seat'
  if (name.includes('row-shape') || name.includes('row-group')) return 'row'
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
  staticLayer?.batchDraw()
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
