<template>
  <div class="row-panel">
    <!-- Category 分组 -->
    <!-- EN: Category -->
    <PanelSection title="分类" :collapsible="true" :defaultExpanded="true">
      <CategorySelector
        :modelValue="localCategoryId"
        :categories="categories"
        @update:modelValue="onCategoryChange"
        @manage="emit('manage-categories')"
      />
    </PanelSection>

    <!-- Row 分组 -->
    <!-- EN: Row -->
    <PanelSection title="排" :collapsible="true" :defaultExpanded="true">
      <div class="property-row">
        <!-- EN: Number of seats -->
        <label class="property-label">座位数</label>
        <div class="property-control">
          <NumberInput
            :modelValue="localSeatCount"
            :min="1"
            @update:modelValue="onUpdateProperty('seatCount', $event)"
          />
        </div>
      </div>
      <div class="property-row">
        <!-- EN: Curve -->
        <label class="property-label">弧度</label>
        <div class="property-control">
          <NumberInput
            :modelValue="localCurve"
            :min="-100"
            :max="100"
            @update:modelValue="onUpdateProperty('curve', $event)"
          />
        </div>
      </div>
      <div class="property-row">
        <!-- EN: Seat spacing -->
        <label class="property-label">座位间距</label>
        <div class="property-control">
          <NumberInput
            :modelValue="localSeatSpacing"
            :min="0"
            unit="pt"
            @update:modelValue="onUpdateProperty('seatSpacing', $event)"
          />
        </div>
      </div>
    </PanelSection>

    <!-- Row labeling 分组 -->
    <!-- EN: Row labeling -->
    <PanelSection title="排编号" :collapsible="true" :defaultExpanded="true">
      <template #header-extra>
        <button class="lock-btn" :class="{ locked: localRowLabelingLocked }" @click="toggleRowLabelLock">
          <Icon :icon="localRowLabelingLocked ? 'lucide:lock' : 'lucide:unlock'" class="lock-icon" />
        </button>
      </template>
      <div class="property-row">
        <!-- EN: Enabled -->
        <label class="property-label">启用</label>
        <div class="property-control">
          <label class="checkbox-wrapper">
            <input
              type="checkbox"
              :checked="localRowLabelingEnabled"
              @change="onUpdateProperty('rowLabeling.enabled', ($event.target as HTMLInputElement).checked)"
              class="checkbox-input"
            />
            <span class="checkmark"></span>
          </label>
        </div>
      </div>
      <div class="property-row">
        <!-- EN: Label -->
        <label class="property-label">标签</label>
        <div class="property-control">
          <input
            type="text"
            :value="localRowLabelingLabel"
            :disabled="localRowLabelingLocked"
            @input="onUpdateProperty('rowLabeling.label', ($event.target as HTMLInputElement).value)"
            class="text-input"
          />
        </div>
      </div>
      <div class="property-row">
        <!-- EN: Displayed label -->
        <label class="property-label">显示标签</label>
        <div class="property-control">
          <input
            type="text"
            :value="localRowLabelingDisplayedLabel"
            @input="onUpdateProperty('rowLabeling.displayedLabel', ($event.target as HTMLInputElement).value)"
            class="text-input"
          />
          <!-- EN: Set -->
          <button class="set-btn" @click="onSetDisplayedLabel">设置</button>
        </div>
      </div>
      <div class="property-row">
        <!-- EN: Position -->
        <label class="property-label">位置</label>
        <div class="property-control">
          <div class="position-selector">
            <button
              v-for="pos in positions"
              :key="pos.value"
              class="position-dot"
              :class="{ active: localRowLabelingPosition === pos.value }"
              @click="onUpdateProperty('rowLabeling.position', pos.value)"
              :title="pos.label"
            ></button>
          </div>
        </div>
      </div>
      <div class="property-row">
        <!-- EN: Displayed type -->
        <label class="property-label">显示类型</label>
        <div class="property-control">
          <!-- EN: Row -->
          <span class="readonly-text">排</span>
        </div>
      </div>
    </PanelSection>

    <!-- Seat labeling 分组 -->
    <!-- EN: Seat labeling -->
    <PanelSection title="座位编号" :collapsible="true" :defaultExpanded="true">
      <template #header-extra>
        <div class="section-header-actions">
          <button class="clear-btn" @click="onClearSeatLabeling">
            <Icon icon="lucide:x" class="clear-icon" />
            <!-- EN: Clear -->
            清除
          </button>
          <button class="lock-btn" :class="{ locked: localSeatLabelingLocked }" @click="toggleSeatLabelLock">
            <Icon :icon="localSeatLabelingLocked ? 'lucide:lock' : 'lucide:unlock'" class="lock-icon" />
          </button>
        </div>
      </template>
      <div class="property-row">
        <!-- EN: Labels -->
        <label class="property-label">标签方案</label>
        <div class="property-control">
          <select
            :value="localSeatLabelingLabels"
            @change="onUpdateProperty('seatLabeling.labels', ($event.target as HTMLSelectElement).value)"
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
        <!-- EN: Displayed type -->
        <label class="property-label">显示类型</label>
        <div class="property-control">
          <!-- EN: Seat -->
          <span class="readonly-text">座位</span>
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
            :value="localEntrance"
            @input="onUpdateProperty('entrance', ($event.target as HTMLInputElement).value)"
            class="text-input"
            placeholder="例如：A入口"
          />
        </div>
      </div>
    </PanelSection>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { Icon } from '@iconify/vue'
