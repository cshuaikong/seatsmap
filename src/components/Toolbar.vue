<template>
  <div class="toolbar">
    <div class="toolbar-group">
      <button
        v-for="tool in tools"
        :key="tool.type"
        class="tool-btn"
        :class="{ active: currentTool === tool.type }"
        :title="tool.label"
        @click="selectTool(tool.type)"
      >
        <span class="tool-icon">{{ tool.icon }}</span>
        <span class="tool-label">{{ tool.label }}</span>
      </button>
    </div>
    
    <div class="toolbar-divider" />
    
    <div class="toolbar-group">
      <button
        class="tool-btn"
        :class="{ active: showGrid }"
        title="显示网格"
        @click="toggleGrid"
      >
        <span class="tool-icon">#</span>
        <span class="tool-label">网格</span>
      </button>
      
      <button
        class="tool-btn"
        :disabled="!hasSelection"
        title="删除选中"
        @click="deleteSelected"
      >
        <span class="tool-icon">🗑</span>
        <span class="tool-label">删除</span>
      </button>
    </div>
    
    <div class="toolbar-divider" />
    
    <div class="toolbar-group">
      <button
        class="tool-btn"
        :disabled="!canUndo"
        title="撤销"
        @click="undo"
      >
        <span class="tool-icon">↶</span>
      </button>
      
      <button
        class="tool-btn"
        :disabled="!canRedo"
        title="重做"
        @click="redo"
      >
        <span class="tool-icon">↷</span>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useChartStore } from '../stores/chartStore'
import type { ToolType } from '../types'

const store = useChartStore()

const currentTool = computed(() => store.currentTool)
const showGrid = computed(() => store.showGrid)
const hasSelection = computed(() => store.hasSelection)

const tools = [
  { type: 'select' as ToolType, icon: '↖', label: '选择' },
  { type: 'pan' as ToolType, icon: '✋', label: '平移' },
  { type: 'seat' as ToolType, icon: '●', label: '座位' },
  { type: 'row' as ToolType, icon: '▬', label: '排' },
  { type: 'section' as ToolType, icon: '▣', label: '区域' },
  { type: 'stage' as ToolType, icon: '▭', label: '舞台' },
  { type: 'text' as ToolType, icon: 'T', label: '文字' },
]

// TODO: 实现历史记录
const canUndo = computed(() => false)
const canRedo = computed(() => false)

function selectTool(tool: ToolType) {
  store.setTool(tool)
}

function toggleGrid() {
  store.showGrid = !store.showGrid
}

function deleteSelected() {
  store.deleteSelected()
}

function undo() {
  // TODO: 实现撤销
}

function redo() {
  // TODO: 实现重做
}
</script>

<style scoped>
.toolbar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  background: white;
  border-bottom: 1px solid #e0e0e0;
}

.toolbar-group {
  display: flex;
  gap: 4px;
}

.toolbar-divider {
  width: 1px;
  height: 32px;
  background: #e0e0e0;
  margin: 0 4px;
}

.tool-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-width: 48px;
  height: 48px;
  padding: 4px 8px;
  border: 1px solid transparent;
  border-radius: 6px;
  background: transparent;
  cursor: pointer;
  transition: all 0.15s ease;
}

.tool-btn:hover:not(:disabled) {
  background: #f0f0f0;
  border-color: #ddd;
}

.tool-btn.active {
  background: #e3f2fd;
  border-color: #2196f3;
}

.tool-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.tool-icon {
  font-size: 18px;
  line-height: 1;
  margin-bottom: 2px;
}

.tool-label {
  font-size: 11px;
  color: #666;
}

.tool-btn.active .tool-label {
  color: #2196f3;
}
</style>
