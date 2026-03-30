<template>
  <div ref="containerRef" class="konva-container"></div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, nextTick } from 'vue'
import Konva from 'konva'
import { useVenueStore } from '../stores/venueStore'
import type { SeatRow, Seat, Section, ShapeObject, TextObject, AreaObject, Position } from '../types'
import { useDrawing, type DrawingToolMode, getUnitVector, generateSeatsAlongLine, calculateBoundingBox, calculatePolygonCenter, toRelativePoints } from '../composables/useDrawing'
import { defaultSeatMapConfig } from '../types'
import { generateId } from '../utils/id'

const containerRef = ref<HTMLDivElement>()
const venueStore = useVenueStore()
const drawing = useDrawing()

// ==================== Konva 实例 ====================

let stage: Konva.Stage | null = null
let mainLayer: Konva.Layer | null = null
let overlayLayer: Konva.Layer | null = null  // 覆盖层：绘制预览、框选、Transformer
let dragLayer: Konva.Layer | null = null  // 拖拽层：拖拽时临时存放选中节点（性能优化）
let transformer: Konva.Transformer | null = null  // 变换工具（旋转）

// ==================== 常量配置 ====================

const SEAT_RADIUS = defaultSeatMapConfig.defaultSeatRadius
const SEAT_SPACING = defaultSeatMapConfig.defaultSeatSpacing
const VIEWPORT_PADDING = 200 // 视口外扩像素
const MIN_SCALE = 0.1
const MAX_SCALE = 5

// ==================== 状态====================

// 节点映射表：id -> Konva.Node
const nodeMap = new Map<string, Konva.Node>()

// 视口状态
const viewportState = {
  scale: 1,
  x: 0,
  y: 0,
  isDragging: false,
  dragStartX: 0,
  dragStartY: 0,
  lastPointerX: 0,
  lastPointerY: 0
}

// 框选状态
const selectionState = {
  isSelecting: false,
  startX: 0,
  startY: 0,
  rect: null as Konva.Rect | null
}

// 标志位：是否正在从 Transformer 同步数据（防止触发重绘）
let isSyncingFromTransformer = false

// 拖拽完成标志 - 用于区分拖拽和点击
let justDragged = false

// ==================== 统一拖拽状态（非响应式，避免 Vue 开销）===================
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
  useDragLayer: boolean // 是否使用 dragLayer（旋转时不使用）
}

const unifiedDragState: UnifiedDragState = {
  active: false,
  startScreenX: 0,
  startScreenY: 0,
  currentX: 0,
  currentY: 0,
  items: [],
  useDragLayer: false
}

// 拖拽 RAF 节流
let dragAnimationFrameId: number | null = null

// ==================== 绘制预览状态====================

// 预览元素引用
let previewElements: Konva.Node[] = []

// 当前绘制模式
const currentDrawingTool = ref<DrawingToolMode>('select')

// 设置当前绘制工具
const setDrawingTool = (tool: DrawingToolMode) => {
  currentDrawingTool.value = tool
  drawing.setTool(tool as any)
  clearDrawingPreview()
}

// 初始化绘制预览
const initDrawingPreview = () => {
  // 预览层已在 onMounted 中创建
}

// 清除绘制预览
const clearDrawingPreview = () => {
  previewElements.forEach(el => el.destroy())
  previewElements = []
  overlayLayer?.batchDraw()
}

// 添加预览元素
const addPreviewElement = (el: Konva.Group | Konva.Shape) => {
  overlayLayer?.add(el)
  previewElements.push(el)
}

// 获取或创建默认 section
const getOrCreateDefaultSection = (): string => {
  if (venueStore.venue.sections.length === 0) {
    const sectionId = venueStore.addSection({
      name: '默认区域',
      rows: [],
      x: 0,
      y: 0
    })
    return sectionId || 'default'
  }
  return venueStore.venue.sections[0].id
}

// ==================== 初始化====================

onMounted(() => {
  if (!containerRef.value) return

  // 获取容器尺寸
  const rect = containerRef.value.getBoundingClientRect()
  
  stage = new Konva.Stage({
    container: containerRef.value,
    width: rect.width || 3000,
    height: rect.height || 2000
  })

  // 主渲染层
  mainLayer = new Konva.Layer()
  stage.add(mainLayer)

  // 覆盖层：包含绘制预览、框选框、Transformer
  // 合并为一层简化管理，始终在最上层
  overlayLayer = new Konva.Layer()
  stage.add(overlayLayer)

  // 拖拽临时层（只包含选中节点，优化400+节点性能）
  dragLayer = new Konva.Layer({
    listening: false,
    visible: false
  })
  stage.add(dragLayer)

  // 初始化 Transformer
  initTransformer()

  // 初始化框选矩形
  initSelectionRect()
  
  // 初始化绘制预览
  initDrawingPreview()

  // 设置事件监听
  setupStageEvents()

  // 初始渲染
  renderAll()
})

onUnmounted(() => {
  // 移除键盘事件监听
  window.removeEventListener('keydown', handleKeyDown)
  
  if (stage) {
    stage.destroy()
    stage = null
  }
  nodeMap.clear()
})

// ==================== 数据监听 ====================

// 监听 venue 数据变化，自动重绘
watch(() => venueStore.venue, () => {
  // 如果是从 Transformer 同步数据，跳过重绘（避免破坏 Transformer 状态）
  if (isSyncingFromTransformer) return
  
  nextTick(() => {
    renderAll()
  })
}, { deep: true })

// 监听选中状态变化，更新选中效果和 Transformer
watch(() => [
  venueStore.selectedRowIds,
  venueStore.selectedSeatIds,
  venueStore.selectedShapeIds,
  venueStore.selectedTextIds,
  venueStore.selectedAreaIds
], (newVal, oldVal) => {
  console.log('watch 触发:', '新值:', newVal.map(a => a.length), '旧值:', oldVal?.map(a => a.length))
  updateSelectionVisuals()
  updateTransformer()
}, { deep: true })

// ==================== 渲染主函数====================

const renderAll = () => {
  if (!mainLayer) return

  // 清空画布和节点映射
  mainLayer.destroyChildren()
  nodeMap.clear()

  // 渲染所有区域
  venueStore.venue.sections.forEach(section => {
    renderSection(section)
  })

  // 应用视口剔除
  updateViewportCulling()

  // 更新选中装饰
  updateSelectionVisuals()

  mainLayer.batchDraw()
}

const renderSection = (section: Section) => {
  if (!mainLayer) return

  // 渲染排（包含座位）
  section.rows.forEach(row => {
    renderRow(row, section)
  })

  // 渲染形状
  if (section.shapes) {
    section.shapes.forEach(shape => {
      renderShape(shape, section)
    })
  }

  // 渲染文本
  if (section.texts) {
    section.texts.forEach(text => {
      renderText(text, section)
    })
  }

  // 渲染区域
  if (section.areas) {
    section.areas.forEach(area => {
      renderArea(area, section)
    })
  }
}

// ==================== 渲染排====================

