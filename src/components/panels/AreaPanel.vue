<template>
  <div class="area-panel">
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

    <!-- Shape 分组 -->
    <!-- EN: Shape -->
    <PanelSection title="形状" :collapsible="true" :defaultExpanded="true">
      <div class="property-row">
        <!-- EN: Width -->
        <label class="property-label">宽度</label>
        <div class="property-control">
          <NumberInput
            :modelValue="localWidth"
            :min="0"
            unit="pt"
            @update:modelValue="onUpdateProperty('width', $event)"
          />
        </div>
      </div>
      <div class="property-row">
        <!-- EN: Height -->
        <label class="property-label">高度</label>
        <div class="property-control">
          <NumberInput
            :modelValue="localHeight"
            :min="0"
            unit="pt"
            @update:modelValue="onUpdateProperty('height', $event)"
          />
        </div>
      </div>
      <div class="property-row">
        <!-- EN: Rotation -->
        <label class="property-label">旋转</label>
        <div class="property-control">
          <NumberInput
            :modelValue="localRotation"
            unit="°"
            @update:modelValue="onUpdateProperty('rotation', $event)"
          />
        </div>
      </div>
      <div class="property-row">
        <!-- EN: Corner radius -->
        <label class="property-label">圆角半径</label>
        <div class="property-control">
          <NumberInput
            :modelValue="localCornerRadius"
            :min="0"
            unit="pt"
            @update:modelValue="onUpdateProperty('cornerRadius', $event)"
          />
        </div>
      </div>
      <div class="property-row">
        <!-- EN: Translucent -->
        <label class="property-label">半透明</label>
        <div class="property-control">
          <label class="checkbox-wrapper">
            <input
              type="checkbox"
              :checked="localTranslucent"
              @change="onUpdateProperty('translucent', ($event.target as HTMLInputElement).checked)"
              class="checkbox-input"
            />
            <span class="checkmark"></span>
          </label>
        </div>
      </div>
    </PanelSection>

    <!-- Transform 分组 -->
    <!-- EN: Transform -->
    <PanelSection title="变换" :collapsible="true" :defaultExpanded="true">
      <div class="property-row">
        <!-- EN: Scale -->
        <label class="property-label">缩放</label>
        <div class="property-control">
          <SliderInput
            :modelValue="localScale"
            :min="0.1"
            :max="3"
            :step="0.1"
            @update:modelValue="onUpdateProperty('scale', $event)"
          />
        </div>
      </div>
    </PanelSection>

    <!-- Area labeling 分组 -->
    <!-- EN: Area labeling -->
    <PanelSection title="区域标签" :collapsible="true" :defaultExpanded="true">
      <template #header-extra>
        <button class="lock-btn" :class="{ locked: localLabelingLocked }" @click="toggleLabelLock">
          <Icon :icon="localLabelingLocked ? 'lucide:lock' : 'lucide:unlock'" class="lock-icon" />
        </button>
      </template>
      <div class="property-row">
        <!-- EN: Label -->
        <label class="property-label">标签</label>
        <div class="property-control">
          <input
            type="text"
            :value="localLabelingLabel"
            :disabled="localLabelingLocked"
            @input="onUpdateProperty('areaLabeling.label', ($event.target as HTMLInputElement).value)"
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
            :value="localLabelingDisplayedLabel"
            @input="onUpdateProperty('areaLabeling.displayedLabel', ($event.target as HTMLInputElement).value)"
            class="text-input"
          />
        </div>
      </div>
      <div class="property-row">
        <!-- EN: Visible -->
        <label class="property-label">可见</label>
        <div class="property-control">
          <label class="checkbox-wrapper">
            <input
              type="checkbox"
              :checked="localLabelingVisible"
              @change="onUpdateProperty('areaLabeling.visible', ($event.target as HTMLInputElement).checked)"
              class="checkbox-input"
            />
            <span class="checkmark"></span>
          </label>
        </div>
      </div>
      <div class="property-row">
        <!-- EN: Font size -->
        <label class="property-label">字号</label>
        <div class="property-control">
          <NumberInput
            :modelValue="localLabelingFontSize"
            :min="8"
            :max="72"
            unit="pt"
            @update:modelValue="onUpdateProperty('areaLabeling.fontSize', $event)"
          />
        </div>
      </div>
      <div class="property-row">
        <!-- EN: Position X -->
        <label class="property-label">位置 X</label>
        <div class="property-control">
          <NumberInput
            :modelValue="localLabelingPositionX"
            :min="0"
            :max="100"
            unit="%"
            @update:modelValue="onUpdateProperty('areaLabeling.positionX', $event)"
          />
        </div>
      </div>
      <div class="property-row">
        <!-- EN: Position Y -->
        <label class="property-label">位置 Y</label>
        <div class="property-control">
          <NumberInput
            :modelValue="localLabelingPositionY"
            :min="0"
            :max="100"
            unit="%"
            @update:modelValue="onUpdateProperty('areaLabeling.positionY', $event)"
          />
        </div>
      </div>
    </PanelSection>

    <!-- Capacity 分组 -->
    <!-- EN: Capacity -->
    <PanelSection title="容量" :collapsible="true" :defaultExpanded="true">
      <div class="property-row">
        <!-- EN: TYPE -->
        <label class="property-label">类型</label>
        <div class="property-control">
          <select
            :value="localCapacityType"
            @change="onUpdateProperty('capacityType', ($event.target as HTMLSelectElement).value)"
            class="select-input"
          >
            <!-- EN: General Admission -->
            <option value="general_admission">通用入场</option>
          </select>
        </div>
      </div>
      <div class="property-row full-width">
        <p class="capacity-hint">多位用户可在通用入场区域内选择位置</p>
      </div>
      <div class="property-row">
        <!-- EN: Capacity -->
        <label class="property-label">容量</label>
        <div class="property-control">
          <NumberInput
            :modelValue="localCapacity"
            :min="1"
            @update:modelValue="onUpdateProperty('capacity', $event)"
          />
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
import SliderInput from './controls/SliderInput.vue'

