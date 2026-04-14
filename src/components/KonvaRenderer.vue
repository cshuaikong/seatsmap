<template>
  <div ref="containerRef" class="konva-container"></div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, nextTick } from 'vue'
import Konva from 'konva'
import { useVenueStore } from '../stores/venueStore'
import type { SeatRow, Seat, Section, ShapeObject, TextObject, AreaObject, CanvasImage, Position, PathPoint } from '../types'
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

// 判断当前是否为座位选择模式
const isSeatSelectMode = (): boolean => {
  return currentDrawingTool.value === 'selectseat'
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
  // 聚焦模式：优先使用当前聚焦的 Section
  const focusedSectionId = venueStore.focusedSectionId
  if (focusedSectionId) {
    return focusedSectionId
  }

  if (venueStore.venue.sections.length === 0) {
    const sectionId = venueStore.addSection({
      name: '默认区域',
      rows: [],
      x: 0,
      y: 0,
      borderType: 'rect',
      borderX: 100,      // 左上角 x
      borderY: 100,      // 左上角 y
      borderWidth: 400,  // 宽度
      borderHeight: 300, // 高度
      borderFill: 'rgba(59,130,246,0.08)'
    })
    return sectionId || 'default'
  }
  // 返回第一个没有边框的 Section（普通 section）或第一个 section
  const defaultSection = venueStore.venue.sections.find(s => !s.borderType || s.borderType === 'none')
  if (defaultSection) return defaultSection.id
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
      const { rowIds, seatIds, shapeIds, textIds, areaIds, sectionIds } = result
      venueStore.setActivePathSegment(null, null)
      if (additive) {
        if (rowIds.length) venueStore.selectedRowIds = [...new Set([...venueStore.selectedRowIds, ...rowIds])]
        if (seatIds.length) venueStore.selectedSeatIds = [...new Set([...venueStore.selectedSeatIds, ...seatIds])]
        if (shapeIds.length) venueStore.selectedShapeIds = [...new Set([...venueStore.selectedShapeIds, ...shapeIds])]
        if (textIds.length) venueStore.selectedTextIds = [...new Set([...venueStore.selectedTextIds, ...textIds])]
        if (areaIds.length) venueStore.selectedAreaIds = [...new Set([...venueStore.selectedAreaIds, ...areaIds])]
        if (sectionIds.length) venueStore.selectedSectionIds = [...new Set([...venueStore.selectedSectionIds, ...sectionIds])]
      } else {
        venueStore.selectedRowIds = rowIds
        venueStore.selectedSeatIds = seatIds
        venueStore.selectedShapeIds = shapeIds
        venueStore.selectedTextIds = textIds
        venueStore.selectedAreaIds = areaIds
        venueStore.selectedSectionIds = sectionIds
      }
      // 更新 Transformer 以显示选中状态
      tfm?.updateTransformer(true)
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
  venueStore.selectedSectionIds,
  venueStore.selectedImageId,
  venueStore.activePathSectionId,
  venueStore.activePathPointIndex
], () => {
  // 如果从 Transformer 同步中，跳过重绘（避免拖拽过程中销毁节点）
  if (isSyncingFromTransformer) return
  tfm?.updateSelectionVisuals()
  tfm?.updateTransformer()
  // 更新排座位的选中视觉效果（边框颜色）
  updateRowSelectionVisuals()
  // 重新渲染以显示/隐藏排扩展手柄
  renderAll()
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
        
        // 同步更新 getSelfRect，确保 Transformer 包围盒跟随内容变化
        ;(rowShape as any).getSelfRect = () => ({
          x: minX,
          y: minY,
          width: width,
          height: height
        })
        
        // 重新设置 sceneFunc 以更新边框颜色
        rowShape.sceneFunc(createRowSceneFunc(row, getSeatColorForRow(row), isSelected, SEAT_RADIUS, venueStore.selectedSeatIds))
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

  // 清空画布和节点映射（包括 dragLayer 防止残留）
  mainLayer.destroyChildren()
  dragLayer?.destroyChildren()
  nodeMap.clear()

  // 渲染图片（在最底层）
  renderImages(getImageRenderOptions())

  // 渲染 Section 边框（在座位排之下）
  venueStore.venue.sections.forEach(section => {
    if (section.borderType && section.borderType !== 'none') {
      renderSectionBorder(section)
    }
  })

  // 渲染所有区域
  venueStore.venue.sections.forEach(section => {
    renderSection(section)
  })

  // 应用视口剔除
  viewport?.updateViewportCulling()

  // 更新选中装饰
  tfm?.updateSelectionVisuals()
  // 重建节点后，Transformer 需要重新绑定到新节点（nodeMap 已更新）
  // 先清空 transformer 节点引用，防止持有已销毁的旧节点
  tfm?.transformer?.nodes([])
  tfm?.updateTransformer(true)

  mainLayer.batchDraw()
}

