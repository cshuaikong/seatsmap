<template>
  <div ref="containerRef" class="konva-container"></div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, nextTick } from 'vue'
import Konva from 'konva'
import { useVenueStore } from '../stores/venueStore'
import type { SeatRow, Seat, Section, ShapeObject, TextObject, AreaObject, CanvasImage, Position } from '../types'
import { useDrawing, type DrawingToolMode, getUnitVector, generateSeatsAlongLine, calculateBoundingBox, calculatePolygonCenter, toRelativePoints, ROW_SPACING } from '../composables/useKonvaDrawing'
import {
  setPreviewLayer,
  clearDrawingPreview,
  addPreviewElement,
  createSeatCursorPreview as _createSeatCursorPreview,
  createSeatRowPreview as _createSeatRowPreview,
  submitSeatRow as _submitSeatRow,
  createRectPreview as _createRectPreview,
  submitRect as _submitRect,
  createEllipsePreview as _createEllipsePreview,
  submitEllipse as _submitEllipse,
  createPolygonPreview as _createPolygonPreview,
  submitPolygon as _submitPolygon,
  submitArea as _submitArea,
  createTextPreview as _createTextPreview,
  submitText as _submitText
} from '../composables/useKonvaDrawing'
import { useKonvaSelection } from '../composables/useKonvaSelection'
import { useKonvaTransformer } from '../composables/useKonvaTransformer'
import { useKonvaKeyboard } from '../composables/useKonvaKeyboard'
import { renderImages, syncImageNodes } from '../composables/useKonvaImages'
import { useKonvaViewport } from '../composables/useKonvaViewport'
import {
  calculateRowBounds,
  createRowShape,
  createRowSceneFunc,
  createRowHitFunc,
  createShapeNode,
  createTextNode,
  createAreaNode
} from '../composables/useKonvaRenderPrimitives'
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


// ==================== 常量配置 ====================

const SEAT_RADIUS = defaultSeatMapConfig.defaultSeatRadius
const SEAT_SPACING = defaultSeatMapConfig.defaultSeatSpacing


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

// 框选（通过 useKonvaSelection 管理）
let selection: ReturnType<typeof useKonvaSelection> | null = null

// Transformer + 统一拖拽（通过 useKonvaTransformer 管理）
let tfm: ReturnType<typeof useKonvaTransformer> | null = null

// 排扩展模式状态（始终开启）
const rowExpandState = {
  handles: [] as Konva.Rect[],
  previewLayer: null as Konva.Layer | null,
  activeRowId: null as string | null,
  activePosition: null as 'start' | 'end' | null,
  dragStartPos: null as { x: number, y: number } | null,
  previewSeats: [] as Konva.Circle[]
}

// 标志位：是否正在从 Transformer 同步数据（防止触发重绘）
let isSyncingFromTransformer = false

// 拖拽完成标志 - 用于区分拖拽和点击
let justDragged = false

// ==================== 绘制预览状态====================

// 当前绘制模式
const currentDrawingTool = ref<DrawingToolMode>('select')

// ==================== 座位绘制状态机（支持三种模式：单排/转折/多行）====================

type SeatDrawStep = 'idle' | 'first' | 'dragging' | 'segment_done'

// 单段数据
interface SeatSegment {
  start: Position
  end: Position
  angle: number  // 段的角度（弧度）
  seatCount: number  // 座位数量
  // 推算的最后一个座位中心位置（用于精确定位转折点）
  lastSeatPos?: Position
}

// 多行绘制数据
interface MultiRowPreview {
  baseRow: SeatSegment  // 第一排数据
  rowCount: number      // 行数
  rowSpacing: number    // 行间距
  angle: number         // 整体角度
  rowDirectionAngle: number  // 行排列方向角度（跟随鼠标）
}

const seatDrawStep = ref<SeatDrawStep>('idle')
const seatDrawPoints = ref<{
  first: Position | null
  current: Position | null
}>({ first: null, current: null })

// 已完成的段（用于多段转折绘制）
const completedSegments = ref<SeatSegment[]>([])

// 多行绘制预览数据
const multiRowPreview = ref<MultiRowPreview | null>(null)

// 是否正在拖拽中（用于区分拖拽模式vs点击模式）
const isDraggingSeat = ref(false)

// 拖拽检测阈值（像素）
const DRAG_THRESHOLD = 5

// 重置座位绘制状态
const resetSeatDrawingState = () => {
  seatDrawStep.value = 'idle'
  seatDrawPoints.value = { first: null, current: null }
  completedSegments.value = []
  multiRowPreview.value = null
  isDraggingSeat.value = false
}

// 判断当前是否为多段转折绘制模式
const isSegmentDrawingMode = (): boolean => {
  return currentDrawingTool.value === 'section'
}

// 判断当前是否为单排绘制模式
const isSingleRowDrawingMode = (): boolean => {
  return currentDrawingTool.value === 'row-straight'
}

// 判断当前是否为多行绘制模式
const isMultiRowDrawingMode = (): boolean => {
  return currentDrawingTool.value === 'section-diagonal'
}

// 设置当前绘制工具
const setDrawingTool = (tool: DrawingToolMode) => {
  // 如果切换工具，重置座位绘制状态
  if (currentDrawingTool.value !== tool) {
    resetSeatDrawingState()
  }
  currentDrawingTool.value = tool
  drawing.setTool(tool as any)
  clearDrawingPreview()
}

// 初始化绘制预览
const initDrawingPreview = () => {
  // 预览层已在 onMounted 中创建
}

// 键盘事件处理（通过 useKonvaKeyboard 管理）
let keyboard: ReturnType<typeof useKonvaKeyboard> | null = null

