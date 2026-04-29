<template>
  <div ref="containerRef" class="seat-map-viewer"></div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue'
import Konva from 'konva'
import type { VenueData, Seat, SeatRow, Section, PathPoint } from '../types'
import { SEAT_STATUS } from '../types'
import { useVenueStore } from '../stores/venueStore'

// 【性能优化】启用 WebGL 硬件加速，大幅提升渲染性能
// 对于大量座位（10000+），WebGL 比 Canvas 2D 快 10 倍
// 如果 WebGL 不可用，Konva 会自动降级到 Canvas 2D
Konva.enableWebGL = true

const props = defineProps<{
  venue: VenueData
  width?: number
  height?: number
  selectable?: boolean
  selectedSeatIds?: string[]
}>()

const emit = defineEmits<{
  'seat-click': [seat: Seat, row: SeatRow, section: Section]
  'update:selectedSeatIds': [seatIds: string[]]
}>()

const containerRef = ref<HTMLDivElement>()
let stage: Konva.Stage | null = null
let layer: Konva.Layer | null = null
let seatNodes: Map<string, Konva.Circle> = new Map() // 存储座位节点用于更新状态
let seatLabels: Map<string, Konva.Text> = new Map() // 存储座位标签节点
let isInitialFit = true // 标记是否是初始自适应

// 【性能优化】节点缓存数组：替换 layer.find() 遍历，O(1) 访问
const sectionBorderNodes: Konva.Node[] = []
const sectionLabelNodes: Konva.Text[] = []
const rowLabelNodes: Konva.Text[] = []
let lodRafId: number | null = null  // LOD 切换防抖

// 【统一配置获取】从 venue 数据或 store 获取配置参数，确保一致性
const getRenderConfig = () => {
  const store = useVenueStore()
  
  // 优先使用 venue 数据中的 baseScale，其次从 store 获取
  const baseScale = (props.venue as any).baseScale || store.getBaseScale()
  
  // 从 venue 数据或 store 获取 visualConfig
  const visualConfig = (props.venue as any).visualConfig || store.visualConfig
  
  return {
    baseScale,
    radius: visualConfig?.radius || 6,
    gap: visualConfig?.gap || 18,
    rowGap: visualConfig?.rowGap || 24,
    borderWidth: visualConfig?.borderWidth || 2
  }
}

// 【修复】座位半径基于 baseScale 计算，与编辑器一致
const getLogicalRadius = () => {
  const config = getRenderConfig()
  // 计算逻辑半径：和编辑器存坐标时的逻辑一致
  // 坐标存的是 (pos / baseScale)，半径也得 (radius / baseScale)
  return config.radius / config.baseScale
}

// 渲染座位条（使用连续线条，支持弧度和转折）
const renderSeatLine = (points: number[], row: SeatRow, opacity: number) => {
  if (!layer || points.length < 4) return  // 至少需要 2 个点（4 个坐标）
  
  const config = getRenderConfig()
  
  // 线条宽度 = 座位直径（使用 baseScale 归一化）
  const strokeWidth = (config.radius * 2) / config.baseScale
  
  // 使用座位排的颜色（从座位的 categoryKey 获取）
  const lineColor = row.seats.length > 0 ? getCategoryColor(row.seats[0].categoryKey) : '#9E9E9E'
  
  const line = new Konva.Line({
    points: points,
    stroke: lineColor,
    strokeWidth: strokeWidth,
    opacity: opacity,
    lineCap: 'round',  // 圆角端点
    lineJoin: 'round',  // 圆角连接（自动处理转折处）
    tension: 0.3,  // 轻微平滑（转折排保持角度，弧形排更自然）
    listening: false  // 不可点击
  })
  
  layer.add(line)
}

// 计算弧形位置
const calculateCurvedPositions = (seats: Seat[], curve: number): Array<{ x: number; y: number }> => {
  if (!curve || curve === 0 || seats.length < 2) {
    return seats.map(seat => ({ x: seat.x, y: seat.y }))
  }

  const count = seats.length
  const firstSeat = seats[0]
  const lastSeat = seats[count - 1]
  
  const dx = lastSeat.x - firstSeat.x
  const dy = lastSeat.y - firstSeat.y
  const length = Math.sqrt(dx * dx + dy * dy)
  const baseAngle = Math.atan2(dy, dx)
  
  const maxCurveAngle = curve * (Math.PI / 180)
  const chordLength = length
  const curveAngle = Math.abs(maxCurveAngle)
  const radius = curveAngle > 0.001 ? chordLength / (2 * Math.sin(curveAngle / 2)) : Infinity
  
  const midX = (firstSeat.x + lastSeat.x) / 2
  const midY = (firstSeat.y + lastSeat.y) / 2
  
  const perpX = -Math.sin(baseAngle) * (curve > 0 ? 1 : -1)
  const perpY = Math.cos(baseAngle) * (curve > 0 ? 1 : -1)
  
  const centerX = midX + perpX * Math.sqrt(Math.max(0, radius * radius - (chordLength / 2) * (chordLength / 2)))
  const centerY = midY + perpY * Math.sqrt(Math.max(0, radius * radius - (chordLength / 2) * (chordLength / 2)))
  
  const startAngle = Math.atan2(firstSeat.y - centerY, firstSeat.x - centerX)
  const endAngle = Math.atan2(lastSeat.y - centerY, lastSeat.x - centerX)
  const angleStep = (endAngle - startAngle) / (count - 1)
  
  return seats.map((_, index) => {
    const angle = startAngle + angleStep * index
    return {
      x: centerX + radius * Math.cos(angle),
      y: centerY + radius * Math.sin(angle)
    }
  })
}

// 获取分类颜色
const getCategoryColor = (categoryKey: string | number): string => {
  if (categoryKey === 0 || categoryKey === '0') return '#BDBDBD'
  const category = props.venue.categories.find(c => String(c.key) === String(categoryKey))
  return category?.color || '#9E9E9E'
}

// 颜色加深函数（加深 25%）
const darkenColor = (color: string, percent: number): string => {
  const num = parseInt(color.replace('#', ''), 16)
  const amt = Math.round(2.55 * percent)
  const R = Math.max((num >> 16) - amt, 0)
  const G = Math.max((num >> 8 & 0x00FF) - amt, 0)
  const B = Math.max((num & 0x0000FF) - amt, 0)
  return '#' + (0x1000000 + R * 0x10000 + G * 0x100 + B).toString(16).slice(1)
}

