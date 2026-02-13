<template>
  <div class="left-toolbar">
    <!-- 选择工具 -->
    <div class="toolbar-section">
      <button 
        class="tool-item"
        :class="{ active: currentTool === 'select' }"
        title="选择工具 (V)"
        @click="selectTool('select')"
      >
        <Icon icon="lucide:mouse-pointer-2" class="tool-icon" />
      </button>
    </div>

    <div class="toolbar-divider"></div>

    <!-- 绘制座位工具 - 参考 seats.io -->
    <div class="toolbar-section">
      <button 
        class="tool-item"
        :class="{ active: currentTool === 'drawRow' }"
        title="画座位排"
        @click="selectTool('drawRow')"
      >
        <Icon icon="lucide:rows-3" class="tool-icon" />
      </button>
      <button 
        class="tool-item"
        :class="{ active: currentTool === 'drawCircle' }"
        title="画圆形区域"
        @click="selectTool('drawCircle')"
      >
        <Icon icon="lucide:circle" class="tool-icon" />
      </button>
      <button 
        class="tool-item"
        :class="{ active: currentTool === 'drawTable' }"
        title="画桌子"
        @click="selectTool('drawTable')"
      >
        <Icon icon="lucide:armchair" class="tool-icon" />
      </button>
    </div>

    <div class="toolbar-divider"></div>

    <!-- 标注工具 -->
    <div class="toolbar-section">
      <button 
        class="tool-item"
        :class="{ active: currentTool === 'text' }"
        title="文字标注"
        @click="selectTool('text')"
      >
        <Icon icon="lucide:type" class="tool-icon" />
      </button>
      <button 
        class="tool-item"
        :class="{ active: currentTool === 'stage' }"
        title="舞台"
        @click="selectTool('stage')"
      >
        <Icon icon="lucide:monitor" class="tool-icon" />
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Icon } from '@iconify/vue'
import type { ToolMode } from '../composables/useDrawing'

defineProps<{
  currentTool: ToolMode
}>()

const emit = defineEmits<{
  toolChange: [tool: ToolMode]
}>()

const selectTool = (tool: ToolMode) => {
  emit('toolChange', tool)
}
</script>

<style scoped>
.left-toolbar {
  position: absolute;
  left: 16px;
  top: 50%;
  transform: translateY(-50%);
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px 8px;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(10px);
  border-radius: 12px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
  z-index: 100;
}

.toolbar-section {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.toolbar-divider {
  width: 100%;
  height: 1px;
  background: #e5e7eb;
  margin: 4px 0;
}

.tool-item {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  background: transparent;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
  color: #6b7280;
}

.tool-item:hover {
  background: #f3f4f6;
  color: #374151;
}

.tool-item.active {
  background: #3b82f6;
  color: white;
  box-shadow: 0 2px 8px rgba(59, 130, 246, 0.3);
}

.tool-icon {
  width: 20px;
  height: 20px;
}
</style>