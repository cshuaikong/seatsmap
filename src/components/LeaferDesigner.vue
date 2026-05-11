<template>
  <div class="chart-designer">
    <!-- 顶部工具栏 -->
    <div class="top-toolbar">
      <div class="toolbar-left">
        <div class="logo">
          <i class="iconfont icon-selectseat"></i>
        </div>
        <span class="chart-name">{{ chartName }}</span>

        <span v-if="focusedSectionName" class="breadcrumb-sep">
          <Icon icon="lucide:chevron-right" />
        </span>
        <span v-if="focusedSectionName" class="breadcrumb-zone">{{ focusedSectionName }}</span>
        <button
          v-if="focusedSectionName"
          type="button"
          class="action-btn secondary zone-exit-btn"
          @mousedown="onExitSectionFocus"
          style="cursor: pointer; position: relative; z-index: 999;"
        >
          <Icon icon="lucide:log-out" class="btn-icon" />
          退出分区
        </button>
      </div>

      <div class="toolbar-right">
        <button class="action-btn secondary" @click="onExportData" :class="{ success: exportStatus === 'success' }">
          <Icon :icon="exportStatus === 'success' ? 'lucide:check' : 'lucide:download'" class="btn-icon" />
          {{ exportStatus === 'success' ? '已导出' : '导出' }}
        </button>
        <button class="action-btn secondary" @click="onImportData" :class="{ success: importStatus === 'success', error: importStatus === 'error' }">
          <Icon :icon="importStatus === 'success' ? 'lucide:check' : importStatus === 'error' ? 'lucide:circle-x' : 'lucide:upload'" class="btn-icon" />
          {{ importStatus === 'success' ? '已导入' : importStatus === 'error' ? '失败' : '导入' }}
        </button>
        <button class="action-btn secondary" @click="onPreview">
          <Icon icon="lucide:eye" class="btn-icon" />
          预览
        </button>
        <button class="action-btn primary" @click="onSave">
          <Icon icon="lucide:check" class="btn-icon" />
          保存
        </button>
        <Transition name="fade">
          <span v-if="exportTip" class="export-tip">{{ exportTip }}</span>
          <span v-else-if="importTip" class="export-tip" :class="{ error: importStatus === 'error' }">{{ importTip }}</span>
        </Transition>
      </div>
    </div>

    <!-- 主内容区 - 三栏布局 -->
    <div class="designer-main">
      <LeftToolbar
        v-model="currentTool as any"
        @undo="onUndo"
        @redo="onRedo"
        @copy="onCopy"
        @paste="onPaste"
        @delete="onDelete"
      />

      <div class="canvas-wrapper">
        <div class="canvas-container">
          <LeaferEditor
            ref="rendererRef"
            :venue="venueStore.venue"
            :width="canvasWidth"
            :height="canvasHeight"
          />

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

      <RightPanel
        :chart-name="chartName"
        :categories="displayCategories"
        :total-seats="totalSeats"
        :current-tool="currentTool as any"
        @manage-categories="onManageCategories"
        @enter-section="(sectionId: string) => (rendererRef as any)?.enterSectionFocus?.(sectionId)"
      />

      <CategoryManager
        :visible="showCategoryManager"
        :categories="displayCategories"
        @close="onCloseCategoryManager"
        @add="onAddCategory"
        @update="onUpdateCategory"
        @delete="onDeleteCategory"
      />

      <PreviewModal
        :visible="showPreview"
        :venue="venueStore.venue"
        @close="showPreview = false"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { Icon } from '@iconify/vue'
import RightPanel from './RightPanel.vue'
import LeftToolbar from './LeftToolbar.vue'
import LeaferEditor from './LeaferEditor.vue'
import type { Seat } from '../types'
import { useVenueStore } from '../stores/venueStore'
import { useSeatMapIO } from '../composables/useSeatMapIO'

