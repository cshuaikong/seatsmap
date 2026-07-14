<template>
  <div class="chart-designer" :class="{ 'chart-designer--embedded': embedded }">
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
        v-model="currentTool"
        :venue-type="props.venueData?.type"
        :section-focused="sectionFocused"
        @undo="onUndo"
        @redo="onRedo"
        @copy="onCopy"
        @paste="onPaste"
        @delete="onDelete"
      />

      <div class="canvas-wrapper">
        <div class="canvas-container">
          <PathEditor
            ref="rendererRef"
            :venue-data="effectiveVenueData"
            :seat-list="[]"
            :current-tool="currentTool"
            hide-toolbar
            @body-double-tap="onPathDoubleTap"
            @update:current-tool="(tool: ToolId) => currentTool = tool"
            @vertex-edit-change="(active: boolean) => vertexEditActive = active"
            @section-focus-change="onSectionFocusChange"
          />

          <div class="status-bar">
            <span class="status-item">
              <Icon icon="lucide:shapes" class="status-icon" />
              座位总数: {{ seatCount }}
            </span>
            <span class="status-item">
              当前工具: {{ currentToolLabel }}
            </span>
          </div>
        </div>
      </div>

      <RightPanel
        :chart-name="chartName"
        :categories="displayCategories"
        :total-seats="0"
        :current-tool="currentTool"
        :vertex-edit-active="vertexEditActive"
        @manage-categories="onManageCategories"
        @enter-section="(sectionId: string) => (rendererRef as any)?.enterSectionFocus?.(sectionId)"
        @toggle-vertex-edit="onToggleVertexEdit"
      />

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
import { ref, computed, onMounted, watch } from 'vue'
import { Icon } from '@iconify/vue'
import RightPanel from './RightPanel.vue'
import LeftToolbar from './LeftToolbar.vue'
import PathEditor from './PathEditor.vue'
import type { VenueData } from '../types'
import { useVenueDataStore } from '../stores/venueDataStore'

import type { ToolId } from '../domain/toolRegistry'
import { ALL_TOOLS } from '../domain/toolRegistry'
import { useEditorStore } from '../stores/editorStore'
import { useHistoryStore } from '../stores/historyStore'
import { useSeatMapIO } from '../composables/useSeatMapIO'
import CategoryManager from './panels/CategoryManager.vue'
import {
  createAddCategoryCommand,
  createUpdateCategoryCommand,
  createDeleteCategoryCommand,
} from '../domain/venueCommands'

const emit = defineEmits<{
  (e: 'save', data: any): void
}>()

const props = withDefaults(defineProps<{
  venueData?: VenueData
  embedded?: boolean
}>(), {
  venueData: () => ({}) as VenueData,
  embedded: false,
})

const currentTool = ref<ToolId>('select')
const vertexEditActive = ref(false)

const rendererRef = ref<InstanceType<typeof PathEditor>>()
const venueDataStore = useVenueDataStore()
const editorStore = useEditorStore()
const historyStore = useHistoryStore()
const { exportSeatMap, importSeatMap, triggerImport } = useSeatMapIO()

const chartName = ref(props.venueData?.name || venueDataStore.venue.name || '未命名座位图')
// PathEditor 始终渲染 store 中的数据；props.venueData 仅作为外部初始数据源导入 store
const effectiveVenueData = computed(() => venueDataStore.venue)

// ==================== 数据加载 ====================

watch(() => props.venueData?.name, (name) => {
  if (name) chartName.value = name
})

// 外部传入的 venueData 同步到 store，使 store 成为唯一真相源
watch(() => props.venueData, (data) => {
  if (data && data.sections && data.sections.length > 0) {
    venueDataStore.importVenueData(data)
    historyStore.reset()
  }
}, { immediate: true })

watch(() => venueDataStore.venue.name, (name) => {
  if (name) chartName.value = name
})

onMounted(() => {
})

// ==================== 统计 ====================

const seatCount = computed(() => {
  let count = 0
  for (const s of venueDataStore.venue.sections ?? []) {
    for (const r of s.rows ?? []) {
      count += r.seats?.length ?? 0
    }
  }
  return count
})

const currentToolLabel = computed(() => {
  const tool = ALL_TOOLS.find(t => t.id === currentTool.value)
  return tool?.label || currentTool.value
})

// ==================== 分区聚焦 ====================

const focusedSectionName = ref<string | null>(null)
const sectionFocused = ref(false)

const onSectionFocusChange = (focused: boolean, sectionName?: string) => {
  sectionFocused.value = focused
  focusedSectionName.value = focused ? (sectionName ?? null) : null
}

const onExitSectionFocus = () => {
  rendererRef.value?.exitSectionFocus?.()
}

// ==================== Categories ====================

const displayCategories = computed(() => {
  return venueDataStore.venue.categories.map(c => ({
    id: String(c.key),
    name: c.label,
    color: c.color,
    accessible: c.accessible,
  }))
})

const showCategoryManager = ref(false)

// ==================== 导出/导入 ====================

const exportStatus = ref<'idle' | 'success'>('idle')
const exportTip = ref('')
let exportTipTimer: ReturnType<typeof setTimeout> | null = null

const importStatus = ref<'idle' | 'success' | 'error'>('idle')
const importTip = ref('')
let importTipTimer: ReturnType<typeof setTimeout> | null = null

const onExportData = async () => {
  const venue = venueDataStore.exportVenueData()
  const result = await exportSeatMap(venue, `${venue.name || 'seatmap'}.json`)
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
    venueDataStore.importVenueData(venue)
    historyStore.reset()
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

const onSave = () => {
  const venue = venueDataStore.exportVenueData()
  emit('save', venue)
}

// ==================== 操作 ====================

const onUndo = () => { historyStore.undo() }
const onRedo = () => { historyStore.redo() }
const onCopy = () => { editorStore.copySelected() }
const onPaste = () => {
  editorStore.paste()
}
const onDelete = () => {
  editorStore.deleteSelected()
}

const onManageCategories = () => {
  showCategoryManager.value = true
}

const onToggleVertexEdit = () => {
  if (vertexEditActive.value) {
    currentTool.value = 'select'
  } else {
    currentTool.value = 'node'
  }
}

const onPathDoubleTap = (body: any) => {
  focusedSectionName.value = body?.id ?? null
}

const onCloseCategoryManager = () => {
  showCategoryManager.value = false
}

const onAddCategory = (category: { name: string; color: string }) => {
  historyStore.execute(createAddCategoryCommand(venueDataStore, {
    label: category.name,
    color: category.color,
    accessible: false,
  }))
}

const onUpdateCategory = (categoryId: string, updates: { name?: string; color?: string }) => {
  const venueUpdates: any = {}
  if (updates.name !== undefined) venueUpdates.label = updates.name
  if (updates.color !== undefined) venueUpdates.color = updates.color
  historyStore.execute(createUpdateCategoryCommand(venueDataStore, categoryId, venueUpdates))
}

const onDeleteCategory = (categoryId: string) => {
  historyStore.execute(createDeleteCategoryCommand(venueDataStore, categoryId))
}

defineExpose({
  getEditor: () => rendererRef.value
})
</script>

<style scoped>
.chart-designer {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: var(--color-bg);
  overflow: hidden;
}
.chart-designer--embedded {
  height: 100%;
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
  z-index: 10;
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
