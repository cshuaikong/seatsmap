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
          <div class="seat-count-display">
            <button class="step-btn" @click="onDecreaseSeatCount" :disabled="!canDecrease">
              <Icon icon="lucide:minus" class="step-icon" />
            </button>
            <span class="count-text">{{ seatCountDisplay }}</span>
            <button class="step-btn" @click="onIncreaseSeatCount" :disabled="!canIncrease">
              <Icon icon="lucide:plus" class="step-icon" />
            </button>
          </div>
        </div>
      </div>
      <div class="property-row">
        <!-- EN: Curve -->
        <label class="property-label">弧度</label>
        <div class="property-control">
          <div class="seat-count-display">
            <button class="step-btn" @click="onDecreaseCurve" :disabled="!canDecreaseCurve">
              <Icon icon="lucide:minus" class="step-icon" />
            </button>
            <span class="count-text">{{ curveDisplay }}</span>
            <button class="step-btn" @click="onIncreaseCurve" :disabled="!canIncreaseCurve">
              <Icon icon="lucide:plus" class="step-icon" />
            </button>
          </div>
        </div>
      </div>
      <div class="property-row">
        <!-- EN: Seat spacing -->
        <label class="property-label">座位间距</label>
        <div class="property-control">
          <div class="seat-count-display">
            <button class="step-btn" @click="onDecreaseSpacing" :disabled="!canDecreaseSpacing">
              <Icon icon="lucide:minus" class="step-icon" />
            </button>
            <span class="count-text">{{ seatSpacingDisplay }}</span>
            <button class="step-btn" @click="onIncreaseSpacing" :disabled="!canIncreaseSpacing">
              <Icon icon="lucide:plus" class="step-icon" />
            </button>
          </div>
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
      
      <!-- 单选：显示单个标签输入 -->
      <div v-if="isSingle" class="property-row">
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
      
      <!-- 多选：显示批量标签设置 -->
      <template v-else>
        <div class="property-row">
          <label class="property-label">标签模式</label>
          <div class="property-control">
            <select v-model="batchLabelMode" class="select-input">
              <option value="">无</option>
              <option value="A-B-C">A-B-C</option>
              <option value="a-b-c">a-b-c</option>
              <option value="1-2-3">1-2-3</option>
            </select>
          </div>
        </div>
        <div class="property-row">
          <label class="property-label">起始值</label>
          <div class="property-control">
            <input 
              type="text" 
              v-model="batchLabelStart" 
              class="text-input"
              :placeholder="batchLabelStartPlaceholder"
            />
          </div>
        </div>
      </template>
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
            <option value="">无</option>
            <option value="1-2-3">1-2-3</option>
            <option value="1-3-5">1-3-5</option>
            <option value="a-b-c">a-b-c</option>
            <option value="A-B-C">A-B-C</option>
          </select>
        </div>
      </div>
    </PanelSection>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, computed } from 'vue'
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
const localSeatCounts = ref<number[]>([])  // 多选时存储每个排的座位数
const localCurves = ref<number[]>([])  // 多选时存储每个排的弧度
const localSeatSpacings = ref<number[]>([])  // 多选时存储每个排的座位间距

// 排标签配置
const localRowLabelingLabel = ref('')
const localRowLabelingLocked = ref(false)

// 座位标签配置
const localSeatLabelingLabels = ref('')
const localSeatLabelingLocked = ref(false)

// 批量标签设置
const batchLabelMode = ref<string>('')
const batchLabelStart = ref('')

// 起始值占位符
const batchLabelStartPlaceholder = computed(() => {
  switch (batchLabelMode.value) {
    case 'A-B-C': return '例如: A 或 C'
    case 'a-b-c': return '例如: a 或 c'
    case '1-2-3': return '例如: 1 或 5'
    default: return ''
  }
})

// 生成标签序列
const generateLabels = (mode: string, start: string, count: number): (string | null)[] => {
  if (!mode) {
    // 空模式：返回 null 数组表示清除标签
    return Array(count).fill(null)
  }
  
  const labels: string[] = []
  
  if (mode === '1-2-3') {
    // 数字模式
    let startNum = parseInt(start) || 1
    for (let i = 0; i < count; i++) {
      labels.push(String(startNum + i))
    }
  } else if (mode === 'A-B-C') {
    // 大写字母模式
    let startCode = start ? start.toUpperCase().charCodeAt(0) : 65 // A = 65
    for (let i = 0; i < count; i++) {
      labels.push(String.fromCharCode(startCode + i))
    }
  } else if (mode === 'a-b-c') {
    // 小写字母模式
    let startCode = start ? start.toLowerCase().charCodeAt(0) : 97 // a = 97
    for (let i = 0; i < count; i++) {
      labels.push(String.fromCharCode(startCode + i))
    }
  }
  
  return labels
}

