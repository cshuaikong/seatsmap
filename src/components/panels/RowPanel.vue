<template>
  <div class="row-panel">
    <!-- Category 分组 -->
    <PanelSection title="分类" :collapsible="false">
      <template #header-extra>
        <button class="manage-btn-sm" @click="emit('manage-categories')">
          <Icon icon="lucide:settings" class="btn-icon-xs" />
          管理
        </button>
      </template>
      <div class="category-dropdown" :class="{ open: dropdownOpen }">
        <div class="dropdown-trigger" @click="dropdownOpen = !dropdownOpen">
          <div class="trigger-content">
            <template v-if="activeCategories.length === 0">
              <span class="trigger-placeholder">未分配</span>
            </template>
            <template v-else>
              <span
                v-for="cat in activeCategories"
                :key="cat.id"
                class="category-tag"
                :style="{ backgroundColor: cat.color + '22', borderColor: cat.color }"
              >
                <span class="tag-dot" :style="{ backgroundColor: cat.color }"></span>
                {{ cat.name }}
              </span>
            </template>
          </div>
          <Icon icon="lucide:chevron-down" class="dropdown-arrow" :class="{ open: dropdownOpen }" />
        </div>
        <div v-if="dropdownOpen" class="dropdown-panel">
          <div
            v-for="cat in categories"
            :key="cat.id"
            class="dropdown-item"
            :class="{ active: isCategoryActive(cat) }"
            @click="onCategoryClick(String(cat.key ?? cat.id))"
          >
            <div class="item-left">
              <div class="color-dot" :style="{ backgroundColor: cat.color }"></div>
              <span>{{ cat.name }}</span>
            </div>
            <Icon v-if="isCategoryActive(cat)" icon="lucide:check" class="check-icon" />
          </div>
        </div>
      </div>
    </PanelSection>

    <!-- Row 分组 -->
    <!-- EN: Row -->
    <PanelSection title="排" :collapsible="true" :defaultExpanded="true">
      <div class="property-row">
        <!-- EN: Number of seats -->
        <label class="property-label">座位数</label>
        <div class="property-control">
          <div class="seat-count-display">
            <button class="step-btn" @click="onDecreaseSeatCount" :disabled="!canDecreaseSeatCount">
              <Icon icon="lucide:minus" class="step-icon" />
            </button>
            <span class="count-text">{{ seatCountDisplay }}</span>
            <button class="step-btn" @click="onIncreaseSeatCount" :disabled="!canIncreaseSeatCount">
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
      <div class="property-row">
        <!-- EN: Row spacing -->
        <label class="property-label">行间距</label>
        <div class="property-control">
          <div class="seat-count-display">
            <button class="step-btn" @click="onDecreaseRowSpacing" :disabled="!canDecreaseRowSpacing">
              <Icon icon="lucide:minus" class="step-icon" />
            </button>
            <span class="count-text">{{ rowSpacingDisplay }}</span>
            <button class="step-btn" @click="onIncreaseRowSpacing" :disabled="!canIncreaseRowSpacing">
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
          <label class="property-label">排编号</label>
          <div class="property-control">
            <select v-model="batchLabelMode" class="select-input">
              <option value="">无</option>
              <option value="1-2-3">1,2,3...</option>
              <option value="A-B-C">A,B,C...</option>
              <option value="a-b-c">a,b,c...</option>
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
        <div class="property-row">
          <label class="property-label">顺序</label>
          <div class="property-control">
            <div class="direction-toggle">
              <button
                class="dir-btn"
                :class="{ active: batchLabelDirection === 'asc' }"
                @click="batchLabelDirection = 'asc'"
              >正序</button>
              <button
                class="dir-btn"
                :class="{ active: batchLabelDirection === 'desc' }"
                @click="batchLabelDirection = 'desc'"
              >倒序</button>
            </div>
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
        <!-- EN: Scheme -->
        <label class="property-label">座位编号</label>
        <div class="property-control">
          <select v-model="seatLabelScheme" class="select-input">
            <option value="">无</option>
            <option value="1-2-3">1,2,3...</option>
            <option value="1-3-5">1,3,5...</option>
            <option value="a-b-c">a,b,c...</option>
            <option value="A-B-C">A,B,C...</option>
          </select>
        </div>
      </div>
      <div class="property-row">
        <label class="property-label">起始值</label>
        <div class="property-control">
          <input type="text" v-model="seatLabelStart" class="text-input" :placeholder="seatLabelStartPlaceholder" />
        </div>
      </div>
      <div class="property-row">
        <label class="property-label">顺序</label>
        <div class="property-control">
          <div class="direction-toggle">
            <button class="dir-btn" :class="{ active: seatLabelDirection === 'asc' }" @click="seatLabelDirection = 'asc'">正序</button>
            <button class="dir-btn" :class="{ active: seatLabelDirection === 'desc' }" @click="seatLabelDirection = 'desc'">倒序</button>
          </div>
        </div>
      </div>
    </PanelSection>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, computed, onMounted, onUnmounted } from 'vue'