import PanelSection from './controls/PanelSection.vue'
import CategorySelector from './controls/CategorySelector.vue'
import NumberInput from './controls/NumberInput.vue'

interface Category {
  id: string
  name: string
  color: string
}

const props = defineProps<{
  nodes: any[]
  isSingle: boolean
  categories: Category[]
}>()

const emit = defineEmits<{
  'update-property': [key: string, value: any]
  'update-category': [categoryId: string]
  'manage-categories': []
}>()

// 本地 ref 管理属性值
const localCategoryId = ref('')
const localSeatCount = ref(0)
const localCurve = ref(0)
const localSeatSpacing = ref(28)
const localEntrance = ref('')

// 排标签配置
const localRowLabelingEnabled = ref(true)
const localRowLabelingLabel = ref('')
const localRowLabelingDisplayedLabel = ref('')
const localRowLabelingPosition = ref('left')
const localRowLabelingLocked = ref(false)

// 座位标签配置
const localSeatLabelingLabels = ref('1-2-3')
const localSeatLabelingLocked = ref(false)

// 位置选项
const positions = [
  { value: 'left', label: 'Left' },
  { value: 'center', label: 'Center' },
  { value: 'right', label: 'Right' }
]

// 从节点读取属性的函数（只读取第一个节点作为代表）
const readFromNodes = () => {
  if (!props.nodes || props.nodes.length === 0) return
  const node = props.nodes[0]
  
  const seats = node.getAttr?.('seats') || node.seats || []
  localCategoryId.value = node.getAttr?.('categoryId') || node.categoryId || ''
  localSeatCount.value = seats.length || 0
  localCurve.value = node.getAttr?.('curve') || node.curve || 0
  localSeatSpacing.value = node.getAttr?.('seatSpacing') || node.seatSpacing || 28
  localEntrance.value = node.getAttr?.('entrance') || node.entrance || ''
  
  // 排标签配置
  const rowLabeling = node.getAttr?.('rowLabeling') || node.rowLabeling || {}
  localRowLabelingEnabled.value = rowLabeling.enabled !== false
  localRowLabelingLabel.value = rowLabeling.label || node.getAttr?.('label') || node.label || ''
  localRowLabelingDisplayedLabel.value = rowLabeling.displayedLabel || ''
  localRowLabelingPosition.value = rowLabeling.position || 'left'
  localRowLabelingLocked.value = rowLabeling.locked || false
  
  // 座位标签配置
  const seatLabeling = node.getAttr?.('seatLabeling') || node.seatLabeling || {}
  localSeatLabelingLabels.value = seatLabeling.labels || '1-2-3'
  localSeatLabelingLocked.value = seatLabeling.locked || false
}

// 挂载时和 nodes 变化时读取
watch(() => props.nodes, () => readFromNodes(), { immediate: true })

function onCategoryChange(categoryId: string) {
  localCategoryId.value = categoryId
  emit('update-category', categoryId)
}

