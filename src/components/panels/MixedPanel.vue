<template>
  <div class="mixed-panel">
    <!-- Category 分组 -->
    <!-- EN: Category -->
    <PanelSection title="分类" :collapsible="true" :defaultExpanded="true">
      <CategorySelector
        :modelValue="categoryId"
        :categories="categories"
        @update:modelValue="onCategoryChange"
        @manage="emit('manage-categories')"
      />
    </PanelSection>

    <!-- Object labeling 分组 -->
    <!-- EN: Object labeling -->
    <PanelSection title="对象编号" :collapsible="true" :defaultExpanded="true">
      <template #header-extra>
        <button class="clear-btn" @click="onClearLabeling">
          <Icon icon="lucide:x" class="clear-icon" />
          <!-- EN: Clear -->
          清除
        </button>
      </template>
      <div class="property-row">
        <!-- EN: Labels -->
        <label class="property-label">标签方案</label>
        <div class="property-control">
          <select
            :value="labelingConfig.labels"
            @change="onUpdateProperty('labels', ($event.target as HTMLSelectElement).value)"
            class="select-input"
          >
            <option value="1-2-3">1-2-3</option>
            <option value="1-3-5">1-3-5</option>
            <option value="a-b-c">a-b-c</option>
            <option value="A-B-C">A-B-C</option>
          </select>
        </div>
      </div>
      <div class="property-row">
        <!-- EN: Displayed label -->
        <label class="property-label">显示标签</label>
        <div class="property-control">
          <!-- EN: Set -->
          <button class="set-btn" @click="onSetDisplayedLabel">设置</button>
        </div>
      </div>
      <div class="property-row">
        <!-- EN: Start at -->
        <label class="property-label">起始编号</label>
        <div class="property-control">
          <NumberInput
            :modelValue="labelingConfig.startAt"
            :min="1"
            @update:modelValue="onUpdateProperty('startAt', $event)"
          />
        </div>
      </div>
      <div class="property-row">
        <!-- EN: Direction -->
        <label class="property-label">方向</label>
        <div class="property-control">
          <div class="direction-toggle">
            <button
              class="direction-btn"
              :class="{ active: labelingConfig.direction === 'asc' }"
              @click="onUpdateProperty('direction', 'asc')"
              title="递增"
            >
              <Icon icon="lucide:arrow-right" class="direction-icon" />
            </button>
            <button
              class="direction-btn"
              :class="{ active: labelingConfig.direction === 'desc' }"
              @click="onUpdateProperty('direction', 'desc')"
              title="递减"
            >
              <Icon icon="lucide:arrow-left" class="direction-icon" />
            </button>
          </div>
        </div>
      </div>
    </PanelSection>

    <!-- Miscellaneous 分组 -->
    <!-- EN: Miscellaneous -->
    <PanelSection title="其他" :collapsible="true" :defaultExpanded="true">
      <div class="property-row">
        <!-- EN: Entrance -->
        <label class="property-label">入口</label>
        <div class="property-control">
          <input
            type="text"
            :value="miscData.entrance"
            @input="onUpdateProperty('entrance', ($event.target as HTMLInputElement).value)"
            class="text-input"
            placeholder="例如：A入口"
          />
        </div>
      </div>
    </PanelSection>

    <!-- 选中统计 -->
    <div class="selection-summary">
      <div class="summary-item">
        <!-- EN: objects selected -->
        <span class="summary-label">{{ nodes.length }} 个对象已选中</span>
      </div>
      <div class="summary-item">
        <span class="summary-label">类型</span>
        <span class="summary-value">{{ typeSummary }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Icon } from '@iconify/vue'
import PanelSection from './controls/PanelSection.vue'
import CategorySelector from './controls/CategorySelector.vue'
import NumberInput from './controls/NumberInput.vue'

interface Category {
  id: string
  name: string
  color: string
}

interface LabelingConfig {
  labels: string
  startAt: number
  direction: 'asc' | 'desc'
}

interface MiscData {
  entrance: string
}

const props = defineProps<{
  nodes: any[]
  categories: Category[]
  types: string[]
}>()

const emit = defineEmits<{
  'update-property': [key: string, value: any]
  'update-category': [categoryId: string]
  'manage-categories': []
}>()

// 类别ID（如果所有选中对象类别相同）
const categoryId = computed(() => {
  const categoryIds = props.nodes.map(n => n.getAttr?.('categoryId') || n.categoryId || '')
  const uniqueIds = [...new Set(categoryIds)]
  return uniqueIds.length === 1 ? uniqueIds[0] : ''
})

