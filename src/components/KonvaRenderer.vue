<template>
  <div ref="containerRef" class="konva-container"></div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, nextTick } from 'vue'
import Konva from 'konva'
import { useVenueStore } from '../stores/venueStore'
import type { SeatRow, Seat, Section, ShapeObject, TextObject, AreaObject, CanvasImage, Position } from '../types'
import { useDrawing, type DrawingToolMode, getUnitVector, generateSeatsAlongLine, calculateBoundingBox, calculatePolygonCenter, toRelativePoints } from '../composables/useDrawing'
import {
  setPreviewLayer,
  clearDrawingPreview,
  addPreviewElement
} from '../composables/useKonvaDrawing'
import { useKonvaSelection } from '../composables/useKonvaSelection'
import { useKonvaTransformer } from '../composables/useKonvaTransformer'
import { useKonvaKeyboard } from '../composables/useKonvaKeyboard'
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

// ==================== 座位绘制状态机（分段式单击绘制）====================

type SeatDrawStep = 'idle' | 'first' | 'second'

const seatDrawStep = ref<SeatDrawStep>('idle')
const seatDrawPoints = ref<{
  first: Position | null
  second: Position | null
}>({ first: null, second: null })

// 重置座位绘制状态
const resetSeatDrawingState = () => {
  seatDrawStep.value = 'idle'
  seatDrawPoints.value = { first: null, second: null }
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

// 清除绘制预览和添加预览元素现在直接从 useKonvaDrawing 导入使用

// 键盘事件处理（通过 useKonvaKeyboard 管理）
let keyboard: ReturnType<typeof useKonvaKeyboard> | null = null

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
    if (!mainLayer) return

    const currentIds = new Set(newImages.map(img => img.id))

    // 删除不再存在的图片节点
    nodeMap.forEach((node, id) => {
      if (node.name() === 'canvas-image' && !currentIds.has(id)) {
        node.destroy()
        nodeMap.delete(id)
      }
    })

    // 更新已存在的图片节点属性，新增不存在的
    newImages.forEach(img => {
      const existingNode = nodeMap.get(img.id) as Konva.Image | undefined
      if (existingNode) {
        // 增量更新节点属性（避免销毁重建）
        existingNode.x(img.x)
        existingNode.y(img.y)
        existingNode.width(img.width)
        existingNode.height(img.height)
        existingNode.rotation(img.rotation || 0)
        existingNode.opacity(img.opacity ?? 1)
        existingNode.listening(!img.locked)
        existingNode.setAttr('canvasImageData', img)
      } else {
        // 新图片：加载并创建节点
        const cachedImage = imageCache.get(img.src)
        if (cachedImage && cachedImage.complete) {
          createImageNode(img, cachedImage)
        } else {
          const imageObj = new Image()
          imageObj.onload = () => {
            imageCache.set(img.src, imageObj)
            createImageNode(img, imageObj)
          }
          imageObj.src = img.src
        }
      }
    })

    mainLayer.batchDraw()
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
], (newVal, oldVal) => {
  console.log('watch 触发:', '新值:', newVal, '旧值:', oldVal,'selectedRowIds',venueStore.selectedRowIds)
  updateSelectionVisuals()
  tfm?.updateTransformer()
}, { deep: true })

// ==================== 渲染主函数====================

