<template>
  <div class="chart-designer">
    <!-- 顶部工具栏 -->
    <div class="top-toolbar">
      <!-- 左侧：Logo和图表名称 -->
      <div class="toolbar-left">
        <div class="logo">
          <i class="iconfont icon-selectseat"></i>
        </div>
        <span class="chart-name">{{ chartName }}</span>
      </div>

      <!-- 右侧：操作按钮 -->
      <div class="toolbar-right">
        <button class="action-btn secondary">
          <Icon icon="lucide:eye" class="btn-icon" />
          预览
        </button>
        <button class="action-btn primary">
          <Icon icon="lucide:check" class="btn-icon" />
          保存
        </button>
      </div>
    </div>

    <!-- 主内容区 - 三栏布局 -->
    <div class="designer-main">
      <!-- 左侧工具栏 -->
      <LeftToolbar 
        v-model="currentTool"
        @undo="onUndo"
        @redo="onRedo"
        @copy="onCopy"
        @paste="onPaste"
        @delete="onDelete"
        @load-background="onLoadBackground"
      />

      <!-- 中间画布区域 -->
      <div class="canvas-wrapper">
        <div class="canvas-container">
          <KonvaCanvas
            ref="canvasRef"
            :width="canvasWidth"
            :height="canvasHeight"
            :show-grid="showGrid"
            :venue-data="venueData"
            :categories="categories"
            @ready="onCanvasReady"
            @seat-click="onSeatClick"
            @row-created="onRowCreated"
            @selection-changed="onSelectionChanged"
            @selection-cleared="onSelectionCleared"
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
              生成 50 座位
            </button>
            <button @click="exportVenueData" class="control-btn" style="background: #4a90d9;">
              <Icon icon="lucide:download" class="btn-icon" />
              导出数据
            </button>
          </div>
        </div>
      </div>

      <!-- 右侧面板 -->
      <RightPanel
        :chart-name="chartName"
        :categories="categories"
        :total-seats="totalSeats"
        :selection="currentSelection"
        :selected-row="selectedRow"
        @update-row="() => {}"
        @update-property="onPropertyUpdate"
        @manage-categories="onManageCategories"
      />

      <!-- Category 管理弹窗 -->
      <CategoryManager
        :visible="showCategoryManager"
        :categories="categories"
        @close="onCloseCategoryManager"
        @add="onAddCategory"
        @update="onUpdateCategory"
        @delete="onDeleteCategory"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue'
import { Icon } from '@iconify/vue'
import Konva from 'konva'
import RightPanel from './RightPanel.vue'
import LeftToolbar from './LeftToolbar.vue'
import KonvaCanvas from './KonvaCanvas.vue'
import type { ToolMode } from '../composables/useDrawing'
import type { VenueData, Seat, Row } from './KonvaCanvas.vue'
import type { PanelSelection } from '../types'
import CategoryManager from './panels/CategoryManager.vue'

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

// 当前选中状态
const currentSelection = ref<PanelSelection | null>(null)

// Category 管理弹窗控制
const showCategoryManager = ref(false)

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
    'selectseat': '选择座位',
    'drawRow': '单行座位',
    'drawSegmentRow': '分段座位',
    'drawMultiRow': '多行座位',
    'drawCircle': '圆形区域',
    'drawRect': '方形区域',
    'drawPolygon': '多边形',
    'drawSector': '扇形',
    'drawRoundTable': '圆桌',
    'drawLine': '线条',
    'text': '文字标注',
    'image': '图片'
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
}

// 监听工具变化，通知 Canvas
watch(currentTool, (newTool) => {
  canvasRef.value?.setTool?.(newTool)
})

const generateTestSeats = () => {
  if (!canvasRef.value) return
  const testData = canvasRef.value.generateTestData(400)
  venueData.value = testData
}

// 编辑操作
const onUndo = () => {
  console.log('撤销')
}

const onRedo = () => {
  console.log('重做')
}

const onCopy = () => {
  console.log('复制')
}

const onPaste = () => {
  console.log('粘贴')
}

const onDelete = () => {
  console.log('删除')
}

// 加载底图
const onLoadBackground = () => {
  console.log('[底图] 打开文件选择器')
  // 创建文件选择器
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = 'image/*'
  input.onchange = (e) => {
    const file = (e.target as HTMLInputElement).files?.[0]
    console.log('[底图] 选择文件:', file?.name)
    if (file && canvasRef.value) {
      console.log('[底图] 调用 loadBackgroundImage')
      // 调用 KonvaCanvas 的加载底图方法
      canvasRef.value.loadBackgroundImage?.(file)
    }
  }
  input.click()
}

// 选中状态变化处理
const onSelectionChanged = (selection: any) => {
  currentSelection.value = { ...selection }  // 用展开运算符创建新对象，触发 Vue 响应
}

const onSelectionCleared = () => {
  currentSelection.value = null
}

