<template>
  <div class="chart-designer">
    <!-- 顶部工具栏 -->
    <TopToolbar :chart-name="chartName" />
    
    <!-- 主内容区 -->
    <div class="designer-main">
      <!-- 左侧工具栏 - 当前工具: {{ currentTool }} -->
      <LeftToolbar 
        :current-tool="currentTool"
        @select-tool="drawing.setTool"
      />
      
      <!-- 中间画布区域 -->
      <div 
        class="canvas-container" 
        ref="containerRef"
        :class="{ 
          'is-placing': drawingState !== 'idle', 
          'is-dragging': isDraggingRow,
          'is-panning': isDragging 
        }"
      >
        <div 
          class="canvas-wrapper"
          :style="canvasTransformStyle"
        >
          <!-- SVG 画布 -->
          <svg 
            ref="svgRef"
            class="chart-svg" 
            :viewBox="`${-offsetX/scale} ${-offsetY/scale} ${canvasWidth/scale} ${canvasHeight/scale}`"
            :width="canvasWidth"
            :height="canvasHeight"
            @mousedown="handleMouseDown"
            @mousemove="handleMouseMove"
            @mouseup="handleMouseUp"
            @mouseleave="handleMouseUp"
            @wheel="handleWheel"
          >
            <!-- 定义 -->
            <defs>
              <pattern 
                id="dot-grid" 
                :width="gridSize" 
                :height="gridSize" 
                patternUnits="userSpaceOnUse"
              >
                <circle cx="1" cy="1" r="1" fill="var(--canvas-dot)" opacity="0.6"/>
              </pattern>
            </defs>
            
            <!-- 背景网格 -->
            <rect 
              v-if="showGrid" 
              :width="canvasWidth" 
              :height="canvasHeight" 
              fill="url(#dot-grid)" 
            />
            
            <!-- 辅助线 -->
            <g class="guide-lines" v-if="guideLines.x !== undefined || guideLines.y !== undefined">
              <line 
                v-if="guideLines.x !== undefined"
                :x1="guideLines.x" 
                :y1="-offsetY/scale - 1000" 
                :x2="guideLines.x" 
                :y2="canvasHeight - offsetY/scale + 1000"
                stroke="#3b82f6" 
                stroke-width="1" 
                stroke-dasharray="4 4"
              />
              <line 
                v-if="guideLines.y !== undefined"
                :x1="-offsetX/scale - 1000" 
                :y1="drawing.guideLines.value.y" 
                :x2="canvasWidth - offsetX/scale + 1000" 
                :y2="guideLines.y"
                stroke="#3b82f6" 
                stroke-width="1" 
                stroke-dasharray="4 4"
              />
            </g>
            
            <!-- 已创建的排 -->
            <g 
              v-for="row in rows" 
              :key="row.id"
              class="row-group"
              :class="{ selected: selectedRowId === row.id }"
              :transform="`translate(${row.x}, ${row.y}) rotate(${row.rotation})`"
              @mousedown.stop="handleRowMouseDown(row, $event)"
            >
              <!-- 选中框 -->
              <g v-if="selectedRowId === row.id">
                <rect 
                  :x="-10" 
                  :y="-25" 
                  :width="(row.seats.length * 28) + 20" 
                  height="50" 
                  fill="none" 
                  stroke="#3b82f6" 
                  stroke-width="2"
                  rx="4"
                />
                <!-- 旋转控制点 -->
                <circle 
                  :cx="(row.seats.length * 28) / 2" 
                  cy="-35" 
                  r="6" 
                  fill="#3b82f6" 
                  stroke="white" 
                  stroke-width="2"
                  class="rotate-handle"
                  @mousedown.stop="startRotate($event, row)"
                />
                <line 
                  :x1="(row.seats.length * 28) / 2" 
                  :y1="-25" 
                  :x2="(row.seats.length * 28) / 2" 
                  :y2="-35"
                  stroke="#3b82f6" 
                  stroke-width="2"
                />
              </g>
              
              <!-- 排内的座位 -->
              <g 
                v-for="(seat, index) in row.seats" 
                :key="seat.id"
                class="seat"
                :transform="`translate(${index * 28}, 0)`"
              >
                <circle 
                  r="12" 
                  :fill="getSeatColor(seat)"
                  stroke="white"
                  stroke-width="2"
                />
                <text 
                  v-if="scale > 0.6"
                  y="4"
                  text-anchor="middle"
                  font-size="9"
                  font-weight="600"
                  fill="white"
                  style="pointer-events: none;"
                >
                  {{ seat.label }}
                </text>
              </g>
            </g>
            
            <!-- 预览排（正在创建中） -->
            <g 
              v-if="previewRow"
              class="preview-row"
              :transform="`translate(${previewRow.x}, ${previewRow.y}) rotate(${previewRow.rotation})`"
            >
              <g 
                v-for="(seat, index) in previewRow.seats" 
                :key="seat.id"
                class="seat preview"
                :transform="`translate(${index * 28}, 0)`"
              >
                <circle 
                  r="12" 
                  fill="#22a559"
                  stroke="white"
                  stroke-width="2"
                  opacity="0.7"
                />
                <text 
                  y="4"
                  text-anchor="middle"
                  font-size="9"
                  font-weight="600"
                  fill="white"
                  opacity="0.7"
                  style="pointer-events: none;"
                >
                  {{ seat.label }}
                </text>
              </g>
              
              <!-- 起点标记 -->
              <circle r="4" fill="#3b82f6" />
              
              <!-- 连接线 -->
              <line 
                x1="0" 
                y1="0" 
                :x2="(previewRow.seats.length - 1) * 28" 
                y2="0"
                stroke="#3b82f6"
                stroke-width="2"
                stroke-dasharray="4 4"
              />
            </g>
          </svg>
        </div>

        <!-- 画布导航器（左下角） -->
        <CanvasNavigator 
          v-model:scale="scale"
          :rotation="rotation"
        />
      </div>
      
      <!-- 右侧面板 -->
      <RightPanel 
        :chart-name="chartName"
        :categories="categories"
        :total-seats="rows.reduce((sum, row) => sum + row.seats.length, 0)"
        :selected-row="selectedRow"
        @update-row="handleUpdateRow"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { Icon } from '@iconify/vue'
