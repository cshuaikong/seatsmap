<template>
  <div class="seat-chart-editor">
    <!-- 顶部工具栏 -->
    <Toolbar />
    
    <!-- 主内容区 -->
    <div class="editor-main">
      <!-- 左侧工具面板（可选） -->
      <div class="left-panel" v-if="showLeftPanel">
        <div class="panel-content">
          <h4>图层</h4>
          <div class="layer-list">
            <div
              v-for="section in chart.sections"
              :key="section.id"
              class="layer-item"
              :class="{ selected: selectedSectionIds.includes(section.id) }"
              @click="selectSection(section.id, false)"
            >
              <span class="layer-icon">▣</span>
              <span class="layer-name">{{ section.name || '未命名区域' }}</span>
              <span class="layer-count">{{ getSectionSeatCount(section) }} 座</span>
            </div>
          </div>
        </div>
      </div>
      
      <!-- 画布区域 -->
      <div class="canvas-wrapper">
        <ChartCanvas
          :chart="chart"
        />
      </div>
      
      <!-- 右侧属性面板 -->
      <PropertyPanel :chart="chart" />
    </div>
    
    <!-- 底部状态栏 -->
    <div class="status-bar">
      <div class="status-left">
        <span>{{ chart.name }}</span>
        <span class="divider">|</span>
        <span>{{ chart.width }} × {{ chart.height }}</span>
      </div>
      <div class="status-right">
        <span>工具: {{ currentToolLabel }}</span>
        <span class="divider">|</span>
        <span>座位: {{ seatCount }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useChartStore } from '../stores/chartStore'
import Toolbar from './Toolbar.vue'
import ChartCanvas from './ChartCanvas.vue'
import PropertyPanel from './PropertyPanel.vue'
import type { Section } from '../types'

const store = useChartStore()
const chart = computed(() => store.chart)
const currentTool = computed(() => store.currentTool)
const selectedSectionIds = computed(() => store.selectedSectionIds)
const seatCount = computed(() => store.seatCount)

const showLeftPanel = ref(true)

const currentToolLabel = computed(() => {
  const labels: Record<string, string> = {
    select: '选择',
    pan: '平移',
    seat: '添加座位',
    row: '添加排',
    section: '添加区域',
    stage: '添加舞台',
    text: '添加文字',
    image: '添加图片',
    shape: '添加形状'
  }
  return labels[currentTool.value] || currentTool.value
})

function selectSection(sectionId: string, additive: boolean) {
  store.selectSection(sectionId, additive)
}

function getSectionSeatCount(section: Section): number {
  return section.rows.reduce((sum, row) => sum + row.seats.length, 0)
}
</script>

<style scoped>
.seat-chart-editor {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: #f5f5f5;
}

.editor-main {
  display: flex;
  flex: 1;
  overflow: hidden;
}

.left-panel {
  width: 200px;
  background: white;
  border-right: 1px solid #e0e0e0;
  overflow-y: auto;
}

.panel-content {
  padding: 16px;
}

.panel-content h4 {
  margin: 0 0 12px 0;
  font-size: 13px;
  font-weight: 600;
  color: #333;
}

.layer-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.layer-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 13px;
}

.layer-item:hover {
  background: #f0f0f0;
}

.layer-item.selected {
  background: #e3f2fd;
}

.layer-icon {
  color: #666;
}

.layer-name {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.layer-count {
  font-size: 11px;
  color: #999;
}

.canvas-wrapper {
  flex: 1;
  overflow: hidden;
  position: relative;
}

.status-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 6px 16px;
  background: white;
  border-top: 1px solid #e0e0e0;
  font-size: 12px;
  color: #666;
}

.status-bar .divider {
  margin: 0 8px;
  color: #ddd;
}
</style>
