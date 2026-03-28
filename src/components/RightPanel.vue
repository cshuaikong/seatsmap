<template>
  <div class="right-panel">
    <!-- 选中对象面板 -->
    <template v-if="shouldShowSelectionPanel">
      <!-- 面板标题栏 -->
      <div class="selection-header">
        <div class="selection-title">
          <span class="title-text">{{ selectionTitle }}</span>
          <span class="title-type">{{ selectionTypeLabel }}</span>
        </div>
      </div>

      <!-- 动态面板内容 -->
      <div class="selection-content">
        <!-- 形状面板 -->
        <ShapePanel
          v-if="panelType === 'shape'"
          :key="'shape-' + (selection?.ids?.[0] || '') + '-' + refreshKey"
          :node="selection?.nodes?.[0]"
          :type="selection?.type as any"
          @update-property="(key, val) => emit('update-property', { [key]: val })"
        />

        <!-- 文本面板 -->
        <TextPanel
          v-else-if="panelType === 'text'"
          :key="'text-' + (selection?.ids?.[0] || '') + '-' + refreshKey"
          :node="selection?.nodes?.[0]"
          @update-property="(key, val) => emit('update-property', { [key]: val })"
        />

        <!-- 座位面板 -->
        <SeatPanel
          v-else-if="panelType === 'seat'"
          :key="'seat-' + (selection?.ids?.join(',') || '') + '-' + refreshKey"
          :nodes="selection?.nodes || []"
          :categories="categories"
          :is-single="(selection?.ids?.length || 0) === 1"
          @update-property="(key, val) => emit('update-property', { [key]: val })"
          @update-category="(catId) => emit('update-property', { categoryId: catId })"
          @manage-categories="emit('manage-categories')"
        />

        <!-- 排面板 -->
        <RowPanel
          v-else-if="panelType === 'row'"
          :key="'row-' + (selection?.ids?.join(',') || '') + '-' + refreshKey"
          :nodes="selection?.nodes || []"
          :is-single="(selection?.ids?.length || 0) === 1"
          :categories="categories"
          @update-property="(key, val) => emit('update-property', { [key]: val })"
          @update-category="(catId) => emit('update-property', { categoryId: catId })"
          @manage-categories="emit('manage-categories')"
        />

        <!-- 区域面板 -->
        <AreaPanel
          v-else-if="panelType === 'area'"
          :key="'area-' + (selection?.ids?.[0] || '') + '-' + refreshKey"
          :node="selection?.nodes?.[0]"
          :categories="categories"
          @update-property="(key, val) => emit('update-property', { [key]: val })"
          @update-category="(catId) => emit('update-property', { categoryId: catId })"
          @manage-categories="emit('manage-categories')"
        />

        <!-- 混合选择面板 -->
        <MixedPanel
          v-else-if="panelType === 'mixed'"
          :key="'mixed-' + (selection?.ids?.join(',') || '') + '-' + refreshKey"
          :nodes="selection?.nodes || []"
          :categories="categories"
          :types="[...new Set(selection?.nodes?.map((n: any) => n?.getAttr?.('data-type') || 'object'))]"
          @update-property="(key, val) => emit('update-property', { [key]: val })"
          @update-category="(catId) => emit('update-property', { categoryId: catId })"
          @manage-categories="emit('manage-categories')"
        />

        <!-- 未知类型 -->
        <div v-else class="panel-placeholder">
          <div class="placeholder-icon">
            <Icon icon="lucide:help-circle" class="icon" />
          </div>
          <p>未知对象类型</p>
        </div>
      </div>
    </template>

    <!-- 兼容旧版：选中排的属性 -->
    <template v-else-if="selectedRow">
      <div class="selection-header">
        <div class="selection-title">
          <span class="title-text">排设置</span>
          <span class="title-type">ROW</span>
        </div>
      </div>

      <div class="selection-content">
        <div class="property-group">
          <div class="property-field">
            <label>排号</label>
            <input type="text" v-model="selectedRow.label" @change="updateRow" />
          </div>

          <div class="property-field">
            <label>座位数量</label>
            <div class="number-input">
              <button class="step-btn" @click="decreaseSeats">
                <Icon icon="lucide:minus" class="step-icon" />
              </button>
              <span class="number-value">{{ selectedRow.seats.length }}</span>
              <button class="step-btn" @click="increaseSeats">
                <Icon icon="lucide:plus" class="step-icon" />
              </button>
            </div>
          </div>

          <div class="property-field">
            <label>旋转角度</label>
            <div class="number-input">
              <button class="step-btn" @click="decreaseRotation">
                <Icon icon="lucide:minus" class="step-icon" />
              </button>
              <span class="number-value">{{ Math.round(selectedRow.rotation) }}°</span>
              <button class="step-btn" @click="increaseRotation">
                <Icon icon="lucide:plus" class="step-icon" />
              </button>
            </div>
          </div>

          <div class="property-field">
            <label>位置</label>
            <div class="position-display">
              <span>X: {{ Math.round(selectedRow.x) }}</span>
              <span>Y: {{ Math.round(selectedRow.y) }}</span>
            </div>
          </div>
        </div>

        <div class="property-group">
          <h4>类别</h4>
          <div class="category-select">
            <div class="category-badge" :style="{ backgroundColor: selectedCategory?.color || '#9ca3af' }"></div>
            <span class="category-name">{{ selectedCategory?.name || '选择类别' }}</span>
            <button class="dropdown-btn">
              <Icon icon="lucide:chevron-down" class="dropdown-icon" />
            </button>
          </div>
        </div>

        <div class="property-group">
          <h4>座位间距</h4>
          <div class="property-field">
            <label>座位间距</label>
            <div class="number-input">
              <button class="step-btn" @click="seatSpacing = Math.max(20, seatSpacing - 2)">
                <Icon icon="lucide:minus" class="step-icon" />
              </button>
              <span class="number-value">{{ seatSpacing }}</span>
              <button class="step-btn" @click="seatSpacing = Math.min(60, seatSpacing + 2)">
                <Icon icon="lucide:plus" class="step-icon" />
              </button>
            </div>
            <span class="unit">pt</span>
          </div>
        </div>
      </div>
    </template>

    <!-- 图表概览（无选中时） -->
    <template v-else>
      <ChartOverviewPanel
        :chart-name="chartName"
        :categories="categories"
        :total-seats="totalSeats"
        @manage-categories="emit('manage-categories')"
      />
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { Icon } from '@iconify/vue'
import type { Row, Category, PanelSelection, SelectedObjectType } from '../types'
import ChartOverviewPanel from './panels/ChartOverviewPanel.vue'
import ShapePanel from './panels/ShapePanel.vue'
import TextPanel from './panels/TextPanel.vue'
import SeatPanel from './panels/SeatPanel.vue'
import RowPanel from './panels/RowPanel.vue'
import AreaPanel from './panels/AreaPanel.vue'
import MixedPanel from './panels/MixedPanel.vue'

