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
        :class="{ active: currentTool === 'seat' }"
        title="添加座位排"
        @click="selectTool('seat')"
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

interface Props {
  currentTool: ToolMode
}

const props = defineProps<Props>()

const emit = defineEmits<{
  'select-tool': [tool: ToolMode]
}>()

function selectTool(tool: ToolMode) {
  emit('select-tool', tool)
}
</script>

<style scoped>
.left-toolbar {
  display: flex;
  flex-direction: column;
  width: 56px;
  background: var(--color-bg-secondary);
  border-right: 1px solid var(--color-border);
  padding: 8px 0;
}

.toolbar-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
}

.tool-item {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  border: none;
  background: transparent;
  border-radius: 8px;
  cursor: pointer;
  color: var(--color-text-secondary);
  transition: all 0.15s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
}

.tool-item:hover {
  background: var(--color-bg-tertiary);
  color: var(--color-text);
}

.tool-item.active {
  background: var(--color-accent-soft);
  color: var(--color-accent);
}

.tool-item.active::before {
  content: '';
  position: absolute;
  left: 2px;
  top: 50%;
  transform: translateY(-50%);
  width: 3px;
  height: 20px;
  background: var(--color-accent);
  border-radius: 0 2px 2px 0;
}

.tool-icon {
  width: 22px;
  height: 22px;
}

.toolbar-divider {
  width: 32px;
  height: 1px;
  background: var(--color-border);
  margin: 8px auto;
}
</style>