// 初始化舞台
const initStage = () => {
  if (!containerRef.value) return

  const width = props.width || containerRef.value.clientWidth || 800
  const height = props.height || containerRef.value.clientHeight || 600
  
  // 【移动端优化】检测设备类型，降低移动端渲染像素比
  const isMobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || 
                   ('ontouchstart' in window && window.innerWidth < 1024)
  
  // 电脑使用设备像素比，手机限制为 1（减少 2-4 倍渲染压力）
  const pixelRatio = isMobile ? 1 : window.devicePixelRatio || 1

  stage = new Konva.Stage({
    container: containerRef.value,
    width,
    height,
    draggable: false,  // 禁用 Konva 默认拖拽，手动控制（避免和双指缩放冲突）
    pixelRatio  // 【性能优化】移动端降低像素比
  })

  layer = new Konva.Layer({
    listening: true // 确保层接收事件
  })
  stage.add(layer)

  // 以鼠标为中心的滚轮缩放
  stage.on('wheel', (e) => {
    e.evt.preventDefault()
    const scaleBy = 1.1
    const oldScale = stage!.scaleX()
    const newScale = e.evt.deltaY > 0 ? oldScale / scaleBy : oldScale * scaleBy
    
    // 【限制】最小缩放为 1.0，小于 1 时使用回弹动画
    if (newScale < 1.0) {
      stage!.to({
        scaleX: 1.0,
        scaleY: 1.0,
        duration: 0.3,
        easing: Konva.Easings.BackEaseOut,
        onFinish: () => {
          updateLabelScale()
          updateLOD()
          layer?.batchDraw()
        }
      })
      return
    }
    
    // 获取鼠标位置
    const pointer = stage!.getPointerPosition()!
    
    // 计算鼠标指向的舞台坐标
    const mousePointTo = {
      x: (pointer.x - stage!.x()) / oldScale,
      y: (pointer.y - stage!.y()) / oldScale
    }
    
    // 设置新缩放
    stage!.scale({ x: newScale, y: newScale })
    
    // 调整舞台位置，使鼠标指向的坐标保持不变
    stage!.position({
      x: pointer.x - mousePointTo.x * newScale,
      y: pointer.y - mousePointTo.y * newScale
    })
    
    // 更新所有 label 的反向缩放
    updateLabelScale()
    updateLOD()  // 缩放后更新 LOD
    
    layer?.batchDraw()
  })

  // 手机端：双指缩放（Pinch Zoom）- 简化版 + 节流优化
  let initialDistance = 0
  let initialScale = 1
  let isPinching = false  // 标记是否正在进行双指缩放
  let pinchRafId: number | null = null  // requestAnimationFrame ID
  
  stage.on('touchstart', (e) => {
    const touches = e.evt.touches
    if (touches.length === 2) {
      e.evt.preventDefault()
      isPinching = true  // 开始双指缩放
      
      // 记录初始双指距离和当前缩放
      initialDistance = getDistance(touches[0], touches[1])
      initialScale = stage!.scaleX()
    }
  })
  
  stage.on('touchmove', (e) => {
    const touches = e.evt.touches
    
    // 双指缩放
    if (touches.length === 2) {
      e.evt.preventDefault()
      
      // 使用 requestAnimationFrame 节流，避免高频重绘
      if (pinchRafId) return
      
      pinchRafId = requestAnimationFrame(() => {
        // 1. 计算当前双指距离
        const currentDistance = getDistance(touches[0], touches[1])
        
        // 2. 计算缩放比例 = 当前距离 / 初始距离
        const scale = currentDistance / initialDistance
        
        // 3. 新缩放 = 初始缩放 × 缩放比例
        const newScale = initialScale * scale
        
        // 4. 限制范围
        const finalScale = Math.max(0.001, Math.min(500, newScale))
        
        // 5. 计算双指中心点（相对于 stage 容器）
        const rect = stage!.container().getBoundingClientRect()
        const centerX = (touches[0].clientX + touches[1].clientX) / 2 - rect.left
        const centerY = (touches[0].clientY + touches[1].clientY) / 2 - rect.top
        
        // 6. 计算中心点对应的舞台坐标（使用当前缩放）
        const oldScale = stage!.scaleX()
        const pointOnStage = {
          x: (centerX - stage!.x()) / oldScale,
          y: (centerY - stage!.y()) / oldScale
        }
        
        // 7. 应用新缩放
        stage!.scale({ x: finalScale, y: finalScale })
        
        // 8. 调整位置，使中心点在缩放后保持在同一位置
        stage!.position({
          x: centerX - pointOnStage.x * finalScale,
          y: centerY - pointOnStage.y * finalScale
        })
        
        // 9. 重绘
        updateLabelScale()
        updateLOD()
        layer?.batchDraw()
        
        pinchRafId = null
      })
    }
  })
  
  stage.on('touchend', (e) => {
    // 清除未完成的动画帧
    if (pinchRafId) {
      cancelAnimationFrame(pinchRafId)
      pinchRafId = null
    }
    
    // 当手指数量变为 1 或 0 时，结束双指缩放
    if (e.evt.touches.length < 2) {
      isPinching = false
    }
  })
  
  // 手机端：双击放大（Double Tap）
  let lastTapTime = 0
  let lastTapPosition: { x: number; y: number } | null = null
  
  stage.on('touchend', (e) => {
    const now = Date.now()
    const touches = e.evt.changedTouches
    
    if (touches.length === 1) {
      // 计算点击位置（相对于 stage 容器）
      const rect = stage!.container().getBoundingClientRect()
      const tapX = touches[0].clientX - rect.left
      const tapY = touches[0].clientY - rect.top
      
      // 判断是否为双击（300ms 内，位置相近）
      if (lastTapTime && (now - lastTapTime) < 300) {
        if (lastTapPosition) {
          const dx = tapX - lastTapPosition.x
          const dy = tapY - lastTapPosition.y
          const distance = Math.sqrt(dx * dx + dy * dy)
          
          // 如果两次点击位置相近（小于 30px），认为是双击
          if (distance < 30) {
            e.evt.preventDefault()
            
            const currentScale = stage!.scaleX()
            const targetScale = currentScale > 1.5 ? 1.0 : 2.5
            
            const pointer = stage!.getPointerPosition()
            if (!pointer) return
            
            const oldScale = currentScale
            const pointBefore = {
              x: (pointer.x - stage!.x()) / oldScale,
              y: (pointer.y - stage!.y()) / oldScale
            }
            
            // 动画过渡
            stage!.to({
              scaleX: targetScale,
              scaleY: targetScale,
              duration: 0.3,
              easing: Konva.Easings.EaseOut,
              onUpdate: () => {
                const newScale = stage!.scaleX()
                stage!.position({
                  x: pointer.x - pointBefore.x * newScale,
                  y: pointer.y - pointBefore.y * newScale
                })
                updateLabelScale()
                updateLOD()
              },
              onFinish: () => {
                layer?.batchDraw()
              }
            })
            
            // 重置
            lastTapTime = 0
            lastTapPosition = null
            return
          }
        }
      }
      
      // 更新最后一次点击
      lastTapTime = now
      lastTapPosition = { x: tapX, y: tapY }
    }
  })
  
  // 手机端：单指拖拽画布（仅在非双指缩放时）- 性能优化
  let isTouchDragging = false
  let touchDragStart: { x: number; y: number } | null = null
  let stageStartPos: { x: number; y: number } | null = null
  let dragRafId: number | null = null  // requestAnimationFrame ID
  
  stage.on('touchstart', (e) => {
    const touches = e.evt.touches
    if (touches.length === 1 && !isPinching) {
      // 单指触摸，且不在双指缩放中 -> 启动拖拽
      isTouchDragging = true
      touchDragStart = {
        x: touches[0].clientX,
        y: touches[0].clientY
      }
      stageStartPos = {
        x: stage!.x(),
        y: stage!.y()
      }
    }
  })
  
  stage.on('touchmove', (e) => {
    if (!isTouchDragging || !touchDragStart || !stageStartPos) return
    
    const touches = e.evt.touches
    if (touches.length !== 1) {
      // 如果变成多指，取消拖拽
      isTouchDragging = false
      return
    }
    
    e.evt.preventDefault()
    
    // 使用 requestAnimationFrame 节流，避免高频重绘
    if (dragRafId) return
    
    dragRafId = requestAnimationFrame(() => {
      const dx = touches[0].clientX - touchDragStart!.x
      const dy = touches[0].clientY - touchDragStart!.y
      
      stage!.position({
        x: stageStartPos!.x + dx,
        y: stageStartPos!.y + dy
      })
      
      layer?.batchDraw()
      dragRafId = null
    })
  })
  
  stage.on('touchend', (e) => {
    // 清除未完成的动画帧
    if (dragRafId) {
      cancelAnimationFrame(dragRafId)
      dragRafId = null
    }
    
    // 当所有手指都离开时，结束拖拽
    if (e.evt.touches.length === 0) {
      isTouchDragging = false
      touchDragStart = null
      stageStartPos = null
    }
  })

  // 画布拖拽
  let isDragging = false
  let lastPos: { x: number; y: number } | null = null

  stage.on('mousedown', (e) => {
    // 如果点击的是座位，不启动拖拽（座位自己的 mousedown 会处理）
    if (e.target !== stage) return
    
    isDragging = true
    lastPos = { x: e.evt.clientX, y: e.evt.clientY }
    if (stage) stage.container().style.cursor = 'grabbing'
  })

  stage.on('mousemove', (e) => {
    if (!isDragging || !lastPos || !stage) return
    
    const dx = e.evt.clientX - lastPos.x
    const dy = e.evt.clientY - lastPos.y
    
    stage.position({
      x: stage.x() + dx,
      y: stage.y() + dy
    })
    
    lastPos = { x: e.evt.clientX, y: e.evt.clientY }
    layer?.batchDraw()
  })

  stage.on('mouseup', () => {
    isDragging = false
    lastPos = null
    if (stage) stage.container().style.cursor = 'default'
  })

  // 鼠标离开画布时停止拖拽
  stage.on('mouseleave', () => {
    isDragging = false
    lastPos = null
    if (stage) stage.container().style.cursor = 'default'
  })
}