import CategoryManager from './panels/CategoryManager.vue'
import PreviewModal from './PreviewModal.vue'

const canvasWidth = 3000
const canvasHeight = 2000

const currentStageScale = ref(1)
const currentBaseScale = ref(1)

const currentTool = ref<string>('select')
const chartName = ref('Leafer 座位图编辑器')

let updateScaleInterval: ReturnType<typeof setInterval> | null = null

onMounted(() => {
  ;(async () => {
    try {
      console.log('[Leafer初始化] 从 JSON 文件加载数据...')
      const response = await fetch('/static/分区座位 全.json')
      if (response.ok) {
        const jsonData = await response.json()
        const venueData = jsonData.venue || jsonData
        if (venueData && venueData.sections) {
          const snapshot = JSON.stringify({ version: '1.0', venue: venueData })
          venueStore.restoreSnapshot(snapshot)
          console.log('[Leafer初始化] 已从 JSON 文件恢复数据')
        } else {
          console.error('[Leafer初始化] JSON 数据格式不正确')
        }
      } else {
        console.error('[Leafer初始化] JSON 文件不存在')
      }
    } catch (error) {
      console.error('[Leafer初始化] 加载 JSON 文件失败:', error)
    }
  })()

  updateScaleInterval = setInterval(() => {
    currentStageScale.value = (rendererRef.value as any)?.getStageScale?.() || 1
    currentBaseScale.value = (rendererRef.value as any)?.getBaseScale?.() || 1
  }, 100)
})

onUnmounted(() => {
  if (updateScaleInterval) {
    clearInterval(updateScaleInterval)
    updateScaleInterval = null
  }
})

// ==================== 分区聚焦 ====================

const focusedSectionName = computed(() => {
  const sectionId = venueStore.focusedSectionId
  if (!sectionId) return null
  return venueStore.venue.sections.find(s => s.id === sectionId)?.name ?? null
})

const onExitSectionFocus = () => {
  ;(rendererRef.value as any)?.exitSectionFocus?.()
}

// ==================== Categories ====================

const displayCategories = computed(() => {
  return venueStore.venue.categories.map(c => ({
    id: String(c.key),
    name: c.label,
    color: c.color,
    accessible: c.accessible
  }))
})

const showCategoryManager = ref(false)
const showPreview = ref(false)

// ==================== 导出/导入 ====================

const exportStatus = ref<'idle' | 'success'>('idle')
const exportTip = ref('')
let exportTipTimer: ReturnType<typeof setTimeout> | null = null

const importStatus = ref<'idle' | 'success' | 'error'>('idle')
const importTip = ref('')
let importTipTimer: ReturnType<typeof setTimeout> | null = null

const rendererRef = ref<InstanceType<typeof LeaferEditor>>()
const venueStore = useVenueStore()
const { exportSeatMap, importSeatMap, triggerImport } = useSeatMapIO()

// ==================== 统计 ====================

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
    'row-straight': '单行座位',
    'section': '分段座位',
    'section-diagonal': '多行座位',
    'draw_rect': '方形区域',
    'draw_ellipse': '圆形/椭圆',
    'draw_polygon': '多边形',
    'draw_polyline': '折线',
    'draw_sector': '扇形',
    'draw_text': '文字标注',
    'draw_area': '区域',
  }
  return labels[currentTool.value] || currentTool.value
})

// ==================== 工具切换 ====================

watch(currentTool, (newTool) => {
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
    'image': 'select',
  }
  const mappedTool = toolMapping[newTool] || newTool
  rendererRef.value?.setDrawingTool?.(mappedTool as any)
})

// ==================== 操作 ====================

const onUndo = () => { console.log('撤销') }
const onRedo = () => { console.log('重做') }
const onCopy = () => { console.log('复制') }
const onPaste = () => { console.log('粘贴') }

const onDelete = () => {
  rendererRef.value?.deleteSelected?.()
}

