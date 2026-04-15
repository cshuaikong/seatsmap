<template>
  <div class="section-panel">
    <div class="panel-header">
      <Icon icon="lucide:layout-grid" class="panel-header-icon" />
      <span>分区属性</span>
    </div>

    <div class="panel-body" v-if="section">
      <!-- 分区名称 -->
      <div class="panel-row">
        <label class="panel-label">分区名称</label>
        <input
          class="panel-input"
          :value="section.name"
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
            @change="(e) => emit('update-property', 'borderFill', (e.target as HTMLInputElement).value)"
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
            :value="section.borderStroke || '#3b82f6'"
            @change="(e) => emit('update-property', 'borderStroke', (e.target as HTMLInputElement).value)"
          />
          <span class="color-value">{{ section.borderStroke || '#3b82f6' }}</span>
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
          :value="section.borderOpacity ?? 1"
          class="slider"
          @input="(e) => emit('update-property', 'borderOpacity', parseFloat((e.target as HTMLInputElement).value))"
        />
        <span class="slider-val">{{ Math.round((section.borderOpacity ?? 1) * 100) }}%</span>
      </div>

      <!-- 层级设置 -->
      <div class="panel-row">
        <label class="panel-label">层级</label>
        <input
          type="number"
          class="panel-input"
          :value="section.zIndex ?? 0"
          @change="(e) => emit('update-property', 'zIndex', parseInt((e.target as HTMLInputElement).value) || 0)"
          style="width: 80px;"
        />
        <span class="panel-hint">数值越大越在上层</span>
      </div>

      <!-- 只读设置 -->
      <div class="panel-row">
        <label class="panel-label">只读</label>
        <label class="checkbox-label">
          <input
            type="checkbox"
            :checked="section.readonly === true"
            @change="(e) => emit('update-property', 'readonly', (e.target as HTMLInputElement).checked)"
          />
          <span>禁止选中和编辑</span>
        </label>
      </div>

      <!-- 统计信息 -->
      <div class="panel-stats">
        <div class="stat-item">
          <Icon icon="lucide:vector-square" class="stat-icon" />
          <span>{{ borderTypeLabel }}</span>
        </div>
        <div class="stat-item">
          <Icon icon="lucide:rows-3" class="stat-icon" />
          <span>{{ section.rows.length }} 排</span>
        </div>
        <div class="stat-item">
          <Icon icon="lucide:armchair" class="stat-icon" />
          <span>{{ seatCount }} 座</span>
        </div>
      </div>

      <div v-if="section.borderType === 'path'" class="panel-note">
        <Icon icon="lucide:pen-tool" class="note-icon" />
        <span>当前走 path 数据</span>
      </div>

      <div v-if="section.borderType === 'path' && pathSegments.length" class="path-editor">
        <div class="path-editor-header">
          <Icon icon="lucide:spline-pointer" class="note-icon" />
          <span>边段编辑</span>
        </div>

        <div class="path-editor-tip">
          点画布边段可快速定位，弧度支持正负，0 就是直线
        </div>

        <div
          v-for="segment in pathSegments"
          :key="segment.pointIndex"
          class="path-segment-card"
          :class="{ active: activePointIndex === segment.pointIndex }"
          @click="activateSegment(segment.pointIndex)"
        >
          <div class="path-segment-top">
            <span class="segment-title">边 {{ segment.segmentIndex + 1 }}</span>
            <span class="segment-points">
              ({{ Math.round(segment.startPoint.x) }}, {{ Math.round(segment.startPoint.y) }}) →
              ({{ Math.round(segment.endPoint.x) }}, {{ Math.round(segment.endPoint.y) }})
            </span>
          </div>

          <div class="path-segment-actions">
            <button
              class="segment-mode-btn"
              :class="{ active: segment.type === 'line' }"
              @click.stop="updatePathPointType(segment.pointIndex, 'line')"
            >直线</button>
            <button
              class="segment-mode-btn"
              :class="{ active: segment.type === 'arc' }"
              @click.stop="updatePathPointType(segment.pointIndex, 'arc')"
            >弧线</button>
          </div>

          <div v-if="segment.type === 'arc'" class="segment-slider-row">
            <label class="panel-label compact">弧度</label>
            <input
              type="number"
              :value="segment.arcDepth"
              class="number-input"
              step="0.1"
              @input="updatePathPointArcDepth(segment.pointIndex, parseFloat(($event.target as HTMLInputElement).value))"
            />
            <input
              type="range"
              min="-2"
              max="2"
              step="0.05"
              :value="Math.max(-2, Math.min(2, segment.arcDepth))"
              class="slider"
              @input="updatePathPointArcDepth(segment.pointIndex, parseFloat(($event.target as HTMLInputElement).value))"
            />
          </div>

          <div v-if="segment.type === 'arc' && segment.isStraightPreview" class="path-editor-tip">
            当前是弧线模式，但弧度为 0，所以画面还是直线
          </div>
        </div>
      </div>

      <!-- 进入分区按钮 -->
      <button class="enter-section-btn" @click="emit('enter-section')">
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
import type { PathPoint, Section } from '../../types'

