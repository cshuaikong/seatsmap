<template>
  <div class="number-input-wrapper">
    <label v-if="label" class="input-label">{{ label }}</label>
    <div class="number-control">
      <button class="step-btn left" @click="decrease" :disabled="min !== undefined && modelValue <= min">
        <Icon icon="lucide:chevron-left" class="step-icon" />
      </button>
      <div class="value-display">
        <span class="value-text">{{ displayValue }}</span>
        <span v-if="unit" class="unit-text">{{ unit }}</span>
      </div>
      <button class="step-btn right" @click="increase" :disabled="max !== undefined && modelValue >= max">
        <Icon icon="lucide:chevron-right" class="step-icon" />
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Icon } from '@iconify/vue'

interface Props {
  modelValue: number
  unit?: string
  min?: number
  max?: number
  step?: number
  label?: string
}

const props = withDefaults(defineProps<Props>(), {
  step: 1
})

const emit = defineEmits<{
  'update:modelValue': [value: number]
}>()

const displayValue = computed(() => {
  // 如果是整数，不显示小数点
  if (Number.isInteger(props.modelValue)) {
    return props.modelValue.toString()
  }
  return props.modelValue.toFixed(1)
})

function decrease() {
  const newValue = props.modelValue - props.step
  if (props.min !== undefined && newValue < props.min) {
    emit('update:modelValue', props.min)
  } else {
    emit('update:modelValue', newValue)
  }
}

function increase() {
  const newValue = props.modelValue + props.step
  if (props.max !== undefined && newValue > props.max) {
    emit('update:modelValue', props.max)
  } else {
    emit('update:modelValue', newValue)
  }
}
</script>

<style scoped>
.number-input-wrapper {
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

.number-control {
  display: flex;
  align-items: center;
  height: 28px;
  border: 1px solid #d0d0d0;
  border-radius: 4px;
  background: #fff;
  overflow: hidden;
  flex: 1;
}

.step-btn {
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

.step-btn:hover:not(:disabled) {
  background: #e8e8e8;
  color: #333;
}

.step-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.step-btn.left {
  border-right: 1px solid #d0d0d0;
}

.step-btn.right {
  border-left: 1px solid #d0d0d0;
}

.step-icon {
  width: 12px;
  height: 12px;
}

.value-display {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 2px;
  padding: 0 8px;
  min-width: 50px;
}

.value-text {
  font-size: 13px;
  font-weight: 500;
  color: #333;
  font-family: 'SF Mono', Monaco, monospace;
}

.unit-text {
  font-size: 11px;
  color: #888;
}
</style>