// ==================== 渲染 Section 边框 ====================

/** 将颜色加深（用于边框） */
const darkenColor = (color: string, percent: number = 30): string => {
  // 处理 hex 颜色
  if (color.startsWith('#')) {
    const hex = color.replace('#', '')
    const r = Math.max(0, parseInt(hex.substring(0, 2), 16) - percent * 2.55)
    const g = Math.max(0, parseInt(hex.substring(2, 4), 16) - percent * 2.55)
    const b = Math.max(0, parseInt(hex.substring(4, 6), 16) - percent * 2.55)
    return `#${Math.round(r).toString(16).padStart(2, '0')}${Math.round(g).toString(16).padStart(2, '0')}${Math.round(b).toString(16).padStart(2, '0')}`
  }
  // 处理 rgba 颜色
  if (color.startsWith('rgba')) {
    const match = color.match(/rgba\((\d+),\s*(\d+),\s*(\d+),\s*([\d.]+)\)/)
    if (match) {
      const r = Math.max(0, parseInt(match[1]) - percent * 2.55)
      const g = Math.max(0, parseInt(match[2]) - percent * 2.55)
      const b = Math.max(0, parseInt(match[3]) - percent * 2.55)
      return `rgba(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)}, 1)`
    }
  }
  return color
}

/** 将 PathPoint 数组转换为 SVG Path 数据 */
const createArcControlPoint = (start: Position, end: Position, depth: number) => {
  const dx = end.x - start.x
  const dy = end.y - start.y
  const length = Math.sqrt(dx * dx + dy * dy) || 1
  const midX = (start.x + end.x) / 2
  const midY = (start.y + end.y) / 2
  const normalX = -dy / length
  const normalY = dx / length
  const offset = length * depth * 0.5

  return {
    x: midX + normalX * offset,
    y: midY + normalY * offset
  }
}

/** 创建三次贝塞尔曲线控制点（更圆滑） */
/** 创建圆弧路径数据（SVG Arc）- 完美圆角
 * 使用 sagitta（矢高）计算圆弧半径
 * depth: 0=直线, 1=半圆, >1=更弯曲
 */
const createArcSegment = (start: Position, end: Position, depth: number): string => {
  const dx = end.x - start.x
  const dy = end.y - start.y
  const length = Math.sqrt(dx * dx + dy * dy) || 1
  
  // sagitta = 矢高（圆弧中点到弦的距离）
  // depth 直接控制矢高比例
  const sagitta = length * Math.abs(depth) * 0.5
  
  // 根据矢高和弦长计算半径: r = (s^2 + (c/2)^2) / (2*s)
  const halfChord = length / 2
  let radius = (sagitta * sagitta + halfChord * halfChord) / (2 * Math.max(sagitta, 0.001))
  
  // 限制最小半径，避免过于尖锐
  radius = Math.max(radius, halfChord)
  
  const sweepFlag = depth > 0 ? 1 : 0
  
  return `M ${start.x} ${start.y} A ${radius} ${radius} 0 0 ${sweepFlag} ${end.x} ${end.y}`
}

const isCurvedEdge = (point: PathPoint) => point.type === 'arc' && Math.abs(point.arcDepth ?? 0) > 0.0001

const createPathSegmentData = (points: PathPoint[], pointIndex: number): string => {
  if (pointIndex < 0 || pointIndex >= points.length) return ''

  const start = points[pointIndex]
  const end = points[(pointIndex + 1) % points.length]

  if (isCurvedEdge(start)) {
    // 使用圆弧（A）代替贝塞尔曲线，完美圆角
    return createArcSegment(start, end, start.arcDepth ?? 0)
  }

  return `M ${start.x} ${start.y} L ${end.x} ${end.y}`
}

