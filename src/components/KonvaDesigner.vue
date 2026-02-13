<template>
  <div class="chart-designer">
    <!-- 顶部工具栏 -->
    <TopToolbar :chart-name="chartName" />

    <!-- 主内容区 -->
    <div class="designer-main">
      <!-- 左侧工具栏 -->
      <LeftToolbar
        :current-tool="currentTool"
        @tool-change="onToolChange"
      />

      <!-- 中间画布区域 -->
      <div class="canvas-container">
        <KonvaCanvas
          ref="canvasRef"
          :width="canvasWidth"
          :height="canvasHeight"
          :show-grid="showGrid"
          :venue-data="venueData"
          @ready="onCanvasReady"
          @seat-click="onSeatClick"
          @row-created="onRowCreated"
        />

        <!-- 状态栏 -->
        <div class="status-bar">
          <span class="status-item">
            <Icon icon="lucide:chair" class="status-icon" />
            座位总数: {{ totalSeats }}
          </span>
          <span class="status-item">
            <span class="status-dot status-available"></span>
            可用: {{ availableSeats }}
          </span>
          <span class="status-item">
            <span class="status-dot status-sold"></span>
            已售: {{ soldSeats }}
          </span>
          <span class="status-item">
            <span class="status-dot status-reserved"></span>
            已预定: {{ reservedSeats }}
          </span>
          <span class="status-item" style="margin-left: auto; color: var(--color-accent); font-weight: 600">
            <Icon icon="lucide:mouse-pointer-2" class="status-icon" />
            已选中: {{ selectedCount }}
          </span>
          <span class="status-item">
            当前工具: {{ currentToolLabel }}
          </span>
          <span class="status-item">
            缩放: {{ Math.round(zoomLevel * 100) }}%
          </span>
        </div>

        <!-- 控制按钮 -->
        <div class="control-buttons">
          <button @click="generateTestSeats" class="control-btn">
            <Icon icon="lucide:refresh-cw" class="btn-icon" />
            生成300座位
          </button>
          <button @click="clearCanvas" class="control-btn">
            <Icon icon="lucide:trash-2" class="btn-icon" />
            清空
          </button>
          <button @click="resetView" class="control-btn">
            <Icon icon="lucide:maximize" class="btn-icon" />
            重置视图
          </button>
        </div>
      </div>

      <!-- 右侧面板 -->
      <RightPanel
        :chart-name="chartName"
        :categories="categories"
        :total-seats="totalSeats"
        :selected-row="selectedRow"
        @update-row="() => {}"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { Icon } from '@iconify/vue'
import Konva from 'konva'
import TopToolbar from './TopToolbar.vue'
import LeftToolbar from './LeftToolbar.vue'
import RightPanel from './RightPanel.vue'
import KonvaCanvas from './KonvaCanvas.vue'
import type { ToolMode } from '../composables/useDrawing'
import type { VenueData, Seat, Row } from './KonvaCanvas.vue'

// 画布配置
const canvasWidth = 3000
const canvasHeight = 2000
const showGrid = ref(true)

// 视图状态
const zoomLevel = ref(1)

// 工具状态
const currentTool = ref<ToolMode>('select')

// 图表数据
const chartName = ref('高性能座位图编辑器')
const venueData = ref<any>(null)
const categories = ref<any[]>([
  { id: '1', name: '普通区', color: '#22a559', accessible: true },
  { id: '2', name: 'VIP区', color: '#e85d4c', accessible: true },
  { id: '3', name: '轮椅区', color: '#3b82f6', accessible: true }
])

const selectedRow = ref<any>(null)
const selectedSeatId = ref<string | null>(null)

// Canvas ref
const canvasRef = ref<InstanceType<typeof KonvaCanvas>>()

// 计算统计数据
const totalSeats = computed(() => {
  if (!venueData.value) return 0
  let count = 0
  venueData.value.sections.forEach((section: any) => {
    section.rows.forEach((row: any) => {
      count += row.seats.length
    })
  })
  return count
})

const availableSeats = computed(() => {
  if (!venueData.value) return 0
  let count = 0
  venueData.value.sections.forEach((section: any) => {
    section.rows.forEach((row: any) => {
      row.seats.forEach((seat: Seat) => {
        if (seat.status === 'available') count++
      })
    })
  })
  return count
})

