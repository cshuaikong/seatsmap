<template>
  <div class="left-toolbar">
    <!-- 选择工具 -->
    <div class="toolbar-section">
      <button 
        class="tool-item"
        :class="{ active: currentTool === 'select' }"
        title="选择 (V)"
        @click="selectTool('select')"
      >
        <Icon icon="lucide:mouse-pointer-2" class="tool-icon" />
      </button>
    </div>

    <div class="toolbar-divider"></div>

    <!-- 绘制工具组 -->
    <div class="toolbar-section">
      <button 
        class="tool-item"
        :class="{ active: currentTool === 'drawSeat' }"
        title="绘制座位排"
        @click="selectTool('drawSeat')"
      >
        <Icon icon="lucide:circle-dot" class="tool-icon" />
      </button>
      <button 
        class="tool-item"
        :class="{ active: currentTool === 'row' }"
        title="添加排"
        @click="selectTool('row')"
      >
        <Icon icon="lucide:users" class="tool-icon" />
      </button>
      <button 
        class="tool-item"
        :class="{ active: currentTool === 'section' }"
        title="添加区域"
        @click="selectTool('section')"
      >
        <Icon icon="lucide:square-dashed" class="tool-icon" />
      </button>
      <button 
        class="tool-item"
        :class="{ active: currentTool === 'booth' }"
        title="添加展位"
        @click="selectTool('booth')"
      >
        <Icon icon="lucide:layout-grid" class="tool-icon" />
      </button>
      <button 
        class="tool-item"
        :class="{ active: currentTool === 'table' }"
        title="添加桌子"
        @click="selectTool('table')"
      >
        <Icon icon="lucide:armchair" class="tool-icon" />
      </button>
      <button 
        class="tool-item"
        :class="{ active: currentTool === 'shape' }"
        title="添加形状"
        @click="selectTool('shape')"
      >
        <Icon icon="lucide:triangle" class="tool-icon" />
      </button>
    </div>

    <div class="toolbar-divider"></div>

    <!-- 标注工具组 -->
    <div class="toolbar-section">
      <button 
        class="tool-item"
        :class="{ active: currentTool === 'text' }"
        title="文字"
        @click="selectTool('text')"
      >
        <Icon icon="lucide:type" class="tool-icon" />
      </button>
      <button 
        class="tool-item"
        :class="{ active: currentTool === 'image' }"
        title="图片"
        @click="selectTool('image')"
      >
        <Icon icon="lucide:image" class="tool-icon" />
      </button>
      <button 
        class="tool-item"
        :class="{ active: currentTool === 'restroom' }"
        title="卫生间"
        @click="selectTool('restroom')"
      >
        <Icon icon="lucide:users" class="tool-icon" />
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