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

        <!-- 聚焦分区面包屑 -->
        <template v-if="focusedSectionName">
          <span class="breadcrumb-sep">
            <Icon icon="lucide:chevron-right" />
          </span>
          <span class="breadcrumb-zone">{{ focusedSectionName }}</span>
          <button class="action-btn secondary zone-exit-btn" @click="onExitSectionFocus">
            <Icon icon="lucide:log-out" class="btn-icon" />
            退出分区
          </button>
        </template>
      </div>

      <!-- 右侧：操作按钮 -->
      <div class="toolbar-right">
        <button class="action-btn secondary" @click="onExportData">
          <Icon icon="lucide:download" class="btn-icon" />
          导出
        </button>
        <button class="action-btn secondary" @click="onImportData">
          <Icon icon="lucide:upload" class="btn-icon" />
          导入
        </button>
        <button class="action-btn secondary" @click="onPreview">
          <Icon icon="lucide:eye" class="btn-icon" />
          预览
        </button>
        <button class="action-btn primary" @click="onSave">
          <Icon icon="lucide:check" class="btn-icon" />
          保存
        </button>
      </div>
    </div>

    <!-- 主内容区 - 三栏布局 -->
    <div class="designer-main">
      <!-- 左侧工具栏 -->
      <LeftToolbar 
        v-model="currentTool as any"
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
              画布缩放: {{ currentStageScale.toFixed(2) }} | baseScale: {{ currentBaseScale }}
            </span>
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
        @enter-section="(sectionId: string) => (rendererRef as any)?.enterSectionFocus?.(sectionId)"
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

      <!-- 预览弹窗 -->
      <PreviewModal
        :visible="showPreview"
        :venue="venueStore.venue"
        @close="showPreview = false"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick, onMounted, onUnmounted } from 'vue'
import { Icon } from '@iconify/vue'
import Konva from 'konva'
import RightPanel from './RightPanel.vue'
import LeftToolbar from './LeftToolbar.vue'
import KonvaRenderer from './KonvaRenderer.vue'
import type { ToolMode } from '../composables/useKonvaDrawing'
import type { Seat } from '../types'
import { useVenueStore } from '../stores/venueStore'
import { generateId } from '../utils/id'
import { useSeatMapIO } from '../composables/useSeatMapIO'

import CategoryManager from './panels/CategoryManager.vue'
import PreviewModal from './PreviewModal.vue'

// 画布配置
const canvasWidth = 3000
const canvasHeight = 2000
const showGrid = ref(true)

// 视图状态
const zoomLevel = ref(1)
const currentStageScale = ref(1)
const currentBaseScale = ref(1)

// 工具状态
const currentTool = ref<ToolMode>('select')

// 图表数据
const chartName = ref('高性能座位图编辑器')

// 页面加载时自动恢复本地数据
onMounted(() => {
  const saved = localStorage.getItem('seatsmap-autosave')
  if (saved) {
    try {
      venueStore.restoreSnapshot(saved)
      console.log('[自动恢复] 已从本地存储恢复数据')
    } catch (error) {
      console.error('[自动恢复] 恢复失败:', error)
    }
  }
  
  // 定期更新缩放显示
  const updateScaleInterval = setInterval(() => {
    currentStageScale.value = (rendererRef.value as any)?.getStageScale?.() || 1
    currentBaseScale.value = (rendererRef.value as any)?.getBaseScale?.() || 1
  }, 100)
  
  // 清理定时器
  onUnmounted(() => {
    clearInterval(updateScaleInterval)
  })
})

// ==================== 分区聚焦模式 ====================

const focusedSectionName = computed(() => {
  const sectionId = venueStore.focusedSectionId
  if (!sectionId) return null
  return venueStore.venue.sections.find(s => s.id === sectionId)?.name ?? null
})

const onExitSectionFocus = () => {
  (rendererRef as any)?.exitSectionFocus?.()
}

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

// 预览弹窗控制
const showPreview = ref(false)

// Renderer ref
const rendererRef = ref<InstanceType<typeof KonvaRenderer>>()

// Venue store
const venueStore = useVenueStore()

// 导出导入
const { exportSeatMap, importSeatMap, triggerImport } = useSeatMapIO()

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
    'selectseat': 'selectseat',
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

// Category 管理
const onManageCategories = () => {
  showCategoryManager.value = true
}

// 导出数据到文件
const onExportData = () => {
  const success = exportSeatMap(venueStore.venue, `${venueStore.venue.name || 'seatmap'}.json`)
  if (success) {
    alert(`导出成功！共 ${totalSeats.value} 个座位`)
  } else {
    alert('导出失败，请查看控制台')
  }
}

// 从文件导入数据
const onImportData = async () => {
  const file = await triggerImport()
  if (!file) return
  
  const venue = await importSeatMap(file)
  if (venue) {
    // 使用 importVenueData 导入（会自动重置 readonly 等属性）
    venueStore.importVenueData(venue)
    alert(`导入成功！共 ${venue.sections.reduce((sum, s) => sum + s.rows.reduce((rSum, r) => rSum + r.seats.length, 0), 0)} 个座位`)
  } else {
    alert('导入失败，请检查文件格式')
  }
}

// 打开预览
const onPreview = () => {
  showPreview.value = true
}

// 保存到本地存储
const onSave = () => {
  const snapshot = venueStore.createSnapshot()
  localStorage.setItem('seatsmap-autosave', snapshot)
  alert('已保存到本地！刷新页面会自动恢复')
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

/* 面包屑 */
.breadcrumb-sep {
  color: var(--color-text-secondary);
  display: flex;
  align-items: center;
}

.breadcrumb-zone {
  font-size: 13px;
  font-weight: 600;
  color: var(--color-accent);
  background: var(--color-accent-soft);
  padding: 3px 10px;
  border-radius: 6px;
}

.zone-exit-btn {
  font-size: 12px;
  padding: 5px 10px;
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
  grid-template-columns: 56px 1fr auto;
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

/* 响应式处理 */
@media (max-width: 1024px) {
  .designer-main {
    grid-template-columns: 56px 1fr;
    gap: 8px;
    padding: 8px;
  }
  
  .designer-main :deep(.right-panel) {
    display: none;
  }
  
  .status-bar {
    gap: 12px;
    padding: 8px 12px;
  }
}

@media (max-width: 768px) {
  .designer-main {
    grid-template-columns: 56px 1fr;
    grid-template-rows: none;
  }
}
</style>
