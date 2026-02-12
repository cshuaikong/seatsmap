<template>
  <div class="right-panel">
    <!-- 顶部标题 -->
    <div class="panel-header">
      <h2 class="panel-title">{{ chartName }}</h2>
    </div>

    <!-- Categories 区域 -->
    <div class="categories-section" :class="{ expanded: showCategories }">
      <div class="categories-header" @click="showCategories = !showCategories">
        <div class="toggle-switch" :class="{ on: showCategories }">
          <div class="toggle-thumb"></div>
        </div>
        <span class="categories-count">{{ categories.length }} 个类别</span>
        <button class="manage-btn">
          <Icon icon="lucide:settings-2" class="manage-icon" />
          管理
        </button>
      </div>
      
      <div v-if="showCategories" class="categories-list">
        <div v-for="cat in categories" :key="cat.id" class="category-item">
          <div class="category-color" :style="{ backgroundColor: cat.color }"></div>
          <span class="category-name">{{ cat.name }}</span>
          <Icon v-if="cat.accessible" icon="lucide:accessibility" class="accessible-icon" />
        </div>
      </div>
    </div>

    <!-- 统计信息 -->
    <div class="stats-section">
      <div class="stat-item">
        <div class="stat-icon-wrapper">
          <Icon icon="lucide:armchair" class="stat-icon" />
        </div>
        <span class="stat-value">{{ totalSeats }}</span>
        <span class="stat-label">个座位</span>
        <button class="search-btn" title="搜索座位">
          <Icon icon="lucide:search" class="search-icon" />
        </button>
      </div>
    </div>

    <!-- 验证列表 -->
    <div class="validation-section">
      <div v-for="(item, index) in validationItems" :key="index" class="validation-item" :class="item.status">
        <div class="validation-icon-wrapper">
          <Icon 
            :icon="item.status === 'success' ? 'lucide:check' : item.status === 'warning' ? 'lucide:alert-triangle' : 'lucide:x'" 
            class="validation-icon" 
          />
        </div>
        <span class="validation-text">{{ item.text }}</span>
      </div>
    </div>

    <!-- 选中排的属性 -->
    <div v-if="selectedRow" class="properties-section">
      <div class="property-group">
        <h4>排设置</h4>
        
        <div class="property-field">
          <label>排号</label>
          <input type="text" v-model="selectedRow.label" @change="updateRow" />
        </div>
        
        <div class="property-field">
          <label>座位数量</label>
          <div class="number-input">
            <button class="step-btn" @click="decreaseSeats">
              <Icon icon="lucide:minus" class="step-icon" />
            </button>
            <span class="number-value">{{ selectedRow.seats.length }}</span>
            <button class="step-btn" @click="increaseSeats">
              <Icon icon="lucide:plus" class="step-icon" />
            </button>
          </div>
        </div>
        
        <div class="property-field">
          <label>旋转角度</label>
          <div class="number-input">
            <button class="step-btn" @click="decreaseRotation">
              <Icon icon="lucide:minus" class="step-icon" />
            </button>
            <span class="number-value">{{ Math.round(selectedRow.rotation) }}°</span>
            <button class="step-btn" @click="increaseRotation">
              <Icon icon="lucide:plus" class="step-icon" />
            </button>
          </div>
        </div>
        
        <div class="property-field">
          <label>位置</label>
          <div class="position-display">
            <span>X: {{ Math.round(selectedRow.x) }}</span>
            <span>Y: {{ Math.round(selectedRow.y) }}</span>
          </div>
        </div>
      </div>

      <!-- 类别 -->
      <div class="property-group">
        <h4>类别</h4>
        <div class="category-select">
          <div class="category-badge" :style="{ backgroundColor: selectedCategory?.color || '#9ca3af' }"></div>
          <span class="category-name">{{ selectedCategory?.name || '选择类别' }}</span>
          <button class="dropdown-btn">
            <Icon icon="lucide:chevron-down" class="dropdown-icon" />
          </button>
        </div>
      </div>

      <!-- 座位间距 -->
      <div class="property-group">
        <h4>座位间距</h4>
        <div class="property-field">
          <label>座位间距</label>
          <div class="number-input">
            <button class="step-btn" @click="seatSpacing = Math.max(20, seatSpacing - 2)">
              <Icon icon="lucide:minus" class="step-icon" />
            </button>
            <span class="number-value">{{ seatSpacing }}</span>
            <button class="step-btn" @click="seatSpacing = Math.min(60, seatSpacing + 2)">
              <Icon icon="lucide:plus" class="step-icon" />
            </button>
          </div>
          <span class="unit">pt</span>
        </div>
      </div>
    </div>

    <!-- 空状态 -->
    <div v-else class="empty-state">
      <Icon icon="lucide:mouse-pointer-2" class="empty-icon" />
      <p>选择一个排进行编辑</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { Icon } from '@iconify/vue'