const renderAll = () => {
  if (!mainLayer) return

  // 清空画布和节点映射
  mainLayer.destroyChildren()
  nodeMap.clear()

  // 渲染图片（在最底层）
  renderImages()

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

// ==================== 渲染底图 ====================

// 缓存已加载的图片
const imageCache = new Map<string, HTMLImageElement>()

// 渲染所有图片
const renderImages = () => {
  if (!mainLayer) return

  const images = venueStore.canvasImages
  if (!images || images.length === 0) return

  images.forEach(canvasImage => {
    // 检查缓存
    const cachedImage = imageCache.get(canvasImage.src)
    if (cachedImage && cachedImage.complete) {
      createImageNode(canvasImage, cachedImage)
      return
    }

    // 异步加载图片
    const imageObj = new Image()
    imageObj.onload = () => {
      imageCache.set(canvasImage.src, imageObj)
      createImageNode(canvasImage, imageObj)
    }
    imageObj.onerror = () => {
      console.error('[图片] 加载失败:', canvasImage.fileName)
    }
    imageObj.src = canvasImage.src
  })
}

// 创建图片节点的辅助函数
const createImageNode = (canvasImage: CanvasImage, imageObj: HTMLImageElement) => {
  if (!mainLayer) return

  // 防止重复创建：如果已存在则直接更新属性
  const existing = nodeMap.get(canvasImage.id) as Konva.Image | undefined
  if (existing) {
    existing.x(canvasImage.x)
    existing.y(canvasImage.y)
    existing.width(canvasImage.width)
    existing.height(canvasImage.height)
    existing.rotation(canvasImage.rotation || 0)
    existing.opacity(canvasImage.opacity ?? 1)
    // 锁定时禁止事件穿透，解锁时恢复
    existing.listening(!canvasImage.locked)
    existing.setAttr('canvasImageData', canvasImage)
    mainLayer.batchDraw()
    return
  }

  const konvaImage = new Konva.Image({
    x: canvasImage.x,
    y: canvasImage.y,
    width: canvasImage.width,
    height: canvasImage.height,
    rotation: canvasImage.rotation || 0,
    opacity: canvasImage.opacity ?? 1,
    image: imageObj,
    id: `image-${canvasImage.id}`,
    name: 'canvas-image',
    // 锁定时不响应事件
    listening: !canvasImage.locked
  })

  konvaImage.setAttr('canvasImageData', canvasImage)

  // 图片点击选中（始终从节点属性读取最新数据）
  konvaImage.on('mousedown', (e) => {
    if (e.evt.button !== 0) return

    // 实时读取最新锁定状态
    const latestData = konvaImage.getAttr('canvasImageData') as CanvasImage
    if (latestData?.locked) return

    e.cancelBubble = true

    const isAlreadySelected = venueStore.selectedImageId === latestData.id
    if (!isAlreadySelected) {
      const additive = e.evt.shiftKey
      venueStore.selectCanvasImage(latestData.id, additive)
      tfm?.updateTransformer(true)
    }

    // 启动统一拖拽
    const pointer = stage!.getPointerPosition()!
    tfm?.startDragAll(pointer)
  })

  // 先注册到 nodeMap，防止异步回调时重复创建
  nodeMap.set(canvasImage.id, konvaImage)
  mainLayer.add(konvaImage)
  mainLayer.batchDraw()
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
  // - Shape.x/y 设为几何中心
  // - offsetX/Y 也设为几何中心，使旋转中心在排中心
  // - 座位使用原始局部坐标绘制
  const rowShape = new Konva.Shape({
    x: row.x,
    y: row.y,
    rotation: row.rotation || 0,
    width: width,
    height: height,
    offsetX: SEAT_RADIUS,  // 旋转中心在第一个座位中心
    offsetY: SEAT_RADIUS,
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
        context.moveTo(seat.x, seat.y)
        context.arc(seat.x, seat.y, radius, 0, Math.PI * 2)
      })

      context.fill()

      // 绘制边框
      context.save()
      context.strokeStyle = isSelected ? '#3b82f6' : color
      context.lineWidth = 1
      groupSeats.forEach(seat => {
        context.beginPath()
        context.arc(seat.x, seat.y, radius, 0, Math.PI * 2)
        context.stroke()
      })
      context.restore()
    })
  })

  // hitFunc: 自定义点击检测区域（与实际绘制区域对齐）
  rowShape.hitFunc((context, shape) => {
    const hitMinX = shape.getAttr('hitMinX') as number
    const hitMinY = shape.getAttr('hitMinY') as number
    const hitMaxX = shape.getAttr('hitMaxX') as number
    const hitMaxY = shape.getAttr('hitMaxY') as number
    context.beginPath()
    context.rect(hitMinX, hitMinY, hitMaxX - hitMinX, hitMaxY - hitMinY)
    context.fillStrokeShape(shape)
  })

  // 事件处理
  rowShape.on('click', (e) => {
    // 绘制模式下不处理选中
    if (isDrawingMode()) return
    // 如果刚完成框选，忽略
    if (selection?.hasDragged) return
    // 阻止冒泡，避免触发舞台 click
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

  // 拖拽结束同步 - 同步 Shape 的坐标到 row 数据
  rowShape.on('dragend', () => {
    if (tfm?.transformer?.isTransforming()) return
    console.log('dragend',rowShape.x(),rowShape.y(),rowShape.rotation())
    // rowShape.x/y 是左上角
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
    
    // 座位绘制：分段式预览（idle 状态显示鼠标跟随圆，first 状态显示排预览）
    if (currentDrawingTool.value === 'draw_seat') {
      if (seatDrawStep.value === 'idle') {
        // idle 状态：显示鼠标跟随的预览圆
        createSeatCursorPreview(pos)
        return
      } else if (seatDrawStep.value === 'first' && seatDrawPoints.value.first) {
        // first 状态：显示从起点到鼠标的排预览
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
    } else if (selection?.isSelecting) {
      // 更新框选 - 使用屏幕坐标
      selection.updateBoxSelection(pointer)
    }
  })

  // 鼠标释放
  stage.on('mouseup', (e) => {
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

  // 点击事件（用于选中对象）
  stage.on('click', (e) => {
    // 座位绘制模式：分段式单击处理
    if (currentDrawingTool.value === 'draw_seat') {
      const pos = getStagePosition()
      if (!pos) return

      if (seatDrawStep.value === 'idle') {
        // 第一次单击：记录起点，进入 first 状态
        seatDrawPoints.value.first = pos
        seatDrawStep.value = 'first'
        clearDrawingPreview()
        return
      } else if (seatDrawStep.value === 'first' && seatDrawPoints.value.first) {
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
  
  // 键盘事件
  window.addEventListener('keydown', handleKeyDown)
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

// ==================== Transformer + 拖拽（已迁移到 useKonvaTransformer）====================
// 见 onMounted 中的 tfm 初始化

// ==================== 框选功能（已迁移到 useKonvaSelection）====================
// 见 onMounted 中的 selection 初始化


// ==================== 绘制功能（已迁移到 useKonvaDrawing）====================

// 注意：以下函数现在作为代理，实际实现已在 useKonvaDrawing.ts 中

import {
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
    // 座位圆圈 - 白色填充 + 蓝色边框
    seats.forEach(seat => {
      ctx.beginPath()
      ctx.arc(seat.x, seat.y, SEAT_RADIUS, 0, Math.PI * 2)
      ctx.fillStyle = '#ffffff'
      ctx.fill()
      ctx.strokeStyle = '#3b82f6'
      ctx.lineWidth = 1.5
      ctx.stroke()
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












