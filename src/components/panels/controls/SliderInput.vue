<template>
  <div class="slider-input-wrapper">
    <label v-if="label" class="input-label">{{ label }}</label>
    <div class="slider-control">
      <button class="step-btn" @click="decrease" :disabled="modelValue <= min">
        <Icon icon="lucide:minus" class="step-icon" />
      </button>
      <div class="slider-track" ref="trackRef" @click="onTrackClick">
        <div class="slider-fill" :style="{ width: percentage + '%' }"></div>
        <div 
          class="slider-thumb" 
          :style="{ left: percentage + '%' }"
          @mousedown="startDrag"
        ></div>
      </div>
      <button class="step-btn" @click="increase" :disabled="modelValue >= max">
        <Icon icon="lucide:plus" class="step-icon" />
      </button>
    </div>
    <span class="value-display">{{ Math.round(modelValue) }}</span>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { Icon } from '@iconify/vue'

interface Props {
  modelValue: number
  min?: number
  max?: number
  step?: number
  label?: string
}

const props = withDefaults(defineProps<Props>(), {
  min: 0,
  max: 100,
  step: 1
})

const emit = defineEmits<{
  'update:modelValue': [value: number]
}>()

const trackRef = ref<HTMLElement>()
const isDragging = ref(false)

const percentage = computed(() => {
  const range = props.max - props.min
  const value = props.modelValue - props.min
  return Math.max(0, Math.min(100, (value / range) * 100))
})

function updateValueFromPosition(clientX: number) {
  if (!trackRef.value) return
  const rect = trackRef.value.getBoundingClientRect()
  const x = Math.max(0, Math.min(rect.width, clientX - rect.left))
  const percent = x / rect.width
  const range = props.max - props.min
  let newValue = props.min + percent * range
  // 按 step 取整
  newValue = Math.round(newValue / props.step) * props.step
  newValue = Math.max(props.min, Math.min(props.max, newValue))
  emit('update:modelValue', newValue)
}

function onTrackClick(e: MouseEvent) {
  updateValueFromPosition(e.clientX)
}

function startDrag(e: MouseEvent) {
  isDragging.value = true
  e.preventDefault()
  
  const handleMouseMove = (e: MouseEvent) => {
    if (isDragging.value) {
      updateValueFromPosition(e.clientX)
    }
  }
  
  const handleMouseUp = () => {
    isDragging.value = false
    document.removeEventListener('mousemove', handleMouseMove)
    document.removeEventListener('mouseup', handleMouseUp)
  }
  
  document.addEventListener('mousemove', handleMouseMove)
  document.addEventListener('mouseup', handleMouseUp)
}

function decrease() {
  const newValue = Math.max(props.min, props.modelValue - props.step)
  emit('update:modelValue', newValue)
}

function increase() {
  const newValue = Math.min(props.max, props.modelValue + props.step)
  emit('update:modelValue', newValue)
}
</script>

<style scoped>
.slider-input-wrapper {
  display: flex;
  align-items: center;
  gap: 10px;
}

.input-label {
  font-size: 12px;
  color: #666;
  min-width: 60px;
  flex-shrink: 0;
}

.slider-control {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
}

.step-btn {
  width: 22px;
  height: 22px;
  border: 1px solid #d0d0d0;
  border-radius: 3px;
  background: #f5f5f5;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #666;
  transition: all 0.15s ease;
  padding: 0;
  flex-shrink: 0;
}

.step-btn:hover:not(:disabled) {
  background: #e8e8e8;
  color: #333;
}

.step-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.step-icon {
  width: 10px;
  height: 10px;
}

.slider-track {
  flex: 1;
  height: 6px;
  background: #e0e0e0;
  border-radius: 3px;
  position: relative;
  cursor: pointer;
}

.slider-fill {
  height: 100%;
  background: #4a90d9;
  border-radius: 3px;
  position: absolute;
  left: 0;
  top: 0;
}

.slider-thumb {
  width: 14px;
  height: 14px;
  background: #fff;
  border: 2px solid #4a90d9;
  border-radius: 50%;
  position: absolute;
  top: 50%;
  transform: translate(-50%, -50%);
  cursor: grab;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
}

.slider-thumb:active {
  cursor: grabbing;
}

.value-display {
  font-size: 12px;
  color: #555;
  min-width: 28px;
  text-align: right;
  font-family: 'SF Mono', Monaco, monospace;
}
</style>