/** 渲染 Path 顶点拖拽手柄 */
const renderPathVertexHandles = (section: Section, isOtherFocused: boolean) => {
  if (!mainLayer || !overlayLayer || !section.borderPathPoints || section.borderPathPoints.length < 2) return

  // 顶点手柄放在 overlayLayer，避免被其他元素拦截
  const layer = overlayLayer
  const baseX = section.borderX || 0
  const baseY = section.borderY || 0

  section.borderPathPoints.forEach((point, index) => {
    // 顶点拖拽手柄
    const vertexHandle = new Konva.Circle({
      x: baseX + point.x,
      y: baseY + point.y,
      radius: 8,
      fill: '#3b82f6',
      stroke: '#fff',
      strokeWidth: 2,
      draggable: !isOtherFocused,
      name: 'path-vertex-handle',
      shadowColor: 'rgba(0,0,0,0.3)',
      shadowBlur: 6,
      shadowOffset: { x: 0, y: 2 }
    })
    
    // 确保拖拽不被拦截
    vertexHandle.listening(true)

    vertexHandle.setAttr('sectionId', section.id)
    vertexHandle.setAttr('vertexIndex', index)

    vertexHandle.on('dragmove', () => {
      const newX = vertexHandle.x() - baseX
      const newY = vertexHandle.y() - baseY
      
      // 直接更新 section 数据（不触发重绘）
      if (section.borderPathPoints) {
        section.borderPathPoints[index] = { ...section.borderPathPoints[index], x: newX, y: newY }
      }
      
      // 实时更新 path 形状
      const borderShape = nodeMap.get('sectionBorder_' + section.id) as Konva.Path
      if (borderShape) {
        const newPathData = pathPointsToSvgPath(section.borderPathPoints || [])
        borderShape.data(newPathData)
      }
      
      // 实时更新边段高亮
      const activePath = mainLayer?.findOne<Konva.Path>((node: Konva.Node) => 
        node.getAttr('sectionId') === section.id && 
        (node as Konva.Path).stroke?.() === '#f59e0b'
      )
      if (activePath) {
        const activePointIndex = venueStore.activePathPointIndex
        if (activePointIndex !== null && activePointIndex !== undefined) {
          const segmentData = createPathSegmentData(section.borderPathPoints || [], activePointIndex)
          activePath.data(segmentData)
        }
      }
      
      layer.batchDraw()
    })
    
    vertexHandle.on('dragend', () => {
      // 拖拽结束时同步到 store
      const newX = vertexHandle.x() - baseX
      const newY = vertexHandle.y() - baseY
      const updatedPoints = [...(section.borderPathPoints || [])]
      updatedPoints[index] = { ...updatedPoints[index], x: newX, y: newY }
      venueStore.updateSectionBorder(section.id, { borderPathPoints: updatedPoints })
    })

    vertexHandle.on('mouseenter', () => {
      if (stage && !isDrawingMode()) {
        stage.container().style.cursor = 'move'
        vertexHandle.scale({ x: 1.2, y: 1.2 })
        layer.batchDraw()
      }
    })

    vertexHandle.on('mouseleave', () => {
      if (stage) {
        stage.container().style.cursor = 'default'
        vertexHandle.scale({ x: 1, y: 1 })
        layer.batchDraw()
      }
    })

    layer.add(vertexHandle)
  })
}