// 标签配置
const labelingConfig = computed<LabelingConfig>(() => {
  // 从第一个节点获取默认配置
  const firstNode = props.nodes[0]
  const labeling = firstNode?.getAttr?.('labeling') || firstNode?.labeling || {}
  return {
    labels: labeling.labels || '1-2-3',
    startAt: labeling.startAt || 1,
    direction: labeling.direction || 'asc'
  }
})

// 杂项数据
const miscData = computed<MiscData>(() => {
  const firstNode = props.nodes[0]
  return {
    entrance: firstNode?.getAttr?.('entrance') || firstNode?.entrance || ''
  }
})

// 类型摘要
const typeSummary = computed(() => {
  const typeNames: Record<string, string> = {
    'seat': '座位',
    'row': '排',
    'area': '区域',
    'rect': '矩形',
    'ellipse': '椭圆',
    'polygon': '多边形',
    'sector': '扇形',
    'polyline': '折线',
    'text': '文本'
  }
  const uniqueTypes = [...new Set(props.types)]
  return uniqueTypes.map(t => typeNames[t] || t).join(', ')
})

function onCategoryChange(categoryId: string) {
  emit('update-category', categoryId)
}

function onUpdateProperty(key: string, value: any) {
  emit('update-property', key, value)
}

function onClearLabeling() {
  emit('update-property', 'labels', '')
}

function onSetDisplayedLabel() {
  // 批量设置显示标签
  emit('update-property', 'setDisplayedLabel', true)
}
</script>

<style scoped>
.mixed-panel {
  background: #fafafa;
}

.property-row {
  display: flex;
  align-items: center;
  min-height: 32px;
  margin-bottom: 10px;
}

.property-row:last-child {
  margin-bottom: 0;
}

.property-label {
  width: 40%;
  font-size: 12px;
  color: #666;
  flex-shrink: 0;
}

.property-control {
  width: 60%;
  display: flex;
  align-items: center;
  gap: 8px;
}

.text-input {
  flex: 1;
  height: 28px;
  padding: 0 10px;
  border: 1px solid #d0d0d0;
  border-radius: 4px;
  background: #fff;
  font-size: 12px;
  color: #333;
  transition: border-color 0.15s ease;
}

.text-input:focus {
  outline: none;
  border-color: #4a90d9;
}

.select-input {
  flex: 1;
  height: 28px;
  padding: 0 8px;
  border: 1px solid #d0d0d0;
  border-radius: 4px;
  background: #fff;
  font-size: 12px;
  color: #333;
  cursor: pointer;
}

.select-input:focus {
  outline: none;
  border-color: #4a90d9;
}

.clear-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 3px 8px;
  border: 1px solid #d0d0d0;
  border-radius: 3px;
  background: #fff;
  cursor: pointer;
  font-size: 11px;
  color: #666;
  transition: all 0.15s ease;
}

.clear-btn:hover {
  background: #f5f5f5;
  border-color: #bbb;
}

.clear-icon {
  width: 10px;
  height: 10px;
}

.set-btn {
  height: 28px;
  padding: 0 16px;
  border: 1px solid #d0d0d0;
  border-radius: 4px;
  background: #f5f5f5;
  cursor: pointer;
  font-size: 11px;
  font-weight: 500;
  color: #555;
  transition: all 0.15s ease;
}

.set-btn:hover {
  background: #e8e8e8;
  border-color: #bbb;
}

/* 方向切换按钮 */
.direction-toggle {
  display: flex;
  gap: 4px;
}

.direction-btn {
  width: 32px;
  height: 28px;
  border: 1px solid #d0d0d0;
  border-radius: 4px;
  background: #fff;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #666;
  transition: all 0.15s ease;
  padding: 0;
}

.direction-btn:hover {
  background: #f5f5f5;
  border-color: #aaa;
}

.direction-btn.active {
  background: #4a90d9;
  border-color: #4a90d9;
  color: #fff;
}

.direction-icon {
  width: 14px;
  height: 14px;
}

/* 选中统计 */
.selection-summary {
  padding: 16px;
  background: #f0f0f0;
  border-top: 1px solid #e0e0e0;
}

.summary-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.summary-item:last-child {
  margin-bottom: 0;
}

.summary-label {
  font-size: 12px;
  color: #666;
}

.summary-value {
  font-size: 12px;
  font-weight: 500;
  color: #333;
}
</style>