import { Icon } from '@iconify/vue'
import PanelSection from './controls/PanelSection.vue'

interface Category {
  id: string
  key?: string
  name: string
  color: string
}

const props = defineProps<{
  nodes: any[]
  isSingle: boolean
  categories: Category[]
  sectionFill?: string
}>()

const emit = defineEmits<{
  'update-property': [key: string, value: any]
  'update-category': [categoryId: string]
  'manage-categories': []
}>()

// 下拉状态
const dropdownOpen = ref(false)

// 所有选中座位涉及的所有分类（用于展示多选标签）
const activeCategories = computed(() => {
  const keys = new Set<string>()
  props.nodes.forEach((row: any) => {
    (row.seats || []).forEach((s: any) => {
      keys.add(String(s.categoryKey ?? 1))
    })
  })
  return (props.categories as any[]).filter(c => keys.has(String(c.key ?? c.id)))
})

// 本地 ref 管理属性值
const localSeatCounts = ref<number[]>([])  // 多选时存储每个排的座位数
const localCurves = ref<number[]>([])  // 多选时存储每个排的弧度
const localSeatSpacings = ref<number[]>([])  // 多选时存储每个排的座位间距
const localRowSpacings = ref<number[]>([])  // 多选时存储每个排的行间距

// 排标签配置
const localRowLabelingLabel = ref('')
const localRowLabelingLocked = ref(false)

// 座位标签配置
const seatLabelScheme = ref('')
const seatLabelStart = ref('')
const seatLabelDirection = ref<'asc' | 'desc'>('asc')
const localSeatLabelingLocked = ref(false)

// 批量标签设置
const batchLabelMode = ref<string>('')
const batchLabelStart = ref('')
const batchLabelDirection = ref<'asc' | 'desc'>('asc')



// 起始值占位符
const batchLabelStartPlaceholder = computed(() => {
  switch (batchLabelMode.value) {
    case 'A-B-C': return '例如: A 或 C'
    case 'a-b-c': return '例如: a 或 c'
    case '1-2-3': return '例如: 1 或 5'
    default: return ''
  }
})

// 切换格式时自动填充默认起始值
watch(batchLabelMode, (mode) => {
  switch (mode) {
    case '1-2-3': batchLabelStart.value = '1'; break
    case 'A-B-C': batchLabelStart.value = 'A'; break
    case 'a-b-c': batchLabelStart.value = 'a'; break
    default: batchLabelStart.value = ''; break
  }
})

// 座位编号起始值占位符
const seatLabelStartPlaceholder = computed(() => {
  switch (seatLabelScheme.value) {
    case 'A-B-C': return '例如: A'
    case 'a-b-c': return '例如: a'
    case '1-2-3': case '1-3-5': return '例如: 1'
    default: return ''
  }
})