// 视口管理（通过 useKonvaViewport 管理）
let viewport: ReturnType<typeof useKonvaViewport> | null = null

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

  // 覆盖层：包含绘制预览、框选框、Transformer始终在最上层
  overlayLayer = new Konva.Layer()
  stage.add(overlayLayer)

  // 设置预览层（供 useKonvaDrawing 使用）
  setPreviewLayer(overlayLayer)

  // 拖拽临时层（只包含选中节点，优化400+节点性能）
  dragLayer = new Konva.Layer({
    listening: false,
    visible: false
  })
  stage.add(dragLayer)

  // 初始化 Transformer + 统一拖拽
  tfm = useKonvaTransformer({
    overlayLayer,
    mainLayer,
    dragLayer,
    stage,
    nodeMap,
    setIsSyncing: (val) => { isSyncingFromTransformer = val }
  })
  tfm.initTransformer()

  // 初始化框选
  selection = useKonvaSelection({
    stage,
    overlayLayer,
    nodeMap,
    onSelectionEnd: (result, additive) => {
      const { rowIds, seatIds, shapeIds, textIds, areaIds } = result
      if (additive) {
        if (rowIds.length) venueStore.selectedRowIds = [...new Set([...venueStore.selectedRowIds, ...rowIds])]
        if (seatIds.length) venueStore.selectedSeatIds = [...new Set([...venueStore.selectedSeatIds, ...seatIds])]
        if (shapeIds.length) venueStore.selectedShapeIds = [...new Set([...venueStore.selectedShapeIds, ...shapeIds])]
        if (textIds.length) venueStore.selectedTextIds = [...new Set([...venueStore.selectedTextIds, ...textIds])]
        if (areaIds.length) venueStore.selectedAreaIds = [...new Set([...venueStore.selectedAreaIds, ...areaIds])]
      } else {
        venueStore.selectedRowIds = rowIds
        venueStore.selectedSeatIds = seatIds
        venueStore.selectedShapeIds = shapeIds
        venueStore.selectedTextIds = textIds
        venueStore.selectedAreaIds = areaIds
      }
    }
  })
  selection.initSelectionRect()
  
  // 初始化键盘事件处理
  keyboard = useKonvaKeyboard({
    currentTool: currentDrawingTool.value,
    isDrawingMode: () => drawing.isDataDrivenTool.value,
    isSeatDrawingMode: () => isSingleRowDrawingMode() || isSegmentDrawingMode() || isMultiRowDrawingMode(),
    seatDrawStep: { get value() { return seatDrawStep.value } },
    resetSeatDrawingState,
    clearDrawingPreview,
    resetDrawingState: () => drawing.resetDrawingState()
  })
  
  // 初始化绘制预览
  initDrawingPreview()

  // 设置事件监听
  setupStageEvents()
  
  // 注册键盘事件
  window.addEventListener('keydown', keyboard.handleKeyDown)

  // 初始化视口管理
  viewport = useKonvaViewport({
    stage,
    mainLayer,
    nodeMap,
    onScaleChange: (scale) => { viewportState.scale = scale }
  })

  // 设置排扩展全局事件
  setupGlobalExpandEvents()

  // 初始渲染
  renderAll()
})