const renderRow = (row: SeatRow, section: Section) => {
  if (!mainLayer || row.seats.length === 0) return

  // 计算座位间距和尺寸
  const seatSpacing = row.seatSpacing || SEAT_SPACING

  // 【参考KonvaCanvas.vue 实现】：直接使用 Shape 方案，放弃 rowGroup
  // 计算边界（包含座位半径）
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
  row.seats.forEach((seat) => {
    minX = Math.min(minX, seat.x - SEAT_RADIUS)
    minY = Math.min(minY, seat.y - SEAT_RADIUS)
    maxX = Math.max(maxX, seat.x + SEAT_RADIUS)
    maxY = Math.max(maxY, seat.y + SEAT_RADIUS)
  })

  // width/height 是内容实际大小
  const width = maxX - minX
  const height = maxY - minY

  // 计算几何中心（用于旋转中心）
  const centerX = (minX + maxX) / 2
  const centerY = (minY + maxY) / 2

  // 创建 Shape 用于绘制座位
  // 【参考KonvaCanvas.vue 实现】：
  // - Shape.x/y = row.x/y + centerX/Y（几何中心）
  // - 不设置 offsetX/offsetY，保持为 0
  // - 座位局部坐标保持原始值
  const rowShape = new Konva.Shape({
    x: (row.x ?? 0) + centerX,  // Shape 位置 = 起点 + 几何中心
    y: (row.y ?? 0) + centerY,
    rotation: row.rotation || 0,
    width: width,
    height: height,
    // 【关键】：不设置 offsetX/offsetY，保持为 0
    // 这样 Transformer 的包围盒从 (x, y) 开始，大小为 width/height
    draggable: false,  // 【关键】：未选中时禁止拖拽
    id: `row-${row.id}`,
    name: 'row-shape',
    perfectDrawEnabled: false,
    transformsEnabled: 'all',
    rowData: row,  // 存储排数据引用
    sectionId: section.id,
    hitMinX: minX,
    hitMinY: minY,
    hitMaxX: maxX,
    hitMaxY: maxY,
    centerX: centerX,  // 存储几何中心，用于后续计算
    centerY: centerY
  })

  // sceneFunc: 批次绘制所有座位（使用局部坐标）
  rowShape.sceneFunc((context, shape) => {
    const rowData = shape.getAttr('rowData') as SeatRow
    const isSelected = venueStore.selectedRowIds.includes(rowData.id)
    const radius = SEAT_RADIUS

    // 按分类颜色分组绘制
    const colorGroups: Record<string, Seat[]> = {}
    rowData.seats.forEach((seat) => {
      const category = venueStore.venue.categories.find(c => String(c.key) === String(seat.categoryKey))
      const color = category?.color || '#9E9E9E'
      if (!colorGroups[color]) colorGroups[color] = []
      colorGroups[color].push(seat)
    })

    // 批次绘制每个颜色组的座位
    Object.entries(colorGroups).forEach(([color, groupSeats]) => {
      if (groupSeats.length === 0) return

      context.beginPath()
      context.fillStyle = color

      // 使用局部坐标绘制（Shape 的 x/y 和 rotation 已经处理变换
      groupSeats.forEach(seat => {
        context.moveTo(seat.x + radius, seat.y)
        context.arc(seat.x, seat.y, radius, 0, Math.PI * 2)
      })

      context.fill()

      // 绘制边框
      context.save()
      context.strokeStyle = isSelected ? '#3b82f6' : color
      context.lineWidth = isSelected ? 3 : 1
      groupSeats.forEach(seat => {
        context.beginPath()
        context.arc(seat.x, seat.y, radius, 0, Math.PI * 2)
        context.stroke()
      })
      context.restore()
    })
  })

  // hitFunc: 自定义点击检测区域
  // 【参考 RotationTest.vue】：从 (0,0) 开始，大小为 width/height
  rowShape.hitFunc((context, shape) => {
    const width = shape.width()
    const height = shape.height()
    context.beginPath()
    context.rect(0, 0, width, height)
    context.fillStrokeShape(shape)
  })

  // 事件处理
  // 【注意】：选中和框选统一在 stage 的 mousedown/click 事件中处理
  // 这里只保留基本的鼠标样式和拖拽结束同步
  rowShape.on('click', (e) => {
    // 阻止冒泡，避免触发舞台点击
    e.cancelBubble = true
    // 选中的具体逻辑在 stage 的 click 事件中统一处理
  })

  rowShape.on('mouseenter', () => {
    if (stage && !isDrawingMode()) stage.container().style.cursor = 'pointer'
  })
  rowShape.on('mouseleave', () => {
    if (stage) stage.container().style.cursor = 'default'
  })

  // 拖拽结束同步 - 同步 Shape 的坐标到 row 数据
  // 【关键】：Shape.x/y = row.x/y + centerX/Y，所以需要减去 centerX/Y 得到 row.x/y
  rowShape.on('dragend', () => {
    // 如果正在使用 Transformer 进行变换，跳过（由 transformend 统一处理）
    if (transformer?.isTransforming()) return

    const centerX = rowShape.getAttr('centerX') || 0
    const centerY = rowShape.getAttr('centerY') || 0

    venueStore.updateRow(row.id, {
      x: rowShape.x() - centerX,  // 减去几何中心得到 row 起点
      y: rowShape.y() - centerY,
      rotation: rowShape.rotation()
    })
  })

  mainLayer.add(rowShape)
  nodeMap.set(row.id, rowShape)
}

// ==================== 渲染形状 ====================

const renderShape = (shape: ShapeObject, section: Section) => {
  if (!mainLayer) return

  let konvaShape: Konva.Shape | null = null

  switch (shape.type) {
    case 'rect':
      konvaShape = new Konva.Rect({
        x: shape.x,
        y: shape.y,
        width: shape.width || 100,
        height: shape.height || 100,
        rotation: shape.rotation || 0,
        fill: shape.fill,
        stroke: shape.stroke,
        strokeWidth: shape.strokeWidth,
        opacity: shape.opacity ?? 1,
        cornerRadius: shape.cornerRadius || 0,
        id: `shape-${shape.id}`,
        name: `shape-object rect-shape`
      })
      break

    case 'ellipse':
      konvaShape = new Konva.Ellipse({
        x: shape.x,
        y: shape.y,
        radiusX: (shape.width || 100) / 2,
        radiusY: (shape.height || 100) / 2,
        rotation: shape.rotation || 0,
        fill: shape.fill,
        stroke: shape.stroke,
        strokeWidth: shape.strokeWidth,
        opacity: shape.opacity ?? 1,
        id: `shape-${shape.id}`,
        name: `shape-object ellipse-shape`
      })
      break

    case 'polygon':
      if (shape.points && shape.points.length >= 6) {
        konvaShape = new Konva.Line({
          x: shape.x,
          y: shape.y,
          points: shape.points,
          rotation: shape.rotation || 0,
          fill: shape.fill,
          stroke: shape.stroke,
          strokeWidth: shape.strokeWidth,
          opacity: shape.opacity ?? 1,
          closed: true,
          id: `shape-${shape.id}`,
          name: `shape-object polygon-shape`
        })
      }
      break

    case 'sector':
      // 使用 Arc 绘制扇形
      konvaShape = new Konva.Arc({
        x: shape.x,
        y: shape.y,
        innerRadius: shape.innerRadius || 0,
        outerRadius: shape.outerRadius || 100,
        angle: shape.angle || 90,
        rotation: shape.rotation || 0,
        fill: shape.fill,
        stroke: shape.stroke,
        strokeWidth: shape.strokeWidth,
        opacity: shape.opacity ?? 1,
        id: `shape-${shape.id}`,
        name: `shape-object sector-shape`
      })
      break

    case 'polyline':
      if (shape.points && shape.points.length >= 4) {
        konvaShape = new Konva.Line({
          x: shape.x,
          y: shape.y,
          points: shape.points,
          rotation: shape.rotation || 0,
          stroke: shape.stroke,
          strokeWidth: shape.strokeWidth,
          opacity: shape.opacity ?? 1,
          closed: false,
          id: `shape-${shape.id}`,
          name: `shape-object polyline-shape`
        })
      }
      break
  }

  if (konvaShape) {
    konvaShape.setAttr('shapeData', shape)
    konvaShape.setAttr('sectionId', section.id)

    // 【关键修复】：mousedown 立即选中，确保 Transformer 能接管拖拽
    konvaShape.on('mousedown', (e) => {
      if (e.evt.button !== 0) return
      e.cancelBubble = true
      
      const isAlreadySelected = venueStore.selectedShapeIds.includes(shape.id)
      if (isAlreadySelected) return
      
      const additive = e.evt.shiftKey
      venueStore.selectShape(shape.id, additive)
      updateTransformer(true)
      
      // 手动启动拖拽
      requestAnimationFrame(() => {
        if (transformer && transformer.nodes().includes(konvaShape)) {
          konvaShape.startDrag(e.evt)
        }
      })
    })

    // 点击事件
    konvaShape.on('click', (e) => {
      e.cancelBubble = true
      const additive = e.evt.shiftKey
      venueStore.selectShape(shape.id, additive)
    })

    // 鼠标样式
    konvaShape.on('mouseenter', () => {
      if (stage && !isDrawingMode()) stage.container().style.cursor = 'pointer'
    })
    konvaShape.on('mouseleave', () => {
      if (stage) stage.container().style.cursor = 'default'
    })
    
    // 拖拽结束同步位置
    konvaShape.on('dragend', () => {
      // 如果正在使用 Transformer 进行变换，跳过（由 transformend 统一处理）
      if (transformer?.isTransforming()) return
      
      const newX = konvaShape.x()
      const newY = konvaShape.y()
      const newRotation = konvaShape.rotation()
      venueStore.updateShape(shape.id, { 
        x: newX, 
        y: newY, 
        rotation: newRotation 
      })
    })
    
    // 启用拖拽
    konvaShape.draggable(true)

    mainLayer.add(konvaShape)
    nodeMap.set(shape.id, konvaShape)
  }
}

