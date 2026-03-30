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
          :key="'shape-' + (selectedIds.shapes?.[0] || '') + '-' + refreshKey"
          :node="selectedObjects.shapes?.[0]"
          :type="currentSelectionType as any"
          @update-property="(key, val) => handlePropertyUpdate({ [key]: val })"
        />

        <!-- 文本面板 -->
        <TextPanel
          v-else-if="panelType === 'text'"
          :key="'text-' + (selectedIds.texts?.[0] || '') + '-' + refreshKey"
          :node="selectedObjects.texts?.[0]"
          @update-property="(key, val) => handlePropertyUpdate({ [key]: val })"
        />

        <!-- 座位面板 -->
        <SeatPanel
          v-else-if="panelType === 'seat'"
          :key="'seat-' + (selectedIds.seats?.join(',') || '') + '-' + refreshKey"
          :nodes="selectedObjects.seats || []"
          :categories="categories as any"
          :is-single="selectedIds.seats?.length === 1"
          @update-property="(key, val) => handlePropertyUpdate({ [key]: val })"
          @update-category="(catId) => handleCategoryChange(catId)"
          @manage-categories="emit('manage-categories')"
        />

        <!-- 排面板 -->
        <RowPanel
          v-else-if="panelType === 'row'"
          :key="'row-' + (selectedIds.rows?.join(',') || '') + '-' + refreshKey"
          :nodes="selectedObjects.rows || []"
          :is-single="selectedIds.rows?.length === 1"
          :categories="categories as any"
          @update-property="(key, val) => handlePropertyUpdate({ [key]: val })"
          @update-category="(catId) => handleCategoryChange(catId)"
          @manage-categories="emit('manage-categories')"
        />

        <!-- 区域面板 -->
        <AreaPanel
          v-else-if="panelType === 'area'"
          :key="'area-' + (selectedIds.areas?.[0] || '') + '-' + refreshKey"
          :node="selectedObjects.areas?.[0]"
          :categories="categories as any"
          @update-property="(key, val) => handlePropertyUpdate({ [key]: val })"
          @update-category="(catId) => handleCategoryChange(catId)"
          @manage-categories="emit('manage-categories')"
        />

        <!-- 混合选择面板 -->
        <MixedPanel
          v-else-if="panelType === 'mixed'"
          :key="'mixed-' + mixedSelectionKey + '-' + refreshKey"
          :nodes="mixedSelectionNodes"
          :categories="categories as any"
          :types="mixedSelectionTypes"
          @update-property="(key, val) => handlePropertyUpdate({ [key]: val })"
          @update-category="(catId) => handleCategoryChange(catId)"
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
              <span class="number-value">{{ Math.round(selectedRow.rotation || 0) }}°</span>
              <button class="step-btn" @click="increaseRotation">
                <Icon icon="lucide:plus" class="step-icon" />
              </button>
            </div>
          </div>

          <div class="property-field">
            <label>位置</label>
            <div class="position-display">
              <span>X: {{ Math.round(selectedRow.x || 0) }}</span>
              <span>Y: {{ Math.round(selectedRow.y || 0) }}</span>
            </div>
          </div>
        </div>

        <div class="property-group">
          <h4>类别</h4>
          <div class="category-select">
            <div class="category-badge" :style="{ backgroundColor: selectedCategory?.color || '#9ca3af' }"></div>
            <span class="category-name">{{ (selectedCategory as any)?.name || (selectedCategory as any)?.label || '选择类别' }}</span>
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
        :categories="categories as any"
        :total-seats="totalSeats"
        @manage-categories="emit('manage-categories')"
      />
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { Icon } from '@iconify/vue'
import { useVenueStore } from '../stores/venueStore'
import type { SeatRow as Row, PanelSelection, SelectedObjectType } from '../types'
import ChartOverviewPanel from './panels/ChartOverviewPanel.vue'
import ShapePanel from './panels/ShapePanel.vue'
import TextPanel from './panels/TextPanel.vue'
import SeatPanel from './panels/SeatPanel.vue'
import RowPanel from './panels/RowPanel.vue'
import AreaPanel from './panels/AreaPanel.vue'
import MixedPanel from './panels/MixedPanel.vue'

// 面板内部使用的 Category 类型（兼容旧版 id/name 和新版 key/label）
interface PanelCategory {
  id?: string
  name?: string
  key?: string | number
  label?: string
  color: string
  accessible?: boolean
}

