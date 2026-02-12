<template>
  <div class="canvas-navigator">
    <!-- 指南针 -->
    <div class="compass-wrapper" title="北">
      <div class="compass-circle" :style="{ transform: `rotate(${-rotation}deg)` }">
        <Icon icon="lucide:navigation" class="compass-arrow" />
      </div>
      <span class="compass-n">N</span>
    </div>

    <!-- 缩放控制 -->
    <div class="zoom-control">
      <button class="zoom-btn" @click="zoomOut" title="缩小">
        <Icon icon="lucide:minus" class="zoom-icon" />
      </button>
      <div class="zoom-value" @click="resetZoom">{{ Math.round(scale * 100) }}%</div>
      <button class="zoom-btn" @click="zoomIn" title="放大">
        <Icon icon="lucide:plus" class="zoom-icon" />
      </button>
    </div>

    <!-- 缩放滑块 -->
    <div class="zoom-slider" v-show="showSlider">
      <input 
        type="range" 
        min="0.1" 
        max="5" 
        step="0.1" 
        :value="scale"
        @input="onSliderChange"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { Icon } from '@iconify/vue'

const props = defineProps<{
  scale: number
  rotation: number
}>()

const emit = defineEmits(['update:scale', 'zoom-in', 'zoom-out', 'reset'])

const showSlider = ref(false)

function zoomIn() {
  const newScale = Math.min(props.scale * 1.2, 5)
  emit('update:scale', newScale)
}

function zoomOut() {
  const newScale = Math.max(props.scale / 1.2, 0.1)
  emit('update:scale', newScale)
}

function resetZoom() {
  showSlider.value = !showSlider.value
}

function onSliderChange(e: Event) {
  const target = e.target as HTMLInputElement
  emit('update:scale', parseFloat(target.value))
}
</script>

<style scoped>
.canvas-navigator {
  position: absolute;
  left: 16px;
  bottom: 16px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  user-select: none;
  z-index: 100;
}

/* 指南针 */
.compass-wrapper {
  position: relative;
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.compass-circle {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: var(--color-bg-secondary);
  border: 1px solid var(--color-border);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: transform 0.3s ease;
}

.compass-arrow {
  width: 20px;
  height: 20px;
  color: var(--color-accent);
}

.compass-n {
  position: absolute;
  top: -2px;
  font-size: 9px;
  font-weight: 700;
  color: var(--color-text-muted);
  font-family: var(--font-mono);
}

/* 缩放控制 */
.zoom-control {
  display: flex;
  flex-direction: column;
  align-items: center;
  background: var(--color-bg-secondary);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  overflow: hidden;
}

.zoom-btn {
  width: 36px;
  height: 32px;
  border: none;
  background: transparent;
  cursor: pointer;
  color: var(--color-text-secondary);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s;
}

.zoom-btn:hover {
  background: var(--color-bg-tertiary);
  color: var(--color-text);
}

.zoom-icon {
  width: 14px;
  height: 14px;
}

.zoom-value {
  width: 36px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  font-weight: 600;
  color: var(--color-text);
  font-family: var(--font-mono);
  border-top: 1px solid var(--color-border);
  border-bottom: 1px solid var(--color-border);
  cursor: pointer;
  transition: all 0.15s;
}

.zoom-value:hover {
  background: var(--color-bg-tertiary);
  color: var(--color-accent);
}

/* 缩放滑块 */
.zoom-slider {
  position: absolute;
  left: 50px;
  bottom: 0;
  padding: 8px 12px;
  background: var(--color-bg-secondary);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.zoom-slider input[type="range"] {
  width: 120px;
  height: 4px;
  -webkit-appearance: none;
  appearance: none;
  background: var(--color-border);
  border-radius: 2px;
  outline: none;
}

.zoom-slider input[type="range"]::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 12px;
  height: 12px;
  background: var(--color-accent);
  border-radius: 50%;
  cursor: pointer;
}

.zoom-slider input[type="range"]::-moz-range-thumb {
  width: 12px;
  height: 12px;
  background: var(--color-accent);
  border-radius: 50%;
  cursor: pointer;
  border: none;
}
</style>