// ==================== 渲染文本 ====================

const renderText = (text: TextObject, section: Section) => {
  if (!mainLayer) return

  const konvaText = new Konva.Text({
    x: text.x,
    y: text.y,
    text: text.text || text.caption || '',
    fontSize: text.fontSize || 16,
    fontFamily: text.fontFamily || 'system-ui, -apple-system, sans-serif',
    fontStyle: text.fontStyle || (text.bold ? 'bold' : text.italic ? 'italic' : 'normal'),
    fill: text.fill || text.textColor || '#333333',
    rotation: text.rotation || 0,
    width: text.width,
    height: text.height,
    align: text.align || 'left',
    id: `text-${text.id}`,
    name: 'text-object'
  })

  konvaText.setAttr('textData', text)
  konvaText.setAttr('sectionId', section.id)

  // 【关键修复】：mousedown 立即选中，确保 Transformer 能接管拖拽
  konvaText.on('mousedown', (e) => {
    if (e.evt.button !== 0) return
    e.cancelBubble = true
    
    const isAlreadySelected = venueStore.selectedTextIds.includes(text.id)
    if (isAlreadySelected) return
    
    const additive = e.evt.shiftKey
    venueStore.selectText(text.id, additive)
    updateTransformer(true)
    
    // 手动启动拖拽
    requestAnimationFrame(() => {
      if (transformer && transformer.nodes().includes(konvaText)) {
        konvaText.startDrag(e.evt)
      }
    })
  })

  // 点击事件
  konvaText.on('click', (e) => {
    e.cancelBubble = true
    const additive = e.evt.shiftKey
    venueStore.selectText(text.id, additive)
  })

  // 鼠标样式
  konvaText.on('mouseenter', () => {
    if (stage && !isDrawingMode()) stage.container().style.cursor = 'pointer'
  })
  konvaText.on('mouseleave', () => {
    if (stage) stage.container().style.cursor = 'default'
  })
  
  // 拖拽结束同步位置
  konvaText.on('dragend', () => {
    // 如果正在使用 Transformer 进行变换，跳过（由 transformend 统一处理）
    if (transformer?.isTransforming()) return
    
    const newX = konvaText.x()
    const newY = konvaText.y()
    venueStore.updateText(text.id, { x: newX, y: newY })
  })
  
  // 启用拖拽
  konvaText.draggable(true)

  mainLayer.add(konvaText)
  nodeMap.set(text.id, konvaText)
}

// ==================== 渲染区域 ====================

const renderArea = (area: AreaObject, section: Section) => {
  if (!mainLayer || !area.points || area.points.length < 6) return

  const areaShape = new Konva.Line({
    x: 0,
    y: 0,
    points: area.points,
    fill: area.fill || 'rgba(100, 100, 100, 0.3)',
    opacity: area.opacity ?? (area.translucent ? 0.3 : 0.6),
    closed: true,
    id: `area-${area.id}`,
    name: 'area-object'
  })

  areaShape.setAttr('areaData', area)
  areaShape.setAttr('sectionId', section.id)

  // 【关键修复】：mousedown 立即选中，确保 Transformer 能接管拖拽
  areaShape.on('mousedown', (e) => {
    if (e.evt.button !== 0) return
    e.cancelBubble = true
    
    const isAlreadySelected = venueStore.selectedAreaIds.includes(area.id)
    if (isAlreadySelected) return
    
    const additive = e.evt.shiftKey
    venueStore.selectArea(area.id, additive)
    updateTransformer(true)
    
    // 手动启动拖拽
    requestAnimationFrame(() => {
      if (transformer && transformer.nodes().includes(areaShape)) {
        areaShape.startDrag(e.evt)
      }
    })
  })

  // 点击事件
  areaShape.on('click', (e) => {
    e.cancelBubble = true
    const additive = e.evt.shiftKey
    venueStore.selectArea(area.id, additive)
  })

  // 鼠标样式
  areaShape.on('mouseenter', () => {
    if (stage && !isDrawingMode()) stage.container().style.cursor = 'pointer'
    areaShape.opacity((area.opacity ?? 0.6) + 0.2)
    mainLayer?.batchDraw()
  })
  areaShape.on('mouseleave', () => {
    if (stage) stage.container().style.cursor = 'default'
    areaShape.opacity(area.opacity ?? (area.translucent ? 0.3 : 0.6))
    mainLayer?.batchDraw()
  })
  
  // 拖拽结束同步位置
  areaShape.on('dragend', () => {
    // 如果正在使用 Transformer 进行变换，跳过（由 transformend 统一处理）
    if (transformer?.isTransforming()) return
    
    // 区域的位置通过 points 定义，需要重新计）
    // 简化处理：区域的拖拽通过更新 points 来实）
    const dx = areaShape.x()
    const dy = areaShape.y()
    if (dx !== 0 || dy !== 0) {
      // 更新所有点的位）
      const newPoints = area.points.map((val, idx) => {
        return idx % 2 === 0 ? val + dx : val + dy
      })
      venueStore.updateArea(area.id, { points: newPoints })
      // 重置位置
      areaShape.position({ x: 0, y: 0 })
    }
  })
  
  // 启用拖拽
  areaShape.draggable(true)

  mainLayer.add(areaShape)
  nodeMap.set(area.id, areaShape)
}

// ==================== 视口管理 ====================

// ==================== 事件处理 ====================

/**
 * 获取相对于舞）Stage)内部逻辑空间的坐）
 * 无论当前缩放(Scale)或平）Position)如何，返回的坐标始终与原始数据对）
 */
const getStagePosition = (): Position | null => {
  if (!stage) return null

  const pointer = stage.getPointerPosition()
  if (!pointer) return null

  // 统一转换公式）物理坐标 - 舞台位移) / 缩放比例
  return {
    x: (pointer.x - stage.x()) / stage.scaleX(),
    y: (pointer.y - stage.y()) / stage.scaleY()
  }
}

// 检查当前是否处于绘制模）
const isDrawingMode = (): boolean => {
  return drawing.isDataDrivenTool.value
}