const props = defineProps<{
  chartName: string
  categories: PanelCategory[]
  totalSeats: number
  // 兼容旧版：selection 现在可选，优先从 venueStore 读取
  selection?: PanelSelection | null
  selectedRow?: Row | null
}>()

const emit = defineEmits<{
  'update-row': [row: Row]
  // 兼容旧版：update-property 现在可选，面板直接写入 store
  'update-property': [updates: Record<string, any>]
  'manage-categories': []
}>()

// 使用 venueStore 作为唯一数据源
const venueStore = useVenueStore()

const seatSpacing = ref(28)

// 刷新 key，用于强制重新挂载子面板
const refreshKey = ref(0)

// 计算当前选中类型（从 venueStore 读取）
const currentSelectionType = computed<SelectedObjectType | null>(() => {
  if (venueStore.selectedSeatIds.length > 0) return 'seat'
  if (venueStore.selectedRowIds.length > 0) return 'row'
  if (venueStore.selectedShapeIds.length > 0) {
    // 返回第一个选中形状的类型
    const shape = venueStore.selectedShapes[0]
    if (shape) {
      const shapeType = shape.type
      if (['rect', 'ellipse', 'polygon', 'sector', 'polyline'].includes(shapeType)) {
        return shapeType as SelectedObjectType
      }
    }
    return 'rect'
  }
  if (venueStore.selectedTextIds.length > 0) return 'text'
  if (venueStore.selectedAreaIds.length > 0) return 'area'
  if (venueStore.selectedSectionIds.length > 0) return 'none'
  return null
})

// 混合选择检测
const isMixedSelection = computed(() => {
  const types = [
    venueStore.selectedSeatIds.length > 0,
    venueStore.selectedRowIds.length > 0,
    venueStore.selectedShapeIds.length > 0,
    venueStore.selectedTextIds.length > 0,
    venueStore.selectedAreaIds.length > 0,
  ].filter(Boolean).length
  return types > 1
})

// 获取选中对象数据
const selectedObjects = computed(() => {
  return {
    seats: venueStore.selectedSeats,
    rows: venueStore.selectedRows,
    shapes: venueStore.selectedShapes,
    texts: venueStore.selectedTexts,
    areas: venueStore.selectedAreas,
  }
})

// 获取选中 ID 列表
const selectedIds = computed(() => {
  return {
    seats: venueStore.selectedSeatIds,
    rows: venueStore.selectedRowIds,
    shapes: venueStore.selectedShapeIds,
    texts: venueStore.selectedTextIds,
    areas: venueStore.selectedAreaIds,
  }
})

// 混合选择的节点数据（合并所有选中类型）
const mixedSelectionNodes = computed(() => {
  return [
    ...selectedObjects.value.seats,
    ...selectedObjects.value.rows,
    ...selectedObjects.value.shapes,
    ...selectedObjects.value.texts,
    ...selectedObjects.value.areas,
  ]
})

// 混合选择的 key（用于强制刷新）
const mixedSelectionKey = computed(() => {
  return [
    ...selectedIds.value.seats,
    ...selectedIds.value.rows,
    ...selectedIds.value.shapes,
    ...selectedIds.value.texts,
    ...selectedIds.value.areas,
  ].join(',')
})

// 混合选择的类型列表
const mixedSelectionTypes = computed(() => {
  const types: string[] = []
  if (selectedIds.value.seats.length > 0) types.push('seat')
  if (selectedIds.value.rows.length > 0) types.push('row')
  if (selectedIds.value.shapes.length > 0) types.push('shape')
  if (selectedIds.value.texts.length > 0) types.push('text')
  if (selectedIds.value.areas.length > 0) types.push('area')
  return types
})

// 监听 venueStore 选择变化，递增 refreshKey
watch(() => [
  venueStore.selectedSeatIds,
  venueStore.selectedRowIds,
  venueStore.selectedShapeIds,
  venueStore.selectedTextIds,
  venueStore.selectedAreaIds
], () => {
  refreshKey.value++
}, { deep: true })

// 兼容旧版：如果 props.selection 存在，也监听它
watch(() => props.selection, () => {
  refreshKey.value++
}, { deep: true })