// 【重构】计算内容边界并自动缩放居中
const fitContentToView = () => {
  if (!stage || !layer) return
  
  // 【修复】只在初始渲染时执行自适应，避免和用户手动缩放冲突
  if (!isInitialFit) return
  isInitialFit = false

  // 1. 强制刷新图元，确保 getClientRect 能拿到最新数据
  layer.batchDraw()
  
  // 2. 获取所有图元的总边界
  const box = layer.getClientRect()
  
  // 【调试】打印边界信息
  const store = useVenueStore()
  
  const padding = 50
  const stageWidth = stage.width()
  const stageHeight = stage.height()
  
  const scale = Math.min(
    (stageWidth - padding) / box.width,
    (stageHeight - padding) / box.height,
    1.5  // 最大不超过 1.5x
  )
  
  stage.scale({ x: scale, y: scale })
  stage.position({
    x: (stageWidth - box.width * scale) / 2 - box.x * scale,
    y: (stageHeight - box.height * scale) / 2 - box.y * scale
  })
  
  // 更新标签缩放和可见性
  updateLabelScale()
  
  layer.batchDraw()
  updateLOD()
  initialFitDone = true
}

// 入场动画：平滑缩放到最佳视角
const fitContentWithAnimation = () => {
  if (!stage || !layer) return
  
  if (!isInitialFit) return
  isInitialFit = false
  
  layer.batchDraw()
  const box = layer.getClientRect()
  
  const padding = 50
  const stageWidth = stage.width()
  const stageHeight = stage.height()
  
  const targetScale = Math.min(
    (stageWidth - padding) / box.width,
    (stageHeight - padding) / box.height,
    1.5
  )
  
  const targetX = (stageWidth - box.width * targetScale) / 2 - box.x * targetScale
  const targetY = (stageHeight - box.height * targetScale) / 2 - box.y * targetScale
  
  // 使用 Konva 动画平滑过渡
  stage.to({
    x: targetX,
    y: targetY,
    scaleX: targetScale,
    scaleY: targetScale,
    duration: 0.8,
    easing: Konva.Easings.EaseInOut,
    onFinish: () => {
      // 动画完成后更新 LOD 和标签缩放
      updateLOD()  // 先更新 LOD，可能触发重新渲染
      updateLabelScale()
      initialFitDone = true
    }
  })
}


// 【性能优化】渲染完成后一次性扫描填充缓存（后续 updateLOD/updateLabelScale 不再遍历 layer）
const populateCaches = () => {
  if (!layer) return
  sectionBorderNodes.length = 0
  sectionLabelNodes.length = 0
  rowLabelNodes.length = 0

  layer.getChildren().forEach(node => {
    const name = node.name()
    if (name === 'section-border') {
      sectionBorderNodes.push(node)
    } else if (name === 'section-label') {
      sectionLabelNodes.push(node as any)
    } else if (name === 'row-label') {
      rowLabelNodes.push(node as any)
    }
  })
}

// 记录初始 fit 完成时间，防止 fitContentToView 后的 updateLOD 立即移除座位
let initialFitDone = false
// LOD 多级细节渲染（基于 baseScale 的智能切换）
const updateLOD = () => {
  if (!stage || !layer) return

  // 初始 fit 未完成时跳过 LOD，避免 fitContentToView 缩放后立即移除刚渲染的座位
  if (!initialFitDone) return

  const currentScale = stage.scaleX()
  const config = getRenderConfig()
  const baseScale = config.baseScale
  const relativeScale = currentScale / baseScale

  const SHOW_BLOCKS_THRESHOLD = 2/3
  const SHOW_SEATS_THRESHOLD = 1.0

  const hasSeatNodes = seatNodes.size > 0
  const shouldShowCircles = relativeScale >= SHOW_SEATS_THRESHOLD
  const shouldShowBlocks = relativeScale >= SHOW_BLOCKS_THRESHOLD && !shouldShowCircles

  const needsRender = (shouldShowCircles || shouldShowBlocks) && !hasSeatNodes

  if (needsRender || (hasSeatNodes && !shouldShowCircles && !shouldShowBlocks)) {
    // 【性能优化】LOD 级别切换加防抖，避免频繁全量重绘
    if (lodRafId) cancelAnimationFrame(lodRafId)
    lodRafId = requestAnimationFrame(() => {
      renderSeatMap(true)
    })
    return
  }

  // 【性能优化】使用缓存数组替代 layer.find()，O(1) 遍历
  rowLabelNodes.forEach(text => {
    text.visible(relativeScale >= 1.0)
  })

  sectionBorderNodes.forEach(node => {
    let opacity = 1.0
    if (currentScale >= baseScale) {
      opacity = 0.4
    } else if (currentScale >= 1.0) {
      opacity = 1.0 - (currentScale - 1.0) / (baseScale - 1.0) * 0.6
    }
    node.opacity(opacity)
  })

  layer.batchDraw()
}
// 创建勾选图标（seats.io 风格）
const createCheckmark = (x: number, y: number, size: number): Konva.Group => {
  const group = new Konva.Group({
    x,
    y,
    name: 'checkmark'
  })
  
  // 白色勾选路径
  const checkmark = new Konva.Line({
    points: [
      -size * 0.4, 0,
      -size * 0.1, size * 0.3,
      size * 0.4, -size * 0.3
    ],
    stroke: '#FFFFFF',
    strokeWidth: size * 0.15,
    lineCap: 'round',
    lineJoin: 'round',
    listening: false
  })
  
  group.add(checkmark)
  return group
}