const setupStageEvents = () => {
  if (!stage) return

  // 滚轮缩放（已禁用）
  // stage.on('wheel', (e) => {
  //   e.evt.preventDefault()
  //   handleWheel(e)
  // })

  // 鼠标按下
  stage.on('mousedown', (e) => {
    // A. 如果正在使用 Transformer 进行变换（旋）缩放），不干）
    if (transformer?.isTransforming()) return
    
    // B. 如果点击的是 Transformer 的组成部分（手柄、边框），直接跳）
    const parent = e.target.getParent()
    if (parent && parent.className === 'Transformer') return

    // C. 获取统一的逻辑坐标
    const pos = getStagePosition()
    if (!pos) return
    
    // D. 获取屏幕坐标（用于统一拖拽）
    const pointer = stage!.getPointerPosition()
    if (!pointer) return

    // E. 绘制模式处理
    if (isDrawingMode() && e.evt.button === 0) {
      const tool = currentDrawingTool.value
      
      // 文本工具：点击即放置
      if (tool === 'draw_text') {
        submitText(pos)
        return
      }
      
      // 多边）区域工具：点击添加点
      if (tool === 'draw_polygon' || tool === 'draw_area') {
        // 检查是否闭）
        if (drawing.polygonPoints.value.length >= 3 && drawing.isNearStartPoint(pos)) {
          if (tool === 'draw_polygon') {
            submitPolygon(drawing.polygonPoints.value)
          } else {
            submitArea(drawing.polygonPoints.value)
          }
          return
        }
        
        drawing.addPolygonPoint(pos)
        createPolygonPreview(drawing.polygonPoints.value, pos)
        return
      }
      
      // 座位）矩形/椭圆：开始拖拽绘）
      if (tool === 'draw_seat' || tool === 'draw_rect' || tool === 'draw_ellipse') {
        drawing.startDrawing(pos)
        return
      }
    }
    
    // F. 标准模式处理
    if (e.evt.button === 1 || (e.evt.button === 0 && e.evt.shiftKey)) {
      // 中键）Shift+左键：开始平）
      viewportState.isDragging = true
      viewportState.dragStartX = stage!.x()
      viewportState.dragStartY = stage!.y()
      viewportState.lastPointerX = e.evt.clientX
      viewportState.lastPointerY = e.evt.clientY
      if (stage) stage.container().style.cursor = 'grabbing'
      return
    }
    
    // G. 检查是否在 Transformer 框内 ）进入统一拖拽模式
    if (transformer && transformer.visible() && e.evt.button === 0 && !isDrawingMode()) {
      // 检测是否点击了旋转锚点）Transformer 手柄
      const targetName = (e.target as any)?.name?.() || ''
      const isRotater = targetName.includes('rotater')
      const isAnchor = targetName.includes('anchor') || targetName.includes('rotater')
      
      // 如果点击的是旋转锚点，让 Transformer 自己处理旋转
      if (isRotater) {
        return  // 不干预，）Transformer 处理旋转
      }
      
      const trRect = transformer.getClientRect()
      const insideTr = (
        pointer.x >= trRect.x &&
        pointer.x <= trRect.x + trRect.width &&
        pointer.y >= trRect.y &&
        pointer.y <= trRect.y + trRect.height
      )
      if (insideTr && !isAnchor) {
        // ）Transformer 框内且不是点击锚））启动统一拖拽
        startDragAll(pointer, false)
        return  // 不触发框选或其他逻辑
      }
    }
    
    // H. 点击舞台空白））启动框）
    if (e.evt.button === 0 && e.target === stage && !isDrawingMode()) {
      startBoxSelection(pointer)  // 使用屏幕坐标
    }
  })

  // 鼠标移动
  stage.on('mousemove', (e) => {
    // 统一拖拽模式优先处理
    if (unifiedDragState.active) {
      const pointer = stage!.getPointerPosition()
      if (pointer) {
        updateDragAll(pointer)
      }
      return
    }
    
    // 如果正在使用 Transformer 进行变换（旋）缩放），不干）
    if (transformer?.isTransforming()) {
      return
    }

    // 使用不带参数）getStagePosition，自动处）scale ）offset
    const pos = getStagePosition()
    if (!pos) return
    
    // 获取屏幕坐标（用于框选）
    const pointer = stage!.getPointerPosition()
    if (!pointer) return
    
    // 绘制模式预览
    if (isDrawingMode() && drawing.previewState.value.isActive) {
      drawing.updateDrawing(pos)
      const startPos = drawing.previewState.value.startPos
      if (!startPos) return
      
      switch (currentDrawingTool.value) {
        case 'draw_seat':
          createSeatRowPreview(startPos, pos)
          break
        case 'draw_rect':
          createRectPreview(startPos, pos)
          break
        case 'draw_ellipse':
          createEllipsePreview(startPos, pos)
          break
      }
      return
    }
    
    // 多边）区域预览
    if (isDrawingMode() && (currentDrawingTool.value === 'draw_polygon' || currentDrawingTool.value === 'draw_area')) {
      if (drawing.polygonPoints.value.length > 0) {
        createPolygonPreview(drawing.polygonPoints.value, pos)
      }
      return
    }
    
    // 标准模式处理
    if (viewportState.isDragging) {
      // 平移画布
      const dx = e.evt.clientX - viewportState.lastPointerX
      const dy = e.evt.clientY - viewportState.lastPointerY
      stage!.x(stage!.x() + dx)
      stage!.y(stage!.y() + dy)
      viewportState.lastPointerX = e.evt.clientX
      viewportState.lastPointerY = e.evt.clientY
      updateViewportCulling()
      mainLayer?.batchDraw()
    } else if (selectionState.isSelecting) {
      // 更新框）- 使用屏幕坐标
      updateBoxSelection(pointer)
    }
  })

  // 鼠标释放
  stage.on('mouseup', (e) => {
    // 统一拖拽结束优先处理
    if (unifiedDragState.active) {
      endDragAll()
      return
    }
    
    // 绘制模式：完成绘）
    if (isDrawingMode() && drawing.previewState.value.isActive) {
      const startPos = drawing.previewState.value.startPos
      // 使用不带参数）getStagePosition，自动处）scale ）offset
      const endPos = getStagePosition()
      
      if (startPos && endPos) {
        switch (currentDrawingTool.value) {
          case 'draw_seat':
            submitSeatRow(startPos, endPos)
            break
          case 'draw_rect':
            submitRect(startPos, endPos)
            break
          case 'draw_ellipse':
            submitEllipse(startPos, endPos)
            break
        }
      }
      
      drawing.finishDrawing()
      return
    }
    
    // 标准模式处理
    if (viewportState.isDragging) {
      viewportState.isDragging = false
      if (stage) stage.container().style.cursor = 'default'
    } else if (selectionState.isSelecting) {
      endBoxSelection(e.evt.shiftKey)
    }
  })

  // 点击事件（用于选中对象）
  stage.on('click', (e) => {
    // 绘制模式下不处理选中
    if (isDrawingMode()) return
    
    // 如果正在框选，不处理点）
    if (selectionState.isSelecting) return
    
    // 如果点击的是舞台空白处，取消选择
    if (e.target === stage) {
      if (!e.evt.shiftKey) {
        venueStore.clearSelection()
      }
      return
    }
    
    // 查找点击的对象（向上遍历父节点）
    let target = e.target as Konva.Node | null
    let selectedNode: Konva.Node | null = null
    let selectedType: 'row' | 'shape' | 'text' | 'area' | null = null
    let selectedId: string | null = null
    
    while (target) {
      const name = target.name() || ''
      const id = target.id() || ''
      
      if (name.includes('row-shape')) {
        selectedNode = target
        selectedType = 'row'
        selectedId = id.replace('row-', '')
        break
      } else if (name.includes('shape-object')) {
        selectedNode = target
        selectedType = 'shape'
        selectedId = id.replace('shape-', '')
        break
      } else if (name.includes('text-object')) {
        selectedNode = target
        selectedType = 'text'
        selectedId = id.replace('text-', '')
        break
      } else if (name.includes('area-object')) {
        selectedNode = target
        selectedType = 'area'
        selectedId = id.replace('area-', '')
        break
      }
      
      target = target.getParent()
    }
    
    // 处理选中
    if (selectedNode && selectedType && selectedId) {
      const additive = e.evt.shiftKey
      
      switch (selectedType) {
        case 'row':
          venueStore.selectRow(selectedId, additive)
          break
        case 'shape':
          venueStore.selectShape(selectedId, additive)
          break
        case 'text':
          venueStore.selectText(selectedId, additive)
          break
        case 'area':
          venueStore.selectArea(selectedId, additive)
          break
      }
    }
  })
  
  // 键盘事件
  window.addEventListener('keydown', handleKeyDown)
}

// 键盘事件处理
const handleKeyDown = (e: KeyboardEvent) => {
  // ESC 取消绘制
  if (e.key === 'Escape') {
    if (isDrawingMode()) {
      clearDrawingPreview()
      drawing.resetDrawingState()
    }
    return
  }
  
  // Delete/Backspace 删除选中
  if (e.key === 'Delete' || e.key === 'Backspace') {
    // 绘制模式下不处理删除
    if (isDrawingMode()) return
    
    deleteSelectedObjects()
  }
}

// 删除选中的对）
const deleteSelectedObjects = () => {
  // 删除选中的排
  venueStore.selectedRowIds.forEach(id => {
    venueStore.deleteRow(id)
  })
  
  // 删除选中的形）
  venueStore.selectedShapeIds.forEach(id => {
    venueStore.deleteShape(id)
  })
  
  // 删除选中的文）
  venueStore.selectedTextIds.forEach(id => {
    venueStore.deleteText(id)
  })
  
  // 删除选中的区）
  venueStore.selectedAreaIds.forEach(id => {
    venueStore.deleteArea(id)
  })
  
  // 清除选择状态
  venueStore.clearSelection()
}