const props = defineProps<{
  chartName: string
  categories: Category[]
  totalSeats: number
  selection?: PanelSelection | null
  selectedRow?: Row | null
}>()

const emit = defineEmits<{
  'update-row': [row: Row]
  'update-property': [updates: Record<string, any>]
  'manage-categories': []
}>()

const seatSpacing = ref(28)

// 刷新 key，用于强制重新挂载子面板
const refreshKey = ref(0)

// 监听 selection 变化，递增 refreshKey
watch(() => props.selection, () => {
  refreshKey.value++
}, { deep: true })

// 判断是否显示选中对象面板
const shouldShowSelectionPanel = computed(() => {
  if (!props.selection) return false
  return props.selection.type !== 'none'
})

// 面板类型映射
const panelType = computed(() => {
  if (!props.selection) return null

  const type = props.selection.type

  // 混合选择
  if (props.selection.isMixed) return 'mixed'

  // 形状类型映射
  const shapeTypes: SelectedObjectType[] = ['rect', 'ellipse', 'polygon', 'sector', 'polyline']
  if (shapeTypes.includes(type)) return 'shape'

  // 直接映射
  if (type === 'text') return 'text'
  if (type === 'seat') return 'seat'
  if (type === 'row') return 'row'
  if (type === 'area') return 'area'

  return 'unknown'
})

// 选中对象标题
const selectionTitle = computed(() => {
  if (!props.selection) return ''

  if (props.selection.isMixed) {
    // 混合选择时显示类型组合
    const types = new Set(props.selection.nodes?.map((n: any) => n?.getAttr?.('data-type') || 'object'))
    const typeNames: Record<string, string> = {
      'rect': '形状',
      'ellipse': '形状',
      'polygon': '形状',
      'sector': '形状',
      'polyline': '形状',
      'text': '文本',
      'seat': '座位',
      'row': '排',
      'area': '区域',
      'object': '对象'
    }
    const uniqueNames = Array.from(types).map(t => typeNames[t as string] || '对象')
    return [...new Set(uniqueNames)].join(', ')
  }

  const titles: Record<SelectedObjectType, string> = {
    'none': '',
    'rect': '形状',
    'ellipse': '形状',
    'polygon': '形状',
    'sector': '形状',
    'polyline': '形状',
    'text': '文本',
    'seat': '座位',
    'row': '排',
    'area': '区域'
  }

  return titles[props.selection.type] || '对象'
})