// 计算两个触摸点之间的距离
const getDistance = (touch1: Touch, touch2: Touch): number => {
  const dx = touch2.clientX - touch1.clientX
  const dy = touch2.clientY - touch1.clientY
  return Math.sqrt(dx * dx + dy * dy)
}

// 渲染座位图（支持大规模座位优化）
const renderSeatMap = (preserveStageState: boolean = false) => {
  if (!stage || !layer) return

  // 【修复】只在首次渲染时重置 Stage 状态
  if (!preserveStageState) {
    stage.scale({ x: 1, y: 1 })
    stage.position({ x: 0, y: 0 })
  }

  layer.destroyChildren()
  seatNodes.clear() // 清空座位节点映射
  seatLabels.clear() // 清空座位标签映射

  // 【性能优化】清空缓存数组（重建时会重新注册）
  sectionBorderNodes.length = 0
  sectionLabelNodes.length = 0
  rowLabelNodes.length = 0

  const config = getRenderConfig()
  const baseScale = config.baseScale
  
  // 【优化】计算视口范围，只渲染可见区域的座位（针对 10 万+座位）
  const stageWidth = stage.width()
  const stageHeight = stage.height()
  const stageScale = stage.scaleX()
  const stagePos = stage.position()
  
  // 视口在逻辑坐标系中的范围
  const viewportLeft = -stagePos.x / stageScale
  const viewportTop = -stagePos.y / stageScale
  const viewportRight = viewportLeft + stageWidth / stageScale
  const viewportBottom = viewportTop + stageHeight / stageScale
  
  // 视口扩展边距（预加载周边座位）
  // 【修复】放大时需要更大的 padding，避免座位被误剔除
  // 使用 stageScale * 系数，确保放大时 padding 足够大
  const padding = 500 * stageScale  // 放大 5 倍时 padding = 2500，缩小 0.5 倍时 padding = 250
  const viewLeft = viewportLeft - padding
  const viewTop = viewportTop - padding
  const viewRight = viewportRight + padding
  const viewBottom = viewportBottom + padding

  // 渲染所有 section
  props.venue.sections.forEach(section => {
    // 【预览模式】渲染分区填充色块，但边框宽度为0
    if (section.borderType && section.borderType !== 'none') {
      renderSectionBorder(section, true)  // 传入 previewMode=true
    }

    // 渲染形状
    section.shapes?.forEach(shape => {
      if (shape.type === 'rect') {
        layer!.add(new Konva.Rect({
          x: shape.x,
          y: shape.y,
          width: shape.width || 100,
          height: shape.height || 100,
          fill: shape.fill || 'rgba(156, 163, 175, 0.6)',
          rotation: shape.rotation || 0
        }))
      } else if (shape.type === 'ellipse') {
        layer!.add(new Konva.Ellipse({
          x: shape.x,
          y: shape.y,
          radiusX: (shape.width || 100) / 2,
          radiusY: (shape.height || 100) / 2,
          fill: shape.fill || 'rgba(156, 163, 175, 0.6)',
          rotation: shape.rotation || 0
        }))
      }
    })

    // 渲染文本
    section.texts?.forEach(text => {
      layer!.add(new Konva.Text({
        x: text.x,
        y: text.y,
        text: text.text || text.caption || '',
        fontSize: text.fontSize || 14,
        fill: text.fill || text.textColor || '#333',
        rotation: text.rotation || 0
      }))
    })

    // 渲染区域
    section.areas?.forEach(area => {
      layer!.add(new Konva.Line({
        points: area.points || [],
        fill: area.fill || 'rgba(100, 100, 100, 0.3)',
        closed: true
      }))
    })

    // 使用 Group 渲染排和座位（【优化】添加视口裁剪）
    section.rows.forEach(row => {
      // 【优化】视口裁剪：只渲染可见区域内的排（针对 10 万+座位）
      const rowX = row.x || 0
      const rowY = row.y || 0
      const seatRadius = config.radius
      const logicalRadius = seatRadius / baseScale
      
      // 计算排的包围盒（【修复】遍历所有座位，而非只取首尾）
      if (row.seats.length > 0) {
        let rowMinX = Infinity, rowMinY = Infinity
        let rowMaxX = -Infinity, rowMaxY = -Infinity
        
        // 遍历所有座位计算精确包围盒
        row.seats.forEach(seat => {
          rowMinX = Math.min(rowMinX, seat.x - logicalRadius)
          rowMinY = Math.min(rowMinY, seat.y - logicalRadius)
          rowMaxX = Math.max(rowMaxX, seat.x + logicalRadius)
          rowMaxY = Math.max(rowMaxY, seat.y + logicalRadius)
        })
        
        // 应用旋转（如果有）
        if (row.rotation) {
          const rad = row.rotation * Math.PI / 180
          const cos = Math.cos(rad)
          const sin = Math.sin(rad)
          const corners = [
            [rowMinX - rowX, rowMinY - rowY],
            [rowMaxX - rowX, rowMinY - rowY],
            [rowMinX - rowX, rowMaxY - rowY],
            [rowMaxX - rowX, rowMaxY - rowY]
          ]
          let rotMinX = Infinity, rotMinY = Infinity, rotMaxX = -Infinity, rotMaxY = -Infinity
          corners.forEach(([cx, cy]) => {
            const rx = cx * cos - cy * sin
            const ry = cx * sin + cy * cos
            rotMinX = Math.min(rotMinX, rx)
            rotMinY = Math.min(rotMinY, ry)
            rotMaxX = Math.max(rotMaxX, rx)
            rotMaxY = Math.max(rotMaxY, ry)
          })
          rowMinX = rowX + rotMinX
          rowMinY = rowY + rotMinY
          rowMaxX = rowX + rotMaxX
          rowMaxY = rowY + rotMaxY
        } else {
          rowMinX += rowX
          rowMinY += rowY
          rowMaxX += rowX
          rowMaxY += rowY
        }
        
        // 视口裁剪判断：排的包围盒与视口无交集则跳过
        if (rowMaxX < viewLeft || rowMinX > viewRight || 
            rowMaxY < viewTop || rowMinY > viewBottom) {
          return  // 跳过视口外的排（性能优化关键）
        }
      }
      
      renderRowGroup(row, section, { viewLeft, viewTop, viewRight, viewBottom })
    })
  })

  layer.batchDraw()
  
  // 【性能优化】填充节点缓存
  populateCaches()
  
  // 【修复】渲染完成后自适应缩放
  requestAnimationFrame(() => {
    fitContentToView()
  })
}