const handleWheel = (e: Konva.KonvaEventObject<WheelEvent>) => {
  if (!stage) return

  const oldScale = stage.scaleX()
  const pointer = stage.getPointerPosition()
  if (!pointer) return

  // 计算新的缩放比例
  const scaleBy = 1.1
  const direction = e.evt.deltaY > 0 ? -1 : 1
  const newScale = direction > 0 ? oldScale * scaleBy : oldScale / scaleBy

  // 限制缩放范围
  if (newScale < MIN_SCALE || newScale > MAX_SCALE) return

  // 计算鼠标位置对应的舞台坐）
  const mousePointTo = {
    x: (pointer.x - stage.x()) / oldScale,
    y: (pointer.y - stage.y()) / oldScale
  }

  // 应用新的缩放
  stage.scale({ x: newScale, y: newScale })

  // 计算新的位置，使鼠标指向的点保持不变
  const newPos = {
    x: pointer.x - mousePointTo.x * newScale,
    y: pointer.y - mousePointTo.y * newScale
  }

  stage.position(newPos)
  viewportState.scale = newScale

  // 更新视口剔除
  updateViewportCulling()
  mainLayer?.batchDraw()
}

// ==================== 视口剔除 ====================

const updateViewportCulling = () => {
  if (!stage || !mainLayer) return

  const viewport = getViewportBounds()
  if (!viewport) return

  // 批量更新可见）
  nodeMap.forEach((node) => {
    const shouldBeVisible = isNodeInViewport(node, viewport)
    if (node.visible() !== shouldBeVisible) {
      node.visible(shouldBeVisible)
    }
  })

  mainLayer.batchDraw()
}

const getViewportBounds = () => {
  if (!stage) return null

  const width = stage.width()
  const height = stage.height()
  const scale = stage.scaleX()
  const x = stage.x()
  const y = stage.y()

  // 计算视口在舞台坐标系中的边界
  const minX = (-x - VIEWPORT_PADDING) / scale
  const maxX = (-x + width + VIEWPORT_PADDING) / scale
  const minY = (-y - VIEWPORT_PADDING) / scale
  const maxY = (-y + height + VIEWPORT_PADDING) / scale

  return { minX, maxX, minY, maxY }
}

const isNodeInViewport = (node: Konva.Node, viewport: { minX: number, maxX: number, minY: number, maxY: number }): boolean => {
  const rect = node.getClientRect()
  return (
    rect.x + rect.width >= viewport.minX &&
    rect.x <= viewport.maxX &&
    rect.y + rect.height >= viewport.minY &&
    rect.y <= viewport.maxY
  )
}

// ==================== Transformer ====================

const initTransformer = () => {
  if (!overlayLayer) return

  transformer = new Konva.Transformer({
    rotateEnabled: true,
    resizeEnabled: false,  // 【参考KonvaCanvas】：禁用缩放
    rotationSnaps: [0, 45, 90, 135, 180, 225, 270, 315],
    rotationSnapTolerance: 5,
    padding: 0,  // 【参考KonvaCanvas】：无内边距
    visible: false,
    
    // 边框样式
    borderStroke: '#3b82f6',
    borderStrokeWidth: 1,
    
    // 锚点样式
    anchorFill: '#ffffff',
    anchorStroke: '#3b82f6',
    anchorStrokeWidth: 1.5,
    anchorSize: 8,
    
    // 旋转锚点
    rotateAnchorOffset: 30,
    rotateAnchorCursor: 'crosshair'
    // 【参考KonvaCanvas】：不设）enabledAnchors，使用默认（启用所有锚点）
  })

  // 变换结束后同步数据到 store
  transformer.on('transformend', () => {
    isSyncingFromTransformer = true
    
    const nodes = transformer?.nodes() || []
    nodes.forEach((node) => {
      const rowData = node.getAttr('rowData') as SeatRow
      const shapeData = node.getAttr('shapeData') as ShapeObject
      const textData = node.getAttr('textData') as TextObject
      const areaData = node.getAttr('areaData') as AreaObject

      if (rowData) {
        // 排：同步位置和旋转，重置缩放（排不支持缩放）
        // 【关键】：Shape.x/y = row.x/y + centerX/Y，需要减去 centerX/Y
        const centerX = node.getAttr('centerX') || 0
        const centerY = node.getAttr('centerY') || 0
        venueStore.updateRow(rowData.id, {
          x: node.x() - centerX,
          y: node.y() - centerY,
          rotation: node.rotation()
        })
        // 重置缩放
        node.scaleX(1)
        node.scaleY(1)
      } else if (shapeData) {
        // 形状：将缩放转换为尺寸变）
        const scaleX = node.scaleX()
        const scaleY = node.scaleY()
        
        const updates: any = {
          x: node.x(),
          y: node.y(),
          rotation: node.rotation()
        }
        
        // 根据形状类型处理缩放
        if (shapeData.type === 'rect' || shapeData.type === 'ellipse') {
          updates.width = (shapeData.width || 100) * scaleX
          updates.height = (shapeData.height || 100) * scaleY
        }
        
        venueStore.updateShape(shapeData.id, updates)
        // 重置缩放
        node.scaleX(1)
        node.scaleY(1)
      } else if (textData) {
        // 文本：将缩放转换为字体大小变）
        const scaleX = node.scaleX()
        const scaleY = node.scaleY()
        const avgScale = (scaleX + scaleY) / 2
        
        const updates: any = {
          x: node.x(),
          y: node.y(),
          rotation: node.rotation()
        }
        
        if (avgScale !== 1) {
          updates.fontSize = Math.round((textData.fontSize || 16) * avgScale)
        }
        
        venueStore.updateText(textData.id, updates)
        // 重置缩放
        node.scaleX(1)
        node.scaleY(1)
      } else if (areaData) {
        // 区域：将缩放和位移应用到 points
        const scaleX = node.scaleX()
        const scaleY = node.scaleY()
        const dx = node.x()
        const dy = node.y()
        
        if (dx !== 0 || dy !== 0 || scaleX !== 1 || scaleY !== 1) {
          const newPoints = areaData.points.map((val: number, idx: number) => {
            if (idx % 2 === 0) {
              return val * scaleX + dx
            } else {
              return val * scaleY + dy
            }
          })
          venueStore.updateArea(areaData.id, { points: newPoints })
          node.position({ x: 0, y: 0 })
          node.scaleX(1)
          node.scaleY(1)
        }
      }
    })
    
    // 强制更新 Transformer 节点和包围盒
    updateTransformer(true)
    
    // 延迟重置标志位，确保 watch 已经执行完毕
    setTimeout(() => {
      isSyncingFromTransformer = false
    }, 0)
  })

  overlayLayer.add(transformer)
}

// 更新 Transformer 节点
const updateTransformer = (forceUpdate = false) => {
  if (!transformer) return

  const selectedNodes: Konva.Node[] = []

  // 收集选中的排
  venueStore.selectedRowIds.forEach(id => {
    const node = nodeMap.get(id)
    if (node) {
      selectedNodes.push(node)
      // 【关键】：选中的排启用拖拽
      node.draggable(true)
    }
  })

  // 收集选中的形）
  venueStore.selectedShapeIds.forEach(id => {
    const node = nodeMap.get(id)
    if (node) selectedNodes.push(node)
  })

  // 收集选中的文）
  venueStore.selectedTextIds.forEach(id => {
    const node = nodeMap.get(id)
    if (node) selectedNodes.push(node)
  })

  // 收集选中的区）
  venueStore.selectedAreaIds.forEach(id => {
    const node = nodeMap.get(id)
    if (node) selectedNodes.push(node)
  })

  // 【关键】：未选中的排禁用拖拽
  nodeMap.forEach((node, id) => {
    const name = node.name() || ''
    if (name.includes('row-shape')) {
      const isSelected = venueStore.selectedRowIds.includes(id)
      node.draggable(isSelected)
    }
  })

  if (selectedNodes.length > 0) {
    const currentNodes = transformer.nodes()
    // 只有在节点列表变化时才重新设）nodes
    if (forceUpdate || 
        currentNodes.length !== selectedNodes.length || 
        !currentNodes.every((node, i) => node === selectedNodes[i])) {
      transformer.nodes(selectedNodes)
      transformer.visible(true)
    }
    // 始终强制更新包围盒，确保位置变化后正确显）
    transformer.forceUpdate()
  } else {
    transformer.nodes([])
    transformer.visible(false)
  }
  
  // 【关键】：选中时将 overlayLayer 提到最上层，防止遮）Transformer 手柄
  if (selectedNodes.length > 0) {
    overlayLayer?.moveToTop()
  }

  overlayLayer?.batchDraw()
}

