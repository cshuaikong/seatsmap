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

// 拖拽状态标志
let isDraggingPathVertex = false


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
  // 如果切换工具，重置所有绘制状态
  if (currentDrawingTool.value !== tool) {
    // 清空座位绘制状态
    resetSeatDrawingState()
    drawing.resetDrawingState()
    // 清空多边形绘制点
    drawing.clearPolygonPoints()
    clearDrawingPreview()
  }
  currentDrawingTool.value = tool
  drawing.setTool(tool as any)
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
      borderFill: 'rgba(128,128,128,0.15)',  // 默认灰色半透明
      borderStroke: '#808080'  // 默认灰色边框
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
    setIsSyncing: (val) => { isSyncingFromTransformer = val },
    updatePathVertexHandlesPosition
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
    currentTool: () => currentDrawingTool.value,
    isDrawingMode: () => drawing.isDataDrivenTool.value,
    isSeatDrawingMode: () => isSingleRowDrawingMode() || isSegmentDrawingMode() || isMultiRowDrawingMode(),
    seatDrawStep: { get value() { return seatDrawStep.value } },
    resetSeatDrawingState,
    clearDrawingPreview,
    resetDrawingState: () => drawing.resetDrawingState(),
    // 多边形点撤销功能
    undoPolygonPoint: () => {
      const points = drawing.polygonPoints.value
      if (points.length > 0) {
        // 创建新数组，移除最后一个点
        const newPoints = [...points]
        newPoints.pop()
        // 清空并重新添加
        drawing.clearPolygonPoints()
        newPoints.forEach(p => drawing.addPolygonPoint(p))
        // 更新预览
        const pos = drawing.previewState.value.currentPos
        if (pos) {
          createPolygonPreview(drawing.polygonPoints.value, pos)
        }
      }
    },
    getPolygonPointCount: () => drawing.polygonPoints.value.length
  })
  
  // 初始化绘制预览
  initDrawingPreview()

  // 初始化历史记录（保存初始状态）
  venueStore.initHistory()

  // 设置事件监听
  setupStageEvents()
  
  // 注册键盘事件
  window.addEventListener('keydown', keyboard.handleKeyDown)

  // 初始化视口管理
  viewport = useKonvaViewport({
    stage,
    mainLayer,
    nodeMap,
    onScaleChange: (scale) => {
      viewportState.scale = scale
      // 【关键】用户手动缩放后，更新 baseScale 为当前缩放值
      // 但只在还没有绘制座位时才更新，绘制后锁定 baseScale
      if (venueStore.focusedSectionId) {
        // 【修复】hasSeats 应检查整个座位图，而不是单个分区
        const hasSeats = venueStore.venue.sections.some(s =>
          s.rows.some((row: SeatRow) => row.seats.length > 0)
        )
        if (!hasSeats) {
          venueStore.setSectionBaseScale(scale)
          console.log('[onScaleChange] baseScale updated to:', scale)
        } else {
          console.log('[onScaleChange] baseScale locked, skipping update')
        }
      }
      // 缩放变化时重新渲染，更新分区边框和 label 的视觉大小
      renderAll()
    }
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
  
  // 如果正在拖拽 path 顶点，跳过重绘（避免手柄被重建）
  if (isDraggingPathVertex) return
  
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
  
  // 如果正在拖拽 path 顶点，跳过重绘
  if (isDraggingPathVertex) return
  
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
        // 使用 baseScale 计算逻辑半径
        const rowBaseScale = venueStore.getBaseScale()
        const rowSeatRadius = SEAT_RADIUS / rowBaseScale
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
        row.seats.forEach((seat) => {
          minX = Math.min(minX, seat.x - rowSeatRadius)
          minY = Math.min(minY, seat.y - rowSeatRadius)
          maxX = Math.max(maxX, seat.x + rowSeatRadius)
          maxY = Math.max(maxY, seat.y + rowSeatRadius)
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
        rowShape.sceneFunc(createRowSceneFunc(row, getSeatColorForRow(row), isSelected, rowSeatRadius, venueStore.selectedSeatIds))
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

  // 按 zIndex 排序 Section（层级低的先渲染，层级高的后渲染在上层）
  const sortedSections = [...venueStore.venue.sections].sort((a, b) => {
    const zIndexA = a.zIndex ?? 0
    const zIndexB = b.zIndex ?? 0
    return zIndexA - zIndexB
  })

  // 按 zIndex 顺序渲染每个 Section
  sortedSections.forEach(section => {
    const isFocusedSection = venueStore.focusedSectionId === section.id
    if (isFocusedSection) {
      // 分区编辑模式：先 border 后 content，座位在最上层可点击
      if (section.borderType && section.borderType !== 'none') {
        renderSectionBorder(section)
      }
      renderSection(section)
    } else {
      // 全局视图：先 content 后 border，border 在最上层可点击
      renderSection(section)
      if (section.borderType && section.borderType !== 'none') {
        renderSectionBorder(section)
      }
    }
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
  if (!mainLayer || !section.borderPathPoints || section.borderPathPoints.length < 2) return

  // 清理旧的顶点手柄
  mainLayer.find('.path-vertex-handle').forEach(handle => handle.destroy())

  // 顶点手柄放在 mainLayer，确保在 path 之上
  const layer = mainLayer
  const baseX = section.borderX || 0
  const baseY = section.borderY || 0

  section.borderPathPoints.forEach((point, index) => {
    // 顶点拖拽手柄 - 始终可拖拽
    // 计算反向缩放因子，使手柄在视觉上保持固定大小
    const stageScale = stage?.scaleX() || 1
    const handleScale = 1 / stageScale
    
    const vertexHandle = new Konva.Circle({
      x: baseX + point.x,
      y: baseY + point.y,
      radius: 2 * handleScale,
      fill: '#3b82f6',
      draggable: true,
      name: 'path-vertex-handle',
      // shadowColor: 'rgba(0,0,0,0.2)',
      // shadowBlur: 2,
      // shadowOffset: { x: 0, y: 1 },
      hitFunc(ctx: Konva.Context) {
        const self = this as unknown as Konva.Circle
        const hitRadius = 3 * handleScale
        ctx.beginPath()
        ctx.arc(0, 0, hitRadius, 0, Math.PI * 2)
        ctx.closePath()
        ctx.fillStrokeShape(self)
      }
    })

    // 确保拖拽不被拦截
    vertexHandle.listening(true)

    vertexHandle.setAttr('sectionId', section.id)
    vertexHandle.setAttr('vertexIndex', index)
    vertexHandle.setAttr('_baseScale', handleScale)

    // 拖拽开始：记录初始位置
    let dragStartX = 0
    let dragStartY = 0
    let pointStartX = point.x
    let pointStartY = point.y
    
    vertexHandle.on('dragstart', () => {
      isDraggingPathVertex = true  // 设置拖拽标志
      dragStartX = vertexHandle.x() - baseX  // 相对坐标
      dragStartY = vertexHandle.y() - baseY
      pointStartX = section.borderPathPoints?.[index]?.x ?? point.x
      pointStartY = section.borderPathPoints?.[index]?.y ?? point.y
    })
    
    vertexHandle.on('dragmove', () => {
      // 直接使用手柄的相对坐标
      const absX = vertexHandle.x()
      const absY = vertexHandle.y()
      const newX = absX - baseX
      const newY = absY - baseY
      
      // 更新 section 数据
      if (section.borderPathPoints) {
        section.borderPathPoints[index] = { ...section.borderPathPoints[index], x: newX, y: newY }
      }
      
      // 实时更新 path 形状
      const borderShape = nodeMap.get('sectionBorder_' + section.id) as Konva.Path
      if (borderShape) {
        const newPathData = pathPointsToSvgPath(section.borderPathPoints || [])
        borderShape.data(newPathData)
        borderShape.draw()  // 强制立即绘制
      }
      
      // 同步更新 Transformer 选择框
      tfm?.updateTransformer()
      
      layer.batchDraw()
    })
    
    vertexHandle.on('dragend', () => {
      // 拖拽结束时同步到 store - 使用最终的相对坐标
      const newX = vertexHandle.x() - baseX
      const newY = vertexHandle.y() - baseY
      
      const updatedPoints = [...(section.borderPathPoints || [])]
      updatedPoints[index] = { ...updatedPoints[index], x: newX, y: newY }
      venueStore.updateSectionBorder(section.id, { borderPathPoints: updatedPoints })
      
      isDraggingPathVertex = false  // 清除拖拽标志
    })

    vertexHandle.on('mouseenter', () => {
      if (stage && !isDrawingMode()) {
        stage.container().style.cursor = 'move'
        vertexHandle.draw()
        layer.batchDraw()
      }
    })

    vertexHandle.on('mouseleave', () => {
      if (stage) {
        stage.container().style.cursor = 'default'
        vertexHandle.draw()
        layer.batchDraw()
      }
    })

    layer.add(vertexHandle)
  })
}

/** 实时更新路径顶点手柄位置（拖拽中同步，不经过 store） */
const updatePathVertexHandlesPosition = (sectionId: string, x: number, y: number) => {
  if (!mainLayer) return
  
  // 计算反向缩放因子
  const stageScale = stage?.scaleX() || 1
  const handleScale = 1 / stageScale
  
  // 找到该 section 的所有顶点手柄
  const handles = mainLayer.find('.path-vertex-handle')
  handles.forEach((handle) => {
    const handleSectionId = handle.getAttr('sectionId')
    if (handleSectionId === sectionId) {
      const vertexIndex = handle.getAttr('vertexIndex') as number
      const section = venueStore.venue.sections.find(s => s.id === sectionId)
      if (section && section.borderPathPoints && section.borderPathPoints[vertexIndex]) {
        const point = section.borderPathPoints[vertexIndex]
        // 更新手柄位置：新的 baseX/baseY + 相对坐标
        handle.position({ x: x + point.x, y: y + point.y })
        // 同步更新缩放，保持视觉大小恒定
        handle.scaleX(handleScale)
        handle.scaleY(handleScale)
        ;(handle as Konva.Circle).strokeWidth(1.5 / stageScale)
      }
    }
  })
  
  mainLayer.batchDraw()
}

const renderPathSegmentHandles = (section: Section, _strokeColor: string, isOtherFocused: boolean) => {
  if (!mainLayer || !section.borderPathPoints || section.borderPathPoints.length < 2) return
        // 获取舞台缩放比例，用于反向缩放保持视觉大小恒定
  const stageScale = stage?.scaleX() || 1
  const layer = mainLayer
  const activePointIndex = venueStore.activePathSectionId === section.id ? venueStore.activePathPointIndex : null

  section.borderPathPoints.forEach((startPoint, segmentIndex) => {
    const pointIndex = segmentIndex
    const nextPoint = section.borderPathPoints![(segmentIndex + 1) % section.borderPathPoints!.length]
    const segmentData = createPathSegmentData(section.borderPathPoints!, pointIndex)
    if (!segmentData) return

    const isSelected = venueStore.selectedSectionIds.includes(section.id)
    const isActive = activePointIndex === pointIndex
    const isCurveSegment = isCurvedEdge(startPoint)

    const hitPath = new Konva.Path({
      x: section.borderX || 0,
      y: section.borderY || 0,
      data: segmentData,
      stroke: 'transparent',
      strokeWidth: 1 / stageScale,
      fillEnabled: false,
      listening: isSelected && !isOtherFocused,
      perfectDrawEnabled: false,
      hitStrokeWidth: 4 / stageScale,
    })

    hitPath.on('click', (e) => {
      if (isDrawingMode()) return  // 绘制模式下不触发选中
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

    if (isActive) {
      const activePath = new Konva.Path({
        x: section.borderX || 0,
        y: section.borderY || 0,
        data: segmentData,
        stroke: darkenColor('#77FD9F', 40),
        strokeWidth: 2 / stageScale,
        fillEnabled: false,
        listening: false,
        opacity: 1
      })

      layer.add(activePath)
    }
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
  const isReadonly = section.readonly === true

  // 获取舞台缩放比例，用于反向缩放保持视觉大小恒定
  const stageScale = stage?.scaleX() || 1
  const visualScale = 1 / stageScale

  let borderShape: Konva.Rect | Konva.Ellipse | Konva.Line | Konva.Path

  // 填充色：未选中保持原始填充；选中时用原始填充（内部）+ 粗边框线展示点击区域
  const fillColor = section.borderFill || 'rgba(128,128,128,0.15)'
  const autoStrokeColor = darkenColor(fillColor, 40)
  const strokeColor = isSelected ? '#3b82f6' : (isFocused ? '#f59e0b' : (section.borderStroke || autoStrokeColor))

  // strokeWidth 使用反向缩放，保持视觉大小恒定，但设置最小值确保始终可见
  // 选中状态：加粗到 6px 视觉宽度，用半透明蓝色直观展示边框线的点击区域
  const baseStrokeWidth = isSelected ? 2 : (isFocused ? 2 : 1.5)
  const scaledStrokeWidth = baseStrokeWidth * visualScale  // 最小 0.5 像素

  // 限制：有其他分区被聚焦时不可点击，只读分区不可点击
  const canListen = !isOtherFocused && !isReadonly
  
  // 【调试】
  if (isSelected) {
    // console.log(`[SectionBorder-选中] ${section.name} baseStroke=${baseStrokeWidth} scaledStroke=${scaledStrokeWidth.toFixed(3)} fill=${isSelected ? strokeFillForSelected : fillColor} visualScale=${visualScale.toFixed(3)}`)
  }
  
  const commonAttrs = {
    fill: fillColor,
    stroke: isReadonly ? '#9ca3af' : strokeColor,
    strokeWidth: scaledStrokeWidth,
    hitStrokeWidth: scaledStrokeWidth,  // 点击区域和视觉边框完全重叠
    dash: [],  // 实线边框，无虚线
    opacity: isOtherFocused ? 0.3 : (section.borderOpacity ?? 1),
    listening: canListen,
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
    fontSize: Math.max(13 * visualScale, 8),  // 反向缩放保持视觉大小恒定，最小 8px
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

    let lastClickTime = 0
    let lastClickPos = { x: 0, y: 0 }

    // mousedown 启动统一拖拽
    borderNode.on('mousedown', (e) => {
      if (isDrawingMode()) return
      if (e.evt.button !== 0) return
      e.cancelBubble = true
      const pointer = stage?.getPointerPosition()
      if (pointer) {
        tfm?.startDragAll(pointer)
      }
    })
    
    borderNode.on('click', (e) => {
      if (justDragged) { justDragged = false; return }  // 拖拽后不触发 click
      console.log('[SectionBorder-点击] ', section.name)
      if (isDrawingMode()) return  // 绘制模式下不触发
      e.cancelBubble = true

      // 如果点击位置命中了多个 section border，选择距离鼠标最近的那个
      let targetSectionId = section.id
      const pointer = stage?.getPointerPosition()
      if (pointer && stage) {
        const allHits = stage.getAllIntersections(pointer)
        const hitBorders = allHits.filter((n: Konva.Node) => n.getAttr('borderType') && n.getAttr('sectionId'))
        if (hitBorders.length > 1) {
          let minDist = Infinity
          hitBorders.forEach((n: Konva.Node) => {
            const btype = n.getAttr('borderType') as string
            let cx = n.x()
            let cy = n.y()
            if (btype === 'rect') {
              cx += (n.getAttr('width') || 0) / 2
              cy += (n.getAttr('height') || 0) / 2
            }
            // pointer 是屏幕坐标，需要转换为舞台世界坐标
            const pt = stage!.getAbsoluteTransform().copy().invert().point(pointer)
            const dx = pt.x - cx
            const dy = pt.y - cy
            const d = Math.sqrt(dx * dx + dy * dy)
            if (d < minDist) {
              minDist = d
              targetSectionId = n.getAttr('sectionId') as string
            }
          })
        }
      }
      
      const now = Date.now()
      const pos = stage?.getPointerPosition() || { x: 0, y: 0 }
      const timeDiff = now - lastClickTime
      const dist = Math.sqrt(Math.pow(pos.x - lastClickPos.x, 2) + Math.pow(pos.y - lastClickPos.y, 2))
      
      // 双击检测：300ms 内且距离小于 10 像素
      if (timeDiff < 300 && dist < 10) {
        // 双击：进入分区编辑
        console.log('[双击] 进入分区:', targetSectionId)
        enterSectionFocus(targetSectionId)
        lastClickTime = 0  // 重置，避免三击触发
      } else {
        // 单击：选中分区
        const additive = e.evt.shiftKey
        venueStore.selectSection(targetSectionId, additive)
        tfm?.updateTransformer(true)
        mainLayer?.batchDraw()
      }
      
      lastClickTime = now
      lastClickPos = pos
    })
  

  borderNode.on('mouseenter', () => {
    if (stage && !isDrawingMode()) {
      stage.container().style.cursor = isFocused ? 'crosshair' : 'pointer'
    }
  })
  borderNode.on('mouseleave', () => {
    if (stage) stage.container().style.cursor = 'default'
  })

  // 后备同步：如果统一拖拽系统没有捕获到移动（例如点击了 stroke 外部），
  // 原生 dragend 会触发，这里同步位置到 store
  borderNode.on('dragend', () => {
    if (section.readonly) return
    isSyncingFromTransformer = true
    const updates: any = {
      borderX: borderNode.x(),
      borderY: borderNode.y(),
      rotation: borderNode.rotation()
    }
    const bt = section.borderType
    const scaleX = borderNode.scaleX()
    const scaleY = borderNode.scaleY()
    if (bt === 'rect') {
      const w = borderNode.getAttr('width') || section.borderWidth || 100
      const h = borderNode.getAttr('height') || section.borderHeight || 100
      updates.borderWidth = w * scaleX
      updates.borderHeight = h * scaleY
    } else if (bt === 'ellipse') {
      const rx = borderNode.getAttr('radiusX') || section.borderRadiusX || 50
      const ry = borderNode.getAttr('radiusY') || section.borderRadiusY || 50
      updates.borderRadiusX = rx * scaleX
      updates.borderRadiusY = ry * scaleY
    }
    venueStore.updateSectionBorder(section.id, updates)
    borderNode.scaleX(1)
    borderNode.scaleY(1)
    nextTick(() => {
      isSyncingFromTransformer = false
    })
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
  isDrawingMode,
  isSelecting: () => selection?.isSelecting ?? false
})

// ==================== 渲染排====================

const renderRow = (row: SeatRow, section: Section) => {
  if (!mainLayer || row.seats.length === 0) return

  // 使用 baseScale 计算逻辑半径，视觉大小随 stageScale 变化（跟随缩放）
  const isGlobalView = !venueStore.focusedSectionId
  const rowBaseScale = venueStore.getBaseScale()
  const rowSeatRadius = SEAT_RADIUS / rowBaseScale
  
  const bounds = calculateRowBounds(row, rowSeatRadius)

  // 获取座位颜色函数
  const getSeatColor = (seat: Seat): string => {
    if (seat.categoryKey === 0) return '#BDBDBD'
    const category = venueStore.venue.categories.find(c => String(c.key) === String(seat.categoryKey))
    return category?.color || '#9E9E9E'
  }

  // 创建 Shape
  const rowShape = createRowShape(row, bounds, {
    seatRadius: rowSeatRadius,
    getSeatColor,
    isSelected: venueStore.selectedRowIds.includes(row.id),
    sectionId: section.id
  })

  // 设置绘制函数
  // 【修复】全局视图下强制使用横条模式，分区编辑模式下显示具体座位
  rowShape.sceneFunc(createRowSceneFunc(row, getSeatColor, venueStore.selectedRowIds.includes(row.id), rowSeatRadius, venueStore.selectedSeatIds, 1, 1, isGlobalView))
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
      // 找最近的座位（在逻辑半径范围内命中）
      let hitSeat: Seat | null = null
      let minDist = rowSeatRadius * 1.5
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
      if (isDrawingMode()) return  // 绘制模式下不触发选中
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
    if (isDrawingMode()) return  // 绘制模式下不触发选中
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
    if (isDrawingMode()) return  // 绘制模式下不触发选中
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

  // 滚轮缩放（Ctrl+滚轮以鼠标为中心缩放）
  stage.on('wheel', (e) => {
    // 只有按住 Ctrl 键时才触发缩放
    if (!e.evt.ctrlKey) return
    
    e.evt.preventDefault()
    viewport?.handleWheel(e)
  })

  // 鼠标按下
  stage.on('mousedown', (e) => {
    // A. 如果正在使用 Transformer 进行变换（旋）缩放），不干）
    if (tfm?.transformer?.isTransforming()) return
    
    // B. 如果点击的是 Transformer 的组成部分（手柄、边框），直接跳）
    const parent = e.target.getParent()
    if (parent && parent.className === 'Transformer') return
    
    // C. 如果点击的是 path 顶点手柄，跳过（让它自己处理拖拽）
    if (e.target.name() === 'path-vertex-handle') return

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

      // 座位绘制：分段式单击处理（在第二个 mousedown 和 click 事件中处理）
      // 注意：这里不要 return，让事件继续传播到第二个 mousedown 处理器
      if (tool === 'row-straight' || tool === 'section' || tool === 'section-diagonal') {
        // 不处理，让事件继续传播
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
    // 如果正在拖拽 path 顶点手柄，跳过 stage 的处理
    if (e.target.name() === 'path-vertex-handle') return
    
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
            console.log('[MouseUp] calling submitSeatRow (drag mode)')
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
    // 如果点击的是 path 顶点手柄，跳过
    if (e.target.name() === 'path-vertex-handle') return
    
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
        console.log('[Click] calling submitSeatRow (click mode)')
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

        // 使用逻辑半径判断距离
        const base = venueStore.getBaseScale()
        const logicalRadius = SEAT_RADIUS / base
        if (dist < logicalRadius * 3) {
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
  const { ux, uy, dist: stageDist } = getUnitVector(startPos, endPos)

  // 核心转换：视觉像素 -> 逻辑尺寸
  const stageScale = stage?.scaleX() || 1
  venueStore.initBaseScale(stageScale)
  const base = venueStore.getBaseScale()
  const { radius, gap } = venueStore.visualConfig
  const logicalRadius = radius / base
  const logicalGap = gap / base

  if (stageDist < logicalGap) return
  const count = Math.max(2, Math.floor(stageDist / logicalGap) + 1)

  clearDrawingPreview()

  // 辅助线
  const line = new Konva.Line({
    points: [startPos.x, startPos.y, endPos.x, endPos.y],
    stroke: '#3b82f6',
    strokeWidth: 1.5 / stageScale,
    dash: [6 / stageScale, 6 / stageScale],
    listening: false
  })
  addPreviewElement(line)

  // 起点标记
  const startDot = new Konva.Circle({
    x: startPos.x,
    y: startPos.y,
    radius: 5 / stageScale,
    fill: '#3b82f6',
    stroke: '#fff',
    strokeWidth: 1.5 / stageScale,
    listening: false
  })
  addPreviewElement(startDot)

  const angle = Math.atan2(uy, ux) * 180 / Math.PI

  // 座位预览圆：使用逻辑半径和逻辑间距
  // Konva 会自动应用 stageScale，视觉与实际渲染的座位一致
  const group = new Konva.Group({
    x: startPos.x,
    y: startPos.y,
    rotation: angle,
    listening: false
  })

  for (let i = 0; i < count; i++) {
    const circle = new Konva.Circle({
      x: i * logicalGap + logicalRadius,
      y: logicalRadius,
      radius: logicalRadius,
      fill: '#dbeafe',
      stroke: '#3b82f6',
      strokeWidth: 1.5 / stageScale,
      listening: false
    })
    group.add(circle)
  }

  addPreviewElement(group)
  overlayLayer?.batchDraw()
}

/** 创建多段座位排预览（支持转折） */
const createMultiSegmentPreview = (
  currentStart: Position,
  currentEnd: Position,
  segments: SeatSegment[]
) => {
  clearDrawingPreview()

  // 核心转换：视觉像素 -> 逻辑尺寸
  const stageScale = stage?.scaleX() || 1
  venueStore.initBaseScale(stageScale)
  const base = venueStore.getBaseScale()
  const { radius, gap } = venueStore.visualConfig
  const logicalRadius = radius / base
  const logicalGap = gap / base
  const visualScale = 1 / stageScale

  // 1. 批量绘制已完成的段
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
          const x = i * logicalGap
          const y = 0

          ctx.beginPath()
          ctx.arc(x, y, logicalRadius, 0, Math.PI * 2)

          const isKeyNode = (isLastSegment && i === segment.seatCount - 1) || (i === 0 && segIndex > 0)

          if (isKeyNode) {
            ctx.fillStyle = '#ffffff'
            ctx.fill()
            ctx.strokeStyle = '#3b82f6'
            ctx.lineWidth = 2 * visualScale
            ctx.stroke()
          } else {
            ctx.fillStyle = '#dbeafe'
            ctx.fill()
            ctx.strokeStyle = '#3b82f6'
            ctx.lineWidth = 1 * visualScale
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
  if (dist >= logicalGap) {
    const count = Math.max(2, Math.floor(dist / logicalGap) + 1)
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
        const x = i * logicalGap
        const y = 0

        ctx.beginPath()
        ctx.arc(x, y, logicalRadius, 0, Math.PI * 2)

        if (i === 0) {
          ctx.fillStyle = '#ffffff'
          ctx.fill()
          ctx.strokeStyle = '#3b82f6'
          ctx.lineWidth = 2 * visualScale
          ctx.stroke()
        } else if (i === count - 1) {
          ctx.fillStyle = '#dbeafe'
          ctx.fill()
          ctx.strokeStyle = '#22c55e'
          ctx.lineWidth = 2 * visualScale
          ctx.stroke()
        } else {
          ctx.fillStyle = '#dbeafe'
          ctx.fill()
          ctx.strokeStyle = '#3b82f6'
          ctx.lineWidth = 1 * visualScale
          ctx.stroke()
        }
      }

      ctx.restore()
    })
    addPreviewElement(previewShape)
  }

  overlayLayer?.batchDraw()
}

/** 创建多行座位预览（一个Shape绘制所有行） */
const createMultiRowPreview = (startPos: Position, endPos: Position) => {
  clearDrawingPreview()

  // 核心转换：视觉像素 -> 逻辑尺寸
  const stageScale = stage?.scaleX() || 1
  venueStore.initBaseScale(stageScale)
  const base = venueStore.getBaseScale()
  const { radius, gap, rowGap } = venueStore.visualConfig
  const logicalRadius = radius / base
  const logicalGap = gap / base
  const logicalRowGap = rowGap / base
  const visualScale = 1 / stageScale

  // 计算第一排数据
  const { ux, uy, dist } = getUnitVector(startPos, endPos)
  if (dist < logicalGap) return

  const seatCount = Math.max(2, Math.floor(dist / logicalGap) + 1)
  const angle = Math.atan2(uy, ux)

  // 在 segment_done 状态下，使用已保存的第一排数据，只更新行数
  let rowCount = 1
  let rowSpacing = logicalRowGap
  let baseRow = { start: startPos, end: endPos, angle, seatCount }

  // 计算行方向角度（默认垂直于第一排）
  let rowDirectionAngle = baseRow.angle + Math.PI / 2

  if (seatDrawStep.value === 'segment_done' && multiRowPreview.value) {
    baseRow = multiRowPreview.value.baseRow
    rowSpacing = logicalRowGap

    // 计算第一排最后一个座位位置
    const lastSeatLocalX = (baseRow.seatCount - 1) * logicalGap
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
    rowSpacing: rowSpacing * stageScale, // 保存屏幕坐标系
    angle: baseRow.angle,
    rowDirectionAngle
  }

  const preview = multiRowPreview.value
  if (!preview) return

  const perpAngle = preview.rowDirectionAngle

  const shape = new Konva.Shape({
    listening: false,
    perfectDrawEnabled: false
  })

  shape.sceneFunc((ctx) => {
    for (let row = 0; row < preview.rowCount; row++) {
      const rowOffsetX = row * rowSpacing * Math.cos(perpAngle)
      const rowOffsetY = row * rowSpacing * Math.sin(perpAngle)
      const rowStartX = preview.baseRow.start.x + rowOffsetX
      const rowStartY = preview.baseRow.start.y + rowOffsetY

      ctx.save()
      ctx.translate(rowStartX, rowStartY)
      ctx.rotate(preview.angle)

      for (let i = 0; i < preview.baseRow.seatCount; i++) {
        const x = i * logicalGap
        const y = 0

        ctx.beginPath()
        ctx.arc(x, y, logicalRadius, 0, Math.PI * 2)

        if (row === 0 && i === 0) {
          ctx.fillStyle = '#ffffff'
          ctx.fill()
          ctx.strokeStyle = '#3b82f6'
          ctx.lineWidth = 2 * visualScale
          ctx.stroke()
        } else if (row === preview.rowCount - 1 && i === preview.baseRow.seatCount - 1) {
          ctx.fillStyle = '#dbeafe'
          ctx.fill()
          ctx.strokeStyle = '#22c55e'
          ctx.lineWidth = 2 * visualScale
          ctx.stroke()
        } else {
          ctx.fillStyle = '#dbeafe'
          ctx.fill()
          ctx.strokeStyle = '#3b82f6'
          ctx.lineWidth = 1 * visualScale
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
  
  const stageScale = stage?.scaleX() || 1
  venueStore.initBaseScale(stageScale)
  const base = venueStore.getBaseScale()
  const { gap } = venueStore.visualConfig
  const logicalGap = gap / base
  
  if (dist < logicalGap) return

  const count = Math.max(2, Math.floor(dist / logicalGap) + 1)
  const angle = Math.atan2(uy, ux)

  // 推算最后一个座位的精确中心位置
  const lastSeatLocalX = (count - 1) * logicalGap
  const lastSeatPos = {
    x: startPos.x + lastSeatLocalX * Math.cos(angle),
    y: startPos.y + lastSeatLocalX * Math.sin(angle)
  }

  completedSegments.value.push({
    start: startPos,
    end: endPos,
    angle,
    seatCount: count,
    lastSeatPos
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

  // 核心转换：视觉像素 -> 逻辑尺寸
  const stageScale = stage?.scaleX() || 1
  venueStore.initBaseScale(stageScale)
  const base = venueStore.getBaseScale()
  const { radius, gap } = venueStore.visualConfig
  const logicalRadius = radius / base
  const logicalGap = gap / base

  // 计算所有座位和关键节点
  const { seats: seatPositions, segmentIndices } = calculateMultiSegmentSeats(
    completedSegments.value,
    logicalGap,
    logicalRadius
  )

  if (seatPositions.length === 0) return

  // 生成座位对象
  const seats: Seat[] = seatPositions.map((pos, index) => ({
    id: generateId(),
    label: '',
    x: pos.x,
    y: pos.y,
    categoryKey: 0,
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
    rotation: 0,
    curve: 0,
    seatSpacing: logicalGap,
    segmentIndices,
    baseScale: base
  })

  // 保存历史记录
  venueStore.saveHistory()

  resetSeatDrawingState()
}

/** 提交多行座位到 store（拆分为多排） */
const submitMultiRows = () => {
  if (!multiRowPreview.value) return

  const preview = multiRowPreview.value
  const sectionId = getOrCreateDefaultSection()
  
  // 核心转换：视觉像素 -> 逻辑尺寸
  const stageScale = stage?.scaleX() || 1
  venueStore.initBaseScale(stageScale)
  const base = venueStore.getBaseScale()
  const { radius, gap, rowGap } = venueStore.visualConfig
  const logicalRadius = radius / base
  const logicalGap = gap / base
  const logicalRowGap = rowGap / base

  // 使用行方向角度计算偏移向量
  const dirX = Math.cos(preview.rowDirectionAngle)
  const dirY = Math.sin(preview.rowDirectionAngle)

  // 逐行提交
  for (let row = 0; row < preview.rowCount; row++) {
    // 计算该行的起点（沿行方向偏移）
    const rowOffsetX = row * logicalRowGap * dirX
    const rowOffsetY = row * logicalRowGap * dirY
    const rowStartX = preview.baseRow.start.x + rowOffsetX
    const rowStartY = preview.baseRow.start.y + rowOffsetY

    // 生成该行的座位
    const seats: Seat[] = []
    for (let i = 0; i < preview.baseRow.seatCount; i++) {
      seats.push({
        id: generateId(),
        label: '',
        x: i * logicalGap + logicalRadius,
        y: logicalRadius,
        categoryKey: 0,
        status: 'available',
        objectType: 'seat'
      })
    }

    venueStore.addRow(sectionId, {
      label: '',
      seats,
      x: rowStartX,
      y: rowStartY,
      rotation: preview.angle * 180 / Math.PI,
      curve: 0,
      seatSpacing: logicalGap,
      baseScale: base
    })
  }

  // 保存历史记录
  venueStore.saveHistory()

  resetSeatDrawingState()
}

/** 提交座位排到 store */
const submitSeatRow = (startPos: Position, endPos: Position) => {
  const { ux, uy, dist: stageDist } = getUnitVector(startPos, endPos)
  
  // 核心转换：视觉像素 -> 逻辑尺寸
  const stageScale = stage?.scaleX() || 1
  
  // 【关键】如果还没有设置 baseScale（首次绘制），则使用当前缩放初始化
  // 如果已有 baseScale，则继续使用（保持所有座位基准一致）
  if (!venueStore.getBaseScale()) {
    venueStore.initBaseScale(stageScale)
  }
  const base = venueStore.getBaseScale()
  
  const { radius, gap } = venueStore.visualConfig
  const logicalRadius = radius / base
  const logicalGap = gap / base
  
  if (stageDist < logicalGap) {
    clearDrawingPreview()
    return
  }
  
  const count = Math.max(2, Math.floor(stageDist / logicalGap) + 1)
  const angle = Math.atan2(uy, ux) * 180 / Math.PI
  
  // 生成座位（保存逻辑坐标）
  const seats: Seat[] = []
  for (let i = 0; i < count; i++) {
    seats.push({
      id: generateId(),
      label: '',
      x: i * logicalGap + logicalRadius,
      y: logicalRadius,
      categoryKey: 0,
      status: 'available',
      objectType: 'seat'
    })
  }
  
  const sectionId = getOrCreateDefaultSection()
  venueStore.addRow(sectionId, {
    label: '',
    seats,
    x: startPos.x,
    y: startPos.y,
    rotation: angle,
    curve: 0,
    seatSpacing: logicalGap,
    baseScale: base
  })

  // 保存历史记录
  venueStore.saveHistory()
  
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
  
  // 清空所有选中状态，避免绘制座位时触发分区拖拽
  venueStore.clearSelection()
  
  // 计算目标区域在 stage 坐标系中的包围盒
  const padding = 80
  const stageWidth = stage.width()
  const stageHeight = stage.height()

  let sectionW = section.borderWidth || 100
  let sectionH = section.borderHeight || 100
  let sectionX = section.borderX || 0
  let sectionY = section.borderY || 0

  // 如果已存在 baseScale，直接使用该值；否则计算合适的缩放
  const existingBaseScale = venueStore.getBaseScale()
  let newScale: number
  
  if (existingBaseScale > 1) {
    // baseScale 已存在，直接使用，不重置、不重新计算
    newScale = existingBaseScale
    console.log('[EnterSection] 使用已存在的 baseScale:', newScale)
  } else {
    // baseScale 不存在，计算合适的默认缩放
    const defaultScale = 2
    const scaledSectionW = sectionW * defaultScale
    const scaledSectionH = sectionH * defaultScale
    const maxWidth = stageWidth - padding * 2
    const maxHeight = stageHeight - padding * 2
    
    newScale = defaultScale
    if (scaledSectionW > maxWidth || scaledSectionH > maxHeight) {
      const scaleX = maxWidth / sectionW
      const scaleY = maxHeight / sectionH
      newScale = Math.min(scaleX, scaleY, defaultScale)
    }
    newScale = Math.max(0.5, Math.min(newScale, 4))
    
    // 首次进入，锁定 baseScale
    console.log('[EnterSection] 首次进入，锁定 baseScale:', newScale)
    venueStore.initBaseScale(newScale)
  }

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

  // 退出分区后 stageScale = 1，座位逻辑坐标基于 baseScale 缩小
  // 所以视觉大小 = 逻辑大小 × 1 = 原始大小 / baseScale（预期行为）

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
    borderFill: 'rgba(128,128,128,0.15)',  // 默认灰色半透明
    borderStroke: '#808080'  // 默认灰色边框
  })
  
  // 保存历史记录
  venueStore.saveHistory()
  
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
    borderFill: 'rgba(128,128,128,0.15)',  // 默认灰色半透明
    borderStroke: '#808080'  // 默认灰色边框
  })
  
  // 保存历史记录
  venueStore.saveHistory()
  
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
    borderFill: 'rgba(128,128,128,0.15)',  // 默认灰色半透明
    borderStroke: '#808080'  // 默认灰色边框
  })
  
  // 保存历史记录
  venueStore.saveHistory()
  
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

  // 保存历史记录
  venueStore.saveHistory()
  
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

  // 保存历史记录
  venueStore.saveHistory()
  
  clearDrawingPreview()
  drawing.clearPolygonPoints()
}

// ==================== 选中效果 ====================
// ==================== 暴露方法 ====================

defineExpose({
  renderAll,
  stage: () => stage,
  layer: () => mainLayer,
  // 获取当前舞台缩放
  getStageScale: () => stage?.scaleX() || 1,
  // 获取当前 baseScale
  getBaseScale: () => venueStore.getBaseScale(),
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