import TopToolbar from './TopToolbar.vue'
import LeftToolbar from './LeftToolbar.vue'
import RightPanel from './RightPanel.vue'
import CanvasNavigator from './CanvasNavigator.vue'
import { useDrawing } from '../composables/useDrawing'
import type { Row, Seat } from '../types'

// 画布配置
const canvasWidth = 3000
const canvasHeight = 2000
const gridSize = 20
const showGrid = ref(true)

// Refs
const svgRef = ref<SVGSVGElement>()

// 视图状态
const scale = ref(1)
const rotation = ref(0)
const offsetX = ref(canvasWidth / 2)
const offsetY = ref(canvasHeight / 2)
const isDragging = ref(false)
const dragStart = ref({ x: 0, y: 0 })

// 旋转相关
const isRotating = ref(false)
const rotateStartAngle = ref(0)
const rotateStartMouseAngle = ref(0)
const rotatingRowId = ref<string | null>(null)

// 使用绘制逻辑
const drawing = useDrawing()

// 解构 refs，模板中可直接使用
const { 
  currentTool, 
  drawingState, 
  previewRow, 
  rows, 
  selectedRowId, 
  selectedRow,
  isDraggingRow,
  guideLines 
} = drawing

// 画布变换样式
const canvasTransformStyle = computed(() => {
  return {
    transform: `translate(${offsetX.value}px, ${offsetY.value}px) scale(${scale.value})`,
    transformOrigin: '0 0',
    transition: isDragging.value ? 'none' : 'transform 0.1s ease-out'
  }
})

// 图表数据
const chartName = ref('Small theatre with GA')

const categories = ref([
  { id: '1', name: 'Balcony', color: '#22a559', accessible: true },
  { id: '2', name: 'Ground Floor', color: '#e85d4c', accessible: true },
  { id: '3', name: 'Wheelchair', color: '#3b82f6', accessible: true }
])

// 计算总座位数


// 获取座位颜色
function getSeatColor(seat: Seat) {
  const category = categories.value.find(c => c.id === seat.categoryId)
  return category?.color || '#22a559'
}

// 获取 SVG 坐标
function getSvgPoint(clientX: number, clientY: number) {
  if (!svgRef.value) return { x: 0, y: 0 }
  
  const ctm = svgRef.value.getScreenCTM()
  if (!ctm) return { x: 0, y: 0 }
  
  const pt = svgRef.value.createSVGPoint()
  pt.x = clientX
  pt.y = clientY
  
  // 转换为 SVG 坐标系
  const svgP = pt.matrixTransform(ctm.inverse())
  
  return {
    x: svgP.x,
    y: svgP.y
  }
}