const renderPathSegmentHandles = (section: Section, _strokeColor: string, isOtherFocused: boolean) => {
  if (!mainLayer || !section.borderPathPoints || section.borderPathPoints.length < 2) return

  const layer = mainLayer
  const activePointIndex = venueStore.activePathSectionId === section.id ? venueStore.activePathPointIndex : null

  section.borderPathPoints.forEach((startPoint, segmentIndex) => {
    const pointIndex = segmentIndex
    const nextPoint = section.borderPathPoints![(segmentIndex + 1) % section.borderPathPoints!.length]
    const segmentData = createPathSegmentData(section.borderPathPoints!, pointIndex)
    if (!segmentData) return

    const isActive = activePointIndex === pointIndex
    const isCurveSegment = isCurvedEdge(startPoint)

    const hitPath = new Konva.Path({
      x: section.borderX || 0,
      y: section.borderY || 0,
      data: segmentData,
      stroke: 'rgba(0,0,0,0.001)',
      strokeWidth: 16,
      fillEnabled: false,
      listening: !isOtherFocused,
      perfectDrawEnabled: false
    })

    hitPath.on('click', (e) => {
      e.cancelBubble = true
      venueStore.selectSection(section.id, e.evt.shiftKey)
      venueStore.setActivePathSegment(section.id, pointIndex)
      tfm?.updateTransformer(true)
      mainLayer?.batchDraw()
    })

    hitPath.on('mouseenter', () => {
      if (stage && !isDrawingMode()) {
        stage.container().style.cursor = 'pointer'
      }
    })

    hitPath.on('mouseleave', () => {
      if (stage) stage.container().style.cursor = 'default'
    })

    layer.add(hitPath)

    if (!isActive) return

    const activePath = new Konva.Path({
      x: section.borderX || 0,
      y: section.borderY || 0,
      data: segmentData,
      stroke: '#f59e0b',
      strokeWidth: 5,
      fillEnabled: false,
      listening: false,
      opacity: isOtherFocused ? 0.3 : 0.95,
      dash: isCurveSegment ? [] : [10, 6]
    })

    layer.add(activePath)

    const activeStart = new Konva.Circle({
      x: (section.borderX || 0) + startPoint.x,
      y: (section.borderY || 0) + startPoint.y,
      radius: 4,
      fill: '#f59e0b',
      stroke: '#fff',
      strokeWidth: 1.5,
      listening: false,
      opacity: isOtherFocused ? 0.3 : 1
    })

    const activeEnd = new Konva.Circle({
      x: (section.borderX || 0) + nextPoint.x,
      y: (section.borderY || 0) + nextPoint.y,
      radius: 3,
      fill: '#fff',
      stroke: '#f59e0b',
      strokeWidth: 1.5,
      listening: false,
      opacity: isOtherFocused ? 0.3 : 1
    })

    layer.add(activeStart)
    layer.add(activeEnd)
  })
}

const pathPointsToSvgPath = (points: PathPoint[]): string => {
  if (points.length < 2) return ''
  
  let path = `M ${points[0].x} ${points[0].y}`

  points.forEach((start, index) => {
    const end = points[(index + 1) % points.length]

    if (isCurvedEdge(start)) {
      // 使用圆弧（A）代替贝塞尔曲线，完美圆角
      path += ' ' + createArcSegment(start, end, start.arcDepth ?? 0).replace(`M ${start.x} ${start.y} `, '')
    } else {
      path += ` L ${end.x} ${end.y}`
    }
  })
  
  path += ' Z'
  return path
}

