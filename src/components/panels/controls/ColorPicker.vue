<template>
  <div class="color-picker-wrapper">
    <label v-if="label" class="input-label">{{ label }}</label>
    <div class="color-control" @click="openPicker">
      <div class="color-preview" :style="{ backgroundColor: modelValue }"></div>
      <span class="color-value">{{ modelValue.toUpperCase() }}</span>
      <input
        ref="colorInput"
        type="color"
        :value="modelValue"
        @input="onColorChange"
        class="native-picker"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

interface Props {
  modelValue: string
  label?: string
}

defineProps<Props>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const colorInput = ref<HTMLInputElement>()

function openPicker() {
  colorInput.value?.click()
}

function onColorChange(e: Event) {
  const target = e.target as HTMLInputElement
  emit('update:modelValue', target.value)
}
</script>

<style scoped>
.color-picker-wrapper {
  display: flex;
  align-items: center;
  gap: 12px;
}

.input-label {
  font-size: 12px;
  color: #666;
  min-width: 60px;
  flex-shrink: 0;
}

.color-control {
  display: flex;
  align-items: center;
  gap: 8px;
  height: 28px;
  padding: 0 10px;
  border: 1px solid #d0d0d0;
  border-radius: 4px;
  background: #fff;
  cursor: pointer;
  flex: 1;
  transition: border-color 0.15s ease;
}

.color-control:hover {
  border-color: #aaa;
}

.color-preview {
  width: 16px;
  height: 16px;
  border-radius: 3px;
  border: 1px solid rgba(0, 0, 0, 0.1);
  flex-shrink: 0;
}

.color-value {
  flex: 1;
  font-size: 12px;
  color: #555;
  font-family: 'SF Mono', Monaco, monospace;
}

.native-picker {
  position: absolute;
  opacity: 0;
  pointer-events: none;
  width: 0;
  height: 0;
}
</style>