const props = defineProps<{
  section: Section | null
  activePointIndex?: number | null
}>()

const emit = defineEmits<{
  'update-property': [key: string, val: any]
  'enter-section': []
  'activate-path-segment': [pointIndex: number]
}>()

const activateSegment = (pointIndex: number) => {
  emit('activate-path-segment', pointIndex)
}

const updatePathPointType = (pointIndex: number, nextType: 'line' | 'arc') => {
  if (!props.section?.borderPathPoints) return
  const nextPoints: PathPoint[] = props.section.borderPathPoints.map((point, currentIndex) => {
    if (currentIndex !== pointIndex) return { ...point }
    return {
      ...point,
      type: nextType,
      arcDepth: nextType === 'arc' ? (point.arcDepth ?? 0) : 0
    }
  })
  emit('update-property', 'borderPathPoints', nextPoints)
}

const updatePathPointArcDepth = (pointIndex: number, nextDepth: number) => {
  if (!props.section?.borderPathPoints) return
  const nextPoints: PathPoint[] = props.section.borderPathPoints.map((point, currentIndex) => {
    if (currentIndex !== pointIndex) return { ...point }
    return {
      ...point,
      type: 'arc',
      arcDepth: nextDepth
    }
  })
  emit('update-property', 'borderPathPoints', nextPoints)
}

// 将带透明度的 rgba fill 转为纯色（用于 color input）
const solidFill = computed(() => {
  const f = props.section?.borderFill || '#3b82f6'
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

const seatCount = computed(() => {
  if (!props.section) return 0
  return props.section.rows.reduce((sum, row) => sum + row.seats.length, 0)
})

const borderTypeLabel = computed(() => {
  const type = props.section?.borderType
  if (type === 'path') return '路径分区'
  if (type === 'ellipse') return '椭圆分区'
  if (type === 'rect') return '矩形分区'
  if (type === 'polygon') return '多边形分区'
  return '普通分区'
})

const pathPoints = computed(() => props.section?.borderPathPoints || [])

const pathSegments = computed(() => {
  if (pathPoints.value.length < 2) return []

  return pathPoints.value.map((startPoint, pointIndex) => {
    const endPoint = pathPoints.value[(pointIndex + 1) % pathPoints.value.length]

    return {
      segmentIndex: pointIndex,
      pointIndex,
      startPoint,
      endPoint,
      type: startPoint.type ?? 'line',
      arcDepth: startPoint.arcDepth ?? 0,
      isStraightPreview: Math.abs(startPoint.arcDepth ?? 0) <= 0.0001
    }
  })
})
</script>

<style scoped>
.section-panel {
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
  gap: 12px;
  padding: 10px 12px;
  background: var(--color-bg-tertiary);
  border-radius: 8px;
  flex-wrap: wrap;
}

.panel-note {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 10px;
  border: 1px dashed var(--color-border);
  border-radius: 8px;
  font-size: 12px;
  color: var(--color-text-secondary);
}

.path-editor {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.path-editor-header {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  font-weight: 600;
  color: var(--color-text);
}

.path-editor-tip {
  font-size: 11px;
  color: var(--color-text-secondary);
}

.path-segment-card {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 10px;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  background: var(--color-bg-tertiary);
  cursor: pointer;
}

.path-segment-card.active {
  border-color: var(--color-accent);
  box-shadow: 0 0 0 1px color-mix(in srgb, var(--color-accent) 40%, transparent);
}

.path-segment-top {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.segment-title {
  font-size: 12px;
  font-weight: 600;
  color: var(--color-text);
}

.segment-points {
  font-size: 11px;
  color: var(--color-text-secondary);
  font-family: monospace;
}

.path-segment-actions {
  display: flex;
  gap: 8px;
}

.segment-mode-btn {
  flex: 1;
  height: 30px;
  border: 1px solid var(--color-border);
  border-radius: 6px;
  background: var(--color-bg);
  color: var(--color-text-secondary);
  font-size: 12px;
  cursor: pointer;
}

.segment-mode-btn.active {
  border-color: var(--color-accent);
  color: var(--color-accent);
}

.segment-mode-btn.disabled {
  opacity: 0.45;
}

.segment-slider-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.panel-label.compact {
  width: 36px;
}

.number-input {
  width: 60px;
  height: 28px;
  padding: 0 8px;
  border: 1px solid var(--color-border);
  border-radius: 4px;
  background: var(--color-bg);
  color: var(--color-text);
  font-size: 13px;
  text-align: center;
}

.number-input:focus {
  outline: none;
  border-color: var(--color-accent);
}

.note-icon {
  width: 14px;
  height: 14px;
  color: var(--color-accent);
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

.enter-section-btn {
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

.enter-section-btn:hover {
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

/* 复选框样式 */
.checkbox-label {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: var(--color-text);
  cursor: pointer;
}

.checkbox-label input[type="checkbox"] {
  width: 16px;
  height: 16px;
  cursor: pointer;
}

.panel-hint {
  font-size: 12px;
  color: var(--color-text-secondary);
  margin-left: 8px;
}
</style>