const renderSectionBorder = (section: Section) => {
  if (!mainLayer || !section.borderType || section.borderType === 'none') return

  const isFocused = venueStore.focusedSectionId === section.id
  const isOtherFocused = venueStore.focusedSectionId !== null && !isFocused
  const isSelected = venueStore.selectedSectionIds.includes(section.id)

  let borderShape: Konva.Rect | Konva.Ellipse | Konva.Line | Konva.Path

  // 根据填充色计算边框色（加深 40%），如果手动设置了 borderStroke 则使用手动值
  const fillColor = section.borderFill || 'rgba(59,130,246,0.08)'
  const autoStrokeColor = darkenColor(fillColor, 40)
  const strokeColor = isSelected ? '#3b82f6' : (isFocused ? '#f59e0b' : (section.borderStroke || autoStrokeColor))

  const commonAttrs = {
    fill: fillColor,
    stroke: strokeColor,
    strokeWidth: isSelected || isFocused ? 2 : 1.5,
    dash: isFocused ? [] : [8, 4],
    opacity: isOtherFocused ? 0.3 : (section.borderOpacity ?? 1),
    listening: !isOtherFocused
  }

  if (section.borderType === 'ellipse') {
    // ellipse: x,y 为中心点，radiusX,radiusY 为半径（与 ShapeObject 一致）
    const rx = section.borderRadiusX || 50
    const ry = section.borderRadiusY || 30
    borderShape = new Konva.Ellipse({
      x: section.borderX || 0,
      y: section.borderY || 0,
      radiusX: rx,
      radiusY: ry,
      ...commonAttrs
    })
    // 设置 getSelfRect - Ellipse 中心在原点，边界为 ±rx, ±ry
    ;(borderShape as any).getSelfRect = () => ({
      x: -rx,
      y: -ry,
      width: rx * 2,
      height: ry * 2
    })
  } else if (section.borderType === 'polygon') {
    // polygon: x,y 为中心点，points 为相对坐标（与 ShapeObject 一致）
    borderShape = new Konva.Line({
      x: section.borderX || 0,
      y: section.borderY || 0,
      points: section.borderPoints || [],
      closed: true,
      ...commonAttrs
    })
    // 设置 getSelfRect 确保 Transformer 包围盒正确
    const points = section.borderPoints || []
    if (points.length >= 2) {
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
      for (let i = 0; i < points.length; i += 2) {
        minX = Math.min(minX, points[i])
        minY = Math.min(minY, points[i + 1])
        maxX = Math.max(maxX, points[i])
        maxY = Math.max(maxY, points[i + 1])
      }
      ;(borderShape as any).getSelfRect = () => ({
        x: minX,
        y: minY,
        width: maxX - minX,
        height: maxY - minY
      })
    }
  } else if (section.borderType === 'path') {
    // path: 带弧线的路径，使用 borderPathPoints
    const pathData = section.borderPathPoints 
      ? pathPointsToSvgPath(section.borderPathPoints)
      : ''
    borderShape = new Konva.Path({
      x: section.borderX || 0,
      y: section.borderY || 0,
      data: pathData,
      ...commonAttrs
    })
    // 设置 getSelfRect 确保 Transformer 包围盒正确
    const pathPoints = section.borderPathPoints || []
    if (pathPoints.length > 0) {
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
      pathPoints.forEach(p => {
        minX = Math.min(minX, p.x)
        minY = Math.min(minY, p.y)
        maxX = Math.max(maxX, p.x)
        maxY = Math.max(maxY, p.y)
      })
      ;(borderShape as any).getSelfRect = () => ({
        x: minX,
        y: minY,
        width: maxX - minX,
        height: maxY - minY
      })
    }
  } else {
    // rect: x,y 为左上角，width,height 为宽高（与 ShapeObject 一致）
    borderShape = new Konva.Rect({
      x: section.borderX || 0,
      y: section.borderY || 0,
      width: section.borderWidth || 0,
      height: section.borderHeight || 0,
      cornerRadius: 6,
      ...commonAttrs
    })
    // Rect 自带 getSelfRect，但为了统一处理也设置一下
    const w = section.borderWidth || 0
    const h = section.borderHeight || 0
    ;(borderShape as any).getSelfRect = () => ({
      x: 0,
      y: 0,
      width: w,
      height: h
    })
  }

  // 分区名称标签位置
  let labelX: number, labelY: number
  if (section.borderType === 'ellipse') {
    // 椭圆中心点
    labelX = section.borderX || 0
    labelY = section.borderY || 0
  } else if (section.borderType === 'polygon' || section.borderType === 'path') {
    // 多边形/路径中心点
    labelX = section.borderX || 0
    labelY = section.borderY || 0
  } else {
    // 矩形中心偏上
    labelX = (section.borderX || 0) + (section.borderWidth || 0) / 2
    labelY = (section.borderY || 0) + 14
  }
  const label = new Konva.Text({
    x: labelX,
    y: labelY,
    text: section.name || '分区',
    fontSize: 13,
    fontFamily: 'Inter, -apple-system, sans-serif',
    fontStyle: 'bold',
    fill: isSelected ? '#3b82f6' : '#555',
    align: 'center',
    offsetX: 0,
    listening: false,
    opacity: isOtherFocused ? 0.3 : 1
  })
  // 水平居中
  label.offsetX(label.width() / 2)

  const borderNode = borderShape as Konva.Shape
  borderNode.setAttr('sectionId', section.id)
  borderNode.setAttr('borderType', section.borderType)
  nodeMap.set('sectionBorder_' + section.id, borderNode)
  
  // 标签也加入 nodeMap 以便跟随移动
  label.setAttr('sectionId', section.id)
  label.setAttr('isSectionLabel', true)
  nodeMap.set('sectionLabel_' + section.id, label)

  // 单击选中（支持 Shift 多选）
  borderNode.on('click', (e) => {
    e.cancelBubble = true
    const additive = e.evt.shiftKey
    venueStore.selectSection(section.id, additive)
    // 更新 Transformer 以显示选中边框
    tfm?.updateTransformer(true)
    mainLayer?.batchDraw()
  })

  // 双击进入聚焦
  borderNode.on('dblclick', (e) => {
    e.cancelBubble = true
    enterSectionFocus(section.id)
  })

  borderNode.on('mouseenter', () => {
    if (stage && !isDrawingMode()) {
      stage.container().style.cursor = isFocused ? 'crosshair' : 'pointer'
    }
  })
  borderNode.on('mouseleave', () => {
    if (stage) stage.container().style.cursor = 'default'
  })

  mainLayer.add(borderShape)

  if (section.borderType === 'path') {
    renderPathSegmentHandles(section, strokeColor, isOtherFocused)
    // 渲染可拖拽的顶点手柄
    if (isSelected) {
      renderPathVertexHandles(section, isOtherFocused)
    }
  }

  mainLayer.add(label)
}