// 鼠标事件处理
function handleMouseDown(e: MouseEvent) {
  const pos = getSvgPoint(e.clientX, e.clientY)
  
  // 中键或 Shift+左键 = 平移画布
  if (e.button === 1 || (e.button === 0 && e.shiftKey)) {
    isDragging.value = true
    dragStart.value = { x: e.clientX - offsetX.value, y: e.clientY - offsetY.value }
    e.preventDefault()
    return
  }
  
  // 左键点击
  if (e.button === 0) {
    // 如果是座位工具且正在放置中，完成放置
    if (currentTool === 'seat' && drawingState === 'placingStart') {
      drawing.finishPlacing()
      return
    }
    
    // 如果是座位工具且空闲，开始放置
    if (currentTool === 'seat' && drawingState === 'idle') {
      startPlacing(pos)
      return
    }
    
    // 选择工具：取消选择
    if (currentTool === 'select') {
      drawing.selectRow(null)
    }
  }
}

function handleRowMouseDown(row: Row, e: MouseEvent) {
  if (currentTool !== 'select') return
  
  const pos = getSvgPoint(e.clientX, e.clientY)
  drawing.startDragRow(row.id, pos)
  e.stopPropagation()
}

function handleMouseMove(e: MouseEvent) {
  const pos = getSvgPoint(e.clientX, e.clientY)
  
  // 平移画布
  if (isDragging.value) {
    offsetX.value = e.clientX - dragStart.value.x
    offsetY.value = e.clientY - dragStart.value.y
    return
  }
  
  // 更新放置预览
  if (drawingState === 'placingStart') {
    drawing.updatePlacing(pos)
  }
  
  // 拖拽排
  if (isDraggingRow) {
    drawing.updateDragRow(pos)
  }
  
  // 旋转
  if (isRotating.value && rotatingRowId.value) {
    const row = rows.find(r => r.id === rotatingRowId.value)
    if (!row) return
    
    const angleRad = Math.atan2(pos.y - row.y, pos.x - row.x)
    const angleDeg = angleRad * 180 / Math.PI + 90 // +90 因为控制点在上方
    drawing.updateRowRotation(rotatingRowId.value, angleDeg)
  }
}

function handleMouseUp(e: MouseEvent) {
  isDragging.value = false
  drawing.endDragRow()
  isRotating.value = false
  rotatingRowId.value = null
}

// 滚轮缩放
function handleWheel(e: WheelEvent) {
  e.preventDefault()
  const delta = e.deltaY > 0 ? 0.9 : 1.1
  const newScale = Math.max(0.1, Math.min(5, scale.value * delta))
  
  // 以鼠标位置为中心缩放
  const rect = svgRef.value?.getBoundingClientRect()
  if (rect) {
    const mouseX = e.clientX - rect.left
    const mouseY = e.clientY - rect.top
    
    // 计算新的偏移量以保持鼠标位置不变
    offsetX.value = mouseX - (mouseX - offsetX.value) * (newScale / scale.value)
    offsetY.value = mouseY - (mouseY - offsetY.value) * (newScale / scale.value)
  }
  
  scale.value = newScale
}

// 开始旋转
function startRotate(e: MouseEvent, row: Row) {
  isRotating.value = true
  rotatingRowId.value = row.id
  rotateStartAngle.value = row.rotation
  e.stopPropagation()
  e.preventDefault()
}

// 更新排
function handleUpdateRow(updatedRow: Row) {
  const index = rows.value.findIndex(r => r.id === updatedRow.id)
  if (index !== -1) {
    rows.value[index] = updatedRow
  }
}
</script>

<style scoped>
.chart-designer {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: var(--color-bg);
  overflow: hidden;
}

.designer-main {
  display: flex;
  flex: 1;
  overflow: hidden;
}

.canvas-container {
  flex: 1;
  position: relative;
  overflow: hidden;
  background: var(--color-bg);
  cursor: default;
}

.canvas-container.is-panning,
.canvas-container:active {
  cursor: move;
}

.canvas-container.is-placing {
  cursor: crosshair;
}

.canvas-container.is-dragging {
  cursor: move;
}

.canvas-wrapper {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
}

.chart-svg {
  display: block;
  width: 100%;
  height: 100%;
}

/* 排组 */
.row-group {
  cursor: move;
}

.row-group:hover .seat circle {
  filter: brightness(1.1);
}

.row-group.selected .seat circle {
  filter: brightness(1.1);
}

/* 座位 */
.seat {
  cursor: pointer;
}

.seat circle {
  transition: all 0.15s;
}

/* 预览排 */
.preview-row .seat.preview circle {
  animation: pulse 1.5s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 0.7; }
  50% { opacity: 0.9; }
}

/* 旋转手柄 */
.rotate-handle {
  cursor: grab;
}

.rotate-handle:active {
  cursor: grabbing;
}

/* 辅助线 */
.guide-lines line {
  pointer-events: none;
}
</style>