// 应用批量标签
const applyBatchLabels = () => {
  const labels = generateLabels(batchLabelMode.value, batchLabelStart.value, props.nodes.length)
  emit('update-property', 'batchLabels', labels)
}

// 监听批量标签设置变化，自动应用
watch([batchLabelMode, batchLabelStart], () => {
  if (!props.isSingle && props.nodes.length > 0) {
    applyBatchLabels()
  }
})

// 计算座位数显示文本（多选用逗号分隔）
const seatCountDisplay = computed(() => {
  if (localSeatCounts.value.length === 0) return '0'
  if (localSeatCounts.value.length === 1) return String(localSeatCounts.value[0])
  // 多选时显示所有座位数，用逗号分隔
  return localSeatCounts.value.join(',')
})

// 是否可以减少座位
const canDecrease = computed(() => {
  return localSeatCounts.value.some(count => count > 1)
})

// 是否可以增加座位
const canIncrease = computed(() => {
  return localSeatCounts.value.length > 0
})

// 计算弧度显示文本（多选用逗号分隔）
const curveDisplay = computed(() => {
  if (localCurves.value.length === 0) return '0'
  if (localCurves.value.length === 1) return String(localCurves.value[0])
  // 多选时显示所有弧度，用逗号分隔
  return localCurves.value.join(',')
})

// 是否可以减少弧度
const canDecreaseCurve = computed(() => {
  return localCurves.value.some(curve => curve > -200)
})

// 是否可以增加弧度
const canIncreaseCurve = computed(() => {
  return localCurves.value.some(curve => curve < 200)
})

// 计算座位间距显示文本（多选用逗号分隔）
const seatSpacingDisplay = computed(() => {
  if (localSeatSpacings.value.length === 0) return '18'
  if (localSeatSpacings.value.length === 1) return String(localSeatSpacings.value[0])
  // 多选时显示所有座位间距，用逗号分隔
  return localSeatSpacings.value.join(',')
})

// 是否可以减少座位间距
const canDecreaseSpacing = computed(() => {
  return localSeatSpacings.value.some(spacing => spacing > 1)
})

// 是否可以增加座位间距
const canIncreaseSpacing = computed(() => {
  return localSeatSpacings.value.length > 0
})

// 从节点读取属性的函数（读取所有节点）
const readFromNodes = () => {
  if (!props.nodes || props.nodes.length === 0) {
    localSeatCounts.value = []
    return
  }
  
  // 读取所有选中排的座位数
  localSeatCounts.value = props.nodes.map(node => {
    const seats = node.getAttr?.('seats') || node.seats || []
    return seats.length || 0
  })
  
  // 读取所有选中排的弧度
  localCurves.value = props.nodes.map(node => {
    return node.getAttr?.('curve') || node.curve || 0
  })
  
  // 读取所有选中排的座位间距
  localSeatSpacings.value = props.nodes.map(node => {
    return node.getAttr?.('seatSpacing') || node.seatSpacing || 18
  })
  
  // 其他属性只读取第一个节点
  const node = props.nodes[0]
  localCategoryId.value = node.getAttr?.('categoryId') || node.categoryId || ''
  
  // 排标签配置
  const rowLabeling = node.getAttr?.('rowLabeling') || node.rowLabeling || {}
  localRowLabelingLabel.value = rowLabeling.label || node.getAttr?.('label') || node.label || ''
  localRowLabelingLocked.value = rowLabeling.locked || false
  
  // 座位标签配置
  const seatLabeling = node.getAttr?.('seatLabeling') || node.seatLabeling || {}
  localSeatLabelingLabels.value = seatLabeling.labels || ''
  localSeatLabelingLocked.value = seatLabeling.locked || false
}

// 挂载时和 nodes 变化时读取
watch(() => props.nodes, () => readFromNodes(), { immediate: true })

function onCategoryChange(categoryId: string) {
  localCategoryId.value = categoryId
  emit('update-category', categoryId)
}

// 减少座位数
function onDecreaseSeatCount() {
  if (!canDecrease.value) return
  // 每个选中的排都减少1个座位，但不能少于1
  const newCounts = localSeatCounts.value.map(count => Math.max(1, count - 1))
  localSeatCounts.value = newCounts
  // 发送更新事件，包含所有排的座位数
  emit('update-property', 'seatCount', newCounts)
}

