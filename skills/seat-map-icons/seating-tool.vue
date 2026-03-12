<template>
  <!-- 座位绘制工具栏组件示例 -->
  <div class="seating-tools">
    <!-- 选择工具 -->
    <button class="tool-item" title="选择工具">
      <Icon icon="lucide:mouse-pointer-2" />
    </button>
    
    <!-- 单行座位 - 三个圆点 -->
    <button class="tool-item" title="单行座位">
      <Icon icon="tabler:dots" />
    </button>
    
    <!-- 弧形座位 - 带角度 -->
    <button class="tool-item" title="弧形座位">
      <Icon icon="mdi:seat-flat-angled" />
    </button>
    
    <!-- 多行座位 - 多行排列 -->
    <button class="tool-item" title="多行座位">
      <Icon icon="tabler:grip-vertical" />
    </button>
    
    <!-- 圆形区域 -->
    <button class="tool-item" title="圆形区域">
      <Icon icon="lucide:circle" />
    </button>
    
    <!-- 桌子 -->
    <button class="tool-item" title="桌子">
      <Icon icon="lucide:armchair" />
    </button>
    
    <!-- 舞台 -->
    <button class="tool-item" title="舞台">
      <Icon icon="lucide:monitor" />
    </button>
    
    <!-- 文字 -->
    <button class="tool-item" title="文字标注">
      <Icon icon="lucide:type" />
    </button>
  </div>
</template>

<script setup>
import { Icon } from '@iconify/vue'
</script>

<style scoped>
.seating-tools {
  display: flex;
  flex-direction: column;
  gap: 8px;
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
  color: var(--color-text-secondary);
  transition: all 0.2s ease;
}

.tool-item:hover {
  background: var(--color-bg-tertiary);
  color: var(--color-text);
}

.tool-item.active {
  background: var(--color-accent-soft);
  color: var(--color-accent);
}
</style>