// 渲染排 Group
const renderRowGroup = (row: SeatRow, section: Section, viewport?: { viewLeft: number, viewTop: number, viewRight: number, viewBottom: number }) => {
  if (!layer) return

  const rowX = row.x || 0
  const rowY = row.y || 0
  const rotation = row.rotation || 0
  const curve = row.curve || 0
  
  const curvedPositions = calculateCurvedPositions(row.seats, curve)

  // 排标签
  const logicalRadius = getLogicalRadius()
  
  // 【关键】提前计算 relativeScale，用于 LOD 判断
  const stageScale = stage?.scaleX() || 1
  const config = getRenderConfig()
  const relativeScale = stageScale / config.baseScale
  
  // 【调试】打印第一排的信息
  if (row.seats.length > 1) {
    const seat0 = row.seats[0]
    const seat1 = row.seats[1]
    const dist = Math.sqrt(Math.pow(seat1.x - seat0.x, 2) + Math.pow(seat1.y - seat0.y, 2))
    const config = getRenderConfig()
  }
  
  // 【修复】排标签精确定位 - 只在 Level 2 显示（圆形座位模式）
  if (relativeScale >= 1.0 && row.label && row.seats.length > 0) {
    const firstPos = curvedPositions[0]
    // 标签位置：第一个座位左侧，垂直居中
    const labelOffsetX = logicalRadius * 2.5  // 座位左侧偏移
    let labelX = rowX + firstPos.x - labelOffsetX
    let labelY = rowY + firstPos.y
    
    // 考虑旋转
    if (rotation) {
      const rad = rotation * Math.PI / 180
      const relX = labelX - rowX
      const relY = labelY - rowY
      labelX = rowX + relX * Math.cos(rad) - relY * Math.sin(rad)
      labelY = rowY + relX * Math.sin(rad) + relY * Math.cos(rad)
    }
    
    // 精确居中：创建后计算文本宽高
    const rowLabelText = new Konva.Text({
      x: labelX,
      y: labelY,
      text: row.label,
      fontSize: 10,  // 减小字体：12 -> 10
      fill: '#666',
      align: 'center',
      verticalAlign: 'middle',
      listening: false,
      name: 'row-label'  // 添加 name 用于 LOD 控制
    })
    // 设置 offset 让文本居中
    rowLabelText.offsetX(rowLabelText.width() / 2)
    rowLabelText.offsetY(rowLabelText.height() / 2)
    
    // 应用初始反向缩放，排标签使用较小的缩放比例
    const stageScale = stage?.scaleX() || 1
    const visualScale = Math.max(0.1, Math.min(5, 1 / stageScale))  // 限制范围 0.1~5（比之前小）
    rowLabelText.scaleX(visualScale)
    rowLabelText.scaleY(visualScale)
    
    layer.add(rowLabelText)
  }

  // 座位（直接添加到 layer，不使用 Group）
  // 使用统一的配置获取函数
  const { radius: configRadius, gap: configGap, rowGap: configRowGap, borderWidth, baseScale } = config
  
  // Level 0: 只显示分区色块和分区名，不渲染座位
  if (relativeScale < 2/3) {
    // 分区色块已在 renderSectionBorder 中渲染
    return
  }
  
  // Level 1: 座位条模式 - 使用线条表示整排座位（支持弧度和转折）
  if (relativeScale < 1.0) {
    if (row.seats.length > 0) {
      // 【优化】统一处理：提取所有座位位置作为一根连续线条的路径点
      const linePoints: number[] = []
      
      // 提取所有座位位置（包括转折排的所有段）
      curvedPositions.forEach(pos => {
        linePoints.push(rowX + pos.x, rowY + pos.y)
      })
      
      // 应用旋转（如果有）
      if (rotation) {
        const rad = rotation * Math.PI / 180
        const rotatedPoints: number[] = []
        
        for (let i = 0; i < linePoints.length; i += 2) {
          const relX = linePoints[i] - rowX
          const relY = linePoints[i + 1] - rowY
          const newX = rowX + relX * Math.cos(rad) - relY * Math.sin(rad)
          const newY = rowY + relX * Math.sin(rad) + relY * Math.cos(rad)
          rotatedPoints.push(newX, newY)
        }
        
        // 绘制一根连续的线条（自动处理转折处的连接）
        renderSeatLine(rotatedPoints, row, 0.4)
      } else {
        // 绘制一根连续的线条（自动处理转折处的连接）
        renderSeatLine(linePoints, row, 0.4)
      }
    }
  } else {
    // Level 2: 圆形座位模式（详细视图）- 添加座位级视口剔除
    row.seats.forEach((seat, index) => {
      const pos = curvedPositions[index]
      
      let x = rowX + pos.x
      let y = rowY + pos.y
      
      if (rotation) {
        const rad = rotation * Math.PI / 180
        const relX = x - rowX
        const relY = y - rowY
        x = rowX + relX * Math.cos(rad) - relY * Math.sin(rad)
        y = rowY + relX * Math.sin(rad) + relY * Math.cos(rad)
      }
      
      // 【性能优化】座位级视口剔除：只渲染视口内的座位
      if (viewport) {
        const { viewLeft, viewTop, viewRight, viewBottom } = viewport
        const seatRadius = logicalRadius
        if (x + seatRadius < viewLeft || x - seatRadius > viewRight ||
            y + seatRadius < viewTop || y - seatRadius > viewBottom) {
          return  // 座位在视口外，跳过渲染
        }
      }
      
      const isSelected = seat.status === SEAT_STATUS.SELECTED
      const color = getCategoryColor(seat.categoryKey)

      // 使用自定义 Shape 绘制三层同心结构（高性能）
      const seatShape = new Konva.Shape({
        x,
        y,
        name: 'seat-node',
        sceneFunc: (context, shape) => {
          const r = logicalRadius  // 内核心半径（已归一化）
          
          // 统一边框宽度（与未选中态一致）
          const borderLineWidth = borderWidth / baseScale
          
          // 【归一化】间隙需要除以 baseScale，确保视觉一致
          const gapWidth = 1 / baseScale  // 透明隔离带宽度（1px 视觉）
          
          // 统一使用边框颜色函数
          const borderColor = darkenColor(color, 50)
          
          // 【关键修复】每次都读取最新的 seat.status，而非闭包捕获的 isSelected
          const isCurrentlySelected = seat.status === SEAT_STATUS.SELECTED
          
          if (isCurrentlySelected) {
            // 选中态：三层同心结构
            
            // 1. 内核心（实心圆，原始分类色）
            context.beginPath()
            context.arc(0, 0, r, 0, Math.PI * 2)
            context.fillStyle = color
            context.fill()
            
            // 2. 中间隔离带（透明间隙）+ 外轮廓环（使用统一的 borderColor 和 borderLineWidth）
            // 外环的半径 = r + gapWidth + borderLineWidth/2
            context.beginPath()
            context.arc(0, 0, r + gapWidth + borderLineWidth / 2, 0, Math.PI * 2)
            context.strokeStyle = borderColor  // 使用统一的边框颜色
            context.lineWidth = borderLineWidth  // 使用统一的边框宽度
            context.stroke()
            
            // 3. 内衬标志（白色勾选图标）
            // 【归一化】勾选图标大小基于 r，但线宽需要归一化
            const checkSize = r * 1.2  // 从 0.75 增加到 1.2，更大更清晰
            context.beginPath()
            context.moveTo(-checkSize * 0.4, 0)
            context.lineTo(-checkSize * 0.1, checkSize * 0.3)
            context.lineTo(checkSize * 0.4, -checkSize * 0.3)
            context.strokeStyle = '#FFFFFF'
            context.lineWidth = Math.max(1 / baseScale, checkSize * 0.3)  // 从 0.25 增加到 0.3，更粗
            context.lineCap = 'round'
            context.lineJoin = 'round'
            context.stroke()
          } else {
            // 未选中态：实心圆 + 边框（与正常座位一致）
            context.beginPath()
            context.arc(0, 0, r, 0, Math.PI * 2)
            context.fillStyle = color
            context.fill()
            
            // 绘制边框（填充色加深 50%，更明显的边框）
            const borderColor = darkenColor(color, 50)
            context.beginPath()
            context.arc(0, 0, r, 0, Math.PI * 2)
            context.strokeStyle = borderColor
            context.lineWidth = borderWidth / baseScale  // 使用配置的 borderWidth
            context.stroke()
          }
          
          // Konva 要求调用 hitFunc 来生成命中区域
          context.fillStrokeShape(shape)
        },
        hitFunc: (context, shape) => {
          // 命中区域：选中时使用外轮廓，未选中时使用核心圆
          const r = logicalRadius
          const gapWidth = 1
          const borderLineWidth = borderWidth / baseScale  // 使用统一的边框宽度
          // 【关键修复】读取最新的 seat.status
          const isCurrentlySelected = seat.status === SEAT_STATUS.SELECTED
          const hitRadius = isCurrentlySelected ? r + gapWidth + borderLineWidth / 2 : r
          
          // 简单的圆形命中区域
          context.beginPath()
          context.arc(0, 0, hitRadius, 0, Math.PI * 2)
          context.fillStrokeShape(shape)
        }
      })

      // 点击事件 - 使用自定义 Shape（性能优化：直接重绘，不经过 watch）
      if (props.selectable !== false) {
        // 提取点击处理逻辑，同时用于 click 和 tap 事件
        const handleSeatClick = (e: any) => {
          e.cancelBubble = true
          
          // 直接根据 status 判断选中状态，不依赖颜色或自定义属性
          const currentlySelected = seat.status === SEAT_STATUS.SELECTED
          
          // 更新 status
          seat.status = currentlySelected ? SEAT_STATUS.AVAILABLE : SEAT_STATUS.SELECTED
          
          // 控制座位标签显隐
          if (currentlySelected) {
            // 取消选中 → 显示标签
            showSeatLabel(seat.id)
          } else {
            // 选中 → 隐藏标签
            hideSeatLabel(seat.id)
          }
          
          // 设置标志位，防止触发 watch 中的 updateSelection
          isInternalUpdate = true
          
          // 更新选中状态数组（通知父组件，但不触发自己的 watch）
          const currentSelected = new Set(props.selectedSeatIds || [])
          if (currentlySelected) {
            currentSelected.delete(seat.id)
          } else {
            currentSelected.add(seat.id)
          }
          emit('update:selectedSeatIds', Array.from(currentSelected))
          emit('seat-click', seat, row, section)
          
          // 直接重绘当前座位（不经过 updateSelection）
          layer?.draw()
        }
        
        // 同时绑定 click（PC）和 tap（移动端）事件
        seatShape.on('click', handleSeatClick)
        seatShape.on('tap', handleSeatClick)
        
        // 鼠标样式（无动画，只改光标）
        seatShape.on('mouseenter', () => {
          if (stage) stage.container().style.cursor = 'pointer'
        })
        seatShape.on('mouseleave', () => {
          if (stage) stage.container().style.cursor = 'default'
        })
      }

      if (layer) {
        layer.add(seatShape)
      }
      seatNodes.set(seat.id, seatShape as any)
      
      // 【性能优化】禁用座位标签渲染，提升性能
      // 座位标签在放大时会创建大量 Konva.Text 对象，严重影响性能
      // 如果需要显示座位编号，建议使用 hover 提示或其他方式
      /*
      // 座位标签（使用 stageScale >= 0.8 判断显示，选中时隐藏）
      const currentStageScale = stage?.scaleX() || 1
      const isCurrentlySelected = seat.status === SEAT_STATUS.SELECTED
      if (seat.label && layer && currentStageScale >= 0.8 && !isCurrentlySelected) {
        const fontSize = logicalRadius  // 字体大小等于座位半径，更清晰
        
        const text = new Konva.Text({
          x: x,
          y: y,
          text: String(seat.label),
          fontSize: fontSize,
          fill: '#333',
          align: 'center',
          verticalAlign: 'middle',
          listening: false,
          name: 'seat-label'  // 添加 name 用于 LOD 控制
        })
        text.offsetX(text.width() / 2)
        text.offsetY(text.height() / 2)
        layer.add(text)
        text.moveToTop()  // 确保座位标签在最上层
        
        // 存储标签引用
        seatLabels.set(seat.id, text)
      }
      */
    })
  }
}