onUnmounted(() => {
  // 移除键盘事件监听
  if (keyboard) {
    window.removeEventListener('keydown', keyboard.handleKeyDown)
  }
  
  // 移除座位间距更新事件监听
  window.removeEventListener('seatSpacingUpdated', handleSeatSpacingUpdated)
  
  // 移除行间距更新事件监听
  window.removeEventListener('rowSpacingUpdated', handleRowSpacingUpdated)
  
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

// 监听图片列表变化，自动重绘
watch(() => venueStore.canvasImages, (newImages) => {
  if (isSyncingFromTransformer) return
  nextTick(() => {
    if (isSyncingFromTransformer) return
    syncImageNodes(newImages, getImageRenderOptions())
  })
}, { deep: true })

// 监听选中状态变化，更新选中效果和 Transformer
watch(() => [
  venueStore.selectedRowIds,
  venueStore.selectedSeatIds,
  venueStore.selectedShapeIds,
  venueStore.selectedTextIds,
  venueStore.selectedAreaIds,
  venueStore.selectedImageId
], () => {
  tfm?.updateSelectionVisuals()
  tfm?.updateTransformer()
  // 更新排座位的选中视觉效果（边框颜色）
  updateRowSelectionVisuals()
}, { deep: true })

// 座位间距更新事件处理函数
const handleSeatSpacingUpdated = () => {
  // 更新排座位的几何属性和选择框
  updateRowSelectionVisuals()
}

// 监听行间距更新事件
const handleRowSpacingUpdated = () => {
  // 重新渲染所有排以应用新的行间距
  renderAll()
  // 更新选择框以跟随新的排位置
  nextTick(() => {
    tfm?.updateTransformer(true)
  })
}

// 监听座位间距更新事件
window.addEventListener('seatSpacingUpdated', handleSeatSpacingUpdated)

// 监听行间距更新事件
window.addEventListener('rowSpacingUpdated', handleRowSpacingUpdated)

// 获取座位颜色的辅助函数
const getSeatColorForRow = (row: SeatRow) => (seat: Seat): string => {
  // categoryKey 为 0 表示未分类，返回中灰色
  if (seat.categoryKey === 0) return '#BDBDBD'
  const category = venueStore.venue.categories.find(c => String(c.key) === String(seat.categoryKey))
  return category?.color || '#9E9E9E'
}

// 更新排座位的选中视觉效果和几何属性
const updateRowSelectionVisuals = () => {
  if (!mainLayer) return
  
  venueStore.venue.sections.forEach(section => {
    section.rows.forEach(row => {
      const rowShape = nodeMap.get(row.id) as Konva.Shape
      if (rowShape && rowShape.getAttr('objectType') === 'row') {
        const isSelected = venueStore.selectedRowIds.includes(row.id)
        
        // 重新计算 bounds（座位位置可能已变化）
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
        row.seats.forEach((seat) => {
          minX = Math.min(minX, seat.x - SEAT_RADIUS)
          minY = Math.min(minY, seat.y - SEAT_RADIUS)
          maxX = Math.max(maxX, seat.x + SEAT_RADIUS)
          maxY = Math.max(maxY, seat.y + SEAT_RADIUS)
        })
        const width = maxX - minX
        const height = maxY - minY
        
        // 更新 shape 的几何属性
        rowShape.width(width)
        rowShape.height(height)
        rowShape.setAttr('hitMinX', minX)
        rowShape.setAttr('hitMinY', minY)
        rowShape.setAttr('hitMaxX', maxX)
        rowShape.setAttr('hitMaxY', maxY)
        
        // 重新设置 sceneFunc 以更新边框颜色
        rowShape.sceneFunc(createRowSceneFunc(row, getSeatColorForRow(row), isSelected, SEAT_RADIUS))
      }
    })
  })
  
  mainLayer.batchDraw()
  
  // 直接调用 updateTransformer(true)，它会调用 forceUpdate() 并刷新 overlayLayer
  // 这和点击选中时的路径完全一致
  tfm?.updateTransformer(true)
}

// ==================== 渲染主函数====================

const renderAll = () => {
  if (!mainLayer) return

  // 清空画布和节点映射
  mainLayer.destroyChildren()
  nodeMap.clear()

  // 渲染图片（在最底层）
  renderImages(getImageRenderOptions())

  // 渲染所有区域
  venueStore.venue.sections.forEach(section => {
    renderSection(section)
  })

  // 应用视口剔除
  viewport?.updateViewportCulling()

  // 更新选中装饰
  tfm?.updateSelectionVisuals()

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

// ==================== 图片渲染选项 ====================

const getImageRenderOptions = () => ({
  mainLayer,
  stage,
  nodeMap,
  tfm,
  isDrawingMode
})

// ==================== 渲染排====================

const renderRow = (row: SeatRow, section: Section) => {
  if (!mainLayer || row.seats.length === 0) return

  // 计算边界
  const bounds = calculateRowBounds(row, SEAT_RADIUS)

  // 获取座位颜色函数
  const getSeatColor = (seat: Seat): string => {
    // categoryKey 为 0 表示未分类，返回中灰色
    if (seat.categoryKey === 0) return '#BDBDBD'
    const category = venueStore.venue.categories.find(c => String(c.key) === String(seat.categoryKey))
    return category?.color || '#9E9E9E'
  }

  // 创建 Shape
  const rowShape = createRowShape(row, bounds, {
    seatRadius: SEAT_RADIUS,
    getSeatColor,
    isSelected: venueStore.selectedRowIds.includes(row.id),
    sectionId: section.id
  })

  // 设置绘制函数
  rowShape.sceneFunc(createRowSceneFunc(row, getSeatColor, venueStore.selectedRowIds.includes(row.id), SEAT_RADIUS))
  rowShape.hitFunc(createRowHitFunc())

  // 事件处理
  rowShape.on('click', (e) => {
    if (isDrawingMode()) return
    if (selection?.hasDragged) return
    e.cancelBubble = true
    const additive = e.evt.shiftKey
    venueStore.selectRow(row.id, additive)
    tfm?.updateTransformer(true)
  })

  rowShape.on('mouseenter', () => {
    if (stage && !isDrawingMode()) stage.container().style.cursor = 'pointer'
  })
  rowShape.on('mouseleave', () => {
    if (stage) stage.container().style.cursor = 'default'
  })

  rowShape.on('dragend', () => {
    if (tfm?.transformer?.isTransforming()) return
    venueStore.updateRow(row.id, {
      x: rowShape.x(),
      y: rowShape.y(),
      rotation: rowShape.rotation()
    })
  })

  mainLayer.add(rowShape)
  nodeMap.set(row.id, rowShape)
  
  // 如果排被选中，添加扩展手柄
  console.log('renderRow:', row.id, 'selected:', venueStore.selectedRowIds.includes(row.id), 'selectedRowIds:', venueStore.selectedRowIds)
  if (venueStore.selectedRowIds.includes(row.id) && row.seats.length > 0) {
    console.log('Adding expand handles for row:', row.id, 'at pos:', row.x, row.y)
    addExpandHandlesToRow(row, rowShape)
  }
}

// ==================== 排扩展手柄 ====================

/** 为排添加扩展手柄（使用本地坐标，设置和排相同的位置和旋转） */
function addExpandHandlesToRow(row: SeatRow, rowShape: Konva.Shape) {
  if (!mainLayer) return
  
  const firstSeat = row.seats[0]
  const lastSeat = row.seats[row.seats.length - 1]
  
  // 计算排的方向（基于座位位置）
  const dx = lastSeat.x - firstSeat.x
  const dy = lastSeat.y - firstSeat.y
  const dirX = dx / Math.sqrt(dx * dx + dy * dy) || 1
  const dirY = dy / Math.sqrt(dx * dx + dy * dy) || 0
  
  const handleSize = 16
  
  // 计算手柄位置
  const startX = (row.x || 0) + firstSeat.x - dirX * SEAT_RADIUS * 2 - handleSize / 2
  const startY = (row.y || 0) + firstSeat.y - dirY * SEAT_RADIUS * 2 - handleSize / 2
  const endX = (row.x || 0) + lastSeat.x + dirX * SEAT_RADIUS * 2 - handleSize / 2
  const endY = (row.y || 0) + lastSeat.y + dirY * SEAT_RADIUS * 2 - handleSize / 2
  
  console.log('Handle positions:', { startX, startY, endX, endY, rotation: row.rotation })
  
  // 起始端手柄 - 使用本地坐标，设置和排相同的位置和旋转
  const startHandle = new Konva.Rect({
    x: startX,
    y: startY,
    width: handleSize,
    height: handleSize,
    fill: '#ffffff',
    stroke: '#3b82f6',
    strokeWidth: 3,
    rotation: row.rotation || 0,
    name: 'expand-handle',
    draggable: false
  })
  startHandle.setAttr('rowId', row.id)
  startHandle.setAttr('position', 'start')
  
  // 结束端手柄
  const endHandle = new Konva.Rect({
    x: endX,
    y: endY,
    width: handleSize,
    height: handleSize,
    fill: '#ffffff',
    stroke: '#3b82f6',
    strokeWidth: 3,
    rotation: row.rotation || 0,
    name: 'expand-handle',
    draggable: false
  })
  endHandle.setAttr('rowId', row.id)
  endHandle.setAttr('position', 'end')
  
  // 添加事件
  setupHandleEvents(startHandle, row, 'start')
  setupHandleEvents(endHandle, row, 'end')
  
  // 添加到 mainLayer
  mainLayer.add(startHandle)
  mainLayer.add(endHandle)
  
  rowExpandState.handles.push(startHandle, endHandle)
  
  console.log('Handles added to mainLayer')
}

// ==================== 渲染形状 ====================

const renderShape = (shape: ShapeObject, section: Section) => {
  if (!mainLayer) return

  // 使用原子函数创建形状节点
  const konvaShape = createShapeNode(shape)
  if (!konvaShape) return

  konvaShape.setAttr('shapeData', shape)
    konvaShape.setAttr('sectionId', section.id)

    // 【关键修复】：mousedown 立即选中，统一拖拽系统接管移动
    konvaShape.on('mousedown', (e) => {
      if (e.evt.button !== 0) return
      e.cancelBubble = true
      
      const isAlreadySelected = venueStore.selectedShapeIds.includes(shape.id)
      if (!isAlreadySelected) {
        const additive = e.evt.shiftKey
        venueStore.selectShape(shape.id, additive)
        // 同步更新 Transformer，确保节点注册后再启动拖拽
        tfm?.updateTransformer(true)
      }
      // 启动统一拖拽（与 rowShape 保持一致）
      const pointer = stage!.getPointerPosition()!
      tfm?.startDragAll(pointer)
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

    // 禁用原生拖拽，由统一拖拽系统接管
    konvaShape.draggable(false)

    mainLayer.add(konvaShape)
    nodeMap.set(shape.id, konvaShape)
}

// ==================== 渲染文本 ====================

const renderText = (text: TextObject, section: Section) => {
  if (!mainLayer) return

  const konvaText = createTextNode(text)

  konvaText.setAttr('textData', text)
  konvaText.setAttr('sectionId', section.id)

  // 【关键修复】：mousedown 立即选中，统一拖拽系统接管移动
  konvaText.on('mousedown', (e) => {
    if (e.evt.button !== 0) return
    e.cancelBubble = true

    const isAlreadySelected = venueStore.selectedTextIds.includes(text.id)
    if (!isAlreadySelected) {
      const additive = e.evt.shiftKey
      venueStore.selectText(text.id, additive)
      // 同步更新 Transformer，确保节点注册后再启动拖拽
      tfm?.updateTransformer(true)
    }
    // 启动统一拖拽（与 shape 保持一致）
    const pointer = stage!.getPointerPosition()!
    tfm?.startDragAll(pointer)
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

  // 禁用原生拖拽，由统一拖拽系统接管
  konvaText.draggable(false)

  mainLayer.add(konvaText)
  nodeMap.set(text.id, konvaText)
}

// ==================== 渲染区域 ====================

const renderArea = (area: AreaObject, section: Section) => {
  if (!mainLayer || !area.points || area.points.length < 6) return

  const areaShape = createAreaNode(area)

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
    tfm?.updateTransformer(true)
    
    // 手动启动拖拽
    requestAnimationFrame(() => {
      if (tfm?.transformer && tfm.transformer.nodes().includes(areaShape)) {
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
    if (tfm?.transformer?.isTransforming()) return
    
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

// ==================== 事件处理 ====================

/**
 * 获取相对于Stage内部逻辑空间的坐）
 * 无论当前缩放Scale或Position如何，返回的坐标始终与原始数据对
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
    if (tfm?.transformer?.isTransforming()) return
    
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
      
      // 矩形/椭圆：开始拖拽绘制
      if (tool === 'draw_rect' || tool === 'draw_ellipse') {
        drawing.startDrawing(pos)
        return
      }

      // 座位绘制：分段式单击处理（在 click 事件中处理）
      if (tool === 'row-straight' || tool === 'section' || tool === 'section-diagonal') {
        // 分段式绘制在 click 事件中处理，这里不处理 mousedown
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
    if (tfm?.transformer && tfm.transformer.visible() && e.evt.button === 0 && !isDrawingMode()) {
      // 检测是否点击了旋转锚点）Transformer 手柄
      const targetName = (e.target as any)?.name?.() || ''
      const isRotater = targetName.includes('rotater')
      const isAnchor = targetName.includes('anchor') || targetName.includes('rotater')
      
      // 如果点击的是旋转锚点，让 Transformer 自己处理旋转
      if (isRotater) {
        return  // 不干预，）Transformer 处理旋转
      }
      
      const trRect = tfm?.transformer?.getClientRect()
      const insideTr = (
        pointer.x >= trRect.x &&
        pointer.x <= trRect.x + trRect.width &&
        pointer.y >= trRect.y &&
        pointer.y <= trRect.y + trRect.height
      )
      if (insideTr && !isAnchor) {
        // ）Transformer 框内且不是点击锚））启动统一拖拽
        tfm?.startDragAll(pointer, false)
        return  // 不触发框选或其他逻辑
      }
    }
    
    // H. 点击舞台空白））启动框）
    const target = e.target as any
    const isEmptyArea = target === stage || target === mainLayer || target === overlayLayer
    if (e.evt.button === 0 && isEmptyArea && !isDrawingMode()) {
      selection?.startBoxSelection(pointer)  // 使用屏幕坐标
    }
  })

  // 鼠标移动
  stage.on('mousemove', (e) => {
    // 统一拖拽模式优先处理
    if (tfm?.unifiedDragState.active) {
      const pointer = stage!.getPointerPosition()
      if (pointer) {
        tfm?.updateDragAll(pointer)
      }
      return
    }
    
    // 如果正在使用 Transformer 进行变换（旋）缩放），不干）
    if (tfm?.transformer?.isTransforming()) {
      return
    }

    // 使用不带参数）getStagePosition，自动处）scale ）offset
    const pos = getStagePosition()
    if (!pos) return
    
    // 获取屏幕坐标（用于框选）
    const pointer = stage!.getPointerPosition()
    if (!pointer) return
    
    // 座位绘制：支持三种模式（单排/转折/多行）
    if (isSingleRowDrawingMode() || isSegmentDrawingMode() || isMultiRowDrawingMode()) {
      if (seatDrawStep.value === 'idle') {
        // idle 状态：显示鼠标跟随的预览圆
        createSeatCursorPreview(pos)
        return
      } else if ((seatDrawStep.value === 'first' || seatDrawStep.value === 'dragging') && seatDrawPoints.value.first) {
        // first/dragging 状态：显示从起点到鼠标的排预览
        seatDrawPoints.value.current = pos
        if (isSegmentDrawingMode()) {
          // 多段转折模式：使用多段预览
          createMultiSegmentPreview(seatDrawPoints.value.first, pos, completedSegments.value)
        } else if (isMultiRowDrawingMode()) {
          // 多行模式：使用多行预览
          createMultiRowPreview(seatDrawPoints.value.first, pos)
        } else {
          // 单排模式：使用简单排预览
          createSeatRowPreview(seatDrawPoints.value.first, pos)
        }
        return
      } else if (seatDrawStep.value === 'segment_done') {
        // segment_done 状态：处理多段/多行预览
        if (isSegmentDrawingMode() && completedSegments.value.length > 0) {
          // 多段转折模式：以上一段终点为起点，预览新段
          const lastSegment = completedSegments.value[completedSegments.value.length - 1]
          const segmentStart = lastSegment.lastSeatPos || lastSegment.end
          seatDrawPoints.value.current = pos
          createMultiSegmentPreview(segmentStart, pos, completedSegments.value)
        } else if (isMultiRowDrawingMode() && multiRowPreview.value) {
          // 多行模式：更新多行预览（调整行数）
          seatDrawPoints.value.current = pos
          createMultiRowPreview(seatDrawPoints.value.first!, pos)
        }
        return
      }
    }

    // 绘制模式预览（矩形、椭圆等拖拽式绘制）
    if (isDrawingMode() && drawing.previewState.value.isActive) {
      drawing.updateDrawing(pos)
      const startPos = drawing.previewState.value.startPos
      if (!startPos) return
      
      switch (currentDrawingTool.value) {
        case 'draw_rect':
          createRectPreview(startPos, pos)
          break
        case 'draw_ellipse':
          createEllipsePreview(startPos, pos)
          break
      }
      return
    }
    
    // 多边区域预览
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
      viewport?.updateViewportCulling()
      mainLayer?.batchDraw()
    } else if (selection?.isSelecting) {
      // 更新框选 - 使用屏幕坐标
      selection.updateBoxSelection(pointer)
    }
  })

  // 鼠标释放
  stage.on('mouseup', (e) => {
    // 座位绘制模式：检测是否为拖拽
    if ((isSingleRowDrawingMode() || isSegmentDrawingMode() || isMultiRowDrawingMode()) && seatDrawStep.value === 'first' && seatDrawPoints.value.first) {
      const endPos = getStagePosition()
      if (endPos) {
        // 计算移动距离
        const dx = endPos.x - seatDrawPoints.value.first.x
        const dy = endPos.y - seatDrawPoints.value.first.y
        const dist = Math.sqrt(dx * dx + dy * dy)

        if (dist > DRAG_THRESHOLD) {
          // 拖拽模式
          isDraggingSeat.value = true

          if (isSegmentDrawingMode()) {
            // 多段转折模式：保存第一段，进入 segment_done 状态
            saveSegment(seatDrawPoints.value.first, endPos)
            seatDrawStep.value = 'segment_done'
          } else if (isSingleRowDrawingMode()) {
            // 单排模式：直接提交
            submitSeatRow(seatDrawPoints.value.first, endPos)
            resetSeatDrawingState()
          } else if (isMultiRowDrawingMode()) {
            // 多行模式：进入多行预览状态，等待确认
            seatDrawStep.value = 'segment_done'
          }
          return
        }
        // 点击模式：移动距离小，保持 first 状态，等待第二次点击
        // 不重置状态，保留起点小圆
      }
      return
    }

    // segment_done 状态：mouseup 不处理，等待 click 提交（多段/多行模式）
    if ((isSegmentDrawingMode() || isMultiRowDrawingMode()) && seatDrawStep.value === 'segment_done') {
      // 不处理，让 click 事件处理提交
      return
    }
    
    // 统一拖拽结束优先处理
    if (tfm?.unifiedDragState.active) {
      justDragged = tfm.endDragAll() ?? false
      return
    }
    
    // 绘制模式：完成绘制（矩形、椭圆等拖拽式绘制）
    if (isDrawingMode() && drawing.previewState.value.isActive) {
      const startPos = drawing.previewState.value.startPos
      // 使用不带参数的 getStagePosition，自动处理 scale 和 offset
      const endPos = getStagePosition()

      if (startPos && endPos) {
        switch (currentDrawingTool.value) {
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
    } else if (selection?.isSelecting) {
      selection.endBoxSelection(e.evt.shiftKey)
    }
  })

  // 鼠标按下事件
  stage.on('mousedown', (e) => {
    // 座位绘制模式：处理第一次按下
    if ((isSingleRowDrawingMode() || isSegmentDrawingMode() || isMultiRowDrawingMode()) && seatDrawStep.value === 'idle') {
      const pos = getStagePosition()
      if (!pos) return

      // 记录起点，进入 first 状态
      seatDrawPoints.value.first = pos
      seatDrawStep.value = 'first'
      isDraggingSeat.value = false
      clearDrawingPreview()
      // 重置多排预览数据
      multiRowPreview.value = null
      // 立即绘制起点小圆
      createSeatCursorPreview(pos)
      return
    }
  })

  // 点击事件（用于选中对象和座位绘制确认）
  stage.on('click', (e) => {
    // 座位绘制模式：第二次点击确认
    if (isSingleRowDrawingMode() || isSegmentDrawingMode() || isMultiRowDrawingMode()) {
      // 如果是拖拽模式（有移动过），不处理 click
      if (isDraggingSeat.value) {
        isDraggingSeat.value = false
        return
      }

      // 单排模式：第二次点击提交
      if (isSingleRowDrawingMode() && seatDrawStep.value === 'first' && seatDrawPoints.value.first && seatDrawPoints.value.current) {
        const pos = getStagePosition()
        if (!pos) return

        // 第二次单击：确定终点，提交座位排
        submitSeatRow(seatDrawPoints.value.first, pos)
        // 重置状态，允许继续绘制下一排
        resetSeatDrawingState()
        return
      }

      // 多行模式：segment_done 状态任意单击提交
      if (isMultiRowDrawingMode() && seatDrawStep.value === 'segment_done' && multiRowPreview.value) {
        // 任意位置单击都提交多行
        submitMultiRows()
        return
      }

      // 多段转折模式：segment_done 状态在终点座位单击提交
      if (isSegmentDrawingMode() && seatDrawStep.value === 'segment_done' && completedSegments.value.length > 0) {
        const clickPos = getStagePosition()
        if (!clickPos) return

        const lastSegment = completedSegments.value[completedSegments.value.length - 1]
        const lastSeatPos = lastSegment.lastSeatPos || lastSegment.end

        // 检查点击位置是否接近最后一段的最后一个座位（关键节点）
        const dx = clickPos.x - lastSeatPos.x
        const dy = clickPos.y - lastSeatPos.y
        const dist = Math.sqrt(dx * dx + dy * dy)

        if (dist < SEAT_RADIUS * 3) {
          // 在关键节点附近单击：提交所有段
          submitAllSegments()
        } else {
          // 在其他位置单击：保存新段并继续
          saveSegment(lastSeatPos, clickPos)
        }
        return
      }
    }

    // 其他绘制模式下不处理选中
    if (isDrawingMode()) return
    
    // 如果刚完成框选（有拖动），不清空选择
    if (selection?.hasDragged) {
      selection.resetSelectionState()
      return
    }
    
    // 单击空白处不做任何操作（Seats.io 风格：用 Esc 键清空选择）
    if (e.target === stage) {
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
}

// ==================== Transformer + 拖拽（已迁移到 useKonvaTransformer）====================
// 见 onMounted 中的 tfm 初始化

// ==================== 框选功能（已迁移到 useKonvaSelection）====================
// 见 onMounted 中的 selection 初始化


// ==================== 绘制功能（已迁移到 useKonvaDrawing）====================

// 注意：以下函数现在作为代理，实际实现已在 useKonvaDrawing.ts 中

// ---------- 座位排绘制 ----------

/** 创建鼠标跟随的预览圆（idle 状态） */
const createSeatCursorPreview = (pos: Position) => {
  _createSeatCursorPreview(pos)
}

/** 创建座位排预览 */
const createSeatRowPreview = (startPos: Position, endPos: Position) => {
  const { ux, uy, dist } = getUnitVector(startPos, endPos)

  if (dist < drawing.SEAT_SPACING) return

  const count = Math.max(2, Math.floor(dist / drawing.SEAT_SPACING) + 1)

  // 清除旧预览
  clearDrawingPreview()

  // 绘制辅助线
  const line = new Konva.Line({
    points: [startPos.x, startPos.y, endPos.x, endPos.y],
    stroke: '#3b82f6',
    strokeWidth: 1.5,
    dash: [12, 6],
    listening: false
  })
  addPreviewElement(line)

  // 生成座位数据（局部坐标）
  const seats: { x: number; y: number }[] = []
  for (let i = 0; i < count; i++) {
    seats.push({
      x: i * drawing.SEAT_SPACING,  
      y: 0
    })
  }
  
  // 计算边界（包含座位半径）
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
  seats.forEach((seat) => {
    minX = Math.min(minX, seat.x - SEAT_RADIUS)
    minY = Math.min(minY, seat.y - SEAT_RADIUS)
    maxX = Math.max(maxX, seat.x + SEAT_RADIUS)
    maxY = Math.max(maxY, seat.y + SEAT_RADIUS)
  })
  
  const width = maxX - minX
  const height = maxY - minY
  
  // 计算旋转角度
  const angle = Math.atan2(uy, ux) * 180 / Math.PI

  // 绘制座位预览
  const shape = new Konva.Shape({
    x: startPos.x,  
    y: startPos.y,
    width: width,
    height: height,
    rotation: angle,
    listening: false,
    perfectDrawEnabled: false
  })
  
  shape.sceneFunc((ctx) => {
    // 座位圆圈 - 浅蓝色填充 + 蓝色边框
    seats.forEach((seat, index) => {
      ctx.beginPath()
      ctx.arc(seat.x, seat.y, SEAT_RADIUS, 0, Math.PI * 2)
      
      // 统一填充：浅蓝色
      ctx.fillStyle = '#dbeafe'
      ctx.fill()
      
      if (index === 0) {
        // 第一个座位：粗边框（2px），表示起点
        ctx.strokeStyle = '#3b82f6'
        ctx.lineWidth = 2
        ctx.stroke()
      } else {
        // 其他座位：标准边框（1px）
        ctx.strokeStyle = '#3b82f6'
        ctx.lineWidth = 1
        ctx.stroke()
      }
    })
  })
  addPreviewElement(shape)
  overlayLayer?.batchDraw()
}

/** 创建多段座位排预览（支持转折）- 优化版本 */
const createMultiSegmentPreview = (
  currentStart: Position,
  currentEnd: Position,
  segments: SeatSegment[]
) => {
  clearDrawingPreview()

  // 1. 批量绘制已完成的段（合并为一个 Shape 减少渲染开销）
  if (segments.length > 0) {
    const completedShape = new Konva.Shape({
      listening: false,
      perfectDrawEnabled: false
    })

    completedShape.sceneFunc((ctx) => {
      segments.forEach((segment, segIndex) => {
        const isLastSegment = segIndex === segments.length - 1

        ctx.save()
        ctx.translate(segment.start.x, segment.start.y)
        ctx.rotate(segment.angle)

        for (let i = 0; i < segment.seatCount; i++) {
          const x = i * drawing.SEAT_SPACING
          const y = 0

          ctx.beginPath()
          ctx.arc(x, y, SEAT_RADIUS, 0, Math.PI * 2)

          // 关键节点判断：最后一段的最后一个座位，或非第一段的第一个座位
          const isKeyNode = (isLastSegment && i === segment.seatCount - 1) || (i === 0 && segIndex > 0)

          if (isKeyNode) {
            // 关键节点：白色填充 + 蓝色边框（与单排起点一致）
            ctx.fillStyle = '#ffffff'
            ctx.fill()
            ctx.strokeStyle = '#3b82f6'
            ctx.lineWidth = 2
            ctx.stroke()
          } else {
            // 普通座位：浅蓝色填充 + 蓝色边框
            ctx.fillStyle = '#dbeafe'
            ctx.fill()
            ctx.strokeStyle = '#3b82f6'
            ctx.lineWidth = 1
            ctx.stroke()
          }
        }

        ctx.restore()
      })
    })
    addPreviewElement(completedShape)
  }

  // 2. 绘制当前预览段
  const { ux, uy, dist } = getUnitVector(currentStart, currentEnd)
  if (dist >= drawing.SEAT_SPACING) {
    const count = Math.max(2, Math.floor(dist / drawing.SEAT_SPACING) + 1)
    const angle = Math.atan2(uy, ux)

    const previewShape = new Konva.Shape({
      listening: false,
      perfectDrawEnabled: false
    })

    previewShape.sceneFunc((ctx) => {
      ctx.save()
      ctx.translate(currentStart.x, currentStart.y)
      ctx.rotate(angle)

      for (let i = 0; i < count; i++) {
        const x = i * drawing.SEAT_SPACING
        const y = 0

        ctx.beginPath()
        ctx.arc(x, y, SEAT_RADIUS, 0, Math.PI * 2)

        // 第一个座位：关键节点样式（白色填充+蓝色边框）
        if (i === 0) {
          ctx.fillStyle = '#ffffff'
          ctx.fill()
          ctx.strokeStyle = '#3b82f6'
          ctx.lineWidth = 2
          ctx.stroke()
        } else if (i === count - 1) {
          // 最后一个座位：可点击提交的关键节点（绿色边框提示）
          ctx.fillStyle = '#dbeafe'
          ctx.fill()
          ctx.strokeStyle = '#22c55e'  // 绿色边框表示可点击
          ctx.lineWidth = 2
          ctx.stroke()
        } else {
          // 其他座位：标准样式
          ctx.fillStyle = '#dbeafe'
          ctx.fill()
          ctx.strokeStyle = '#3b82f6'
          ctx.lineWidth = 1
          ctx.stroke()
        }
      }

      ctx.restore()
    })
    addPreviewElement(previewShape)
  }

  overlayLayer?.batchDraw()
}

/** 创建多行座位预览（一个Shape绘制所有行）- seats.io风格 */
const createMultiRowPreview = (startPos: Position, endPos: Position) => {
  clearDrawingPreview()

  // 计算第一排数据（实时计算，不缓存）
  const { ux, uy, dist } = getUnitVector(startPos, endPos)
  if (dist < drawing.SEAT_SPACING) return

  const seatCount = Math.max(2, Math.floor(dist / drawing.SEAT_SPACING) + 1)
  const angle = Math.atan2(uy, ux)

  // 在 segment_done 状态下，使用已保存的第一排数据，只更新行数
  let rowCount = 1
  let rowSpacing = ROW_SPACING
  let baseRow = { start: startPos, end: endPos, angle, seatCount }

  // 计算行方向角度（默认垂直于第一排）
  let rowDirectionAngle = baseRow.angle + Math.PI / 2

  if (seatDrawStep.value === 'segment_done' && multiRowPreview.value) {
    // 使用已保存的第一排数据
    baseRow = multiRowPreview.value.baseRow
    rowSpacing = multiRowPreview.value.rowSpacing

    // 计算第一排最后一个座位位置
    const lastSeatLocalX = (baseRow.seatCount - 1) * drawing.SEAT_SPACING
    const firstRowEndX = baseRow.start.x + lastSeatLocalX * Math.cos(baseRow.angle)
    const firstRowEndY = baseRow.start.y + lastSeatLocalX * Math.sin(baseRow.angle)

    // 计算鼠标相对于第一排终点的方向
    const dx = endPos.x - firstRowEndX
    const dy = endPos.y - firstRowEndY
    const dist = Math.sqrt(dx * dx + dy * dy)

    // 根据距离计算行数
    rowCount = Math.max(1, Math.floor(dist / rowSpacing) + 1)

    // 根据鼠标方向计算行排列角度
    if (dist > 5) {
      rowDirectionAngle = Math.atan2(dy, dx)
    }
  }

  // 保存预览数据
  multiRowPreview.value = {
    baseRow,
    rowCount,
    rowSpacing,
    angle: baseRow.angle,
    rowDirectionAngle
  }

  const preview = multiRowPreview.value
  if (!preview) return

  // 使用鼠标方向作为行排列方向
  const perpAngle = preview.rowDirectionAngle

  // 使用一个 Shape 绘制所有行
  const shape = new Konva.Shape({
    listening: false,
    perfectDrawEnabled: false
  })

  shape.sceneFunc((ctx) => {
    for (let row = 0; row < preview.rowCount; row++) {
      // 计算该行的起点（从第一排起点沿行方向偏移）
      const rowOffsetX = row * preview.rowSpacing * Math.cos(perpAngle)
      const rowOffsetY = row * preview.rowSpacing * Math.sin(perpAngle)
      const rowStartX = preview.baseRow.start.x + rowOffsetX
      const rowStartY = preview.baseRow.start.y + rowOffsetY

      ctx.save()
      ctx.translate(rowStartX, rowStartY)
      ctx.rotate(preview.angle)

      for (let i = 0; i < preview.baseRow.seatCount; i++) {
        const x = i * drawing.SEAT_SPACING
        const y = 0

        ctx.beginPath()
        ctx.arc(x, y, SEAT_RADIUS, 0, Math.PI * 2)

        // 第一排第一个座位：白色填充（起点标记）
        if (row === 0 && i === 0) {
          ctx.fillStyle = '#ffffff'
          ctx.fill()
          ctx.strokeStyle = '#3b82f6'
          ctx.lineWidth = 2
          ctx.stroke()
        } else if (row === preview.rowCount - 1 && i === preview.baseRow.seatCount - 1) {
          // 最后一排最后一个座位：绿色边框（可点击提交）
          ctx.fillStyle = '#dbeafe'
          ctx.fill()
          ctx.strokeStyle = '#22c55e'
          ctx.lineWidth = 2
          ctx.stroke()
        } else {
          // 其他座位：标准样式
          ctx.fillStyle = '#dbeafe'
          ctx.fill()
          ctx.strokeStyle = '#3b82f6'
          ctx.lineWidth = 1
          ctx.stroke()
        }
      }

      ctx.restore()
    }
  })

  addPreviewElement(shape)
  overlayLayer?.batchDraw()
}

/** 保存当前段到 completedSegments */
const saveSegment = (startPos: Position, endPos: Position) => {
  const { ux, uy, dist } = getUnitVector(startPos, endPos)
  if (dist < drawing.SEAT_SPACING) return

  const count = Math.max(2, Math.floor(dist / drawing.SEAT_SPACING) + 1)
  const angle = Math.atan2(uy, ux)

  // 推算最后一个座位的精确中心位置（不是鼠标位置）
  const lastSeatLocalX = (count - 1) * drawing.SEAT_SPACING
  const lastSeatPos = {
    x: startPos.x + lastSeatLocalX * Math.cos(angle),
    y: startPos.y + lastSeatLocalX * Math.sin(angle)
  }

  // 保存段数据
  completedSegments.value.push({
    start: startPos,
    end: endPos,
    angle,
    seatCount: count,
    lastSeatPos  // 记录精确的最后一个座位位置
  })
}

/** 计算多段座位排的所有座位坐标（相对row起点的局部坐标） */
const calculateMultiSegmentSeats = (
  segments: SeatSegment[],
  seatSpacing: number,
  seatRadius: number
): { seats: { x: number; y: number }[]; segmentIndices: number[] } => {
  if (segments.length === 0) return { seats: [], segmentIndices: [] }

  const seats: { x: number; y: number }[] = []
  const segmentIndices: number[] = [0]  // 第一个座位索引为0，总是关键节点

  // 以第一段的起点作为row的参考原点
  const rowOrigin = segments[0].start

  let currentGlobalPos = { ...rowOrigin }

  segments.forEach((segment, segIndex) => {
    // 计算段起点相对于row原点的偏移
    const segmentOffsetX = segment.start.x - rowOrigin.x
    const segmentOffsetY = segment.start.y - rowOrigin.y

    // 生成该段的座位
    for (let i = 0; i < segment.seatCount; i++) {
      // 座位在段内的局部位置
      const localX = i * seatSpacing

      // 转换为全局坐标
      const globalX = segment.start.x + localX * Math.cos(segment.angle)
      const globalY = segment.start.y + localX * Math.sin(segment.angle)

      // 转换为相对row原点的局部坐标
      seats.push({
        x: globalX - rowOrigin.x + seatRadius,
        y: globalY - rowOrigin.y + seatRadius
      })
    }

    // 记录下一段的起点索引（如果不是最后一段）
    if (segIndex < segments.length - 1) {
      // 下一段的起点是当前段的最后一个座位
      segmentIndices.push(seats.length)
    }

    // 更新当前全局位置到下一段的起点（当前段最后一个座位）
    const lastSeatLocalX = (segment.seatCount - 1) * seatSpacing
    currentGlobalPos = {
      x: segment.start.x + lastSeatLocalX * Math.cos(segment.angle),
      y: segment.start.y + lastSeatLocalX * Math.sin(segment.angle)
    }
  })

  return { seats, segmentIndices }
}

/** 提交所有段到 store */
const submitAllSegments = () => {
  if (completedSegments.value.length === 0) return

  // 计算所有座位和关键节点
  const { seats: seatPositions, segmentIndices } = calculateMultiSegmentSeats(
    completedSegments.value,
    drawing.SEAT_SPACING,
    SEAT_RADIUS
  )

  if (seatPositions.length === 0) return

  // 生成座位对象
  const seats: Seat[] = seatPositions.map((pos, index) => ({
    id: generateId(),
    label: '',  // 默认空标签
    x: pos.x,
    y: pos.y,
    categoryKey: 0,  // 默认未分类（灰色）
    status: 'available',
    objectType: 'seat'
  }))

  // 提交到store
  const sectionId = getOrCreateDefaultSection()
  const firstSegment = completedSegments.value[0]

  venueStore.addRow(sectionId, {
    label: '',
    seats,
    x: firstSegment.start.x,
    y: firstSegment.start.y,
    rotation: 0,  // 多段排不使用整体旋转
    curve: 0,
    seatSpacing: drawing.SEAT_SPACING,
    segmentIndices  // 记录关键节点
  })

  resetSeatDrawingState()
}

/** 提交多行座位到 store（拆分为多排） */
const submitMultiRows = () => {
  if (!multiRowPreview.value) return

  const preview = multiRowPreview.value
  const sectionId = getOrCreateDefaultSection()

  // 使用行方向角度计算偏移向量
  const dirX = Math.cos(preview.rowDirectionAngle)
  const dirY = Math.sin(preview.rowDirectionAngle)

  // 逐行提交
  for (let row = 0; row < preview.rowCount; row++) {
    // 计算该行的起点（沿行方向偏移）
    const rowOffsetX = row * preview.rowSpacing * dirX
    const rowOffsetY = row * preview.rowSpacing * dirY
    const rowStartX = preview.baseRow.start.x + rowOffsetX
    const rowStartY = preview.baseRow.start.y + rowOffsetY

    // 生成该行的座位
    const seats: Seat[] = []
    for (let i = 0; i < preview.baseRow.seatCount; i++) {
      seats.push({
        id: generateId(),
        label: '',  // 默认空标签
        x: i * drawing.SEAT_SPACING + SEAT_RADIUS,
        y: SEAT_RADIUS,
        categoryKey: 0,  // 默认未分类（灰色）
        status: 'available',
        objectType: 'seat'
      })
    }

    // 提交每一排
    venueStore.addRow(sectionId, {
      label: '',
      seats,
      x: rowStartX,
      y: rowStartY,
      rotation: preview.angle * 180 / Math.PI,
      curve: 0,
      seatSpacing: drawing.SEAT_SPACING
    })
  }

  resetSeatDrawingState()
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
  
  // 生成座位（使用局部坐标，偏移半径使 minX=0）
  const seats: Seat[] = []
  for (let i = 0; i < count; i++) {
    seats.push({
      id: generateId(),
      label: '',  // 默认空标签
      x: i * drawing.SEAT_SPACING + SEAT_RADIUS,
      y: SEAT_RADIUS,
      categoryKey: 0,  // 默认未分类（灰色）
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
  const isNearStart = drawing.isNearStartPoint(currentPos)
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
  const relativePoints = toRelativePoints(points, center)
  
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
    viewport?.updateViewportCulling()
    mainLayer?.batchDraw()
  },
  getViewport: () => viewport?.getViewportBounds(),
  updateViewportCulling: () => viewport?.updateViewportCulling(),
  // 绘制工具
  setDrawingTool,
  currentDrawingTool,
  // 删除
  deleteSelected: () => keyboard?.deleteSelectedObjects(),
  // 清除绘制状态
  clearDrawing: () => {
    clearDrawingPreview()
    drawing.resetDrawingState()
  }
})

// ==================== 排扩展功能 ====================

/** 清除扩展手柄 */
function clearExpandHandles() {
  rowExpandState.handles.forEach(handle => handle.destroy())
  rowExpandState.handles = []
  clearExpandPreview()
  mainLayer?.batchDraw()
}

/** 设置手柄事件 */
function setupHandleEvents(handle: Konva.Rect, row: SeatRow, position: 'start' | 'end') {
  handle.on('mouseenter', () => {
    handle.stroke('#2563eb')
    handle.scale({ x: 1.2, y: 1.2 })
    stage!.container().style.cursor = 'ew-resize'
    mainLayer?.batchDraw()
  })
  
  handle.on('mouseleave', () => {
    handle.stroke('#3b82f6')
    handle.scale({ x: 1, y: 1 })
    stage!.container().style.cursor = 'default'
    mainLayer?.batchDraw()
  })
  
  handle.on('mousedown', (e) => {
    e.cancelBubble = true
    rowExpandState.activeRowId = row.id
    rowExpandState.activePosition = position
    rowExpandState.dragStartPos = stage!.getPointerPosition()!
  })
}

/** 清除扩展预览 */
function clearExpandPreview() {
  rowExpandState.previewSeats.forEach(seat => seat.destroy())
  rowExpandState.previewSeats = []
}

/** 更新扩展预览 */
function updateExpandPreview(rowId: string, position: 'start' | 'end', seatCount: number) {
  clearExpandPreview()
  if (seatCount <= 0 || !overlayLayer) return
  
  const row = venueStore.selectedRows.find(r => r.id === rowId)
  if (!row) return
  
  const rotation = (row.rotation || 0) * Math.PI / 180
  const dirX = Math.cos(rotation)
  const dirY = Math.sin(rotation)
  const seatSpacing = row.seatSpacing || SEAT_SPACING
  
  // 计算起始位置
  let startX: number, startY: number
  if (position === 'start') {
    const firstSeat = row.seats[0]
    startX = (row.x || 0) + (firstSeat?.x || 0) * dirX - (firstSeat?.y || 0) * dirY
    startY = (row.y || 0) + (firstSeat?.x || 0) * dirY + (firstSeat?.y || 0) * dirX
    // 向外扩展，所以反向
  } else {
    const lastSeat = row.seats[row.seats.length - 1]
    startX = (row.x || 0) + (lastSeat?.x || 0) * dirX - (lastSeat?.y || 0) * dirY
    startY = (row.y || 0) + (lastSeat?.x || 0) * dirY + (lastSeat?.y || 0) * dirX
  }
  
  // 创建预览座位（虚线样式）
  for (let i = 1; i <= seatCount; i++) {
    const offset = i * seatSpacing
    const actualOffset = position === 'start' ? -offset : offset
    
    const previewSeat = new Konva.Circle({
      x: startX + actualOffset * dirX,
      y: startY + actualOffset * dirY,
      radius: SEAT_RADIUS,
      fill: 'transparent',
      stroke: '#3b82f6',
      strokeWidth: 1.5,
      dash: [4, 4]
    })
    
    overlayLayer.add(previewSeat)
    rowExpandState.previewSeats.push(previewSeat)
  }
  
  overlayLayer.batchDraw()
}

// 在 stage 上添加全局鼠标事件处理拖拽
function setupGlobalExpandEvents() {
  if (!stage) return
  
  stage.on('mousemove', () => {
    if (!rowExpandState.activeRowId || !rowExpandState.dragStartPos) return
    
    const currentPos = stage!.getPointerPosition()!
    const dx = currentPos.x - rowExpandState.dragStartPos.x
    const dy = currentPos.y - rowExpandState.dragStartPos.y
    
    // 计算沿排方向的拖拽距离
    const row = venueStore.selectedRows.find(r => r.id === rowExpandState.activeRowId)
    if (!row) return
    
    const rotation = (row.rotation || 0) * Math.PI / 180
    const dirX = Math.cos(rotation)
    const dirY = Math.sin(rotation)
    
    // 投影到排方向
    const dragDist = dx * dirX + dy * dirY
    const absDist = Math.abs(dragDist)
    
    const seatSpacing = row.seatSpacing || SEAT_SPACING
    const seatCount = Math.floor(absDist / seatSpacing)
    
    updateExpandPreview(rowExpandState.activeRowId, rowExpandState.activePosition!, seatCount)
  })
  
  stage.on('mouseup', () => {
    if (!rowExpandState.activeRowId) return
    
    // 计算最终添加的座位数
    const previewCount = rowExpandState.previewSeats.length
    if (previewCount > 0) {
      venueStore.expandRow(rowExpandState.activeRowId, rowExpandState.activePosition!, previewCount)
      // 重新渲染（会自动添加手柄）
      renderAll()
    }
    
    // 重置状态
    rowExpandState.activeRowId = null
    rowExpandState.activePosition = null
    rowExpandState.dragStartPos = null
    clearExpandPreview()
  })
}
</script>

<style scoped>
.konva-container {
  width: 100%;
  height: 100%;
  overflow: hidden;
}
</style>