/**
 * 渲染 Section 简化概览（聚焦模式下其他分区只显示简化表示）
 */
const renderSectionOverview = (section: Section) => {
  if (!mainLayer || section.rows.length === 0) return

  // 计算 section 的包围盒
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
  section.rows.forEach(row => {
    row.seats.forEach(seat => {
      minX = Math.min(minX, seat.x)
      minY = Math.min(minY, seat.y)
      maxX = Math.max(maxX, seat.x)
      maxY = Math.max(maxY, seat.y)
    })
  })

  const width = maxX - minX + 40
  const height = maxY - minY + 40
  const centerX = (minX + maxX) / 2
  const centerY = (minY + maxY) / 2

  // 根据座位数量决定颜色（绿色=多，橙色=中，红色=少）
  const seatCount = section.rows.reduce((sum, row) => sum + row.seats.length, 0)
  let fillColor = 'rgba(76, 175, 80, 0.15)' // 绿色
  if (seatCount < 50) fillColor = 'rgba(255, 152, 0, 0.15)' // 橙色
  if (seatCount < 20) fillColor = 'rgba(244, 67, 54, 0.15)' // 红色

  // 绘制简化矩形概览
  const overview = new Konva.Rect({
    x: centerX,
    y: centerY,
    width: width,
    height: height,
    offsetX: width / 2,
    offsetY: height / 2,
    fill: fillColor,
    stroke: 'rgba(150, 150, 150, 0.3)',
    strokeWidth: 1,
    listening: false // 只读，不响应事件
  })

  // 添加座位数量标签
  const label = new Konva.Text({
    x: centerX,
    y: centerY,
    text: String(seatCount),
    fontSize: 14,
    fontFamily: 'Inter, -apple-system, sans-serif',
    fontStyle: 'bold',
    fill: 'rgba(100, 100, 100, 0.5)',
    align: 'center',
    verticalAlign: 'middle',
    listening: false
  })
  label.offsetX(label.width() / 2)
  label.offsetY(label.height() / 2)

  mainLayer.add(overview)
  mainLayer.add(label)
}