// 更新座位选中状态（当 selectedSeatIds 变化时调用）- 性能优化版：只重绘变化的座位
const updateSelection = () => {
  // 【优化】只更新状态发生变化的座位，根据 status 字段判断
  const currentSelectedIds = new Set(props.selectedSeatIds || [])
  const needsRedraw: Konva.Shape[] = []  // 记录需要重绘的座位
  
  // 遍历所有座位节点，检查 status 是否需要同步
  seatNodes.forEach((shape, seatId) => {
    const isSelected = currentSelectedIds.has(seatId)
    
    // 查找座位数据以获取 status
    let seat: any = null
    props.venue.sections.forEach(section => {
      section.rows.forEach(row => {
        const found = row.seats.find(s => s.id === seatId)
        if (found) seat = found
      })
    })
    
    if (!seat) return
    
    // 根据 status 判断当前是否已选中（唯一的判断依据）
    const isCurrentlySelected = seat.status === SEAT_STATUS.SELECTED
    
    // 只有状态不一致时才更新（数据与视图同步）
    if (isSelected && seat.status !== SEAT_STATUS.SELECTED) {
      // 应该选中，但 status 不是 SELECTED → 更新为选中状态
      seat.status = SEAT_STATUS.SELECTED
      needsRedraw.push(shape as Konva.Shape)  // 记录需要重绘
      
      // 隐藏座位标签（选中时不显示）
      hideSeatLabel(seatId)
    } else if (!isSelected && seat.status === SEAT_STATUS.SELECTED) {
      // 应该取消，但 status 是 SELECTED → 恢复为未选中状态
      seat.status = SEAT_STATUS.AVAILABLE
      needsRedraw.push(shape as Konva.Shape)  // 记录需要重绘
      
      // 显示座位标签（取消选中时显示）
      showSeatLabel(seatId)
    }
  })
  
  // 性能优化：只重绘实际变化的座位，而非整个 layer
  needsRedraw.forEach(shape => {
    shape.drawScene()
    shape.drawHit()
  })
}

// 隐藏座位标签（使用存储的引用）
const hideSeatLabel = (seatId: string) => {
  const label = seatLabels.get(seatId)
  if (label) {
    label.visible(false)
  }
}

// 显示座位标签（使用存储的引用）
const showSeatLabel = (seatId: string) => {
  const label = seatLabels.get(seatId)
  if (label) {
    label.visible(true)
  }
}

