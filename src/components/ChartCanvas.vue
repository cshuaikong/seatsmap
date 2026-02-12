<template>
  <div 
    class="chart-canvas"
    :class="[`tool-${currentTool}`]"
    @wheel.prevent="handleWheel"
  >
    <svg
      ref="svgRef"
      class="chart-svg"
      :width="chart.width"
      :height="chart.height"
      :viewBox="viewBox"
      @mousedown="handleSvgMouseDown"
      @mousemove="handleSvgMouseMove"
      @mouseup="handleSvgMouseUp"
      @click="handleSvgClick"
    >
      <!-- 定义 -->
      <defs>
        <!-- 网格图案 -->
        <pattern
          id="grid"
          :width="snapGridSize"
          :height="snapGridSize"
          patternUnits="userSpaceOnUse"
        >
          <path
            :d="`M ${snapGridSize} 0 L 0 0 0 ${snapGridSize}`"
            fill="none"
            stroke="#e0e0e0"
            stroke-width="0.5"
          />
        </pattern>
        
        <!-- 选中效果滤镜 -->
        <filter id="glow">
          <feGaussianBlur stdDeviation="2.5" result="coloredBlur"/>
          <feMerge>
            <feMergeNode in="coloredBlur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
      </defs>
      
      <!-- 背景网格 -->
      <rect
        v-if="showGrid"
        :width="chart.width"
        :height="chart.height"
        fill="url(#grid)"
      />
      
      <!-- 图表背景 -->
      <rect
        :width="chart.width"
        :height="chart.height"
        fill="transparent"
        class="chart-background"
      />
      
      <!-- 区域列表 -->
      <SeatSection
        v-for="section in chart.sections"
        :key="section.id"
        :section="section"
        :categories="chart.categories"
        :show-row-labels="showRowLabels"
        :show-seat-labels="showSeatLabels"
        @select-section="handleSelectSection"
        @select-row="handleSelectRow"
        @select-seat="handleSelectSeat"
      />
      
      <!-- 临时预览（添加排时使用） -->
      <g v-if="previewRow && currentTool === 'row'" class="preview-row" opacity="0.5">
        <circle
          v-for="(point, i) in previewRow.points"
          :key="i"
          :cx="point.x"
          :cy="point.y"
          r="12"
          fill="none"
          stroke="#2196F3"
          stroke-width="2"
          stroke-dasharray="4 4"
        />
        <line
          :x1="previewRow.start.x"
          :y1="previewRow.start.y"
          :x2="previewRow.end.x"
          :y2="previewRow.end.y"
          stroke="#2196F3"
          stroke-width="1"
          stroke-dasharray="4 4"
        />
      </g>
      
      <!-- 选框（框选模式） -->
      <rect
        v-if="selectionRect"
        :x="selectionRect.x"
        :y="selectionRect.y"
        :width="selectionRect.width"
        :height="selectionRect.height"
        fill="rgba(33, 150, 243, 0.1)"
        stroke="#2196F3"
        stroke-width="1"
        stroke-dasharray="4 4"
      />
    </svg>
    
    <!-- 缩放控制 -->
    <div class="zoom-controls">
      <button @click="zoomIn">+</button>
      <span>{{ Math.round(zoom * 100) }}%</span>
      <button @click="zoomOut">-</button>
      <button @click="resetZoom">⟲</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import type { ChartData, Point, Rect } from '../types'
import { useChartStore } from '../stores/chartStore'
import { screenToSvg, snapToGrid } from '../utils/geometry'
import SeatSection from './SeatSection.vue'

interface Props {
  chart: ChartData
}

const props = defineProps<Props>()
const store = useChartStore()

// Refs
const svgRef = ref<SVGSVGElement>()

// 响应式状态 (直接通过 store 访问保持响应性)
const currentTool = computed(() => store.currentTool)
const zoom = computed(() => store.zoom)
const pan = computed(() => store.pan)
const snapType = computed(() => store.snapType)
const snapGridSize = computed(() => store.snapGridSize)
const showGrid = computed(() => store.showGrid)
const showRowLabels = computed(() => store.showRowLabels)
const showSeatLabels = computed(() => store.showSeatLabels)

// 视图框
const viewBox = computed(() => {
  const width = props.chart.width / zoom.value
  const height = props.chart.height / zoom.value
  const x = -pan.value.x / zoom.value
  const y = -pan.value.y / zoom.value
  return `${x} ${y} ${width} ${height}`
})

// 拖拽状态
const isDragging = ref(false)
const dragStart = ref<Point>({ x: 0, y: 0 })
const lastPan = ref<Point>({ x: 0, y: 0 })

// 框选状态
const selectionRect = ref<Rect | null>(null)
const selectionStart = ref<Point>({ x: 0, y: 0 })