const renderSection = (section: Section) => {
  if (!mainLayer) return

  // 检查是否处于聚焦模式
  const focusedSectionId = venueStore.focusedSectionId
  const isFocusedSection = section.id === focusedSectionId
  const isOtherSection = focusedSectionId && section.id !== focusedSectionId

  // 如果是其他 section（非当前聚焦），渲染简化概览
  if (isOtherSection) {
    renderSectionOverview(section)
    return
  }

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

  // 设置绘制函数（聚焦模式下传入 visualScale 保持座位视觉大小）
  const visualScale = venueStore.focusedSectionId ? (stage?.scaleX() || 1) : 1
  rowShape.sceneFunc(createRowSceneFunc(row, getSeatColor, venueStore.selectedRowIds.includes(row.id), SEAT_RADIUS, venueStore.selectedSeatIds, visualScale))
  rowShape.hitFunc(createRowHitFunc())

  // 事件处理
  rowShape.on('mousedown', (e) => {
    if (isDrawingMode()) return
    if (e.evt.button !== 0) return
    e.cancelBubble = true

    // 座位选择模式：命中具体座位
    if (isSeatSelectMode()) {
      const pointer = stage!.getPointerPosition()!
      // 转换到排的局部坐标（考虑 stage 缩放/平移、排的旋转/偏移/offsetX/offsetY）
      const transform = rowShape.getAbsoluteTransform().copy().invert()
      const localPos = transform.point(pointer)
      // 找最近的座位（在 seatRadius 范围内命中）
      let hitSeat: Seat | null = null
      let minDist = SEAT_RADIUS * 1.5
      row.seats.forEach(seat => {
        const dx = seat.x - localPos.x
        const dy = seat.y - localPos.y
        const dist = Math.sqrt(dx * dx + dy * dy)
        if (dist < minDist) {
          minDist = dist
          hitSeat = seat
        }
      })
      if (hitSeat) {
        const additive = e.evt.shiftKey
        venueStore.selectSeat((hitSeat as Seat).id, additive)
      }
      return
    }

    const isAlreadySelected = venueStore.selectedRowIds.includes(row.id)
    if (!isAlreadySelected) {
      const additive = e.evt.shiftKey
      venueStore.selectRow(row.id, additive)
      // 先更新 Transformer 注册节点，再启动拖拽
      tfm?.updateTransformer(true)
    }
    // 接入统一拖拽系统（updateTransformer 是同步的，可立即启动）
    const pointer = stage!.getPointerPosition()!
    tfm?.startDragAll(pointer)
  })

  rowShape.on('click', (e) => {
    if (isDrawingMode()) return
    if (selection?.hasDragged) return
    e.cancelBubble = true
    const additive = e.evt.shiftKey
    venueStore.selectRow(row.id, additive)
    tfm?.updateTransformer(true)
  })

  rowShape.on('mouseenter', () => {
    if (stage && !isDrawingMode()) stage.container().style.cursor = isSeatSelectMode() ? 'crosshair' : 'pointer'
  })
  rowShape.on('mouseleave', () => {
    if (stage) stage.container().style.cursor = 'default'
  })

  // 移除原生 dragend —— 由统一拖拽系统 endDragAll 负责同步到 store
  // 原生 dragend 会绕过 isSyncingFromTransformer 保护，导致 renderAll 重复绘制

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
      
      // 多边形/区域工具：点击添加点（Shift 可把当前点出发的边标成弧线）
      if (tool === 'draw_polygon' || tool === 'draw_area') {
        // 检查是否闭合
        if (drawing.polygonPoints.value.length >= 3 && drawing.isNearStartPoint(pos)) {
          if (tool === 'draw_polygon') {
            submitPolygon(drawing.polygonPoints.value)
          } else {
            submitArea(drawing.polygonPoints.value)
          }
          return
        }
        
        // 检查是否按住 Shift 键（标记从当前点出发的边）
        const isArc = e.evt.shiftKey
        const point: import('../types').PathPoint = {
          x: pos.x,
          y: pos.y,
          type: isArc ? 'arc' : 'line',
          arcDepth: 0
        }
        
        drawing.addPolygonPoint(point as any)
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

/** 进入 Section 聚焦模式：缩放到该分区，其余分区变暗 */
const enterSectionFocus = (sectionId: string) => {
  if (!stage) return
  const section = venueStore.venue.sections.find(s => s.id === sectionId)
  if (!section) return

  venueStore.focusedSectionId = sectionId

  // 计算目标区域在 stage 坐标系中的包围盒
  const padding = 80
  const stageWidth = stage.width()
  const stageHeight = stage.height()

  let sectionW = section.borderWidth || 100
  let sectionH = section.borderHeight || 100
  let sectionX = section.borderX || 0
  let sectionY = section.borderY || 0

  const scaleX = (stageWidth - padding * 2) / sectionW
  const scaleY = (stageHeight - padding * 2) / sectionH
  const newScale = Math.min(scaleX, scaleY, 4)  // 最大缩放 4x

  const newX = stageWidth / 2 - (sectionX + sectionW / 2) * newScale
  const newY = stageHeight / 2 - (sectionY + sectionH / 2) * newScale

  stage.to({ x: newX, y: newY, scaleX: newScale, scaleY: newScale, duration: 0.3 })
  viewportState.scale = newScale
  viewportState.x = newX
  viewportState.y = newY

  // 重绘以应用灰显效果
  renderAll()
}

/** 退出 Section 聚焦模式，恢复全局视图 */
const exitSectionFocus = () => {
  if (!stage) return
  venueStore.focusedSectionId = null

  // 恢复到默认视口
  stage.to({ x: 0, y: 0, scaleX: 1, scaleY: 1, duration: 0.3 })
  viewportState.scale = 1
  viewportState.x = 0
  viewportState.y = 0

  renderAll()
}

/** 提交矩形→ 创建 Section */
const submitRect = (startPos: Position, endPos: Position) => {
  const width = Math.abs(endPos.x - startPos.x)
  const height = Math.abs(endPos.y - startPos.y)
  
  if (width < drawing.MIN_SHAPE_SIZE || height < drawing.MIN_SHAPE_SIZE) {
    clearDrawingPreview()
    return
  }
  
  const x = Math.min(startPos.x, endPos.x)
  const y = Math.min(startPos.y, endPos.y)

  // 创建 Section（不再是 Shape）
  venueStore.addSection({
    name: '矩形分区',
    rows: [],
    x: 0,
    y: 0,
    borderType: 'rect',
    borderX: x,
    borderY: y,
    borderWidth: width,
    borderHeight: height,
    borderFill: 'rgba(59,130,246,0.08)'
  })
  
  clearDrawingPreview()
}

// ---------- 椭圆绘制 ----------

/** 创建椭圆预览 - 对角线拖拽方式 */
const createEllipsePreview = (startPos: Position, endPos: Position) => {
  clearDrawingPreview()
  
  // 计算宽高的一半作为半径
  const radiusX = Math.abs(endPos.x - startPos.x) / 2
  const radiusY = Math.abs(endPos.y - startPos.y) / 2
  
  if (radiusX < 5 || radiusY < 5) return
  
  // 椭圆中心为起点和终点的中点
  const centerX = (startPos.x + endPos.x) / 2
  const centerY = (startPos.y + endPos.y) / 2
  
  const ellipse = new Konva.Ellipse({
    x: centerX,
    y: centerY,
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

/** 提交椭圆→ 创建 Section - 对角线拖拽方式 */
const submitEllipse = (startPos: Position, endPos: Position) => {
  // 计算宽高的一半作为半径
  const radiusX = Math.abs(endPos.x - startPos.x) / 2
  const radiusY = Math.abs(endPos.y - startPos.y) / 2
  
  if (radiusX < drawing.MIN_SHAPE_SIZE / 2 || radiusY < drawing.MIN_SHAPE_SIZE / 2) {
    clearDrawingPreview()
    return
  }
  
  // 椭圆中心为起点和终点的中点
  const centerX = (startPos.x + endPos.x) / 2
  const centerY = (startPos.y + endPos.y) / 2
  
  // 创建 Section（椭圆）
  venueStore.addSection({
    name: '椭圆分区',
    rows: [],
    x: 0,
    y: 0,
    borderType: 'ellipse',
    borderX: centerX,
    borderY: centerY,
    borderRadiusX: radiusX,
    borderRadiusY: radiusY,
    borderFill: 'rgba(59,130,246,0.08)'
  })
  
  clearDrawingPreview()
}

// ---------- 多边形绘制 ----------

/** 创建多边形预览（使用 useKonvaDrawing 中的版本，支持弧线） */
const createPolygonPreview = (points: import('../types').PathPoint[], currentPos: Position) => {
  // 调用 useKonvaDrawing 中的 createPolygonPreview
  _createPolygonPreview(points, currentPos)
}

/** 提交多边形→ 创建 Section（统一使用 path 数据） */
const submitPolygon = (points: import('../types').PathPoint[]) => {
  if (points.length < 3) {
    clearDrawingPreview()
    drawing.clearPolygonPoints()
    return
  }
  
  const center = calculatePolygonCenter(points)
  const relativePathPoints = points.map(p => ({
    x: p.x - center.x,
    y: p.y - center.y,
    type: p.type ?? 'line',
    arcDepth: p.arcDepth
  }))
  
  venueStore.addSection({
    name: '路径分区',
    rows: [],
    x: 0,
    y: 0,
    borderType: 'path',
    borderX: center.x,
    borderY: center.y,
    borderPathPoints: relativePathPoints,
    borderFill: 'rgba(59,130,246,0.08)'
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
  // Section 聚焦
  enterSectionFocus,
  exitSectionFocus,
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