import type { Row, Category } from '../types'

const props = defineProps<{
  chartName: string
  categories: Category[]
  totalSeats: number
  selectedRow: Row | null
}>()

const emit = defineEmits<{
  'update-row': [row: Row]
}>()

const showCategories = ref(true)
const seatSpacing = ref(28)

const selectedCategory = computed(() => {
  if (!props.selectedRow || props.selectedRow.seats.length === 0) return null
  return props.categories.find(c => c.id === props.selectedRow!.seats[0].categoryId)
})

const validationItems = [
  { status: 'success', text: '无重复对象' },
  { status: 'success', text: '所有对象已标记' },
  { status: 'success', text: '所有对象已分类' },
  { status: 'success', text: '焦点已设置' }
]

function updateRow() {
  if (props.selectedRow) {
    emit('update-row', props.selectedRow)
  }
}

function increaseSeats() {
  // TODO: 增加座位
}

function decreaseSeats() {
  // TODO: 减少座位
}

function increaseRotation() {
  if (props.selectedRow) {
    props.selectedRow.rotation = (props.selectedRow.rotation + 5) % 360
    updateRow()
  }
}

function decreaseRotation() {
  if (props.selectedRow) {
    props.selectedRow.rotation = (props.selectedRow.rotation - 5) % 360
    updateRow()
  }
}
</script>

<style scoped>
.right-panel {
  width: 300px;
  background: var(--color-bg-secondary);
  border-left: 1px solid var(--color-border);
  overflow-y: auto;
  display: flex;
  flex-direction: column;
}

.panel-header {
  padding: 16px;
  border-bottom: 1px solid var(--color-border);
}

.panel-title {
  margin: 0;
  font-size: 15px;
  font-weight: 600;
  color: var(--color-text);
}

/* Categories */
.categories-section {
  background: var(--color-bg-tertiary);
  border-bottom: 1px solid var(--color-border);
}

.categories-section.expanded {
  background: var(--color-accent);
}

.categories-header {
  display: flex;
  align-items: center;
  padding: 12px 16px;
  cursor: pointer;
  gap: 12px;
}

.toggle-switch {
  width: 36px;
  height: 20px;
  background: var(--color-border-hover);
  border-radius: 10px;
  position: relative;
  transition: background 0.2s;
}

.toggle-switch.on {
  background: rgba(255,255,255,0.3);
}

.toggle-thumb {
  position: absolute;
  top: 2px;
  left: 2px;
  width: 16px;
  height: 16px;
  background: white;
  border-radius: 50%;
  transition: transform 0.2s;
}

.toggle-switch.on .toggle-thumb {
  transform: translateX(16px);
}

.categories-count {
  flex: 1;
  font-size: 13px;
  font-weight: 500;
  color: var(--color-text);
}

.categories-section.expanded .categories-count {
  color: white;
}

.manage-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  border: none;
  background: rgba(0,0,0,0.08);
  border-radius: 6px;
  font-size: 12px;
  color: var(--color-text);
  cursor: pointer;
}

.categories-section.expanded .manage-btn {
  color: white;
  background: rgba(255,255,255,0.2);
}

.manage-icon {
  width: 12px;
  height: 12px;
}

.categories-list {
  padding: 12px 16px;
  background: var(--color-bg-secondary);
}

.category-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 0;
}

.category-color {
  width: 14px;
  height: 14px;
  border-radius: 50%;
}

.category-name {
  flex: 1;
  font-size: 13px;
  color: var(--color-text);
}

.accessible-icon {
  width: 14px;
  height: 14px;
  color: var(--color-text-secondary);
}

/* Stats */
.stats-section {
  padding: 16px;
  background: var(--color-bg-secondary);
  border-bottom: 1px solid var(--color-border);
}

