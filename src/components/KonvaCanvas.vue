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
}>()

// ==================== Refs ====================

const containerRef = ref<HTMLDivElement>()
let stage: Konva.Stage | null = null
let layer: Konva.Layer | null = null
let gridGroup: Konva.Group | null = null
let transformLayer: Konva.Layer | null = null
const sectionGroups = new Map<string, Konva.Group>()
const seatGroups = new Map<string, Konva.Group>()

// 视图状态
const scale = ref(1)
const offsetX = ref(0)
const offsetY = ref(0)
const isDraggingStage = ref(false)
const dragStart = ref({ x: 0, y: 0 })

// 颜色映射
const statusColors = {
  available: '#22a559',
  sold: '#ef4444',
  reserved: '#f59e0b',
  blocked: '#9ca3af'
}

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

  // 鼠标按下 - 统一处理框选和平移
  stage.on('mousedown', (e) => {
    // 只响应左键
    if (e.evt.button !== 0) return

    // 如果点击的不是舞台（是座位等），不启动框选
    if (e.target !== stage) return

    const pos = stage!.getPointerPosition()
    if (!pos) return

    // 转换为舞台坐标
    const transform = stage!.getAbsoluteTransform().copy()
    transform.invert()
    const stagePos = transform.point(pos)

    // Shift+点击 = 平移画布
    if (e.evt.shiftKey) {
      isDraggingStage.value = true
      dragStart.value = { x: stage!.x(), y: stage!.y() }
      return
    }

    // 普通点击 = 启动框选
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

  // 鼠标移动 - 处理框选和平移
  stage.on('mousemove', (e) => {
    // 处理框选
    if (isSelecting.value && selectionStart && selectionRect) {
      const pos = stage!.getPointerPosition()
      if (!pos) return

      // 转换为舞台坐标
      const transform = stage!.getAbsoluteTransform().copy()
      transform.invert()
      const stagePos = transform.point(pos)

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

  // 鼠标释放 - 结束框选或平移
  stage.on('mouseup', () => {
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
    if (e.target === stage && !e.evt.shiftKey) {
      clearSelection()
    }
  })
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
    draggable: false, // 默认不可拖拽，选中后才可拖拽
    id: seat.id,
    name: `seat row-${rowId}`
  })

  const circle = new Konva.Circle({
    radius: 12,
    fill: statusColors[seat.status],
    stroke: 'white',
    strokeWidth: 2,
    name: 'seatCircle'
  })

  // 开启缓存优化
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

  // 座位点击事件
  group.on('click', (e) => {
    e.cancelBubble = true

    // 只有选择工具才能选中
    if (currentTool.value !== 'select') return

    // 检测是否点击了排标签区域（座位左侧）
    const clickPos = group.getRelativePointerPosition()
    const isClickOnRowLabel = clickPos && clickPos.x < 0

    if (isClickOnRowLabel) {
      // 点击排标签，选中整排
      if (selectedRowIds.value.has(rowId)) {
        // 如果已选中，取消选择
        clearSelection()
      } else {
        selectRow(rowId, e.evt.shiftKey)
      }
    } else {
      // 点击座位，选中单个座位
      if (selectedSeatIds.value.has(seat.id)) {
        deselectSeat(seat.id)
      } else {
        selectSeat(seat.id, e.evt.shiftKey)
      }
    }
    emit('seatClick', seat.id)
  })

  // 座位拖拽事件
  group.on('dragend', () => {
    emit('seatDrag', seat.id, group.x(), group.y())
  })

  return group
}

const createSection = (section: Section) => {
  const sectionGroup = new Konva.Group({
    x: section.x,
    y: section.y,
    id: `section-${section.id}`
  })

  // 计算区域边界
  let minX = Infinity, minY = Infinity
  let maxX = -Infinity, maxY = -Infinity

  // 创建行和座位
  section.rows.forEach((row, rowIndex) => {
    const rowGroup = new Konva.Group({
      y: 30 + rowIndex * 35
    })

    // 行标签
    const rowLabel = new Konva.Text({
      text: row.label,
      fontSize: 14,
      fontFamily: 'Inter',
      fill: '#666',
      offsetY: -5
    })
    rowGroup.add(rowLabel)

    // 创建座位
    row.seats.forEach((seat) => {
      const seatGroup = createSeat(seat, row.label, row.id)
      rowGroup.add(seatGroup)
      seatGroups.set(seat.id, seatGroup)

      // 计算边界
      const seatAbsX = seat.x
      const seatAbsY = 30 + rowIndex * 35 + seat.y
      minX = Math.min(minX, seatAbsX - 15)
      minY = Math.min(minY, seatAbsY - 15)
      maxX = Math.max(maxX, seatAbsX + 15)
      maxY = Math.max(maxY, seatAbsY + 15)
    })

    sectionGroup.add(rowGroup)
  })

  // 创建区域边框
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

  // 创建区域标题
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

  // 对区域开启缓存优化
  sectionGroup.cache()

  return sectionGroup
}

// ==================== 渲染场地数据 ====================

const renderVenueData = (data: VenueData) => {
  if (!layer) return

  // 清除选择状态
  clearSelection()

  // 清除现有内容（保留选择框和transformer）
  const children = [...layer.getChildren()]
  children.forEach(child => {
    // 保留选择框和transformer
    if (child !== selectionRect && child !== transformer) {
      child.destroy()
    }
  })

  // 清空座位映射
  seatGroups.clear()
  sectionGroups.clear()

  // 渲染每个区域
  data.sections.forEach(section => {
    const sectionGroup = createSection(section)
    layer!.add(sectionGroup)
    sectionGroups.set(section.id, sectionGroup)
  })

  // 使用 batchDraw 批量绘制
  layer.batchDraw()
}

// ==================== 生成测试数据 ====================

const generateTestData = (seatCount: number = 300) => {
  const sections: Section[] = []

  // 区域1: 左侧竖向区域 (8排 x 8座 = 64座)
  const leftRows: Row[] = []
  for (let r = 0; r < 8; r++) {
    const seats: Seat[] = []
    const rowLabel = String.fromCharCode(65 + r)

    for (let c = 0; c < 8; c++) {
      const status: Seat['status'] =
        Math.random() < 0.2 ? 'sold' :
        Math.random() < 0.3 ? 'reserved' : 'available'

      // 竖向排列: x固定, y变化
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

  // 区域2: 中间横向区域 (12排 x 12座 = 144座)
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

  // 区域3: 右侧竖向区域 (8排 x 8座 = 64座)
  const rightRows: Row[] = []
  for (let r = 0; r < 8; r++) {
    const seats: Seat[] = []
    const rowLabel = String.fromCharCode(65 + r)

    for (let c = 0; c < 8; c++) {
      const status: Seat['status'] =
        Math.random() < 0.2 ? 'sold' :
        Math.random() < 0.3 ? 'reserved' : 'available'

      // 竖向排列
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

  // 区域4: 斜向VIP区域 (3排 x 10座 = 30座)
  const vipRows: Row[] = []
  for (let r = 0; r < 3; r++) {
    const seats: Seat[] = []
    const rowLabel = `VIP${r + 1}`

    for (let c = 0; c < 10; c++) {
      const status: Seat['status'] =
        Math.random() < 0.3 ? 'sold' :
        Math.random() < 0.4 ? 'reserved' : 'available'

      // 斜向排列: x和y都变化
      seats.push({
        id: `seat-vip-${r}-${c}`,
        label: String(c + 1),
        x: 30 + c * 28,
        y: c * 8, // 每座位向下偏移8像素，形成斜线
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

  // 清除选择状态
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
  // 切换工具时清除选择
  if (tool !== 'select') {
    clearSelection()
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

  // 创建选择框
  selectionRect = new Konva.Rect({
    visible: false,
    fill: 'rgba(59, 130, 246, 0.1)',
    stroke: '#3b82f6',
    strokeWidth: 1,
    dash: [4, 4]
  })
  layer.add(selectionRect)

  // 创建 Transformer
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
  if (!selectionRect) return

  const rect = {
    x: selectionRect.x(),
    y: selectionRect.y(),
    width: selectionRect.width(),
    height: selectionRect.height()
  }

  // 遍历所有座位进行碰撞检测
  seatGroups.forEach((group, seatId) => {
    const seatX = group.x()
    const seatY = group.y()

    // 简单的 AABB 碰撞检测
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

  // 高亮选中的座位
  const seatGroup = seatGroups.get(seatId)
  if (seatGroup) {
    const circle = seatGroup.findOne<Konva.Circle>('.seatCircle')
    if (circle) {
      circle.stroke('#3b82f6')
      circle.strokeWidth(3)
    }
    // 启用拖拽
    seatGroup.draggable(true)
  }

  updateTransformer()
}

const selectRow = (rowId: string, additive = false) => {
  if (!additive) {
    clearSelection()
  }

  selectedRowIds.value.add(rowId)

  // 选中该排的所有座位
  seatGroups.forEach((group, seatId) => {
    if (group.name().includes(`row-${rowId}`)) {
      selectedSeatIds.value.add(seatId)

      const circle = group.findOne<Konva.Circle>('.seatCircle')
      if (circle) {
        circle.stroke('#3b82f6')
        circle.strokeWidth(3)
      }
      // 启用拖拽
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
    // 禁用拖拽
    seatGroup.draggable(false)
  }

  updateTransformer()
}

const clearSelection = () => {
  // 恢复所有座位的样式
  selectedSeatIds.value.forEach(seatId => {
    const seatGroup = seatGroups.get(seatId)
    if (seatGroup) {
      const circle = seatGroup.findOne<Konva.Circle>('.seatCircle')
      if (circle) {
        circle.stroke('white')
        circle.strokeWidth(2)
      }
      // 禁用拖拽
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
    // 将 transformer 移到最上层
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
