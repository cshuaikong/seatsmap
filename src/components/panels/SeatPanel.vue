<template>
  <div class="seat-panel">
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

    <!-- Seat label 分组 - 单选模式 -->
    <!-- EN: Seat label -->
    <PanelSection v-if="isSingle" title="座位标签" :collapsible="true" :defaultExpanded="true">
      <div class="property-row">
        <!-- EN: Label -->
        <label class="property-label">标签</label>
        <div class="property-control">
          <input
            type="text"
            :value="localLabel"
            @input="onUpdateProperty('label', ($event.target as HTMLInputElement).value)"
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
            :value="localDisplayedLabel"
            @input="onUpdateProperty('displayedLabel', ($event.target as HTMLInputElement).value)"
            class="text-input"
          />
          <Icon icon="lucide:info" class="info-icon" title="显示在座位上的标签" />
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

    <!-- Seat label 分组 - 多选模式 -->
    <!-- EN: Seat labeling -->
    <PanelSection v-else title="座位编号" :collapsible="true" :defaultExpanded="true">
      <div class="property-row">
        <!-- EN: Displayed type -->
        <label class="property-label">显示类型</label>
        <div class="property-control">
          <!-- EN: Seat -->
          <span class="readonly-text">座位</span>
        </div>
      </div>
    </PanelSection>

    <!-- Seat properties 分组 -->
    <!-- EN: Seat properties -->
    <PanelSection title="座位属性" :collapsible="true" :defaultExpanded="true">
      <div class="property-row">
        <!-- EN: Accessibility -->
        <label class="property-label">无障碍</label>
        <div class="property-control">
          <select
            :value="localAccessibility"
            @change="onUpdateProperty('accessibility', ($event.target as HTMLSelectElement).value)"
            class="select-input"
          >
            <!-- EN: None -->
            <option value="none">无</option>
            <!-- EN: Wheelchair -->
            <option value="wheelchair">轮椅位</option>
          </select>
        </div>
      </div>
      <div class="property-row">
        <!-- EN: Restricted view -->
        <label class="property-label">受限视野</label>
        <div class="property-control">
          <label class="checkbox-wrapper">
            <input
              type="checkbox"
              :checked="localRestrictedView"
              @change="onUpdateProperty('restrictedView', ($event.target as HTMLInputElement).checked)"
              class="checkbox-input"
            />
            <span class="checkmark"></span>
          </label>
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

    <!-- 多选状态栏 -->
    <div v-if="!isSingle" class="selection-footer">
      <!-- EN: seats selected -->
      <span class="selection-count">{{ nodes.length }} 个座位已选中</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { Icon } from '@iconify/vue'
import PanelSection from './controls/PanelSection.vue'
import CategorySelector from './controls/CategorySelector.vue'

interface Category {
  id: string
  name: string
  color: string
}

const props = defineProps<{
  nodes: any[]
  categories: Category[]
  isSingle: boolean
}>()

const emit = defineEmits<{
  'update-property': [key: string, value: any]
  'update-category': [categoryId: string]
  'manage-categories': []
}>()

// 本地 ref 管理属性值
const localLabel = ref('')
const localDisplayedLabel = ref('')
const localCategoryId = ref('')
const localAccessibility = ref<'none' | 'wheelchair'>('none')
const localRestrictedView = ref(false)
const localEntrance = ref('')

// 从节点读取属性的函数
const readFromNodes = () => {
  if (props.nodes.length === 0) return
  
  const node = props.nodes[0]
  localLabel.value = node.getAttr?.('label') || node.label || ''
  localDisplayedLabel.value = node.getAttr?.('displayedLabel') || node.displayedLabel || ''
  localAccessibility.value = node.getAttr?.('accessibility') || node.accessibility || 'none'
  localRestrictedView.value = node.getAttr?.('restrictedView') || node.restrictedView || false
  localEntrance.value = node.getAttr?.('entrance') || node.entrance || ''
  
  // 计算类别ID
  if (props.isSingle) {
    localCategoryId.value = node.getAttr?.('categoryId') || node.categoryId || ''
  } else {
    // 多选时，如果所有选中座位类别相同，显示该类别，否则为空
    const categoryIds = props.nodes.map(n => n.getAttr?.('categoryId') || n.categoryId || '')
    const uniqueIds = [...new Set(categoryIds)]
    localCategoryId.value = uniqueIds.length === 1 ? uniqueIds[0] : ''
  }
}

// 挂载时和 nodes 变化时读取
watch(() => props.nodes, () => readFromNodes(), { immediate: true, deep: true })

function onCategoryChange(categoryId: string) {
  localCategoryId.value = categoryId
  emit('update-category', categoryId)
}

function onUpdateProperty(key: string, value: any) {
  // 更新本地 ref
  switch(key) {
    case 'label': localLabel.value = value; break
    case 'displayedLabel': localDisplayedLabel.value = value; break
    case 'accessibility': localAccessibility.value = value; break
    case 'restrictedView': localRestrictedView.value = value; break
    case 'entrance': localEntrance.value = value; break
  }
  emit('update-property', key, value)
}

// 暴露 refresh 方法供外部调用
const refresh = () => readFromNodes()
defineExpose({ refresh })
</script>

<style scoped>
.seat-panel {
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

.readonly-text {
  font-size: 12px;
  color: #888;
  font-style: italic;
}

.info-icon {
  width: 16px;
  height: 16px;
  color: #888;
  cursor: help;
  flex-shrink: 0;
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

.selection-footer {
  padding: 12px 16px;
  background: #f0f0f0;
  border-top: 1px solid #e0e0e0;
  text-align: center;
}

.selection-count {
  font-size: 12px;
  color: #666;
  font-weight: 500;
}
</style>