// 查找座位数据（优化版，避免三重循环）
const findSeatById = (seatId: string): any => {
  for (const section of props.venue.sections) {
    for (const row of section.rows) {
      const seat = row.seats.find(s => s.id === seatId)
      if (seat) return seat
    }
  }
  return null
}

onMounted(() => {
  initStage()
  
  // 【关键】初次渲染前，确保 baseScale 已初始化
  const store = useVenueStore()
  const venueBaseScale = (props.venue as any).baseScale
  if (!venueBaseScale || venueBaseScale === 1) {
    // 如果 venue 没有 baseScale，使用当前 stageScale 初始化
    const currentStageScale = stage?.scaleX() || 1
    store.initBaseScale(currentStageScale)
    console.log('[SeatMapViewer] 初始化 baseScale:', currentStageScale)
  } else {
    console.log('[SeatMapViewer] 使用 venue.baseScale:', venueBaseScale)
  }
  
  // 先渲染，再自适应
  renderSeatMap()
  // 使用 requestAnimationFrame 确保渲染完成
  requestAnimationFrame(() => {
    // 入场动画：平滑缩放到最佳视角
    fitContentWithAnimation()
  })
})

// 监听选中状态变化，更新座位颜色（仅外部修改时触发）
let isInternalUpdate = false  // 标志位：是否为内部点击触发

watch(() => props.selectedSeatIds, () => {
  // 如果是内部点击触发的更新，跳过（点击事件已经重绘了）
  if (isInternalUpdate) {
    isInternalUpdate = false
    return
  }
  
  // 外部修改（如全选按钮），需要同步 status 和重绘
  updateSelection()
}, { deep: true })

// 【修复】监听 venue 的 sections 变化，重新渲染并自适应
watch(() => props.venue.sections, (newSections, oldSections) => {
  // 只在 sections 真正变化时重新渲染（比较引用或长度）
  if (newSections !== oldSections || newSections.length !== oldSections?.length) {
    isInitialFit = true // 重置标志，允许重新自适应
    renderSeatMap()
    requestAnimationFrame(() => {
      fitContentToView()
    })
  }
})

onUnmounted(() => {
  if (stage) {
    stage.destroy()
    stage = null
  }
})

// 判断是否是弯曲边
const isCurvedEdge = (point: PathPoint) => point.type === 'arc' && Math.abs(point.arcDepth ?? 0) > 0.0001

// 创建圆弧段（SVG Arc）
const createArcSegment = (start: PathPoint, end: PathPoint, depth: number): string => {
  const dx = end.x - start.x
  const dy = end.y - start.y
  const length = Math.sqrt(dx * dx + dy * dy) || 1
  
  const sagitta = length * Math.abs(depth) * 0.5
  const halfChord = length / 2
  let radius = (sagitta * sagitta + halfChord * halfChord) / (2 * Math.max(sagitta, 0.001))
  radius = Math.max(radius, halfChord)
  
  const sweepFlag = depth > 0 ? 1 : 0
  
  return `M ${start.x} ${start.y} A ${radius} ${radius} 0 0 ${sweepFlag} ${end.x} ${end.y}`
}

// 将路径点转换为 SVG Path 数据
const pathPointsToSvgPath = (points: PathPoint[]): string => {
  if (points.length < 2) return ''
  
  let path = `M ${points[0].x} ${points[0].y}`

  points.forEach((start, index) => {
    const end = points[(index + 1) % points.length]

    if (isCurvedEdge(start)) {
      path += ' ' + createArcSegment(start, end, start.arcDepth ?? 0).replace(`M ${start.x} ${start.y} `, '')
    } else {
      path += ` L ${end.x} ${end.y}`
    }
  })
  
  path += ' Z'
  return path
}

// 渲染分区标签（仅名称，无边框）- 用于预览模式
const renderSectionLabel = (section: Section) => {
  if (!layer || !section.name) return
  
  let labelX = section.borderX || 0
  let labelY = section.borderY || 0
  
  // 根据不同类型计算中心点
  if (section.borderType === 'rect') {
    labelX += (section.borderWidth || 100) / 2
    labelY += (section.borderHeight || 100) / 2
  } else if (section.borderType === 'ellipse') {
    labelX += (section.borderRadiusX || 50) / 2
    labelY += (section.borderRadiusY || 50) / 2
  } else if (section.borderType === 'polygon' && section.borderPoints) {
    // 计算多边形中心
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
    for (let i = 0; i < section.borderPoints.length; i += 2) {
      minX = Math.min(minX, section.borderPoints[i])
      minY = Math.min(minY, section.borderPoints[i + 1])
      maxX = Math.max(maxX, section.borderPoints[i])
      maxY = Math.max(maxY, section.borderPoints[i + 1])
    }
    labelX += (minX + maxX) / 2
    labelY += (minY + maxY) / 2
  } else if (section.borderType === 'path' && section.borderPathPoints) {
    // 计算路径中心
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
    section.borderPathPoints.forEach(p => {
      minX = Math.min(minX, p.x)
      minY = Math.min(minY, p.y)
      maxX = Math.max(maxX, p.x)
      maxY = Math.max(maxY, p.y)
    })
    labelX += (minX + maxX) / 2
    labelY += (minY + maxY) / 2
  }
  
  // 获取舞台缩放比例，用于反向缩放保持视觉大小恒定
  const stageScale = stage?.scaleX() || 1
  const visualScale = 1 / stageScale
  
  const text = new Konva.Text({
    x: labelX,
    y: labelY,
    text: section.name,
    fontSize: 10,  // 固定字体大小
    fontStyle: 'bold',
    fill: '#666',
    align: 'center',
    verticalAlign: 'middle'
  })
  
  // 居中显示
  text.offsetX(text.width() / 2)
  text.offsetY(text.height() / 2)
  
  // 设置缩放变换，保持视觉大小恒定
  text.scaleX(visualScale)
  text.scaleY(visualScale)
  
  layer.add(text)
}