function onUpdateProperty(key: string, value: any) {
  // 更新本地 ref
  switch(key) {
    case 'seatCount': localSeatCount.value = value; break
    case 'curve': localCurve.value = value; break
    case 'seatSpacing': localSeatSpacing.value = value; break
    case 'entrance': localEntrance.value = value; break
    case 'rowLabeling.enabled': localRowLabelingEnabled.value = value; break
    case 'rowLabeling.label': localRowLabelingLabel.value = value; break
    case 'rowLabeling.displayedLabel': localRowLabelingDisplayedLabel.value = value; break
    case 'rowLabeling.position': localRowLabelingPosition.value = value; break
    case 'rowLabeling.locked': localRowLabelingLocked.value = value; break
    case 'seatLabeling.labels': localSeatLabelingLabels.value = value; break
    case 'seatLabeling.locked': localSeatLabelingLocked.value = value; break
  }
  emit('update-property', key, value)
}

function toggleRowLabelLock() {
  const newValue = !localRowLabelingLocked.value
  localRowLabelingLocked.value = newValue
  emit('update-property', 'rowLabeling.locked', newValue)
}

function toggleSeatLabelLock() {
  const newValue = !localSeatLabelingLocked.value
  localSeatLabelingLocked.value = newValue
  emit('update-property', 'seatLabeling.locked', newValue)
}

function onSetDisplayedLabel() {
  localRowLabelingDisplayedLabel.value = localRowLabelingLabel.value
  emit('update-property', 'rowLabeling.displayedLabel', localRowLabelingLabel.value)
}

function onClearSeatLabeling() {
  localSeatLabelingLabels.value = ''
  emit('update-property', 'seatLabeling.labels', '')
}

// 暴露 refresh 方法供外部调用
const refresh = () => readFromNodes()
defineExpose({ refresh })
</script>

<style scoped>
.row-panel {
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

.text-input:disabled {
  background: #f5f5f5;
  color: #888;
  cursor: not-allowed;
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

.readonly-text {
  font-size: 12px;
  color: #888;
  font-style: italic;
}

.lock-btn {
  width: 24px;
  height: 24px;
  border: 1px solid #d0d0d0;
  border-radius: 4px;
  background: #fff;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #888;
  transition: all 0.15s ease;
  padding: 0;
}

.lock-btn:hover {
  border-color: #aaa;
  color: #666;
}

.lock-btn.locked {
  background: #fff8e1;
  border-color: #ffc107;
  color: #f57c00;
}

.lock-icon {
  width: 12px;
  height: 12px;
}

.section-header-actions {
  display: flex;
  align-items: center;
  gap: 6px;
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
  padding: 0 12px;
  border: 1px solid #d0d0d0;
  border-radius: 4px;
  background: #f5f5f5;
  cursor: pointer;
  font-size: 11px;
  font-weight: 500;
  color: #555;
  transition: all 0.15s ease;
  flex-shrink: 0;
}

.set-btn:hover {
  background: #e8e8e8;
  border-color: #bbb;
}

.checkbox-wrapper {
  position: relative;
  display: inline-block;
  width: 18px;
  height: 18px;
  cursor: pointer;
}

.checkbox-input {
  position: absolute;
  opacity: 0;
  width: 0;
  height: 0;
}

.checkmark {
  position: absolute;
  top: 0;
  left: 0;
  width: 18px;
  height: 18px;
  background: #fff;
  border: 2px solid #d0d0d0;
  border-radius: 3px;
  transition: all 0.15s ease;
}

.checkbox-wrapper:hover .checkmark {
  border-color: #aaa;
}

.checkbox-input:checked + .checkmark {
  background: #4a90d9;
  border-color: #4a90d9;
}

.checkmark::after {
  content: '';
  position: absolute;
  display: none;
  left: 5px;
  top: 2px;
  width: 4px;
  height: 8px;
  border: solid white;
  border-width: 0 2px 2px 0;
  transform: rotate(45deg);
}

.checkbox-input:checked + .checkmark::after {
  display: block;
}

/* Position 可视化选择器 */
.position-selector {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 10px;
  background: #f0f0f0;
  border-radius: 4px;
}

.position-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  border: 2px solid #ccc;
  background: #fff;
  cursor: pointer;
  transition: all 0.15s ease;
  padding: 0;
}

.position-dot:hover {
  border-color: #4a90d9;
}

.position-dot.active {
  background: #4a90d9;
  border-color: #4a90d9;
}
</style>
