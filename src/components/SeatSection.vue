<template>
  <g 
    class="seat-section"
    :class="{ 'is-selected': isSelected }"
    :transform="`translate(${section.x}, ${section.y}) rotate(${section.rotation}) scale(${section.scaleX}, ${section.scaleY})`"
    @mousedown.stop="handleSectionClick"
  >
    <!-- 区域背景（选中时显示） -->
    <rect
      v-if="isSelected"
      :x="bounds.x - 20"
      :y="bounds.y - 40"
      :width="bounds.width + 40"
      :height="bounds.height + 60"
      fill="rgba(33, 150, 243, 0.05)"
      stroke="#2196F3"
      stroke-width="1"
      stroke-dasharray="8 4"
      rx="8"
    />
    
    <!-- 区域名称 -->
    <g v-if="section.name" :transform="`translate(${bounds.x + bounds.width / 2}, ${bounds.y - 25})`">
      <rect
        x="-60"
        y="-12"
        width="120"
        height="24"
        rx="12"
        :fill="isSelected ? '#2196F3' : '#fff'"
        :stroke="isSelected ? '#2196F3' : '#ddd'"
        stroke-width="1"
      />
      <text
        y="4"
        text-anchor="middle"
        font-size="12"
        font-weight="500"
        :fill="isSelected ? '#fff' : '#333'"
        class="section-name-text"
      >
        {{ section.name }}
      </text>
    </g>
    
    <!-- 排列表 -->
    <SeatRow
      v-for="row in section.rows"
      :key="row.id"
      :row="row"
      :categories="categories"
      :show-label="showRowLabels"
      :show-seat-labels="showSeatLabels"
      @select-row="handleRowSelect"
      @select-seat="handleSeatSelect"
    />
  </g>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { Section, Category } from '../types'
import { useChartStore } from '../stores/chartStore'
import SeatRow from './SeatRow.vue'

interface Props {
  section: Section
  categories: Category[]
  showRowLabels?: boolean
  showSeatLabels?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  showRowLabels: true,
  showSeatLabels: true
})

const emit = defineEmits<{
  selectSection: [sectionId: string, additive: boolean]
  selectRow: [rowId: string, additive: boolean]
  selectSeat: [seatId: string, additive: boolean]
}>()

const store = useChartStore()

const isSelected = computed(() => 
  store.selectedSectionIds.includes(props.section.id)
)

// 计算区域的边界框
const bounds = computed(() => {
  if (props.section.rows.length === 0) {
    return { x: 0, y: 0, width: 100, height: 100 }
  }
  
  let minX = Infinity, minY = Infinity
  let maxX = -Infinity, maxY = -Infinity
  
  props.section.rows.forEach(row => {
    row.seats.forEach(seat => {
      minX = Math.min(minX, seat.x - seat.radius)
      minY = Math.min(minY, seat.y - seat.radius)
      maxX = Math.max(maxX, seat.x + seat.radius)
      maxY = Math.max(maxY, seat.y + seat.radius)
    })
  })
  
  return {
    x: minX === Infinity ? 0 : minX,
    y: minY === Infinity ? 0 : minY,
    width: minX === Infinity ? 100 : maxX - minX,
    height: minY === Infinity ? 100 : maxY - minY
  }
})

function handleSectionClick(e: MouseEvent) {
  // 只有点击区域背景时才选择区域
  if ((e.target as Element).tagName === 'g' || (e.target as Element).tagName === 'rect') {
    const additive = e.shiftKey || e.ctrlKey || e.metaKey
    emit('selectSection', props.section.id, additive)
  }
}

function handleRowSelect(rowId: string, additive: boolean) {
  emit('selectRow', rowId, additive)
}

function handleSeatSelect(seatId: string, additive: boolean) {
  emit('selectSeat', seatId, additive)
}
</script>

<style scoped>
.seat-section {
  cursor: pointer;
}

.section-name-text {
  pointer-events: none;
  user-select: none;
}
</style>