// 添加排预览
const previewRow = ref<{
  start: Point
  end: Point
  points: Point[]
} | null>(null)

// 工具函数：获取 SVG 坐标
function getSvgPoint(e: MouseEvent): Point {
  if (!svgRef.value) return { x: 0, y: 0 }
  return screenToSvg({ x: e.clientX, y: e.clientY }, svgRef.value)
}

function getSnappedPoint(point: Point): Point {
  if (snapType.value === 'grid') {
    return snapToGrid(point, snapGridSize.value)
  }
  return point
}

// 事件处理
function handleSvgMouseDown(e: MouseEvent) {
  const point = getSvgPoint(e)
  
  if (currentTool.value === 'pan' || e.button === 1) {
    // 平移模式或中键拖拽
    isDragging.value = true
    dragStart.value = { x: e.clientX, y: e.clientY }
    lastPan.value = { x: pan.value.x, y: pan.value.y }
    return
  }
  
  if (currentTool.value === 'select' && !e.shiftKey) {
    // 开始框选
    selectionStart.value = point
    selectionRect.value = {
      x: point.x,
      y: point.y,
      width: 0,
      height: 0
    }
  }
  
  if (currentTool.value === 'row') {
    // 开始添加排
    const snapped = getSnappedPoint(point)
    previewRow.value = {
      start: snapped,
      end: snapped,
      points: []
    }
  }
}

function handleSvgMouseMove(e: MouseEvent) {
  const point = getSvgPoint(e)
  
  if (isDragging.value) {
    // 平移
    const dx = e.clientX - dragStart.value.x
    const dy = e.clientY - dragStart.value.y
    store.pan = {
      x: lastPan.value.x + dx,
      y: lastPan.value.y + dy
    }
    return
  }
  
  if (selectionRect.value) {
    // 更新框选框
    const width = point.x - selectionStart.value.x
    const height = point.y - selectionStart.value.y
    selectionRect.value = {
      x: width > 0 ? selectionStart.value.x : point.x,
      y: height > 0 ? selectionStart.value.y : point.y,
      width: Math.abs(width),
      height: Math.abs(height)
    }
  }
  
  if (previewRow.value && currentTool.value === 'row') {
    // 更新预览
    const snapped = getSnappedPoint(point)
    previewRow.value.end = snapped
    // TODO: 计算预览点位置
  }
}

function handleSvgMouseUp(e: MouseEvent) {
  isDragging.value = false
  
  if (selectionRect.value) {
    // 完成框选
    // TODO: 选择框内的座位
    selectionRect.value = null
  }
  
  if (previewRow.value && currentTool.value === 'row') {
    // 完成添加排
    // TODO: 调用 store.addRow()
    previewRow.value = null
  }
}

function handleSvgClick(e: MouseEvent) {
  // 只有点击空白处才清除选择
  if ((e.target as Element).classList.contains('chart-background')) {
    store.clearSelection()
  }
}

// 选择事件
function handleSelectSection(sectionId: string, additive: boolean) {
  store.selectSection(sectionId, additive)
}

function handleSelectRow(rowId: string, additive: boolean) {
  store.selectRow(rowId, additive)
}

function handleSelectSeat(seatId: string, additive: boolean) {
  store.selectSeat(seatId, additive)
}

// 缩放控制
function handleWheel(e: WheelEvent) {
  const delta = e.deltaY > 0 ? 0.9 : 1.1
  store.setZoom(zoom.value * delta)
}

function zoomIn() {
  store.setZoom(zoom.value * 1.2)
}

function zoomOut() {
  store.setZoom(zoom.value / 1.2)
}

function resetZoom() {
  store.resetView()
}
</script>

<style scoped>
.chart-canvas {
  width: 100%;
  height: 100%;
  overflow: hidden;
  background: #f5f5f5;
  position: relative;
}

.chart-svg {
  display: block;
  background: white;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.tool-select .chart-svg {
  cursor: default;
}

.tool-pan .chart-svg,
.tool-pan .chart-svg:active {
  cursor: grab;
}

.tool-seat .chart-svg,
.tool-row .chart-svg {
  cursor: crosshair;
}

.zoom-controls {
  position: absolute;
  bottom: 20px;
  right: 20px;
  display: flex;
  align-items: center;
  gap: 8px;
  background: white;
  padding: 8px 12px;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
}

.zoom-controls button {
  width: 32px;
  height: 32px;
  border: 1px solid #ddd;
  background: white;
  border-radius: 4px;
  cursor: pointer;
  font-size: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.zoom-controls button:hover {
  background: #f0f0f0;
}

.zoom-controls span {
  min-width: 50px;
  text-align: center;
  font-size: 14px;
  color: #666;
}

.preview-row circle {
  animation: pulse 1s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% {
    opacity: 0.5;
  }
  50% {
    opacity: 1;
  }
}
</style>
