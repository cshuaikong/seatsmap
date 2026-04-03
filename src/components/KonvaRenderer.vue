<template>
  <div ref="containerRef" class="konva-container"></div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, nextTick } from 'vue'
import Konva from 'konva'
import { useVenueStore } from '../stores/venueStore'
import type { SeatRow, Seat, Section, ShapeObject, TextObject, AreaObject, CanvasImage, Position } from '../types'
import { useDrawing, type DrawingToolMode, getUnitVector, generateSeatsAlongLine, calculateBoundingBox, calculatePolygonCenter, toRelativePoints } from '../composables/useKonvaDrawing'
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

// 标志位：是否正在从 Transformer 同步数据（防止触发重绘）
let isSyncingFromTransformer = false

// 拖拽完成标志 - 用于区分拖拽和点击
let justDragged = false

// ==================== 绘制预览状态====================

// 当前绘制模式
const currentDrawingTool = ref<DrawingToolMode>('select')

// ==================== 座位绘制状态机（支持拖拽/点击混合模式）====================

type SeatDrawStep = 'idle' | 'first' | 'dragging'

const seatDrawStep = ref<SeatDrawStep>('idle')
const seatDrawPoints = ref<{
  first: Position | null
  current: Position | null
}>({ first: null, current: null })

// 是否正在拖拽中（用于区分拖拽模式vs点击模式）
const isDraggingSeat = ref(false)

// 拖拽检测阈值（像素）
const DRAG_THRESHOLD = 5

// 重置座位绘制状态
const resetSeatDrawingState = () => {
  seatDrawStep.value = 'idle'
  seatDrawPoints.value = { first: null, current: null }
  isDraggingSeat.value = false
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

  // 初始渲染
  renderAll()
})

onUnmounted(() => {
  // 移除键盘事件监听
  if (keyboard) {
    window.removeEventListener('keydown', keyboard.handleKeyDown)
  }
  
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
}, { deep: true })

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
      if (tool === 'draw_seat') {
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
    
    // 座位绘制：支持拖拽/点击混合模式
    if (currentDrawingTool.value === 'draw_seat') {
      if (seatDrawStep.value === 'idle') {
        // idle 状态：显示鼠标跟随的预览圆
        createSeatCursorPreview(pos)
        return
      } else if ((seatDrawStep.value === 'first' || seatDrawStep.value === 'dragging') && seatDrawPoints.value.first) {
        // first/dragging 状态：显示从起点到鼠标的排预览
        seatDrawPoints.value.current = pos
        createSeatRowPreview(seatDrawPoints.value.first, pos)
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
    if (currentDrawingTool.value === 'draw_seat' && seatDrawStep.value === 'first' && seatDrawPoints.value.first) {
      const endPos = getStagePosition()
      if (endPos) {
        // 计算移动距离
        const dx = endPos.x - seatDrawPoints.value.first.x
        const dy = endPos.y - seatDrawPoints.value.first.y
        const dist = Math.sqrt(dx * dx + dy * dy)
        
        if (dist > DRAG_THRESHOLD) {
          // 拖拽模式：移动距离超过阈值，提交座位排
          isDraggingSeat.value = true
          submitSeatRow(seatDrawPoints.value.first, endPos)
          resetSeatDrawingState()
          return
        }
        // 点击模式：移动距离小，保持 first 状态，等待第二次点击
        // 不重置状态，保留起点小圆
      }
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
    if (currentDrawingTool.value === 'draw_seat' && seatDrawStep.value === 'idle') {
      const pos = getStagePosition()
      if (!pos) return

      // 记录起点，进入 first 状态
      seatDrawPoints.value.first = pos
      seatDrawStep.value = 'first'
      isDraggingSeat.value = false
      clearDrawingPreview()
      // 立即绘制起点小圆
      createSeatCursorPreview(pos)
      return
    }
  })

  // 点击事件（用于选中对象和座位绘制确认）
  stage.on('click', (e) => {
    // 座位绘制模式：第二次点击确认
    if (currentDrawingTool.value === 'draw_seat') {
      // 如果是拖拽模式（有移动过），不处理 click
      if (isDraggingSeat.value) {
        isDraggingSeat.value = false
        return
      }
      
      // 忽略第一次点击（刚从 idle 进入 first 状态）
      // 通过检查是否有 current 点来判断是否是第二次点击
      if (seatDrawStep.value === 'first' && seatDrawPoints.value.first && seatDrawPoints.value.current) {
        const pos = getStagePosition()
        if (!pos) return
        
        // 第二次单击：确定终点，提交座位排
        submitSeatRow(seatDrawPoints.value.first, pos)
        // 重置状态，允许继续绘制下一排
        resetSeatDrawingState()
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
    dash: [6, 6],
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
      label: String(i + 1),
      x: i * drawing.SEAT_SPACING + SEAT_RADIUS,
      y: SEAT_RADIUS,
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
</script>

<style scoped>
.konva-container {
  width: 100%;
  height: 100%;
  overflow: hidden;
}
</style>












