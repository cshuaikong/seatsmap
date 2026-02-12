<template>
  <div class="property-panel">
    <div class="panel-header">
      <h3>属性</h3>
      <span v-if="selectionCount > 0" class="selection-count">
        {{ selectionCount }} 项选中
      </span>
    </div>
    
    <!-- 座位属性 -->
    <div v-if="selectedSeats.length > 0" class="panel-section">
      <h4>座位</h4>
      <div class="form-group">
        <label>标签</label>
        <input 
          v-model="selectedSeats[0].label"
          type="text"
          @change="updateSeatLabel"
        />
      </div>
      <div class="form-group">
        <label>类别</label>
        <select v-model="selectedSeats[0].categoryId">
          <option :value="null">无</option>
          <option 
            v-for="cat in chart.categories" 
            :key="cat.id" 
            :value="cat.id"
          >
            {{ cat.name }}
          </option>
        </select>
      </div>
      <div class="form-group">
        <label>形状</label>
        <div class="shape-selector">
          <button
            :class="{ active: selectedSeats[0].shape === 'circle' }"
            @click="setSeatShape('circle')"
          >
            ● 圆形
          </button>
          <button
            :class="{ active: selectedSeats[0].shape === 'square' }"
            @click="setSeatShape('square')"
          >
            ■ 方形
          </button>
        </div>
      </div>
      <div class="form-group">
        <label>大小 ({{ selectedSeats[0].radius }}px)</label>
        <input
          v-model.number="selectedSeats[0].radius"
          type="range"
          min="8"
          max="24"
        />
      </div>
    </div>
    
    <!-- 排属性 -->
    <div v-if="selectedRows.length > 0" class="panel-section">
      <h4>排</h4>
      <div class="form-group">
        <label>标签</label>
        <input v-model="selectedRows[0].label" type="text" />
      </div>
      <div class="form-group">
        <label>座位间距 ({{ selectedRows[0].seatSpacing }}px)</label>
        <input
          v-model.number="selectedRows[0].seatSpacing"
          type="range"
          min="20"
          max="60"
        />
      </div>
      <div class="form-group">
        <label>弯曲度 ({{ selectedRows[0].curve }}°)</label>
        <input
          v-model.number="selectedRows[0].curve"
          type="range"
          min="-90"
          max="90"
        />
      </div>
    </div>
    
    <!-- 区域属性 -->
    <div v-if="selectedSections.length > 0" class="panel-section">
      <h4>区域</h4>
      <div class="form-group">
        <label>名称</label>
        <input v-model="selectedSections[0].name" type="text" />
      </div>
      <div class="form-group">
        <label>类别</label>
        <select v-model="selectedSections[0].categoryId">
          <option :value="null">无</option>
          <option 
            v-for="cat in chart.categories" 
            :key="cat.id" 
            :value="cat.id"
          >
            {{ cat.name }}
          </option>
        </select>
      </div>
      <div class="form-group">
        <label>旋转 ({{ Math.round(selectedSections[0].rotation) }}°)</label>
        <input
          v-model.number="selectedSections[0].rotation"
          type="range"
          min="-180"
          max="180"
        />
      </div>
      <div class="form-group">
        <label>缩放</label>
        <div class="scale-inputs">
          <input
            v-model.number="selectedSections[0].scaleX"
            type="number"
            step="0.1"
            min="0.1"
            max="3"
          />
          <span>×</span>
          <input
            v-model.number="selectedSections[0].scaleY"
            type="number"
            step="0.1"
            min="0.1"
            max="3"
          />
        </div>
      </div>
    </div>
    
    <!-- 类别管理 -->
    <div class="panel-section">
      <h4>类别管理</h4>
      <div class="category-list">
        <div
          v-for="cat in chart.categories"
          :key="cat.id"
          class="category-item"
        >
          <input
            v-model="cat.color"
            type="color"
            class="color-picker"
          />
          <input
            v-model="cat.name"
            type="text"
            class="category-name"
          />
          <button
            class="btn-icon"
            title="删除类别"
            @click="deleteCategory(cat.id)"
          >
            ×
          </button>
        </div>
      </div>
      <button class="btn-add" @click="addCategory">
        + 添加类别
      </button>
    </div>
    
    <!-- 图表信息 -->
    <div class="panel-section">
      <h4>图表信息</h4>
      <div class="info-item">
        <span>座位总数</span>
        <strong>{{ seatCount }}</strong>
      </div>
      <div class="info-item">
        <span>区域数</span>
        <strong>{{ chart.sections.length }}</strong>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { ChartData } from '../types'
