<template>
  <div class="text-panel">
    <!-- Text 分组 -->
    <!-- EN: Text -->
    <PanelSection title="文本">
      <!-- Caption -->
      <div class="property-row textarea-row">
        <!-- EN: Caption -->
        <label class="property-label">内容</label>
        <textarea
          :value="localCaption"
          @input="updateProperty('caption', ($event.target as HTMLTextAreaElement).value)"
          class="textarea-input"
          placeholder="输入文本内容"
          rows="3"
        />
      </div>

      <!-- Font size -->
      <div class="property-row">
        <!-- EN: Font size -->
        <label class="property-label">字号</label>
        <NumberInput
          :model-value="localFontSize"
          unit="pt"
          :step="1"
          :min="8"
          :max="72"
          @update:model-value="updateProperty('fontSize', $event)"
        />
      </div>

      <!-- Text color -->
      <div class="property-row">
        <!-- EN: Text color -->
        <label class="property-label">文字颜色</label>
        <ColorPicker
          :model-value="localTextColor"
          @update:model-value="updateProperty('textColor', $event)"
        />
      </div>

      <!-- Style -->
      <div class="property-row style-row">
        <!-- EN: Style -->
        <label class="property-label">样式</label>
        <div class="style-buttons">
          <button
            class="style-btn bold"
            :class="{ active: localBold }"
            @click="updateProperty('bold', !localBold)"
            title="加粗"
          >
            B
          </button>
          <button
            class="style-btn italic"
            :class="{ active: localItalic }"
            @click="updateProperty('italic', !localItalic)"
            title="斜体"
          >
            I
          </button>
        </div>
      </div>
    </PanelSection>

    <!-- Transform 分组 -->
    <!-- EN: Transform -->
    <PanelSection title="变换">
      <!-- Scale -->
      <div class="property-row">
        <!-- EN: Scale -->
        <label class="property-label">缩放</label>
        <SliderInput
          :model-value="localScale"
          :min="10"
          :max="200"
          :step="1"
          @update:model-value="updateProperty('scale', $event)"
        />
      </div>
    </PanelSection>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import PanelSection from './controls/PanelSection.vue'
import NumberInput from './controls/NumberInput.vue'
import ColorPicker from './controls/ColorPicker.vue'
import SliderInput from './controls/SliderInput.vue'

const props = defineProps<{
  node: any
}>()

const emit = defineEmits<{
  'update-property': [key: string, value: any]
}>()

// 本地 ref 管理属性值
const localCaption = ref('')
const localFontSize = ref(14)
const localTextColor = ref('#000000')
const localBold = ref(false)
const localItalic = ref(false)
const localScale = ref(100)

// 从节点读取属性的函数
const readFromNode = () => {
  if (!props.node) return
  const node = props.node
  
  localCaption.value = node.text?.() || ''
  localFontSize.value = node.fontSize?.() || 14
  localTextColor.value = node.fill?.() || '#000000'
  const fontStyle = node.fontStyle?.() || ''
  localBold.value = fontStyle.includes('bold')
  localItalic.value = fontStyle.includes('italic')
  const scaleX = node.scaleX?.() || 1
  localScale.value = Math.round(scaleX * 100)
}

// 挂载时和 node 变化时读取
watch(() => props.node, () => readFromNode(), { immediate: true })

// 更新属性：同时更新本地 ref 和 emit
const updateProperty = (key: string, value: any) => {
  // 更新本地 ref
  switch(key) {
    case 'caption': localCaption.value = value; break
    case 'fontSize': localFontSize.value = value; break
    case 'textColor': localTextColor.value = value; break
    case 'bold': localBold.value = value; break
    case 'italic': localItalic.value = value; break
    case 'scale': localScale.value = value; break
  }
  // emit 到父组件更新 Konva 节点
  emit('update-property', key, value)
}

// 暴露 refresh 方法供外部调用
const refresh = () => readFromNode()
defineExpose({ refresh })
</script>

<style scoped>
.text-panel {
  background: var(--color-bg-secondary);
}

.property-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 32px;
  margin-bottom: 8px;
}

.property-row:last-child {
  margin-bottom: 0;
}

.property-label {
  font-size: 12px;
  color: #666;
  flex-shrink: 0;
  width: 40%;
}

.property-row > :not(.property-label) {
  width: 60%;
}

/* Textarea 行特殊样式 */
.textarea-row {
  align-items: flex-start;
  min-height: auto;
}

.textarea-input {
  width: 60%;
  padding: 8px;
  border: 1px solid #d0d0d0;
  border-radius: 4px;
  background: #fff;
  font-size: 13px;
  color: #333;
  resize: vertical;
  font-family: inherit;
}

.textarea-input:focus {
  outline: none;
  border-color: var(--color-accent);
}

/* Style 按钮样式 */
.style-row {
  justify-content: space-between;
}

.style-buttons {
  display: flex;
  gap: 6px;
  width: 60%;
}

.style-btn {
  width: 28px;
  height: 28px;
  border: 1px solid #d0d0d0;
  border-radius: 4px;
  background: #fff;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #666;
  font-size: 14px;
  font-weight: 500;
  transition: all 0.15s ease;
  padding: 0;
}

.style-btn:hover {
  background: #f5f5f5;
  border-color: #aaa;
  color: #333;
}

.style-btn.active {
  background: var(--color-accent);
  border-color: var(--color-accent);
  color: #fff;
}

.style-btn.bold {
  font-weight: 700;
}

.style-btn.italic {
  font-style: italic;
  font-family: Georgia, serif;
}
</style>