// 选中对象类型标签（右上角大写）
const selectionTypeLabel = computed(() => {
  if (!props.selection) return ''

  if (props.selection.isMixed) return 'MULTIPLE'

  const labels: Record<SelectedObjectType, string> = {
    'none': '',
    'rect': 'SHAPE',
    'ellipse': 'SHAPE',
    'polygon': 'SHAPE',
    'sector': 'SHAPE',
    'polyline': 'SHAPE',
    'text': 'TEXT',
    'seat': 'SEAT',
    'row': 'ROW',
    'area': 'AREA'
  }

  return labels[props.selection.type] || 'OBJECT'
})

// 兼容旧版：选中类别
const selectedCategory = computed(() => {
  if (!props.selectedRow || props.selectedRow.seats.length === 0) return null
  return props.categories.find(c => c.id === props.selectedRow!.seats[0].categoryId)
})

function updateRow() {
  if (props.selectedRow) {
    emit('update-row', props.selectedRow)
  }
}

function increaseSeats() {
  // TODO: 增加座位
}

function decreaseSeats() {
  // TODO: 减少座位
}

function increaseRotation() {
  if (props.selectedRow) {
    props.selectedRow.rotation = (props.selectedRow.rotation + 5) % 360
    updateRow()
  }
}

function decreaseRotation() {
  if (props.selectedRow) {
    props.selectedRow.rotation = (props.selectedRow.rotation - 5) % 360
    updateRow()
  }
}
</script>

<style scoped>
.right-panel {
  width: 300px;
  background: var(--color-bg-secondary);
  border-left: 1px solid var(--color-border);
  overflow-y: auto;
  display: flex;
  flex-direction: column;
}

/* 选中对象面板标题栏 */
.selection-header {
  padding: 16px;
  background: var(--color-bg-tertiary);
  border-bottom: 1px solid var(--color-border);
  flex-shrink: 0;
}

.selection-title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.title-text {
  font-size: 15px;
  font-weight: 600;
  color: var(--color-text);
}

.title-type {
  font-size: 11px;
  font-weight: 500;
  color: var(--color-text-secondary);
  letter-spacing: 0.5px;
}

/* 选中对象内容区 */
.selection-content {
  flex: 1;
  overflow-y: auto;
}

/* 占位面板样式 */
.panel-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  text-align: center;
  color: var(--color-text-secondary);
}

.placeholder-icon {
  width: 64px;
  height: 64px;
  border-radius: 16px;
  background: var(--color-bg-tertiary);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 16px;
}

.placeholder-icon .icon {
  width: 32px;
  height: 32px;
  color: var(--color-text-muted);
}

.panel-placeholder p {
  font-size: 15px;
  font-weight: 500;
  color: var(--color-text);
  margin: 0 0 8px 0;
}

.placeholder-hint {
  font-size: 13px;
  color: var(--color-text-muted);
}

/* 图表概览头部 */
.panel-header {
  padding: 16px;
  border-bottom: 1px solid var(--color-border);
  flex-shrink: 0;
}

.panel-title {
  margin: 0;
  font-size: 15px;
  font-weight: 600;
  color: var(--color-text);
}

/* Categories */
.categories-section {
  background: var(--color-bg-tertiary);
  border-bottom: 1px solid var(--color-border);
  flex-shrink: 0;
}

.categories-section.expanded {
  background: var(--color-accent);
}

.categories-header {
  display: flex;
  align-items: center;
  padding: 12px 16px;
  cursor: pointer;
  gap: 12px;
}

.toggle-switch {
  width: 36px;
  height: 20px;
  background: var(--color-border-hover);
  border-radius: 10px;
  position: relative;
  transition: background 0.2s;
}

.toggle-switch.on {
  background: rgba(255, 255, 255, 0.3);
}

.toggle-thumb {
  position: absolute;
  top: 2px;
  left: 2px;
  width: 16px;
  height: 16px;
  background: white;
  border-radius: 50%;
  transition: transform 0.2s;
}

.toggle-switch.on .toggle-thumb {
  transform: translateX(16px);
}

.categories-count {
  flex: 1;
  font-size: 13px;
  font-weight: 500;
  color: var(--color-text);
}

.categories-section.expanded .categories-count {
  color: white;
}

.manage-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  border: none;
  background: rgba(0, 0, 0, 0.08);
  border-radius: 6px;
  font-size: 12px;
  color: var(--color-text);
  cursor: pointer;
}

.categories-section.expanded .manage-btn {
  color: white;
  background: rgba(255, 255, 255, 0.2);
}

.manage-icon {
  width: 12px;
  height: 12px;
}

.categories-list {
  padding: 12px 16px;
  background: var(--color-bg-secondary);
}