// 导出座位图数据到控制台
const exportVenueData = async () => {
  // 从画布中获取最新数据
  const currentData = canvasRef.value?.getVenueData?.()
  
  // 即使没有座位也能导出空数据结构
  const dataToExport = currentData || { sections: [] }
  
  // 更新 venueData 以便计算统计数据
  venueData.value = dataToExport
  
  console.log('========== 座位图数据结构 ==========')
  console.log('📊 总座位数:', totalSeats.value)
  console.log('📊 可用座位数:', availableSeats.value)
  console.log('📊 已售座位数:', soldSeats.value)
  console.log('📊 保留座位数:', reservedSeats.value)
  console.log('\n📁 完整数据结构:')
  console.log(JSON.stringify(dataToExport, null, 2))
  console.log('====================================')
  
  if (totalSeats.value === 0) {
    alert('数据已输出到控制台！\n当前没有座位，快去绘制一些座位吧~ 🎨')
  } else {
    alert(`数据已输出到控制台！\n共 ${totalSeats.value} 个座位 ✨`)
  }
}

const onPropertyUpdate = (updates: Record<string, any>) => {
  if (!currentSelection.value?.ids || currentSelection.value.ids.length === 0) return
  
  // 如果是分类变更或排属性变更且选中了多个排组，需要遍历所有选中的排组
  const rowProperties = ['seatCount', 'curve', 'seatSpacing', 'rowSpacing']
  const isRowPropertyChange = Object.keys(updates).some(key => rowProperties.includes(key))
  
  if ((updates.categoryId || isRowPropertyChange) && currentSelection.value.ids.length > 1) {
    currentSelection.value.ids.forEach(nodeId => {
      canvasRef.value?.updateNodeProperty?.(nodeId, updates)
    })
  } else {
    // 单个对象或其他属性变更，只更新第一个
    canvasRef.value?.updateNodeProperty?.(
      currentSelection.value.ids[0],
      updates
    )
  }
}

// Category 管理
const onManageCategories = () => {
  showCategoryManager.value = true
}

const onCloseCategoryManager = () => {
  showCategoryManager.value = false
}

const onAddCategory = (category: { name: string; color: string }) => {
  const newCat = {
    id: String(Date.now()),
    name: category.name,
    color: category.color,
    accessible: false
  }
  categories.value.push(newCat)
}

const onUpdateCategory = (categoryId: string, updates: { name?: string; color?: string }) => {
  const cat = categories.value.find((c: any) => c.id === categoryId)
  if (cat) {
    Object.assign(cat, updates)
    
    // 如果颜色发生变化，需要刷新画布上所有使用该分类的座位
    if (updates.color && canvasRef.value) {
      // 重新渲染场地数据以应用新颜色
      if (venueData.value) {
        const data = { ...venueData.value }
        venueData.value = null
        nextTick(() => {
          venueData.value = data
        })
      }
    }
  }
}

const onDeleteCategory = (categoryId: string) => {
  const idx = categories.value.findIndex((c: any) => c.id === categoryId)
  if (idx !== -1) categories.value.splice(idx, 1)
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

/* 顶部工具栏 */
.top-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 52px;
  background: var(--color-bg-secondary);
  border-bottom: 1px solid var(--color-border);
  padding: 0 16px;
  flex-shrink: 0;
}

.toolbar-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.logo {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  background: var(--color-accent);
  border-radius: 8px;
  color: white;
  font-size: 20px;
}

.chart-name {
  font-size: 14px;
  font-weight: 500;
  color: var(--color-text);
}

.toolbar-right {
  display: flex;
  align-items: center;
  gap: 8px;
}

.action-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  border: none;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s cubic-bezier(0.4, 0, 0.2, 1);
}

.action-btn.primary {
  background: var(--color-accent);
  color: white;
}

.action-btn.primary:hover {
  background: var(--color-accent-hover);
  transform: translateY(-1px);
}

.action-btn.secondary {
  background: var(--color-bg-tertiary);
  color: var(--color-text);
  border: 1px solid var(--color-border);
}

.action-btn.secondary:hover {
  background: var(--color-bg);
  border-color: var(--color-border-hover);
}

.btn-icon {
  width: 16px;
  height: 16px;
}

/* 主内容区 - 三栏布局 */
.designer-main {
  display: grid;
  grid-template-columns: auto 1fr auto;
  gap: 12px;
  padding: 12px;
  flex: 1;
  overflow: hidden;
  min-width: 0;
}

/* 中间画布包装器 */
.canvas-wrapper {
  display: flex;
  flex-direction: column;
  min-width: 0;
  overflow: hidden;
  background: var(--color-bg-secondary);
  border: 1px solid var(--color-border);
  border-radius: 12px;
}

/* 画布容器 */
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
  flex-wrap: wrap;
  row-gap: 8px;
}

.status-item {
  display: flex;
  align-items: center;
  gap: 6px;
  white-space: nowrap;
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
  white-space: nowrap;
}

.control-btn:hover {
  background: var(--color-bg-tertiary);
  border-color: var(--color-border-hover);
}

.control-btn:active {
  transform: scale(0.98);
}

/* 响应式处理 */
@media (max-width: 1024px) {
  .designer-main {
    grid-template-columns: auto 1fr;
    gap: 8px;
    padding: 8px;
  }
  
  .status-bar {
    gap: 12px;
    padding: 8px 12px;
  }
}

@media (max-width: 768px) {
  .designer-main {
    grid-template-columns: 1fr;
    grid-template-rows: auto 1fr;
  }
  
  .control-buttons {
    display: none;
  }
}
</style>
