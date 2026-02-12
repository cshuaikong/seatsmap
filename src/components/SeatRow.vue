<template>
  <g 
    class="seat-row"
    :class="{ 'is-selected': isSelected }"
    :transform="`translate(${row.x}, ${row.y}) rotate(${row.rotation})`"
    @mousedown.stop="handleRowClick"
  >
    <!-- 排的连线（可选） -->
    <line
      v-if="showConnectionLine"
      :x1="firstSeat?.x || 0"
      :y1="firstSeat?.y || 0"
      :x2="lastSeat?.x || 0"
      :y2="lastSeat?.y || 0"
      stroke="#ccc"
      stroke-width="1"
      stroke-dasharray="4 4"
    />
    
    <!-- 排标签 -->
    <g v-if="showLabel" :transform="`translate(-30, ${row.seats[0]?.y || 0})`">
      <rect
        x="-20"
        y="-10"
        width="30"
        height="20"
        rx="4"
        :fill="isSelected ? '#2196F3' : '#fff'"
        :stroke="isSelected ? '#2196F3' : '#ccc'"
        stroke-width="1"
      />
      <text
        x="-5"
        y="4"
        text-anchor="middle"
        font-size="12"
        :fill="isSelected ? '#fff' : '#666'"
        class="row-label-text"
      >
        {{ row.label }}
      </text>
    </g>
    
    <!-- 座位列表 -->
    <SeatItem
      v-for="seat in row.seats"
      :key="seat.id"
      :seat="seat"
      :categories="categories"
      :show-label="showSeatLabels"
      @select="handleSeatSelect"
    />
    
    <!-- 选中框 -->
    <rect
      v-if="isSelected"
      :x="bounds.x - 10"
      :y="bounds.y - 10"
      :width="bounds.width + 20"
      :height="bounds.height + 20"
      fill="none"
      stroke="#2196F3"
      stroke-width="2"
      stroke-dasharray="5 5"
      rx="4"
    />
  </g>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { SeatRow, Category } from '../types'
import { useChartStore } from '../stores/chartStore'
import SeatItem from './SeatItem.vue'

interface Props {
  row: SeatRow
  categories: Category[]
  showLabel?: boolean
  showSeatLabels?: boolean
  showConnectionLine?: boolean
}

withDefaults(defineProps<Props>(), {
  showLabel: true,
  showSeatLabels: true,
  showConnectionLine: false
})

const emit = defineEmits<{
  selectRow: [rowId: string, additive: boolean]
  selectSeat: [seatId: string, additive: boolean]
}>()

const store = useChartStore()

const isSelected = computed(() => 
  store.selectedRowIds.includes(props.row.id)
)

const firstSeat = computed(() => props.row.seats[0])
const lastSeat = computed(() => props.row.seats[props.row.seats.length - 1])

// 计算排的边界框
const bounds = computed(() => {
  if (props.row.seats.length === 0) {
    return { x: 0, y: 0, width: 0, height: 0 }
  }
  
  let minX = Infinity, minY = Infinity
  let maxX = -Infinity, maxY = -Infinity
  
  props.row.seats.forEach(seat => {
    minX = Math.min(minX, seat.x - seat.radius)
    minY = Math.min(minY, seat.y - seat.radius)
    maxX = Math.max(maxX, seat.x + seat.radius)
    maxY = Math.max(maxY, seat.y + seat.radius)
  })
  
  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY
  }
})

function handleRowClick(e: MouseEvent) {
  // 只有点击排的背景时才选择排
  if ((e.target as Element).tagName === 'g') {
    const additive = e.shiftKey || e.ctrlKey || e.metaKey
    emit('selectRow', props.row.id, additive)
  }
}

function handleSeatSelect(seatId: string, additive: boolean) {
  emit('selectSeat', seatId, additive)
}
</script>

<style scoped>
.seat-row {
  cursor: pointer;
}

.row-label-text {
  pointer-events: none;
  user-select: none;
}
</style>
