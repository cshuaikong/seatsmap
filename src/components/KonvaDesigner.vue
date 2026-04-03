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
      />

      <!-- 中间画布区域 -->
      <div class="canvas-wrapper">
        <div class="canvas-container">
          <KonvaRenderer
            ref="rendererRef"
            :width="canvasWidth"
            :height="canvasHeight"
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
        :categories="displayCategories"
        :total-seats="totalSeats"
        :current-tool="currentTool as any"
        @manage-categories="onManageCategories"
      />

      <!-- Category 管理弹窗 -->
      <CategoryManager
        :visible="showCategoryManager"
        :categories="displayCategories"
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
import KonvaRenderer from './KonvaRenderer.vue'
import type { ToolMode } from '../composables/useKonvaDrawing'
import type { Seat } from '../types'
import { useVenueStore } from '../stores/venueStore'
import { generateId } from '../utils/id'

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

// 从 venueStore 获取分类，并映射为显示格式（id/name）
const displayCategories = computed(() => {
  return venueStore.venue.categories.map(c => ({
    id: String(c.key),
    name: c.label,
    color: c.color,
    accessible: c.accessible
  }))
})

// Category 管理弹窗控制
const showCategoryManager = ref(false)

// Renderer ref
const rendererRef = ref<InstanceType<typeof KonvaRenderer>>()

// Venue store
const venueStore = useVenueStore()

// 计算统计数据
const totalSeats = computed(() => {
  let count = 0
  venueStore.venue.sections.forEach((section: any) => {
    section.rows.forEach((row: any) => {
      count += row.seats.length
    })
  })
  return count
})

const availableSeats = computed(() => {
  let count = 0
  venueStore.venue.sections.forEach((section: any) => {
    section.rows.forEach((row: any) => {
      row.seats.forEach((seat: Seat) => {
        if (seat.status === 'available') count++
      })
    })
  })
  return count
})

const soldSeats = computed(() => {
  let count = 0
  venueStore.venue.sections.forEach((section: any) => {
    section.rows.forEach((row: any) => {
      row.seats.forEach((seat: Seat) => {
        if (seat.status === 'booked') count++
      })
    })
  })
  return count
})

const reservedSeats = computed(() => {
  let count = 0
  venueStore.venue.sections.forEach((section: any) => {
    section.rows.forEach((row: any) => {
      row.seats.forEach((seat: Seat) => {
        if (seat.status === 'reserved') count++
      })
    })
  })
  return count
})

const selectedCount = computed(() => {
  return venueStore.selectedSeatIds.length
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

// 监听工具变化，通知 Renderer
watch(currentTool, (newTool) => {
  // 映射工具名称
  const toolMapping: Record<string, string> = {
    'select': 'select',
    'selectseat': 'select',
    'row-straight': 'row-straight',
    'section': 'section',
    'section-diagonal': 'section-diagonal',
    'drawCircle': 'draw_ellipse',
    'drawRect': 'draw_rect',
    'drawPolygon': 'draw_polygon',
    'drawPolyline': 'draw_polyline',
    'drawSector': 'draw_sector',
    'drawRoundTable': 'draw_ellipse',
    'text': 'draw_text',
    'image': 'select'
  }
  const mappedTool = toolMapping[newTool] || newTool
  rendererRef.value?.setDrawingTool?.(mappedTool as any)
})

const generateTestSeats = () => {
  // 使用 venueStore 生成测试数据
  const sectionId = venueStore.addSection({
    name: '测试区域',
    rows: [],
    x: 100,
    y: 100
  })
  
  // 生成 50 个座位（5排 x 10座）
  for (let rowIdx = 0; rowIdx < 5; rowIdx++) {
    const seats: Seat[] = []
    for (let seatIdx = 0; seatIdx < 10; seatIdx++) {
      seats.push({
        id: `seat-${Date.now()}-${rowIdx}-${seatIdx}`,
        label: String(seatIdx + 1),
        x: seatIdx * 28,
        y: 0,
        categoryKey: venueStore.venue.categories[0]?.key || 1,
        status: 'available',
        objectType: 'seat'
      })
    }
    
    venueStore.addRow(sectionId, {
      label: String.fromCharCode(65 + rowIdx),
      seats,
      x: 100,
      y: 100 + rowIdx * 32,
      rotation: 0,
      curve: 0,
      seatSpacing: 28
    })
  }
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

// onDelete 已在下方定义

// 加载底图（已迁移到 RightPanel > ImagePanel，此处保留兼容）
const onLoadBackground = () => {
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = 'image/*'
  input.multiple = true
  input.onchange = (e) => {
    const files = (e.target as HTMLInputElement).files
    if (!files) return

    Array.from(files).forEach(file => {
      if (!file.type.startsWith('image/')) return
      if (file.size > 10 * 1024 * 1024) {
        alert(`${file.name} 超过 10MB 限制`)
        return
      }

      const reader = new FileReader()
      reader.onload = (event) => {
        const src = event.target?.result as string
        if (!src) return

        const img = new Image()
        img.onload = () => {
          const canvasImage = {
            id: generateId(),
            type: 'image' as const,
            src,
            x: 100 + Math.random() * 200,
            y: 100 + Math.random() * 200,
            width: img.width,
            height: img.height,
            rotation: 0,
            opacity: 1,
            locked: false,
            visible: true,
            fileName: file.name
          }
          venueStore.addCanvasImage(canvasImage)
        }
        img.src = src
      }
      reader.readAsDataURL(file)
    })
  }
  input.click()
}

// 导出座位图数据到控制台
const exportVenueData = async () => {
  // 从 store 中获取数据
  const dataToExport = venueStore.exportVenueData()
  
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



// Category 管理
const onManageCategories = () => {
  showCategoryManager.value = true
}

const onCloseCategoryManager = () => {
  showCategoryManager.value = false
}

const onAddCategory = (category: { name: string; color: string }) => {
  venueStore.addCategory({
    label: category.name,
    color: category.color,
    accessible: false
  })
}

const onUpdateCategory = (categoryId: string, updates: { name?: string; color?: string }) => {
  // 将 id 映射到 key，name 映射到 label
  const venueUpdates: any = {}
  if (updates.name !== undefined) venueUpdates.label = updates.name
  if (updates.color !== undefined) venueUpdates.color = updates.color
  
  venueStore.updateCategory(categoryId, venueUpdates)
}

const onDeleteCategory = (categoryId: string) => {
  venueStore.deleteCategory(categoryId)
}

// 删除选中的对象
const onDelete = () => {
  rendererRef.value?.deleteSelected?.()
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