interface Category {
  id: string
  name: string
  color: string
}

const props = defineProps<{
  node: any
  categories: Category[]
}>()

const emit = defineEmits<{
  'update-property': [key: string, value: any]
  'update-category': [categoryId: string]
  'manage-categories': []
}>()

// 本地 ref 管理属性值
const localCategoryId = ref('')
const localWidth = ref(100)
const localHeight = ref(100)
const localRotation = ref(0)
const localCornerRadius = ref(0)
const localTranslucent = ref(false)
const localScale = ref(1)
const localCapacityType = ref('general_admission')
const localCapacity = ref(100)
const localEntrance = ref('')

// 区域标签配置
const localLabelingLabel = ref('')
const localLabelingDisplayedLabel = ref('')
const localLabelingLocked = ref(false)
const localLabelingVisible = ref(true)
const localLabelingFontSize = ref(14)
const localLabelingPositionX = ref(50)
const localLabelingPositionY = ref(50)

// 从节点读取属性的函数
const readFromNode = () => {
  if (!props.node) return
  const node = props.node
  
  localCategoryId.value = node.getAttr?.('categoryId') || node.categoryId || ''
  localWidth.value = node.getAttr?.('width') || node.width || 100
  localHeight.value = node.getAttr?.('height') || node.height || 100
  localRotation.value = node.getAttr?.('rotation') || node.rotation || 0
  localCornerRadius.value = node.getAttr?.('cornerRadius') || node.cornerRadius || 0
  localTranslucent.value = node.getAttr?.('translucent') || node.translucent || false
  localScale.value = node.getAttr?.('scale') || node.scale || 1
  localCapacityType.value = node.getAttr?.('capacityType') || node.capacityType || 'general_admission'
  localCapacity.value = node.getAttr?.('capacity') || node.capacity || 100
  localEntrance.value = node.getAttr?.('entrance') || node.entrance || ''
  
  // 区域标签配置
  const labeling = node.getAttr?.('areaLabeling') || node.areaLabeling || {}
  localLabelingLabel.value = labeling.label || node.getAttr?.('label') || node.label || ''
  localLabelingDisplayedLabel.value = labeling.displayedLabel || ''
  localLabelingLocked.value = labeling.locked || false
  localLabelingVisible.value = labeling.visible !== false
  localLabelingFontSize.value = labeling.fontSize || 14
  localLabelingPositionX.value = labeling.positionX !== undefined ? labeling.positionX : 50
  localLabelingPositionY.value = labeling.positionY !== undefined ? labeling.positionY : 50
}

// 挂载时和 node 变化时读取
watch(() => props.node, () => readFromNode(), { immediate: true })

function onCategoryChange(categoryId: string) {
  localCategoryId.value = categoryId
  emit('update-category', categoryId)
}

function onUpdateProperty(key: string, value: any) {
  // 更新本地 ref
  switch(key) {
    case 'width': localWidth.value = value; break
    case 'height': localHeight.value = value; break
    case 'rotation': localRotation.value = value; break
    case 'cornerRadius': localCornerRadius.value = value; break
    case 'translucent': localTranslucent.value = value; break
    case 'scale': localScale.value = value; break
    case 'capacityType': localCapacityType.value = value; break
    case 'capacity': localCapacity.value = value; break
    case 'entrance': localEntrance.value = value; break
    case 'areaLabeling.label': localLabelingLabel.value = value; break
    case 'areaLabeling.displayedLabel': localLabelingDisplayedLabel.value = value; break
    case 'areaLabeling.locked': localLabelingLocked.value = value; break
    case 'areaLabeling.visible': localLabelingVisible.value = value; break
    case 'areaLabeling.fontSize': localLabelingFontSize.value = value; break
    case 'areaLabeling.positionX': localLabelingPositionX.value = value; break
    case 'areaLabeling.positionY': localLabelingPositionY.value = value; break
  }
  emit('update-property', key, value)
}

function toggleLabelLock() {
  const newValue = !localLabelingLocked.value
  localLabelingLocked.value = newValue
  emit('update-property', 'areaLabeling.locked', newValue)
}

// 暴露 refresh 方法供外部调用
const refresh = () => readFromNode()
defineExpose({ refresh })
</script>

<style scoped>
.area-panel {
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

.property-row.full-width {
  display: block;
  margin-bottom: 8px;
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

.capacity-hint {
  margin: 0;
  padding: 8px 12px;
  background: #f0f8ff;
  border-left: 3px solid #4a90d9;
  font-size: 11px;
  color: #555;
  line-height: 1.5;
}
</style>