.stat-item {
  display: flex;
  align-items: center;
  gap: 10px;
}

.stat-icon-wrapper {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  background: var(--color-bg-tertiary);
  display: flex;
  align-items: center;
  justify-content: center;
}

.stat-icon {
  width: 16px;
  height: 16px;
  color: var(--color-text);
}

.stat-value {
  font-size: 18px;
  font-weight: 700;
  color: var(--color-text);
}

.stat-label {
  flex: 1;
  font-size: 13px;
  color: var(--color-text-secondary);
}

.search-btn {
  width: 28px;
  height: 28px;
  border: none;
  background: var(--color-bg-tertiary);
  border-radius: 6px;
  cursor: pointer;
  color: var(--color-text-secondary);
  display: flex;
  align-items: center;
  justify-content: center;
}

.search-icon {
  width: 14px;
  height: 14px;
}

/* Validation */
.validation-section {
  padding: 8px 16px;
  background: var(--color-bg-secondary);
  border-bottom: 1px solid var(--color-border);
}

.validation-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 6px 0;
  font-size: 12px;
}

.validation-icon-wrapper {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.validation-item.success .validation-icon-wrapper {
  background: rgba(34, 165, 89, 0.12);
}

.validation-icon {
  width: 10px;
  height: 10px;
}

.validation-item.success .validation-icon {
  color: var(--color-success);
}

.validation-text {
  flex: 1;
  color: var(--color-text-secondary);
}

/* Properties */
.properties-section {
  flex: 1;
}

.property-group {
  padding: 16px;
  border-bottom: 1px solid var(--color-border);
}

.property-group h4 {
  margin: 0 0 16px 0;
  font-size: 13px;
  font-weight: 600;
  color: var(--color-text);
}

.property-field {
  margin-bottom: 16px;
}

.property-field label {
  display: block;
  font-size: 11px;
  color: var(--color-text-muted);
  margin-bottom: 6px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.property-field input[type="text"] {
  width: 100%;
  height: 36px;
  padding: 0 12px;
  border: 1px solid var(--color-border);
  border-radius: 6px;
  background: var(--color-bg-tertiary);
  color: var(--color-text);
  font-size: 13px;
}

.property-field input:focus {
  outline: none;
  border-color: var(--color-accent);
}

.number-input {
  display: flex;
  align-items: center;
  border: 1px solid var(--color-border);
  border-radius: 6px;
  overflow: hidden;
  background: var(--color-bg-tertiary);
}

.step-btn {
  width: 36px;
  height: 36px;
  border: none;
  background: transparent;
  cursor: pointer;
  color: var(--color-text-secondary);
  display: flex;
  align-items: center;
  justify-content: center;
}

.step-btn:hover {
  background: var(--color-border);
  color: var(--color-text);
}

.step-icon {
  width: 14px;
  height: 14px;
}

.number-value {
  flex: 1;
  text-align: center;
  font-size: 14px;
  font-weight: 500;
  color: var(--color-text);
  font-family: var(--font-mono);
}

.unit {
  margin-left: 8px;
  font-size: 11px;
  color: var(--color-text-muted);
}

.position-display {
  display: flex;
  gap: 16px;
  padding: 10px 12px;
  background: var(--color-bg-tertiary);
  border-radius: 6px;
  font-size: 13px;
  color: var(--color-text-secondary);
  font-family: var(--font-mono);
}

.category-select {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 10px;
  border: 1px solid var(--color-border);
  border-radius: 6px;
  background: var(--color-bg-tertiary);
}

.category-badge {
  width: 14px;
  height: 14px;
  border-radius: 50%;
}

.category-name {
  flex: 1;
  font-size: 13px;
  color: var(--color-text);
}

.dropdown-btn {
  width: 22px;
  height: 22px;
  border: none;
  background: transparent;
  cursor: pointer;
  color: var(--color-text-secondary);
  display: flex;
  align-items: center;
  justify-content: center;
}

.dropdown-icon {
  width: 14px;
  height: 14px;
}

/* 空状态 */
.empty-state {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px;
  color: var(--color-text-muted);
}

.empty-icon {
  width: 48px;
  height: 48px;
  margin-bottom: 16px;
  opacity: 0.5;
}

.empty-state p {
  font-size: 13px;
  text-align: center;
}
</style>