// 判断是否显示选中对象面板
const shouldShowSelectionPanel = computed(() => {
  // 优先使用 venueStore
  if (venueStore.hasSelection) return true
  // 兼容旧版
  if (!props.selection) return false
  return props.selection.type !== 'none'
})

// 面板类型映射
const panelType = computed(() => {
  // 优先使用 venueStore
  if (isMixedSelection.value) return 'mixed'
  
  const type = currentSelectionType.value
  if (type) {
    // 形状类型映射
    const shapeTypes: SelectedObjectType[] = ['rect', 'ellipse', 'polygon', 'sector', 'polyline']
    if (shapeTypes.includes(type)) return 'shape'
    // 直接映射
    if (type === 'text') return 'text'
    if (type === 'seat') return 'seat'
    if (type === 'row') return 'row'
    if (type === 'area') return 'area'
  }

  // 兼容旧版
  if (!props.selection) return null
  const oldType = props.selection.type
  if (props.selection.isMixed) return 'mixed'
  const shapeTypes: SelectedObjectType[] = ['rect', 'ellipse', 'polygon', 'sector', 'polyline']
  if (shapeTypes.includes(oldType)) return 'shape'
  if (oldType === 'text') return 'text'
  if (oldType === 'seat') return 'seat'
  if (oldType === 'row') return 'row'
  if (oldType === 'area') return 'area'

  return 'unknown'
})

// 选中对象标题
const selectionTitle = computed(() => {
  // 优先使用 venueStore
  if (isMixedSelection.value) {
    return '混合选择'
  }

  const type = currentSelectionType.value
  if (type) {
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
    return titles[type] || '对象'
  }

  // 兼容旧版
  if (!props.selection) return ''

  if (props.selection.isMixed) {
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
  // 优先使用 venueStore
  if (isMixedSelection.value) return 'MULTIPLE'

  const type = currentSelectionType.value
  if (type) {
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
    return labels[type] || 'OBJECT'
  }

  // 兼容旧版
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

// 通用属性更新处理器 - 直接写入 venueStore
const handlePropertyUpdate = (updates: Record<string, any>) => {
  const type = currentSelectionType.value
  if (!type) {
    // 兼容旧版：通过 emit 更新
    emit('update-property', updates)
    return
  }

  // 获取当前选中的 ID 列表
  let ids: string[] = []
  switch (type) {
    case 'seat':
      ids = venueStore.selectedSeatIds
      break
    case 'row':
      ids = venueStore.selectedRowIds
      break
    case 'rect':
    case 'ellipse':
    case 'polygon':
    case 'sector':
    case 'polyline':
      ids = venueStore.selectedShapeIds
      break
    case 'text':
      ids = venueStore.selectedTextIds
      break
    case 'area':
      ids = venueStore.selectedAreaIds
      break
  }

  // 批量更新所有选中对象
  for (const id of ids) {
    venueStore.updateObjectProperty(type, id, updates)
  }
}

// 处理分类变更
const handleCategoryChange = (categoryId: string) => {
  const type = currentSelectionType.value
  if (!type) {
    // 兼容旧版
    emit('update-property', { categoryId })
    return
  }

  let ids: string[] = []
  switch (type) {
    case 'seat':
      ids = venueStore.selectedSeatIds
      // 批量更新座位分类
      venueStore.updateSeatsCategory(ids, categoryId)
      return
    case 'row':
      ids = venueStore.selectedRowIds
      break
    case 'area':
      ids = venueStore.selectedAreaIds
      break
    default:
      // 其他类型不处理分类
      return
  }

  // 批量更新分类
  for (const id of ids) {
    venueStore.updateObjectProperty(type, id, { categoryId })
  }
}

// 兼容旧版：选中类别
const selectedCategory = computed(() => {
  if (!props.selectedRow || props.selectedRow.seats.length === 0) return null
  // Seat 使用 categoryKey 而非 categoryId
  const seat = props.selectedRow.seats[0] as any
  const categoryKey = seat.categoryKey || seat.categoryId
  return props.categories.find(c => (c as any).id === categoryKey || c.key === categoryKey)
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
    props.selectedRow.rotation = ((props.selectedRow.rotation || 0) + 5) % 360
    updateRow()
  }
}

function decreaseRotation() {
  if (props.selectedRow) {
    props.selectedRow.rotation = ((props.selectedRow.rotation || 0) - 5) % 360
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