// 切换座位编号格式时自动填充默认起始值
watch(seatLabelScheme, (scheme) => {
  switch (scheme) {
    case '1-2-3': case '1-3-5': seatLabelStart.value = '1'; break
    case 'A-B-C': seatLabelStart.value = 'A'; break
    case 'a-b-c': seatLabelStart.value = 'a'; break
    default: seatLabelStart.value = ''; break
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
  if (batchLabelDirection.value === 'desc') labels.reverse()
  emit('update-property', 'batchLabels', labels)
}

// 监听批量标签设置变化，自动应用
watch([batchLabelMode, batchLabelStart, batchLabelDirection], () => {
  if (!props.isSingle && props.nodes.length > 0) {
    applyBatchLabels()
  }
})

// 应用座位编号
const applySeatLabels = () => {
  emit('update-property', 'seatLabeling', {
    scheme: seatLabelScheme.value,
    start: seatLabelStart.value,
    direction: seatLabelDirection.value,
  })
}

// 监听座位编号设置变化，自动应用
watch([seatLabelScheme, seatLabelStart, seatLabelDirection], () => {
  if (props.nodes.length > 0) {
    applySeatLabels()
  }
})

// 计算座位数显示文本（多选用逗号分隔）
const seatCountDisplay = computed(() => {
  if (localSeatCounts.value.length === 0) return '0'
  if (localSeatCounts.value.length === 1) return String(localSeatCounts.value[0])
  // 多选时显示所有座位数，用逗号分隔
  return localSeatCounts.value.join(',')
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

// 是否可以减少座位数
const canDecreaseSeatCount = computed(() => {
  return localSeatCounts.value.some(count => count > 1)
})

// 是否可以增加座位数
const canIncreaseSeatCount = computed(() => {
  return localSeatCounts.value.length > 0
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
  return localSeatSpacings.value.some(spacing => spacing > 0.2)
})

// 是否可以增加座位间距
const canIncreaseSpacing = computed(() => {
  return localSeatSpacings.value.length > 0
})

// 计算行间距显示文本（多选用逗号分隔）
const rowSpacingDisplay = computed(() => {
  if (localRowSpacings.value.length === 0) return '-'
  const values = localRowSpacings.value.map(v => v != null ? String(v) : '-')
  return values.join(',')
})

// 是否可以减少行间距
const canDecreaseRowSpacing = computed(() => {
  return localRowSpacings.value.some(spacing => spacing != null && spacing > 0.2)
})

// 是否可以增加行间距
const canIncreaseRowSpacing = computed(() => {
  return localRowSpacings.value.some(spacing => spacing != null)
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
  
  // 读取所有选中排的行间距（注意：0 是有效值，不能作为默认值）
  localRowSpacings.value = props.nodes.map(node => {
    const attrValue = node.getAttr?.('rowSpacing')
    const propValue = node.rowSpacing
    // 优先使用 getAttr 的值，如果没有则使用属性值
    if (attrValue !== undefined && attrValue !== null) return attrValue
    if (propValue !== undefined && propValue !== null) return propValue
    return undefined as any
  })
  
  // 其他属性只读取第一个节点
  const node = props.nodes[0]

  // 排标签配置
  const rowLabeling = node.getAttr?.('rowLabeling') || node.rowLabeling || {}
  localRowLabelingLabel.value = rowLabeling.label || node.getAttr?.('label') || node.label || ''
  localRowLabelingLocked.value = rowLabeling.locked || false
  
  // 座位标签配置
  const seatLabeling = node.getAttr?.('seatLabeling') || node.seatLabeling || {}
  seatLabelScheme.value = seatLabeling.scheme || seatLabeling.labels || ''
  seatLabelStart.value = seatLabeling.start || ''
  seatLabelDirection.value = seatLabeling.direction || 'asc'
  localSeatLabelingLocked.value = seatLabeling.locked || false
}

// 挂载时和 nodes 变化时读取
watch(() => props.nodes, () => readFromNodes(), { immediate: true })

function onDocumentClick(e: MouseEvent) {
  const target = e.target as HTMLElement
  if (!target.closest('.category-dropdown')) {
    dropdownOpen.value = false
  }
}
onMounted(() => document.addEventListener('click', onDocumentClick))
onUnmounted(() => document.removeEventListener('click', onDocumentClick))

function isCategoryActive(cat: any): boolean {
  return activeCategories.value.some(c => String(c.key ?? c.id) === String(cat.key ?? cat.id))
}

function onCategoryClick(categoryId: string) {
  if (!categoryId) return
  dropdownOpen.value = false
  // 更新所有选中排中所有座位的分类
  emit('update-property', 'categoryId', categoryId)
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
  // 每个选中的排都减少0.2个单位，不能少于0.2
  const newSpacings = localSeatSpacings.value.map(spacing => Math.max(0.2, +(spacing - 0.2).toFixed(2)))
  localSeatSpacings.value = newSpacings
  emit('update-property', 'seatSpacing', { spacings: newSpacings, resetCurve: true })
}

// 增加座位间距
function onIncreaseSpacing() {
  if (!canIncreaseSpacing.value) return
  const newSpacings = localSeatSpacings.value.map(spacing => +(spacing + 0.2).toFixed(2))
  localSeatSpacings.value = newSpacings
  emit('update-property', 'seatSpacing', { spacings: newSpacings, resetCurve: true })
}

// 减少行间距
function onDecreaseRowSpacing() {
  if (!canDecreaseRowSpacing.value) return
  // 用第一个有效值作为 undefined 行的基准
  const fallback = localRowSpacings.value.find(s => s != null) ?? 1
  const newSpacings = localRowSpacings.value.map(spacing => Math.max(0.2, +((spacing != null ? spacing : fallback) - 0.2).toFixed(2)))
  localRowSpacings.value = newSpacings
  emit('update-property', 'rowSpacing', newSpacings)
}

// 增加行间距
function onIncreaseRowSpacing() {
  if (!canIncreaseRowSpacing.value) return
  const fallback = localRowSpacings.value.find(s => s != null) ?? 0.2
  const newSpacings = localRowSpacings.value.map(spacing => +((spacing != null ? spacing : fallback) + 0.2).toFixed(2))
  localRowSpacings.value = newSpacings
  emit('update-property', 'rowSpacing', newSpacings)
}

function onDecreaseSeatCount() {
  if (!canDecreaseSeatCount.value) return
  const newCounts = localSeatCounts.value.map(count => Math.max(1, count - 1))
  localSeatCounts.value = newCounts
  emit('update-property', 'seatCount', newCounts)
}

function onIncreaseSeatCount() {
  if (!canIncreaseSeatCount.value) return
  const newCounts = localSeatCounts.value.map(count => count + 1)
  localSeatCounts.value = newCounts
  emit('update-property', 'seatCount', newCounts)
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
  seatLabelScheme.value = ''
  seatLabelStart.value = ''
  applySeatLabels()
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

/* 分类下拉 */
.category-dropdown {
  position: relative;
}

.manage-btn-sm {
  display: flex;
  align-items: center;
  gap: 3px;
  padding: 2px 8px;
  border: 1px solid #d0d0d0;
  border-radius: 4px;
  background: #fff;
  cursor: pointer;
  font-size: 11px;
  color: #666;
  transition: all 0.15s;
}

.manage-btn-sm:hover {
  border-color: #4a90d9;
  color: #4a90d9;
}

.btn-icon-xs {
  width: 12px;
  height: 12px;
}

.dropdown-trigger {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 30px;
  padding: 4px 8px;
  border: 1px solid #d0d0d0;
  border-radius: 6px;
  background: #fff;
  cursor: pointer;
  transition: border-color 0.15s;
}

.dropdown-trigger:hover {
  border-color: #4a90d9;
}

.category-dropdown.open .dropdown-trigger {
  border-color: #4a90d9;
}

.trigger-content {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  flex: 1;
}

.trigger-placeholder {
  font-size: 12px;
  color: #999;
  font-style: italic;
}

.category-tag {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 11px;
  font-weight: 500;
  color: #333;
  border: 1px solid;
}

.tag-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.dropdown-arrow {
  width: 14px;
  height: 14px;
  color: #888;
  flex-shrink: 0;
  transition: transform 0.15s;
}

.dropdown-arrow.open {
  transform: rotate(180deg);
}

.dropdown-panel {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  margin-top: 4px;
  background: #fff;
  border: 1px solid #d0d0d0;
  border-radius: 6px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.12);
  z-index: 100;
  max-height: 200px;
  overflow-y: auto;
}

.dropdown-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 10px;
  cursor: pointer;
  transition: background 0.1s;
}

.dropdown-item:hover {
  background: #f5f5f5;
}

.dropdown-item.active {
  background: #e8f0fe;
}

.item-left {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: #333;
}

.color-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  flex-shrink: 0;
  border: 1px solid rgba(0,0,0,0.1);
}

.check-icon {
  width: 14px;
  height: 14px;
  color: #4a90d9;
}

/* 方向切换按钮组 */
.direction-toggle {
  display: flex;
  border: 1px solid #d0d0d0;
  border-radius: 4px;
  overflow: hidden;
  flex: 1;
}

.dir-btn {
  flex: 1;
  height: 28px;
  border: none;
  background: #fff;
  cursor: pointer;
  font-size: 12px;
  color: #666;
  transition: all 0.15s ease;
  padding: 0;
}

.dir-btn:first-child {
  border-right: 1px solid #d0d0d0;
}

.dir-btn:hover {
  background: #f5f5f5;
}

.dir-btn.active {
  background: #4a90d9;
  color: #fff;
}

</style>