const soldSeats = computed(() => {
  if (!venueData.value) return 0
  let count = 0
  venueData.value.sections.forEach((section: any) => {
    section.rows.forEach((row: any) => {
      row.seats.forEach((seat: Seat) => {
        if (seat.status === 'sold') count++
      })
    })
  })
  return count
})

const reservedSeats = computed(() => {
  if (!venueData.value) return 0
  let count = 0
  venueData.value.sections.forEach((section: any) => {
    section.rows.forEach((row: any) => {
      row.seats.forEach((seat: Seat) => {
        if (seat.status === 'reserved') count++
      })
    })
  })
  return count
})

const selectedCount = computed(() => {
  return canvasRef.value?.selectedSeatIds?.size || 0
})

const currentToolLabel = computed(() => {
  const labels: Record<string, string> = {
    'select': '选择',
    'drawRow': '画座位排',
    'drawCircle': '画圆形区域',
    'drawTable': '画桌子',
    'text': '文字标注',
    'stage': '舞台'
  }
  return labels[currentTool.value] || currentTool.value
})

// 事件处理
const onCanvasReady = (stage: Konva.Stage) => {
  console.log('Konva 画布就绪', stage)
}

const onSeatClick = (seatId: string) => {
  selectedSeatId.value = seatId
  console.log('座位点击:', seatId)
}

const onRowCreated = (seats: Seat[]) => {
  console.log('创建座位排:', seats)
  
  // 初始化场地数据
  if (!venueData.value) {
    venueData.value = { sections: [] }
  }

  // 创建一个新的区域来存放绘制的座位
  const sectionId = `section-custom-${Date.now()}`
  const rowId = `row-custom-${Date.now()}`
  
  // 计算边界
  let minX = Infinity, minY = Infinity
  let maxX = -Infinity, maxY = -Infinity
  
  seats.forEach(seat => {
    minX = Math.min(minX, seat.x)
    minY = Math.min(minY, seat.y)
    maxX = Math.max(maxX, seat.x)
    maxY = Math.max(maxY, seat.y)
  })

  // 创建新区域
  const newSection = {
    id: sectionId,
    name: `自定义区域 ${venueData.value.sections.length + 1}`,
    rows: [{
      id: rowId,
      label: `排${venueData.value.sections.length + 1}`,
      seats: seats
    }],
    x: minX - 30,
    y: minY - 30
  }

  venueData.value.sections.push(newSection)
}

const onToolChange = (tool: ToolMode) => {
  currentTool.value = tool
  // 通知 Canvas 工具已切换
  canvasRef.value?.setTool?.(tool)
}

const generateTestSeats = () => {
  if (!canvasRef.value) return
  const testData = canvasRef.value.generateTestData(300)
  venueData.value = testData
}

const clearCanvas = () => {
  venueData.value = null
  canvasRef.value?.clearSelection()
}

const resetView = () => {
  canvasRef.value?.resetView()
  zoomLevel.value = 1
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

/* 状态栏 */
.status-bar {
  position: absolute;
  top: 12px;
  left: 12px;
  right: 12px;
  background: var(--color-bg-secondary);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  padding: 8px 16px;
  display: flex;
  align-items: center;
  gap: 20px;
  font-size: 13px;
  color: var(--color-text-secondary);
  font-family: var(--font-sans);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.status-item {
  display: flex;
  align-items: center;
  gap: 6px;
}

.status-icon {
  width: 16px;
  height: 16px;
}

.status-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
}

.status-available {
  background: #22a559;
}

.status-sold {
  background: #ef4444;
}

.status-reserved {
  background: #f59e0b;
}

/* 控制按钮 */
.control-buttons {
  position: absolute;
  top: 60px;
  left: 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.control-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  background: var(--color-bg-secondary);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  color: var(--color-text);
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  font-family: var(--font-sans);
  transition: all 0.2s;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.control-btn:hover {
  background: var(--color-bg-tertiary);
  border-color: var(--color-border-hover);
}

.control-btn:active {
  transform: scale(0.98);
}

.btn-icon {
  width: 16px;
  height: 16px;
}
</style>