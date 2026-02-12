<template>
  <g 
    class="seat-item"
    :class="{
      'is-selected': isSelected,
      'is-hovered': isHovered
    }"
    :transform="`translate(${seat.x}, ${seat.y})`"
    @mousedown.stop="handleMouseDown"
    @mouseenter="isHovered = true"
    @mouseleave="isHovered = false"
  >
    <!-- 座位形状 -->
    <circle
      v-if="seat.shape === 'circle'"
      :r="seat.radius"
      :fill="fillColor"
      :stroke="strokeColor"
      :stroke-width="isSelected ? 3 : 2"
      class="seat-shape"
    />
    <rect
      v-else
      :x="-seat.radius"
      :y="-seat.radius"
      :width="seat.radius * 2"
      :height="seat.radius * 2"
      :rx="4"
      :fill="fillColor"
      :stroke="strokeColor"
      :stroke-width="isSelected ? 3 : 2"
      class="seat-shape"
    />
    
    <!-- 座位标签 -->
    <text
      v-if="showLabel"
      :y="seat.radius + 14"
      text-anchor="middle"
      font-size="10"
      fill="#666"
      class="seat-label"
    >
      {{ seat.label }}
    </text>
    
    <!-- 选中标记 -->
    <circle
      v-if="isSelected"
      :r="seat.radius + 6"
      fill="none"
      stroke="#2196F3"
      stroke-width="2"
      stroke-dasharray="4 2"
      class="selection-ring"
    />
  </g>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import type { Seat, Category } from '../types'
import { useChartStore } from '../stores/chartStore'

interface Props {
  seat: Seat
  categories: Category[]
  showLabel?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  showLabel: true
})

const emit = defineEmits<{
  select: [seatId: string, additive: boolean]
}>()

const store = useChartStore()
const isHovered = ref(false)

// 是否被选中
const isSelected = computed(() => 
  store.selectedSeatIds.includes(props.seat.id)
)

// 获取类别颜色
const category = computed(() => 
  props.categories.find(c => c.id === props.seat.categoryId)
)

// 填充颜色
const fillColor = computed(() => {
  if (category.value) {
    return category.value.color
  }
  return '#E0E0E0' // 默认灰色
})

// 边框颜色
const strokeColor = computed(() => {
  if (isSelected.value) return '#2196F3'
  return '#999'
})

// 处理鼠标点击
function handleMouseDown(e: MouseEvent) {
  const additive = e.shiftKey || e.ctrlKey || e.metaKey
  emit('select', props.seat.id, additive)
}
</script>

<style scoped>
.seat-item {
  cursor: pointer;
}

.seat-shape {
  transition: all 0.15s ease;
}

.seat-item:hover .seat-shape {
  filter: brightness(1.1);
}

.seat-label {
  pointer-events: none;
  user-select: none;
}

.selection-ring {
  animation: rotate 2s linear infinite;
}

@keyframes rotate {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}
</style>
