<template>
  <div class="label-editor">
    <!-- Label 输入 -->
    <div class="field-row">
      <!-- EN: Label -->
      <label class="field-label">标签</label>
      <div class="field-control">
        <input
          type="text"
          :value="label"
          @input="onLabelInput"
          :disabled="locked"
          class="text-input"
          placeholder="输入标签..."
        />
        <button
          v-if="showLock"
          class="lock-btn"
          :class="{ locked }"
          @click="toggleLock"
          :title="locked ? '解锁' : '锁定'"
        >
          <Icon :icon="locked ? 'lucide:lock' : 'lucide:unlock'" class="lock-icon" />
        </button>
      </div>
    </div>

    <!-- Displayed Label 输入 -->
    <div v-if="showDisplayedLabel" class="field-row">
      <!-- EN: Displayed -->
      <label class="field-label">显示标签</label>
      <div class="field-control">
        <input
          type="text"
          :value="displayedLabel"
          @input="onDisplayedLabelInput"
          class="text-input"
          placeholder="与标签相同"
        />
        <button
          class="set-btn"
          @click="onSetDisplayed"
          :disabled="!label"
        >
          <!-- EN: Set -->
          设置
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Icon } from '@iconify/vue'

interface Props {
  label: string
  displayedLabel: string
  locked?: boolean
  showDisplayedLabel?: boolean
  showLock?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  locked: false,
  showDisplayedLabel: true,
  showLock: true
})

const emit = defineEmits<{
  'update:label': [value: string]
  'update:displayedLabel': [value: string]
  'update:locked': [value: boolean]
}>()

function onLabelInput(e: Event) {
  const target = e.target as HTMLInputElement
  emit('update:label', target.value)
}

function onDisplayedLabelInput(e: Event) {
  const target = e.target as HTMLInputElement
  emit('update:displayedLabel', target.value)
}

function toggleLock() {
  emit('update:locked', !props.locked)
}

function onSetDisplayed() {
  // 将 label 的值复制到 displayedLabel
  emit('update:displayedLabel', props.label)
}
</script>

<style scoped>
.label-editor {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.field-row {
  display: flex;
  align-items: center;
  gap: 12px;
}

.field-label {
  font-size: 12px;
  color: #666;
  min-width: 60px;
  flex-shrink: 0;
}

.field-control {
  display: flex;
  align-items: center;
  gap: 6px;
  flex: 1;
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

.lock-btn {
  width: 28px;
  height: 28px;
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
  flex-shrink: 0;
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
  width: 14px;
  height: 14px;
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

.set-btn:hover:not(:disabled) {
  background: #e8e8e8;
  border-color: #bbb;
}

.set-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