// ==================== 统一拖拽功能（优化多选性能）===================

const startDragAll = (screenPos: { x: number; y: number }, isRotation = false) => {
  if (!transformer) return
  
  const selectedNodes = transformer.nodes()
  if (selectedNodes.length === 0) return
  
  unifiedDragState.active = true
  unifiedDragState.startScreenX = screenPos.x
  unifiedDragState.startScreenY = screenPos.y
  unifiedDragState.useDragLayer = !isRotation // 旋转时不使用 dragLayer
  unifiedDragState.items = selectedNodes.map(node => ({
    node,
    startX: node.x(),
    startY: node.y()
  }))
  
  // 官方优化方案：拖拽时将节点移）dragLayer，并优化变换计算
  // 注意：旋转操作时不切）Layer，避免变换中心偏移导致的抖动
  if (dragLayer && mainLayer && unifiedDragState.useDragLayer) {
    unifiedDragState.items.forEach(item => {
      // 移入 dragLayer 前记录当前旋转角）
      const currentRotation = item.node.rotation()
      item.node.moveTo(dragLayer)
      // 关键：确保角度被重新应用，防止被默认值覆）
      item.node.rotation(currentRotation)
    })
    dragLayer.visible(true)
    dragLayer.listening(false)
    dragLayer.batchDraw()
  }
  
  if (stage) stage.container().style.cursor = 'grabbing'
}

const updateDragAll = (screenPos: { x: number; y: number }) => {
  if (!unifiedDragState.active || !stage) return
  
  // 记录当前鼠标位置（用于拖拽结束时计算最终位置）
  unifiedDragState.currentX = screenPos.x
  unifiedDragState.currentY = screenPos.y
  
  // RAF 节流：确保与屏幕刷新率同步，避免同一帧内多次重绘
  if (dragAnimationFrameId) return
  
  dragAnimationFrameId = requestAnimationFrame(() => {
    dragAnimationFrameId = null
    if (!unifiedDragState.active || !stage) return
    
    const scaleVal = stage.scaleX()
    const dx = (screenPos.x - unifiedDragState.startScreenX) / scaleVal
    const dy = (screenPos.y - unifiedDragState.startScreenY) / scaleVal
    
    // 批量更新节点属性，使用 setAttrs 减少重绘次数
    unifiedDragState.items.forEach(item => {
      item.node.setAttrs({
        x: item.startX + dx,
        y: item.startY + dy
      })
    })
    
    // 批量渲染
    if (unifiedDragState.useDragLayer) {
      dragLayer?.batchDraw()
    } else {
      mainLayer?.batchDraw()
    }
    
    // 更新 Transformer 位置
    transformer?.forceUpdate()
    overlayLayer?.batchDraw()
  })
}

const endDragAll = () => {
  if (!unifiedDragState.active) return
  
  // 取消未执行的渲染排
  if (dragAnimationFrameId) {
    cancelAnimationFrame(dragAnimationFrameId)
    dragAnimationFrameId = null
  }
  
  // 拖拽结束：将节点移回 mainLayer，恢复变换设）
  // 注意：只有使用了 dragLayer 时才需要移）
  if (dragLayer && mainLayer && unifiedDragState.useDragLayer) {
    unifiedDragState.items.forEach(item => {
      // 移回前记录当前旋转角）
      const currentRotation = item.node.rotation()
      item.node.moveTo(mainLayer)
      // 关键：确保角度被重新应用，防止被默认值覆）
      item.node.rotation(currentRotation)
    })
    dragLayer.visible(false)
  }
  
  // 只有真正移动了才）justDragged，防止误取消选中
  const moved = unifiedDragState.items.some(item =>
    Math.abs(item.node.x() - item.startX) > 2 ||
    Math.abs(item.node.y() - item.startY) > 2
  )
  justDragged = moved
  unifiedDragState.active = false
  unifiedDragState.useDragLayer = false
  
  if (stage) stage.container().style.cursor = 'default'
  
  // 同步位置）store
  if (moved) {
    unifiedDragState.items.forEach(item => {
      const rowData = item.node.getAttr('rowData')
      const shapeData = item.node.getAttr('shapeData')
      const textData = item.node.getAttr('textData')
      const areaData = item.node.getAttr('areaData')
      
      if (rowData) {
        // 【关键】：Shape.x/y = row.x/y + centerX/Y，需要减去 centerX/Y
        const centerX = item.node.getAttr('centerX') || 0
        const centerY = item.node.getAttr('centerY') || 0
        venueStore.updateRow(rowData.id, {
          x: item.node.x() - centerX,
          y: item.node.y() - centerY,
          rotation: item.node.rotation()
        })
      } else if (shapeData) {
        venueStore.updateShape(shapeData.id, {
          x: item.node.x(),
          y: item.node.y(),
          rotation: item.node.rotation()
        })
      } else if (textData) {
        venueStore.updateText(textData.id, {
          x: item.node.x(),
          y: item.node.y(),
          rotation: item.node.rotation()
        })
      } else if (areaData) {
        // 区域的位置通过 points 定义
        const dx = item.node.x()
        const dy = item.node.y()
        if (dx !== 0 || dy !== 0) {
          const newPoints = areaData.points.map((val: number, idx: number) => {
            return idx % 2 === 0 ? val + dx : val + dy
          })
          venueStore.updateArea(areaData.id, { points: newPoints })
          item.node.position({ x: 0, y: 0 })
        }
      }
    })
  }
  
  unifiedDragState.items = []
  
  // 最终重绘
  mainLayer?.batchDraw()
  overlayLayer?.batchDraw()
}

// ==================== 框选功）====================

const initSelectionRect = () => {
  if (!overlayLayer) return

  selectionState.rect = new Konva.Rect({
    fill: 'rgba(59, 130, 246, 0.1)',
    stroke: '#3b82f6',
    strokeWidth: 1,
    dash: [4, 4],
    visible: false,
    listening: false
  })

  overlayLayer.add(selectionState.rect)
}

const startBoxSelection = (screenPos: { x: number, y: number }) => {
  if (!selectionState.rect || !stage) return

  selectionState.isSelecting = true
  selectionState.startX = screenPos.x
  selectionState.startY = screenPos.y

  // 使用屏幕坐标（指针位置）
  selectionState.rect.setAttrs({
    x: screenPos.x,
    y: screenPos.y,
    width: 0,
    height: 0,
    visible: true
  })

  overlayLayer?.batchDraw()
}

const updateBoxSelection = (screenPos: { x: number, y: number }) => {
  if (!selectionState.rect || !stage) return

  // 使用屏幕坐标
  const x = Math.min(selectionState.startX, screenPos.x)
  const y = Math.min(selectionState.startY, screenPos.y)
  const width = Math.abs(screenPos.x - selectionState.startX)
  const height = Math.abs(screenPos.y - selectionState.startY)

  selectionState.rect.setAttrs({ x, y, width, height })
  overlayLayer?.batchDraw()
}