import { useChartStore } from '../stores/chartStore'

interface Props {
  chart: ChartData
}

const props = defineProps<Props>()
const store = useChartStore()

const selectedSeats = computed(() => store.selectedSeats)
const selectedRows = computed(() => store.selectedRows)
const selectedSections = computed(() => store.selectedSections)
const seatCount = computed(() => store.seatCount)

const selectionCount = computed(() => 
  selectedSeats.value.length + 
  selectedRows.value.length + 
  selectedSections.value.length
)

function updateSeatLabel() {
  // 批量更新座位标签
  if (selectedSeats.value.length > 1) {
    // TODO: 重新编号
  }
}

function setSeatShape(shape: 'circle' | 'square') {
  selectedSeats.value.forEach(seat => {
    seat.shape = shape
  })
}

function addCategory() {
  const colors = ['#4CAF50', '#2196F3', '#FF9800', '#F44336', '#9C27B0']
  const randomColor = colors[Math.floor(Math.random() * colors.length)]
  
  store.addCategory({
    name: `类别 ${props.chart.categories.length + 1}`,
    color: randomColor,
    accessible: false
  })
}

function deleteCategory(categoryId: string) {
  store.deleteCategory(categoryId)
}
</script>

<style scoped>
.property-panel {
  width: 280px;
  background: white;
  border-left: 1px solid #e0e0e0;
  display: flex;
  flex-direction: column;
  overflow-y: auto;
}

.panel-header {
  padding: 16px;
  border-bottom: 1px solid #e0e0e0;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.panel-header h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
}

.selection-count {
  font-size: 12px;
  color: #666;
  background: #f0f0f0;
  padding: 2px 8px;
  border-radius: 12px;
}

.panel-section {
  padding: 16px;
  border-bottom: 1px solid #e0e0e0;
}

.panel-section h4 {
  margin: 0 0 12px 0;
  font-size: 13px;
  font-weight: 600;
  color: #333;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.form-group {
  margin-bottom: 12px;
}

.form-group label {
  display: block;
  font-size: 12px;
  color: #666;
  margin-bottom: 4px;
}

.form-group input,
.form-group select {
  width: 100%;
  padding: 6px 10px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 13px;
}

.form-group input:focus,
.form-group select:focus {
  outline: none;
  border-color: #2196F3;
}

.shape-selector {
  display: flex;
  gap: 8px;
}

.shape-selector button {
  flex: 1;
  padding: 8px;
  border: 1px solid #ddd;
  background: white;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
}

.shape-selector button.active {
  background: #e3f2fd;
  border-color: #2196F3;
  color: #2196F3;
}

.scale-inputs {
  display: flex;
  align-items: center;
  gap: 8px;
}

.scale-inputs input {
  flex: 1;
}

.category-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 12px;
}

.category-item {
  display: flex;
  align-items: center;
  gap: 8px;
}

.color-picker {
  width: 32px !important;
  height: 32px;
  padding: 0 !important;
  border: none !important;
  cursor: pointer;
}

.category-name {
  flex: 1;
}

.btn-icon {
  width: 28px;
  height: 28px;
  border: none;
  background: transparent;
  color: #999;
  font-size: 18px;
  cursor: pointer;
  border-radius: 4px;
}

.btn-icon:hover {
  background: #f0f0f0;
  color: #f44336;
}

.btn-add {
  width: 100%;
  padding: 8px;
  border: 1px dashed #ddd;
  background: transparent;
  border-radius: 4px;
  cursor: pointer;
  font-size: 13px;
  color: #666;
}

.btn-add:hover {
  border-color: #2196F3;
  color: #2196F3;
}

.info-item {
  display: flex;
  justify-content: space-between;
  padding: 8px 0;
  font-size: 13px;
}

.info-item span {
  color: #666;
}

.info-item strong {
  color: #333;
}
</style>
