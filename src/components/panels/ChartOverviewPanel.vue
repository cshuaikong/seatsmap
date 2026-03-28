<template>
  <div class="chart-overview-panel">
    <!-- 图表名称 -->
    <div class="panel-header">
      <h2 class="panel-title">{{ chartName }}</h2>
    </div>

    <!-- Categories 区域 -->
    <div class="categories-section" :class="{ expanded: showCategories }">
      <div class="categories-header" @click="showCategories = !showCategories">
        <div class="toggle-switch" :class="{ on: showCategories }">
          <div class="toggle-thumb"></div>
        </div>
        <!-- EN: categories -->
        <span class="categories-count">{{ categories.length }} 个分类</span>
        <button class="manage-btn" @click.stop="emit('manage-categories')">
          <Icon icon="lucide:settings-2" class="manage-icon" />
          <!-- EN: Manage -->
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
        <!-- EN: places -->
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
          <Icon :icon="item.status === 'success' ? 'lucide:check' : item.status === 'warning' ? 'lucide:alert-triangle' : 'lucide:x'" class="validation-icon" />
        </div>
        <span class="validation-text">{{ item.text }}</span>
      </div>
    </div>

    <!-- 空状态提示 -->
    <div class="empty-state">
      <Icon icon="lucide:mouse-pointer-2" class="empty-icon" />
      <p>选择一个对象进行编辑</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { Icon } from '@iconify/vue'

interface Category {
  id: string
  name: string
  color: string
  accessible?: boolean
}

const props = defineProps<{
  chartName: string
  categories: Category[]
  totalSeats: number
}>()

const emit = defineEmits<{
  'manage-categories': []
}>()

const showCategories = ref(true)

const validationItems = [
  // EN: No duplicate objects
  { status: 'success', text: '无重复对象' },
  // EN: All objects are labeled
  { status: 'success', text: '所有对象已标注' },
  // EN: All objects are categorized
  { status: 'success', text: '所有对象已分类' },
  // EN: One category per object type
  { status: 'success', text: '每种对象类型一个分类' },
  // EN: Focal point is set
  { status: 'success', text: '焦点已设置' }
]
</script>

<style scoped>
.chart-overview-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
}

/* 图表概览头部 */
.panel-header {
  padding: 16px;
  border-bottom: 1px solid var(--color-border);
  flex-shrink: 0;
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
  flex-shrink: 0;
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
  background: rgba(255, 255, 255, 0.3);
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
  background: rgba(0, 0, 0, 0.08);
  border-radius: 6px;
  font-size: 12px;
  color: var(--color-text);
  cursor: pointer;
}

.categories-section.expanded .manage-btn {
  color: white;
  background: rgba(255, 255, 255, 0.2);
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
  flex-shrink: 0;
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
  flex-shrink: 0;
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