const endBoxSelection = (additive: boolean) => {
  if (!selectionState.rect || !stage) return

  selectionState.isSelecting = false

  // 【关键修复】：框选框使用屏幕坐标，需要转换为相对于舞台的坐标
  // 获取框选框在屏幕坐标系中的位置和大小
  const rectX = selectionState.rect.x()
  const rectY = selectionState.rect.y()
  const rectWidth = selectionState.rect.width()
  const rectHeight = selectionState.rect.height()
  
  // 转换为舞台坐标系（考虑舞台的缩放和平移）
  const scale = stage.scaleX()
  const stageX = stage.x()
  const stageY = stage.y()
  
  // 屏幕坐标 → 舞台坐标
  const selRect = {
    x: (rectX - stageX) / scale,
    y: (rectY - stageY) / scale,
    width: rectWidth / scale,
    height: rectHeight / scale
  }

  // 框选区域太小，忽略
  if (selRect.width < 5 || selRect.height < 5) {
    selectionState.rect.visible(false)
    overlayLayer?.batchDraw()
    return
  }

  // 找到与框选区域相交的对象
  const selectedIds: { type: 'row' | 'seat' | 'shape' | 'text' | 'area', id: string }[] = []

  nodeMap.forEach((node, id) => {
    // 获取节点在舞台坐标系中的位置
    // 【关键】：必须使用 relativeTo: 'stage' 获取舞台坐标，与 selRect 保持一致
    const nodeRect = node.getClientRect({ relativeTo: stage! })
    
    // AABB 相交检测
    const isIntersecting = (
      nodeRect.x < selRect.x + selRect.width &&
      nodeRect.x + nodeRect.width > selRect.x &&
      nodeRect.y < selRect.y + selRect.height &&
      nodeRect.y + nodeRect.height > selRect.y
    )

    if (isIntersecting) {
      console.log('isIntersecting', node.name(),node)
      const name = node.name() || ''
      let type: 'row' | 'seat' | 'shape' | 'text' | 'area' | null = null

      if (name.includes('row-shape')) type = 'row'
      else if (name.includes('seat-hit-area')) type = 'seat'
      else if (name.includes('shape-object')) type = 'shape'
      else if (name.includes('text-object')) type = 'text'
      else if (name.includes('area-object')) type = 'area'

      if (type) {
        selectedIds.push({ type, id })
      }
    }
  })

  // 按类型分组收集 ID
  const rowIds: string[] = []
  const seatIds: string[] = []
  const shapeIds: string[] = []
  const textIds: string[] = []
  const areaIds: string[] = []

  selectedIds.forEach(({ type, id }) => {
    switch (type) {
      case 'row': rowIds.push(id); break
      case 'seat': seatIds.push(id); break
      case 'shape': shapeIds.push(id); break
      case 'text': textIds.push(id); break
      case 'area': areaIds.push(id); break
    }
  })

  // 【关键优化】：批量更新所有选中状态，只触发一次 watch
  // 不单独调用 clearSelection，而是直接赋值新数组
  if (additive) {
    // Shift+框选：追加模式
    if (rowIds.length) venueStore.selectedRowIds = [...new Set([...venueStore.selectedRowIds, ...rowIds])]
    if (seatIds.length) venueStore.selectedSeatIds = [...new Set([...venueStore.selectedSeatIds, ...seatIds])]
    if (shapeIds.length) venueStore.selectedShapeIds = [...new Set([...venueStore.selectedShapeIds, ...shapeIds])]
    if (textIds.length) venueStore.selectedTextIds = [...new Set([...venueStore.selectedTextIds, ...textIds])]
    if (areaIds.length) venueStore.selectedAreaIds = [...new Set([...venueStore.selectedAreaIds, ...areaIds])]
  } else {
    // 普通框选：替换模式（一次性赋值所有类型）
    venueStore.selectedRowIds = rowIds
    venueStore.selectedSeatIds = seatIds
    venueStore.selectedShapeIds = shapeIds
    venueStore.selectedTextIds = textIds
    venueStore.selectedAreaIds = areaIds
  }

  // 隐藏选择框
  selectionState.rect.visible(false)
  overlayLayer?.batchDraw()
}

// ==================== 绘制功能 ====================

// ---------- 座位排绘）----------

/** 创建座位排预览*/
const createSeatRowPreview = (startPos: Position, endPos: Position) => {
  const { ux, uy, dist } = getUnitVector(startPos, endPos)
  
  if (dist < drawing.SEAT_SPACING) return
  
  const count = Math.max(2, Math.floor(dist / drawing.SEAT_SPACING) + 1)
  
  // 清除旧预览
  clearDrawingPreview()
  
  // 绘制辅助）
  const line = new Konva.Line({
    points: [startPos.x, startPos.y, endPos.x, endPos.y],
    stroke: '#3b82f6',
    strokeWidth: 1.5,
    dash: [5, 4],
    listening: false
  })
  addPreviewElement(line)
  
  // 绘制起点标记
  const startDot = new Konva.Circle({
    x: startPos.x,
    y: startPos.y,
    radius: 5,
    fill: '#3b82f6',
    stroke: '#fff',
    strokeWidth: 1.5,
    listening: false
  })
  addPreviewElement(startDot)
  
  // 绘制座位预览
  const shape = new Konva.Shape({
    listening: false,
    perfectDrawEnabled: false
  })
  
  shape.sceneFunc((ctx) => {
    ctx.beginPath()
    for (let i = 0; i < count; i++) {
      const x = startPos.x + ux * i * drawing.SEAT_SPACING
      const y = startPos.y + uy * i * drawing.SEAT_SPACING
      ctx.moveTo(x + SEAT_RADIUS, y)
      ctx.arc(x, y, SEAT_RADIUS, 0, Math.PI * 2)
    }
    ctx.fillStyle = 'rgba(59, 130, 246, 0.25)'
    ctx.fill()
    ctx.strokeStyle = '#3b82f6'
    ctx.lineWidth = 1.5
    ctx.stroke()
  })
  
  addPreviewElement(shape)
  overlayLayer?.batchDraw()
}

/** 提交座位排到 store */
const submitSeatRow = (startPos: Position, endPos: Position) => {
  const { ux, uy, dist } = getUnitVector(startPos, endPos)
  
  if (dist < drawing.SEAT_SPACING) {
    clearDrawingPreview()
    return
  }
  
  const count = Math.max(2, Math.floor(dist / drawing.SEAT_SPACING) + 1)
  const angle = Math.atan2(uy, ux) * 180 / Math.PI
  
  // 生成座位（使用局部坐标，）KonvaCanvas.vue ）handleRowStraightClick 一致）
  const seats: Seat[] = []
  for (let i = 0; i < count; i++) {
    seats.push({
      id: generateId(),
      label: String(i + 1),
      x: i * drawing.SEAT_SPACING,
      y: 0,
      categoryKey: venueStore.venue.categories[0]?.key || 1,
      status: 'available',
      objectType: 'seat'
    })
  }
  
  // 提交）store
  const sectionId = getOrCreateDefaultSection()
  venueStore.addRow(sectionId, {
    label: '',
    seats,
    x: startPos.x,
    y: startPos.y,
    rotation: angle,
    curve: 0,
    seatSpacing: drawing.SEAT_SPACING
  })
  
  clearDrawingPreview()
}

// ---------- 矩形绘制 ----------

/** 创建矩形预览 */
const createRectPreview = (startPos: Position, endPos: Position) => {
  clearDrawingPreview()
  
  const width = Math.abs(endPos.x - startPos.x)
  const height = Math.abs(endPos.y - startPos.y)
  
  if (width < 5 || height < 5) return
  
  const x = Math.min(startPos.x, endPos.x)
  const y = Math.min(startPos.y, endPos.y)
  
  const rect = new Konva.Rect({
    x,
    y,
    width,
    height,
    fill: 'rgba(156, 163, 175, 0.4)',
    stroke: '#3b82f6',
    strokeWidth: 1.5,
    dash: [5, 4],
    listening: false
  })
  
  addPreviewElement(rect)
  overlayLayer?.batchDraw()
}

/** 提交矩形）store */
const submitRect = (startPos: Position, endPos: Position) => {
  const width = Math.abs(endPos.x - startPos.x)
  const height = Math.abs(endPos.y - startPos.y)
  
  if (width < drawing.MIN_SHAPE_SIZE || height < drawing.MIN_SHAPE_SIZE) {
    clearDrawingPreview()
    return
  }
  
  const x = Math.min(startPos.x, endPos.x)
  const y = Math.min(startPos.y, endPos.y)
  
  const sectionId = getOrCreateDefaultSection()
  venueStore.addShape(sectionId, {
    type: 'rect',
    x,
    y,
    width,
    height,
    rotation: 0,
    fill: 'rgba(156, 163, 175, 0.6)',
    stroke: 'transparent',
    strokeWidth: 0,
    cornerRadius: 8
  })
  
  clearDrawingPreview()
}

// ---------- 椭圆绘制 ----------

/** 创建椭圆预览 */
const createEllipsePreview = (startPos: Position, endPos: Position) => {
  clearDrawingPreview()
  
  const radiusX = Math.abs(endPos.x - startPos.x)
  const radiusY = Math.abs(endPos.y - startPos.y)
  
  if (radiusX < 5 || radiusY < 5) return
  
  const ellipse = new Konva.Ellipse({
    x: startPos.x,
    y: startPos.y,
    radiusX,
    radiusY,
    fill: 'rgba(156, 163, 175, 0.4)',
    stroke: '#3b82f6',
    strokeWidth: 1.5,
    dash: [5, 4],
    listening: false
  })
  
  addPreviewElement(ellipse)
  overlayLayer?.batchDraw()
}