.category-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 0;
}

.category-color {
  width: 14px;
  height: 14px;
  border-radius: 50%;
}

.category-name {
  flex: 1;
  font-size: 13px;
  color: var(--color-text);
}

.accessible-icon {
  width: 14px;
  height: 14px;
  color: var(--color-text-secondary);
}

/* Stats */
.stats-section {
  padding: 16px;
  background: var(--color-bg-secondary);
  border-bottom: 1px solid var(--color-border);
  flex-shrink: 0;
}

.stat-item {
  display: flex;
  align-items: center;
  gap: 10px;
}

.stat-icon-wrapper {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  background: var(--color-bg-tertiary);
  display: flex;
  align-items: center;
  justify-content: center;
}

.stat-icon {
  width: 16px;
  height: 16px;
  color: var(--color-text);
}

.stat-value {
  font-size: 18px;
  font-weight: 700;
  color: var(--color-text);
}

.stat-label {
  flex: 1;
  font-size: 13px;
  color: var(--color-text-secondary);
}

.search-btn {
  width: 28px;
  height: 28px;
  border: none;
  background: var(--color-bg-tertiary);
  border-radius: 6px;
  cursor: pointer;
  color: var(--color-text-secondary);
  display: flex;
  align-items: center;
  justify-content: center;
}

.search-icon {
  width: 14px;
  height: 14px;
}

/* Validation */
.validation-section {
  padding: 8px 16px;
  background: var(--color-bg-secondary);
  border-bottom: 1px solid var(--color-border);
  flex-shrink: 0;
}

.validation-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 6px 0;
  font-size: 12px;
}

.validation-icon-wrapper {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.validation-item.success .validation-icon-wrapper {
  background: rgba(34, 165, 89, 0.12);
}

.validation-icon {
  width: 10px;
  height: 10px;
}

.validation-item.success .validation-icon {
  color: var(--color-success);
}

.validation-text {
  flex: 1;
  color: var(--color-text-secondary);
}

/* Properties */
.property-group {
  padding: 16px;
  border-bottom: 1px solid var(--color-border);
}

.property-group h4 {
  margin: 0 0 16px 0;
  font-size: 13px;
  font-weight: 600;
  color: var(--color-text);
}

.property-field {
  margin-bottom: 16px;
}

.property-field label {
  display: block;
  font-size: 11px;
  color: var(--color-text-muted);
  margin-bottom: 6px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.property-field input[type="text"] {
  width: 100%;
  height: 36px;
  padding: 0 12px;
  border: 1px solid var(--color-border);
  border-radius: 6px;
  background: var(--color-bg-tertiary);
  color: var(--color-text);
  font-size: 13px;
}

.property-field input:focus {
  outline: none;
  border-color: var(--color-accent);
}

.number-input {
  display: flex;
  align-items: center;
  border: 1px solid var(--color-border);
  border-radius: 6px;
  overflow: hidden;
  background: var(--color-bg-tertiary);
}

.step-btn {
  width: 36px;
  height: 36px;
  border: none;
  background: transparent;
  cursor: pointer;
  color: var(--color-text-secondary);
  display: flex;
  align-items: center;
  justify-content: center;
}

.step-btn:hover {
  background: var(--color-border);
  color: var(--color-text);
}

.step-icon {
  width: 14px;
  height: 14px;
}

.number-value {
  flex: 1;
  text-align: center;
  font-size: 14px;
  font-weight: 500;
  color: var(--color-text);
  font-family: var(--font-mono);
}

.unit {
  margin-left: 8px;
  font-size: 11px;
  color: var(--color-text-muted);
}

.position-display {
  display: flex;
  gap: 16px;
  padding: 10px 12px;
  background: var(--color-bg-tertiary);
  border-radius: 6px;
  font-size: 13px;
  color: var(--color-text-secondary);
  font-family: var(--font-mono);
}

.category-select {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 10px;
  border: 1px solid var(--color-border);
  border-radius: 6px;
  background: var(--color-bg-tertiary);
}

.category-badge {
  width: 14px;
  height: 14px;
  border-radius: 50%;
}

.dropdown-btn {
  width: 22px;
  height: 22px;
  border: none;
  background: transparent;
  cursor: pointer;
  color: var(--color-text-secondary);
  display: flex;
  align-items: center;
  justify-content: center;
}

.dropdown-icon {
  width: 14px;
  height: 14px;
}

/* 空状态 */
.empty-state {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px;
  color: var(--color-text-muted);
}

.empty-icon {
  width: 48px;
  height: 48px;
  margin-bottom: 16px;
  opacity: 0.5;
}

.empty-state p {
  font-size: 13px;
  text-align: center;
}
</style>
