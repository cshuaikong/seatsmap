<template>
  <div class="zone-panel">
    <div class="panel-header">
      <Icon icon="lucide:layout-grid" class="panel-header-icon" />
      <span>分区属性</span>
    </div>

    <div class="panel-body" v-if="zone">
      <!-- 分区名称 -->
      <div class="panel-row">
        <label class="panel-label">分区名称</label>
        <input
          class="panel-input"
          :value="zone.name"
          @change="(e) => emit('update-property', 'name', (e.target as HTMLInputElement).value)"
        />
      </div>

      <!-- 填充色 -->
      <div class="panel-row">
        <label class="panel-label">填充色</label>
        <div class="color-row">
          <input
            type="color"
            class="color-swatch"
            :value="solidFill"
            @change="(e) => emit('update-property', 'fill', (e.target as HTMLInputElement).value)"
          />
          <span class="color-value">{{ solidFill }}</span>
        </div>
      </div>

      <!-- 描边色 -->
      <div class="panel-row">
        <label class="panel-label">描边色</label>
        <div class="color-row">
          <input
            type="color"
            class="color-swatch"
            :value="zone.stroke || '#3b82f6'"
            @change="(e) => emit('update-property', 'stroke', (e.target as HTMLInputElement).value)"
          />
          <span class="color-value">{{ zone.stroke || '#3b82f6' }}</span>
        </div>
      </div>

      <!-- 透明度 -->
      <div class="panel-row">
        <label class="panel-label">透明度</label>
        <input
          type="range"
          min="0"
          max="1"
          step="0.05"
          :value="zone.opacity ?? 1"
          class="slider"
          @input="(e) => emit('update-property', 'opacity', parseFloat((e.target as HTMLInputElement).value))"
        />
        <span class="slider-val">{{ Math.round((zone.opacity ?? 1) * 100) }}%</span>
      </div>

      <!-- 统计信息 -->
      <div class="panel-stats">
        <div class="stat-item">
          <Icon icon="lucide:rows-3" class="stat-icon" />
          <span>{{ rowCount }} 排</span>
        </div>
        <div class="stat-item">
          <Icon icon="lucide:armchair" class="stat-icon" />
          <span>{{ seatCount }} 座</span>
        </div>
      </div>

      <!-- 进入分区按钮 -->
      <button class="enter-zone-btn" @click="emit('enter-zone')">
        <Icon icon="lucide:zoom-in" class="btn-icon" />
        进入分区编辑
      </button>
    </div>

    <div v-else class="panel-empty">
      未选中分区
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Icon } from '@iconify/vue'
import type { Zone } from '../../types'
import { useVenueStore } from '../../stores/venueStore'

const props = defineProps<{
  zone: Zone | null
}>()

const emit = defineEmits<{
  'update-property': [key: string, val: any]
  'enter-zone': []
}>()

const venueStore = useVenueStore()

// 将带透明度的 rgba fill 转为纯色（用于 color input）
const solidFill = computed(() => {
  const f = props.zone?.fill || '#3b82f6'
  // 如果是 rgba，取前三通道近似转换
  if (f.startsWith('rgba')) {
    const match = f.match(/rgba\((\d+),\s*(\d+),\s*(\d+)/)
    if (match) {
      const r = parseInt(match[1]).toString(16).padStart(2, '0')
      const g = parseInt(match[2]).toString(16).padStart(2, '0')
      const b = parseInt(match[3]).toString(16).padStart(2, '0')
      return `#${r}${g}${b}`
    }
  }
  return f
})

const rowCount = computed(() => {
  if (!props.zone) return 0
  const section = venueStore.venue.sections.find(s => s.zoneId === props.zone!.id)
  return section?.rows.length ?? 0
})

const seatCount = computed(() => {
  if (!props.zone) return 0
  const section = venueStore.venue.sections.find(s => s.zoneId === props.zone!.id)
  if (!section) return 0
  return section.rows.reduce((sum, row) => sum + row.seats.length, 0)
})
</script>

<style scoped>
.zone-panel {
  padding: 0;
}

.panel-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px 10px;
  font-size: 13px;
  font-weight: 600;
  color: var(--color-text);
  border-bottom: 1px solid var(--color-border);
}

.panel-header-icon {
  width: 15px;
  height: 15px;
  color: var(--color-accent);
}

.panel-body {
  padding: 12px 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.panel-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.panel-label {
  font-size: 12px;
  color: var(--color-text-secondary);
  width: 60px;
  flex-shrink: 0;
}

.panel-input {
  flex: 1;
  padding: 5px 8px;
  font-size: 13px;
  border: 1px solid var(--color-border);
  border-radius: 6px;
  background: var(--color-bg);
  color: var(--color-text);
  outline: none;
}

.panel-input:focus {
  border-color: var(--color-accent);
}

.color-row {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
}

.color-swatch {
  width: 28px;
  height: 28px;
  border: 1px solid var(--color-border);
  border-radius: 6px;
  cursor: pointer;
  padding: 2px;
  background: none;
}

.color-value {
  font-size: 12px;
  color: var(--color-text-secondary);
  font-family: monospace;
}

.slider {
  flex: 1;
  accent-color: var(--color-accent);
}

.slider-val {
  font-size: 12px;
  color: var(--color-text-secondary);
  width: 34px;
  text-align: right;
}

.panel-stats {
  display: flex;
  gap: 16px;
  padding: 10px 12px;
  background: var(--color-bg-tertiary);
  border-radius: 8px;
}

.stat-item {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: var(--color-text-secondary);
}

.stat-icon {
  width: 14px;
  height: 14px;
  color: var(--color-accent);
}

.enter-zone-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100%;
  padding: 10px;
  border: none;
  border-radius: 8px;
  background: var(--color-accent);
  color: white;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.enter-zone-btn:hover {
  opacity: 0.9;
  transform: translateY(-1px);
}

.btn-icon {
  width: 15px;
  height: 15px;
}

.panel-empty {
  padding: 24px 16px;
  text-align: center;
  font-size: 13px;
  color: var(--color-text-secondary);
}
</style>