// 渲染分区边框
const renderSectionBorder = (section: Section, previewMode: boolean = false) => {
  if (!layer || !section.borderType || section.borderType === 'none') return

  const fillColor = section.borderFill || 'rgba(128,128,128,0.15)'
  const strokeColor = section.borderStroke || '#808080'
  // 预览模式：边框宽度为 0；编辑模式：边框宽度为 1
  const strokeWidth = previewMode ? 0 : 1

  if (section.borderType === 'rect') {
    layer.add(new Konva.Rect({
      x: section.borderX || 0,
      y: section.borderY || 0,
      width: section.borderWidth || 100,
      height: section.borderHeight || 100,
      fill: fillColor,
      stroke: strokeColor,
      strokeWidth: strokeWidth,
      name: 'section-border'  // 用于 LOD 控制
    }))
  } else if (section.borderType === 'ellipse') {
    layer.add(new Konva.Ellipse({
      x: section.borderX || 0,
      y: section.borderY || 0,
      radiusX: section.borderRadiusX || 50,
      radiusY: section.borderRadiusY || 50,
      fill: fillColor,
      stroke: strokeColor,
      strokeWidth: strokeWidth,
      name: 'section-border'
    }))
  } else if (section.borderType === 'polygon' && section.borderPoints) {
    layer.add(new Konva.Line({
      x: section.borderX || 0,
      y: section.borderY || 0,
      points: section.borderPoints,
      closed: true,
      fill: fillColor,
      stroke: strokeColor,
      strokeWidth: strokeWidth,
      name: 'section-border'
    }))
  } else if (section.borderType === 'path' && section.borderPathPoints) {
    // 使用 SVG Path 渲染带弧度的路径
    const pathData = pathPointsToSvgPath(section.borderPathPoints)
    layer.add(new Konva.Path({
      x: section.borderX || 0,
      y: section.borderY || 0,
      data: pathData,
      fill: fillColor,
      stroke: strokeColor,
      strokeWidth: strokeWidth,
      name: 'section-border'
    }))
  }

  // 渲染分区标签 - 计算分区中心位置
  if (section.name) {
    let labelX = section.borderX || 0
    let labelY = section.borderY || 0
    
    // 根据不同类型计算中心点
    if (section.borderType === 'rect') {
      labelX += (section.borderWidth || 100) / 2
      labelY += (section.borderHeight || 100) / 2
    } else if (section.borderType === 'ellipse') {
      labelX += (section.borderRadiusX || 50) / 2
      labelY += (section.borderRadiusY || 50) / 2
    } else if (section.borderType === 'polygon' && section.borderPoints) {
      // 计算多边形中心
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
      for (let i = 0; i < section.borderPoints.length; i += 2) {
        minX = Math.min(minX, section.borderPoints[i])
        minY = Math.min(minY, section.borderPoints[i + 1])
        maxX = Math.max(maxX, section.borderPoints[i])
        maxY = Math.max(maxY, section.borderPoints[i + 1])
      }
      labelX += (minX + maxX) / 2
      labelY += (minY + maxY) / 2
    } else if (section.borderType === 'path' && section.borderPathPoints) {
      // 计算路径中心
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
      section.borderPathPoints.forEach(p => {
        minX = Math.min(minX, p.x)
        minY = Math.min(minY, p.y)
        maxX = Math.max(maxX, p.x)
        maxY = Math.max(maxY, p.y)
      })
      labelX += (minX + maxX) / 2
      labelY += (minY + maxY) / 2
    }
    
    // 获取舞台缩放比例，分区标签使用更温和的缩放
    const stageScale = stage?.scaleX() || 1
    // 使用更温和的平方根缩放，系数 1.2（比之前 1.5 小）
    const visualScale = 1.2 / Math.sqrt(stageScale)
    
    const text = new Konva.Text({
      x: labelX,
      y: labelY,
      text: section.name,
      fontSize: 10,  // 减小字体：12 -> 10（与排标签一致）
      fontStyle: 'bold',
      fill: 'rgba(102, 102, 102, 0.6)',  // 添加透明度，让标签更柔和
      align: 'center',
      verticalAlign: 'middle',
      name: 'section-label'  // 添加 name 用于识别
    })
    
    // 居中显示
    text.offsetX(text.width() / 2)
    text.offsetY(text.height() / 2)
    
    // 设置缩放变换，分区标签更低调一些
    const safeVisualScale = Math.max(0.3, Math.min(2.5, visualScale))  // 限制范围 0.3~2.5（比之前小）
    text.scaleX(safeVisualScale)
    text.scaleY(safeVisualScale)
    
    // 低缩放层级时隐藏分区标签（stageScale < 1.0 时不显示）
    text.visible(stageScale >= 1.0)
    
    layer.add(text)
  }
}

// 【性能优化】更新所有 label 的缩放（使用缓存替代 layer.find()）
const updateLabelScale = () => {
  if (!stage || !layer) return
  
  const stageScale = stage.scaleX()
  
  sectionLabelNodes.forEach(text => {
    if (stageScale < 1.0) {
      text.visible(false)
    } else {
      text.visible(true)
      const vs = 1.2 / Math.sqrt(Math.max(0.1, stageScale))
      const safeVisualScale = Math.max(0.3, Math.min(2.5, vs))
      text.scaleX(safeVisualScale)
      text.scaleY(safeVisualScale)
    }
  })
  
  rowLabelNodes.forEach(text => {
    const vs = 1 / Math.max(0.1, stageScale)
    const safeVisualScale = Math.max(0.2, Math.min(5, vs))
    text.scaleX(safeVisualScale)
    text.scaleY(safeVisualScale)
  })
  
  layer.batchDraw()
}

defineExpose({ 
  refresh: renderSeatMap, 
  updateSelection,
  // 清空所有选中（性能优化）
  clearAllSelection: () => {
    // 1. 设置标志位，阻止 watch 触发 updateSelection
    isInternalUpdate = true
    
    // 2. 通知父组件（触发 watch，但会被标志位拦截）
    emit('update:selectedSeatIds', [])
    
    // 3. 直接遍历所有座位数据，重置 status（避开三重循环）
    // 使用 for...of 提前退出，比 forEach 快
    for (const section of props.venue.sections) {
      for (const row of section.rows) {
        for (const seat of row.seats) {
          if (seat.status === SEAT_STATUS.SELECTED) {
            seat.status = SEAT_STATUS.AVAILABLE
          }
        }
      }
    }
    
    // 4. 批量重绘（一次完成）
    layer?.draw()
    
    // 5. 重置标志位
    setTimeout(() => {
      isInternalUpdate = false
    }, 0)
  },
  // 新增：获取舞台状态供 Minimap 使用
  getStageState: () => ({
    scale: stage?.scaleX() || 1,
    position: stage?.position() || { x: 0, y: 0 },
    width: stage?.width() || 0,
    height: stage?.height() || 0
  }),
  getVenueBounds: () => {
    // 【关键】使用固定的内容边界，不受缩放影响
    // 计算所有图形元素的原始坐标边界（舞台坐标）
    if (!layer) return { x: 0, y: 0, width: 0, height: 0 }
    
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
    
    layer.getChildren().forEach((child: any) => {
      // 直接读取节点的 x, y, width, height 属性（不受缩放影响）
      const x = child.x()
      const y = child.y()
      const width = child.width ? child.width() : 0
      const height = child.height ? child.height() : 0
      
      // 对于没有 width/height 的节点（如 Circle），使用半径计算
      const radius = child.radius ? child.radius() : 0
      const nodeMinX = radius > 0 ? x - radius : x
      const nodeMinY = radius > 0 ? y - radius : y
      const nodeMaxX = radius > 0 ? x + radius : x + width
      const nodeMaxY = radius > 0 ? y + radius : y + height
      
      minX = Math.min(minX, nodeMinX)
      minY = Math.min(minY, nodeMinY)
      maxX = Math.max(maxX, nodeMaxX)
      maxY = Math.max(maxY, nodeMaxY)
    })
    
    if (minX === Infinity) return { x: 0, y: 0, width: 0, height: 0 }
    
    return {
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY
    }
  },
  getSelectedSeats: () => {
    // 返回已选座位的坐标
    const selected: Array<{ x: number; y: number }> = []
    seatNodes.forEach((node, id) => {
      if (props.selectedSeatIds?.includes(id)) {
        selected.push({ x: node.x(), y: node.y() })
      }
    })
    return selected
  }
})
</script>

<style scoped>
.seat-map-viewer {
  width: 100%;
  height: 100%;
  background: white;
  border-radius: 12px;
  overflow: hidden;
}
</style>