// 增加座位数
function onIncreaseSeatCount() {
  if (!canIncrease.value) return
  // 每个选中的排都增加1个座位
  const newCounts = localSeatCounts.value.map(count => count + 1)
  localSeatCounts.value = newCounts
  // 发送更新事件，包含所有排的座位数
  emit('update-property', 'seatCount', newCounts)
}

// 减少弧度
function onDecreaseCurve() {
  if (!canDecreaseCurve.value) return
  // 每个选中的排都减少5个单位的弧度，但不能少于-200
  const newCurves = localCurves.value.map(curve => Math.max(-200, curve - 5))
  localCurves.value = newCurves
  // 发送更新事件，包含所有排的弧度
  emit('update-property', 'curve', newCurves)
}

// 增加弧度
function onIncreaseCurve() {
  if (!canIncreaseCurve.value) return
  // 每个选中的排都增加5个单位的弧度，但不能超过200
  const newCurves = localCurves.value.map(curve => Math.min(200, curve + 5))
  localCurves.value = newCurves
  // 发送更新事件，包含所有排的弧度
  emit('update-property', 'curve', newCurves)
}

// 减少座位间距
function onDecreaseSpacing() {
  if (!canDecreaseSpacing.value) return
  // 每个选中的排都减少1个单位的座位间距，但不能少于1
  const newSpacings = localSeatSpacings.value.map(spacing => Math.max(1, spacing - 1))
  localSeatSpacings.value = newSpacings
  // 发送更新事件，包含所有排的座位间距，同时重置弧度为0
  emit('update-property', 'seatSpacing', { spacings: newSpacings, resetCurve: true })
}

// 增加座位间距
function onIncreaseSpacing() {
  if (!canIncreaseSpacing.value) return
  // 每个选中的排都增加1个单位的座位间距
  const newSpacings = localSeatSpacings.value.map(spacing => spacing + 1)
  localSeatSpacings.value = newSpacings
  // 发送更新事件，包含所有排的座位间距，同时重置弧度为0
  emit('update-property', 'seatSpacing', { spacings: newSpacings, resetCurve: true })
}

function onUpdateProperty(key: string, value: any) {
  // 更新本地 ref
  switch(key) {
    case 'seatCount': 
      // 座位数通过 onDecreaseSeatCount/onIncreaseSeatCount 处理
      break
    case 'curve': 
      // 弧度通过 onDecreaseCurve/onIncreaseCurve 处理
      break
    case 'seatSpacing': 
      // 座位间距通过 onDecreaseSpacing/onIncreaseSpacing 处理
      break
    case 'rowLabeling.label': localRowLabelingLabel.value = value; break
    case 'rowLabeling.locked': localRowLabelingLocked.value = value; break
    case 'seatLabeling.labels': localSeatLabelingLabels.value = value; break
    case 'seatLabeling.locked': localSeatLabelingLocked.value = value; break
  }
  if (key !== 'seatCount' && key !== 'curve') {
    emit('update-property', key, value)
  }
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

/* 座位数显示控件 */
.seat-count-display {
  display: flex;
  align-items: center;
  height: 28px;
  border: 1px solid #d0d0d0;
  border-radius: 4px;
  background: #fff;
  overflow: hidden;
  flex: 1;
}

.seat-count-display .step-btn {
  width: 24px;
  height: 100%;
  border: none;
  background: #f5f5f5;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #666;
  transition: all 0.15s ease;
  padding: 0;
}

.seat-count-display .step-btn:hover:not(:disabled) {
  background: #e8e8e8;
  color: #333;
}

.seat-count-display .step-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.seat-count-display .step-btn:first-child {
  border-right: 1px solid #d0d0d0;
}

.seat-count-display .step-btn:last-child {
  border-left: 1px solid #d0d0d0;
}

.seat-count-display .step-icon {
  width: 12px;
  height: 12px;
}

.seat-count-display .count-text {
  flex: 1;
  text-align: center;
  font-size: 13px;
  font-weight: 500;
  color: #333;
  font-family: 'SF Mono', Monaco, monospace;
  padding: 0 8px;
  min-width: 50px;
}

/* 批量设置按钮 */
.batch-btn {
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

.batch-btn:hover {
  background: #f5f5f5;
  border-color: #bbb;
}

.batch-icon {
  width: 12px;
  height: 12px;
}
</style>