/** 提交椭圆）store */
const submitEllipse = (startPos: Position, endPos: Position) => {
  const radiusX = Math.abs(endPos.x - startPos.x)
  const radiusY = Math.abs(endPos.y - startPos.y)
  
  if (radiusX < drawing.MIN_SHAPE_SIZE || radiusY < drawing.MIN_SHAPE_SIZE) {
    clearDrawingPreview()
    return
  }
  
  const sectionId = getOrCreateDefaultSection()
  venueStore.addShape(sectionId, {
    type: 'ellipse',
    x: startPos.x,
    y: startPos.y,
    width: radiusX * 2,
    height: radiusY * 2,
    rotation: 0,
    fill: 'rgba(156, 163, 175, 0.6)',
    stroke: 'transparent',
    strokeWidth: 0
  })
  
  clearDrawingPreview()
}

// ---------- 多边形绘）----------

/** 创建多边形预览*/
const createPolygonPreview = (points: Position[], currentPos: Position) => {
  clearDrawingPreview()
  
  if (points.length === 0) return
  
  // 绘制已固定的）
  points.forEach((p, i) => {
    const dot = new Konva.Circle({
      x: p.x,
      y: p.y,
      radius: i === 0 ? 4 : 3,
      fill: i === 0 ? '#3b82f6' : '#60a5fa',
      stroke: '#fff',
      strokeWidth: 1.5,
      listening: false
    })
    addPreviewElement(dot)
  })
  
  // 绘制固定线段
  if (points.length >= 2) {
    const linePoints: number[] = []
    points.forEach(p => linePoints.push(p.x, p.y))
    
    const line = new Konva.Line({
      points: linePoints,
      stroke: '#3b82f6',
      strokeWidth: 2,
      listening: false
    })
    addPreviewElement(line)
  }
  
  // 绘制预览线段（最后一个点到鼠标位置）
  const lastPoint = points[points.length - 1]
  const isNearStart = drawing.isNearStartPoint(currentPos, drawing.SNAP_TO_START_DISTANCE)
  const targetPoint = isNearStart ? points[0] : currentPos
  
  const previewLine = new Konva.Line({
    points: [lastPoint.x, lastPoint.y, targetPoint.x, targetPoint.y],
    stroke: isNearStart ? '#22c55e' : '#3b82f6',
    strokeWidth: 2,
    dash: isNearStart ? [] : [5, 5],
    listening: false
  })
  addPreviewElement(previewLine)
  
  // 如果靠近起点，显示闭合预览
  if (isNearStart && points.length >= 3) {
    const fillPoints = points.flatMap(p => [p.x, p.y])
    fillPoints.push(points[0].x, points[0].y)
    
    const fill = new Konva.Line({
      points: fillPoints,
      fill: 'rgba(156, 163, 175, 0.4)',
      closed: true,
      listening: false
    })
    addPreviewElement(fill)
    
    // 高亮起点
    const highlight = new Konva.Circle({
      x: points[0].x,
      y: points[0].y,
      radius: 6,
      fill: '#22c55e',
      stroke: '#fff',
      strokeWidth: 2,
      listening: false
    })
    addPreviewElement(highlight)
  }
  
  overlayLayer?.batchDraw()
}

/** 提交多边形到 store */
const submitPolygon = (points: Position[]) => {
  if (points.length < 3) {
    clearDrawingPreview()
    drawing.clearPolygonPoints()
    return
  }
  
  const center = calculatePolygonCenter(points)
  const relativePoints = toRelativePoints(points, center.x, center.y)
  
  const sectionId = getOrCreateDefaultSection()
  venueStore.addShape(sectionId, {
    type: 'polygon',
    x: center.x,
    y: center.y,
    rotation: 0,
    fill: 'rgba(156, 163, 175, 0.6)',
    stroke: 'transparent',
    strokeWidth: 0,
    points: relativePoints
  })
  
  clearDrawingPreview()
  drawing.clearPolygonPoints()
}

// ---------- 文本绘制 ----------

/** 创建文本预览 */
const createTextPreview = (pos: Position) => {
  clearDrawingPreview()
  
  const text = new Konva.Text({
    x: pos.x,
    y: pos.y,
    text: '文本',
    fontSize: 16,
    fontFamily: 'system-ui, -apple-system, sans-serif',
    fill: '#333333',
    listening: false
  })
  
  addPreviewElement(text)
  overlayLayer?.batchDraw()
}

/** 提交文本）store */
const submitText = (pos: Position) => {
  const sectionId = getOrCreateDefaultSection()
  venueStore.addText(sectionId, {
    type: 'text',
    x: pos.x,
    y: pos.y,
    text: '文本',
    fontSize: 16,
    fontFamily: 'system-ui, -apple-system, sans-serif',
    fill: '#333333',
    rotation: 0
  })
  
  clearDrawingPreview()
}

// ---------- 区域绘制 ----------

/** 提交区域）store */
const submitArea = (points: Position[]) => {
  if (points.length < 3) {
    clearDrawingPreview()
    drawing.clearPolygonPoints()
    return
  }
  
  const flatPoints: number[] = []
  points.forEach(p => flatPoints.push(p.x, p.y))
  
  const sectionId = getOrCreateDefaultSection()
  venueStore.addArea(sectionId, {
    type: 'area',
    label: '区域',
    points: flatPoints,
    fill: 'rgba(100, 100, 100, 0.3)',
    opacity: 0.3,
    translucent: true
  })
  
  clearDrawingPreview()
  drawing.clearPolygonPoints()
}

// ==================== 选中效果 ====================

const updateSelectionVisuals = () => {
  if (!mainLayer) return
  console.log('updateSelectionVisuals',venueStore.selectedRowIds)
  // 为所有节点移除选中效果
  nodeMap.forEach((node, id) => {
    const name = node.name() || ''

    if (name.includes('row-shape')) {
      // 排的选择效果）sceneFunc 中处）
      node.setAttr('selected', venueStore.selectedRowIds.includes(id))
    } else if (name.includes('shape-object') || name.includes('area-object')) {
      const isSelected = venueStore.selectedShapeIds.includes(id) || venueStore.selectedAreaIds.includes(id)
      const shapeNode = node as Konva.Shape
      if (isSelected) {
        // 保存原始 stroke（如果还没保存的话）
        if (shapeNode.getAttr('_originalStroke') === undefined) {
          shapeNode.setAttr('_originalStroke', shapeNode.stroke())
          shapeNode.setAttr('_originalStrokeWidth', shapeNode.strokeWidth())
        }
        shapeNode.stroke('#3b82f6')
        shapeNode.strokeWidth(2)
      } else {
        // 恢复原始 stroke
        const origStroke = shapeNode.getAttr('_originalStroke')
        const origWidth = shapeNode.getAttr('_originalStrokeWidth')
        shapeNode.stroke(origStroke !== undefined ? origStroke : undefined)
        shapeNode.strokeWidth(origWidth !== undefined ? origWidth : 0)
        shapeNode.setAttr('_originalStroke', undefined)
        shapeNode.setAttr('_originalStrokeWidth', undefined)
      }
    } else if (name.includes('text-object')) {
      const isSelected = venueStore.selectedTextIds.includes(id)
      if (isSelected) {
        node.setAttr('selected', true)
      } else {
        node.setAttr('selected', false)
      }
    }
  })

  // 重绘以更新选中效果
  mainLayer.batchDraw()
}

// ==================== 暴露方法 ====================

defineExpose({
  renderAll,
  stage: () => stage,
  layer: () => mainLayer,
  zoomTo: (scale: number, x?: number, y?: number) => {
    if (!stage) return
    stage.scale({ x: scale, y: scale })
    if (x !== undefined && y !== undefined) {
      stage.position({ x, y })
    }
    viewportState.scale = scale
    updateViewportCulling()
    mainLayer?.batchDraw()
  },
  getViewport: () => getViewportBounds(),
  updateViewportCulling,
  // 绘制工具
  setDrawingTool,
  currentDrawingTool,
  // 删除
  deleteSelected: deleteSelectedObjects,
  // 清除绘制状态
  clearDrawing: () => {
    clearDrawingPreview()
    drawing.resetDrawingState()
  }
})
</script>

<style scoped>
.konva-container {
  width: 100%;
  height: 100%;
  overflow: hidden;
}
</style>