const onManageCategories = () => {
  showCategoryManager.value = true
}

const onExportData = async () => {
  const result = await exportSeatMap(venueStore.venue, `${venueStore.venue.name || 'seatmap'}.json`)
  if (result.success) {
    exportStatus.value = 'success'
    if (result.method === 'download') {
      exportTip.value = '已自动下载到默认文件夹'
    }
    if (exportTipTimer) clearTimeout(exportTipTimer)
    exportTipTimer = setTimeout(() => {
      exportStatus.value = 'idle'
      exportTip.value = ''
    }, 2000)
  }
}

const onImportData = async () => {
  const file = await triggerImport()
  if (!file) return
  const venue = await importSeatMap(file)
  if (venue) {
    venueStore.importVenueData(venue)
    // 触发画布重渲染（watch 也会触发，此处作为保险）
    rendererRef.value?.renderAll?.()
    const seatCount = venue.sections.reduce((sum, s) => sum + s.rows.reduce((rSum, r) => rSum + r.seats.length, 0), 0)
    importStatus.value = 'success'
    importTip.value = `成功导入 ${seatCount} 个座位`
  } else {
    importStatus.value = 'error'
    importTip.value = '文件格式错误，导入失败'
  }
  if (importTipTimer) clearTimeout(importTipTimer)
  importTipTimer = setTimeout(() => {
    importStatus.value = 'idle'
    importTip.value = ''
  }, 3000)
}

const onPreview = () => {
  showPreview.value = true
}

const onSave = async () => {
  try {
    const snapshot = venueStore.createSnapshot()
    if ('showSaveFilePicker' in window) {
      try {
        const handle = await (window as any).showSaveFilePicker({
          suggestedName: '分区座位 全.json',
          types: [{
            description: 'JSON 文件',
            accept: { 'application/json': ['.json'] }
          }]
        })
        const writable = await handle.createWritable()
        await writable.write(snapshot)
        await writable.close()
        console.log('数据已保存到本地文件')
        return
      } catch (err: any) {
        if (err.name === 'AbortError') return
        console.warn('File System Access API 失败，使用下载方式:', err)
      }
    }
    const blob = new Blob([snapshot], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = '分区座位 全.json'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    console.log('数据已下载')
  } catch (error) {
    console.error('保存失败:', error)
    alert('保存失败：' + (error instanceof Error ? error.message : '未知错误'))
  }
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
  const venueUpdates: any = {}
  if (updates.name !== undefined) venueUpdates.label = updates.name
  if (updates.color !== undefined) venueUpdates.color = updates.color
  venueStore.updateCategory(categoryId, venueUpdates)
}

const onDeleteCategory = (categoryId: string) => {
  venueStore.deleteCategory(categoryId)
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

.action-btn.success {
  background: #22a559 !important;
  color: white !important;
  border-color: #22a559 !important;
}

.action-btn.error {
  background: #ef4444 !important;
  color: white !important;
  border-color: #ef4444 !important;
}

.export-tip {
  font-size: 12px;
  color: var(--color-text-muted);
  white-space: nowrap;
  margin-left: 4px;
}

.export-tip.error {
  color: #ef4444;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.btn-icon {
  width: 16px;
  height: 16px;
}

.designer-main {
  display: grid;
  grid-template-columns: 56px 1fr auto;
  gap: 12px;
  padding: 12px;
  flex: 1;
  overflow: hidden;
  min-width: 0;
}

.canvas-wrapper {
  display: flex;
  flex-direction: column;
  min-width: 0;
  overflow: hidden;
  background: var(--color-bg-secondary);
  border: 1px solid var(--color-border);
  border-radius: 12px;
}

.canvas-container {
  flex: 1;
  position: relative;
  overflow: hidden;
  background: var(--color-bg);
  cursor: default;
}

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

.status-available { background: #22a559; }
.status-sold { background: #ef4444; }
.status-reserved { background: #f59e0b; }

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
