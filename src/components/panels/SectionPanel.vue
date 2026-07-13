<template>
  <div class="section-panel">
    <div class="panel-header">
      <div class="header-left">
        <Icon icon="lucide:layout-grid" class="panel-header-icon" />
        <span>{{ isMulti ? `批量编辑 (${selectedCount}个分区)` : '分区属性' }}</span>
        <span v-if="sectionTypeLabel" class="section-type-badge">{{ sectionTypeLabel }}</span>
      </div>
      <button
        v-if="!isMulti && section"
        class="header-edit-btn"
        title="进入分区编辑模式"
        @click="emit('enter-section')"
      >
        <Icon icon="lucide:pen-square" class="btn-icon" />
        编辑
      </button>
    </div>

    <div class="panel-body" v-if="section">
      <!-- 分区名称 - 单选时显示 -->
      <div class="panel-row" v-if="!isMulti">
        <label class="panel-label">分区名称</label>
        <input
          class="panel-input"
          :value="section.name"
          @change="(e) => emit('update-property', 'name', (e.target as HTMLInputElement).value)"
        />
      </div>

      <!-- 批量重命名 - 多选时显示 -->
      <div v-if="isMulti" class="batch-rename-section">
        <div class="batch-rename-row">
          <label class="panel-label">分区编号</label>
          <select v-model="namingFormat" class="format-select">
            <option value="number">1-2-3...</option>
            <option value="letter">A-B-C...</option>
          </select>
        </div>
        <div class="batch-rename-row">
          <label class="panel-label">起始编号</label>
          <input
            v-if="namingFormat === 'number'"
            v-model.number="nameStartNum"
            type="number"
            min="1"
            class="panel-input"
          />
          <input
            v-else
            :value="nameStartLetter"
            class="panel-input"
            placeholder="A"
            @input="onLetterInput"
          />
        </div>
        <div class="batch-rename-row">
          <label class="panel-label">方向</label>
          <button
            class="dir-toggle-btn"
            :title="namingAscending ? '正序' : '倒序'"
            @click="namingAscending = !namingAscending"
          >
            <Icon :icon="namingAscending ? 'lucide:arrow-up' : 'lucide:arrow-down'" class="btn-icon" />
            {{ namingAscending ? '正序' : '倒序' }}
          </button>
          <button class="batch-apply-btn" @click="applyBatchNaming">应用</button>
        </div>
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
            :value="section.stroke || '#3b82f6'"
            @change="(e) => emit('update-property', 'stroke', (e.target as HTMLInputElement).value)"
          />
          <span class="color-value">{{ section.stroke || '#3b82f6' }}</span>
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
          :value="section.opacity ?? 1"
          class="slider"
          @input="(e) => emit('update-property', 'opacity', parseFloat((e.target as HTMLInputElement).value))"
        />
        <span class="slider-val">{{ Math.round((section.opacity ?? 1) * 100) }}%</span>
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
          <span>{{ isMulti ? `${selectedCount} 个分区` : sectionTypeLabel }}</span>
        </div>
        <div class="stat-item" v-if="!isMulti">
          <Icon icon="lucide:rows-3" class="stat-icon" />
          <span>{{ section.rows.length }} 排</span>
        </div>
        <div class="stat-item" v-if="isMulti">
          <Icon icon="lucide:rows-3" class="stat-icon" />
          <span>{{ totalRowCount }} 排</span>
        </div>
        <div class="stat-item">
          <Icon icon="lucide:armchair" class="stat-icon" />
          <span>{{ totalSeatCount }} 座</span>
        </div>
      </div>

      <!-- 座位分类属性 -->
      <div v-if="sectionCategories.length > 0" class="categories-section">
        <div class="section-label">座位分类</div>
        <div
          v-for="cat in sectionCategories"
          :key="cat.key"
          class="category-row"
        >
          <div class="category-left">
            <input
              type="color"
              class="color-swatch small"
              :value="cat.color"
              @change="(e) => onCategoryColorChange(cat.key, (e.target as HTMLInputElement).value)"
              title="修改分类颜色，所有同分类座位同步更新"
            />
            <span class="category-label">{{ cat.label }}</span>
          </div>
          <span class="category-count">{{ cat.seatCount }} 座</span>
        </div>
      </div>

      <div v-if="section.type === 'path' && pathSegments.length && !isMulti" class="path-editor">
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

    </div>

    <div v-else class="panel-empty">
      未选中分区
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { Icon } from '@iconify/vue'
import type { PathPoint, Section } from '../../types'
import { useVenueDataStore } from '../../stores/venueDataStore'

const props = defineProps<{
  section: Section | null
  activePointIndex?: number | null
  isMulti?: boolean  // 是否多选模式
  selectedCount?: number  // 选中的分区数量
  selectedSections?: Section[]  // 所有选中的分区
  vertexEditActive?: boolean  // 是否处于顶点编辑模式
}>()

const emit = defineEmits<{
  'update-property': [key: string, val: any]
  'enter-section': []
  'activate-path-segment': [pointIndex: number]
  'batch-update-names': [names: string[]]  // 批量更新名称
  'toggle-vertex-edit': []
}>()

// 批量重命名 — seats.io 风格：数字 123 / 字母 ABC，可设起始值，正序/倒序
const namingFormat = ref<'number' | 'letter'>('number')
const nameStartNum = ref(1)
const nameStartLetter = ref('A')
const namingAscending = ref(true)

function numberToLetters(n: number): string {
  let result = ''
  let num = n
  while (num > 0) {
    num--
    result = String.fromCharCode(65 + (num % 26)) + result
    num = Math.floor(num / 26)
  }
  return result
}

function lettersToNumber(s: string): number {
  let result = 0
  for (let i = 0; i < s.length; i++) {
    result = result * 26 + (s.charCodeAt(i) - 64)
  }
  return result
}

function resolveName(index: number): string {
  if (namingFormat.value === 'number') {
    const n = namingAscending.value ? nameStartNum.value + index : nameStartNum.value - index
    return String(Math.max(1, n))
  } else {
    const letterNum = lettersToNumber(nameStartLetter.value)
    const n = namingAscending.value ? letterNum + index : letterNum - index
    return numberToLetters(Math.max(1, n))
  }
}

function applyBatchNaming(): void {
  if (!props.selectedSections || props.selectedSections.length === 0) return
  const names = props.selectedSections.map((_, i) => resolveName(i))
  emit('batch-update-names', names)
}

function onLetterInput(e: Event): void {
  const val = (e.target as HTMLInputElement).value.toUpperCase().replace(/[^A-Z]/g, '')
  nameStartLetter.value = val || 'A'
}

const activateSegment = (pointIndex: number) => {
  emit('activate-path-segment', pointIndex)
}

const updatePathPointType = (pointIndex: number, nextType: 'line' | 'arc') => {
  if (!props.section?.pathPoints) return
  const nextPoints: PathPoint[] = props.section.pathPoints.map((point, currentIndex) => {
    if (currentIndex !== pointIndex) return { ...point }
    return {
      ...point,
      type: nextType,
      arcDepth: nextType === 'arc' ? (point.arcDepth ?? 0) : 0
    }
  })
  emit('update-property', 'pathPoints', nextPoints)
}

const updatePathPointArcDepth = (pointIndex: number, nextDepth: number) => {
  if (!props.section?.pathPoints) return
  const nextPoints: PathPoint[] = props.section.pathPoints.map((point, currentIndex) => {
    if (currentIndex !== pointIndex) return { ...point }
    return {
      ...point,
      type: 'arc',
      arcDepth: nextDepth
    }
  })
  emit('update-property', 'pathPoints', nextPoints)
}

// 将带透明度的 rgba fill 转为纯色（用于 color input）
const solidFill = computed(() => {
  const f = props.section?.fill || '#3b82f6'
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

const venueDataStore = useVenueDataStore()

const seatCount = computed(() => {
  if (!props.section) return 0
  return props.section.rows.reduce((sum, row) => sum + row.seats.length, 0)
})

const totalSeatCount = computed(() => {
  if (props.isMulti && props.selectedSections) {
    return props.selectedSections.reduce((sum, s) =>
      sum + s.rows.reduce((rSum, r) => rSum + r.seats.length, 0), 0)
  }
  return seatCount.value
})

const totalRowCount = computed(() => {
  if (props.isMulti && props.selectedSections) {
    return props.selectedSections.reduce((sum, s) => sum + s.rows.length, 0)
  }
  return props.section?.rows.length ?? 0
})

/** 提取选中分区内所有唯一的座位分类，含 label/color/seatCount */
const sectionCategories = computed(() => {
  const sections = props.isMulti && props.selectedSections
    ? props.selectedSections
    : (props.section ? [props.section] : [])

  const categoryMap = new Map<string, { key: string; label: string; color: string; seatCount: number }>()

  for (const section of sections) {
    for (const row of section.rows) {
      for (const seat of row.seats) {
        const key = String(seat.categoryKey ?? 1)
        const existing = categoryMap.get(key)
        if (existing) {
          existing.seatCount++
        } else {
          categoryMap.set(key, { key, label: '', color: '#A5D6A7', seatCount: 1 })
        }
      }
    }
  }

  // 从 venueStore 补全 label / color
  const storeCategories = venueDataStore.venue.categories ?? []
  for (const cat of categoryMap.values()) {
    const storeCat = storeCategories.find(c => String(c.key) === cat.key)
    if (storeCat) {
      cat.label = storeCat.label
      cat.color = storeCat.color
    } else {
      cat.label = `分类 ${cat.key}`
    }
  }

  return Array.from(categoryMap.values())
})

function onCategoryColorChange(key: string, color: string): void {
  venueDataStore.updateCategory(key, { color })
}

const sectionTypeLabel = computed(() => {
  const type = props.section?.type
  if (type === 'path') return ''
  if (type === 'ellipse') return '椭圆分区'
  if (type === 'rect') return '矩形分区'
  return '普通分区'
})

const pathPoints = computed(() => props.section?.pathPoints || [])

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
  justify-content: space-between;
  gap: 8px;
  padding: 12px 16px 10px;
  font-size: 13px;
  font-weight: 600;
  color: var(--color-text);
  border-bottom: 1px solid var(--color-border);
}

.header-left {
  display: flex;
  align-items: center;
  gap: 8px;
}

.header-edit-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  font-size: 12px;
  font-weight: 500;
  background: var(--color-accent);
  color: #fff;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  white-space: nowrap;
  flex-shrink: 0;
}
.header-edit-btn:hover {
  opacity: 0.9;
}
.header-edit-btn .btn-icon {
  width: 14px;
  height: 14px;
}

.panel-header-icon {
  width: 15px;
  height: 15px;
  color: var(--color-accent);
}

.section-type-badge {
  margin-left: 6px;
  padding: 2px 8px;
  font-size: 11px;
  font-weight: 500;
  color: var(--color-text-secondary, #64748b);
  background: var(--color-bg-tertiary, #f1f5f9);
  border-radius: 4px;
  white-space: nowrap;
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

.vertex-edit-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100%;
  padding: 10px;
  border: 1.5px solid #3b82f6;
  border-radius: 8px;
  background: transparent;
  color: #3b82f6;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  margin-bottom: 8px;
}

.vertex-edit-btn.active {
  background: #3b82f6;
  color: white;
}

.vertex-edit-btn:hover {
  opacity: 0.85;
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

/* 批量重命名样式 */
.batch-rename-section {
  background: var(--color-bg-tertiary);
  border-radius: 8px;
  padding: 12px;
  margin-bottom: 8px;
}

.batch-rename-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.batch-rename-row:last-child {
  margin-bottom: 0;
}

.batch-rename-row .panel-label {
  flex-shrink: 0;
}

.format-select {
  padding: 5px 6px;
  font-size: 12px;
  font-weight: 600;
  border: 1px solid var(--color-border);
  border-radius: 6px;
  background: var(--color-bg);
  color: var(--color-text);
  outline: none;
  cursor: pointer;
  width: 56px;
}

.format-select:focus {
  border-color: var(--color-accent);
}

.dir-toggle-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 5px 10px;
  border: 1px solid var(--color-border);
  border-radius: 6px;
  background: var(--color-bg);
  color: var(--color-text-secondary);
  font-size: 12px;
  cursor: pointer;
  transition: all 0.15s;
}

.dir-toggle-btn:hover {
  border-color: var(--color-accent);
  color: var(--color-accent);
}

.dir-toggle-btn .btn-icon {
  width: 14px;
  height: 14px;
}

.batch-apply-btn {
  padding: 5px 14px;
  border: none;
  border-radius: 6px;
  background: var(--color-accent);
  color: white;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  margin-left: auto;
}

.batch-apply-btn:hover {
  opacity: 0.9;
}

/* 座位分类 */
.categories-section {
  background: var(--color-bg-tertiary);
  border-radius: 8px;
  padding: 12px;
}

.section-label {
  font-size: 12px;
  font-weight: 600;
  color: var(--color-text-secondary);
  margin-bottom: 8px;
}

.category-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 6px 0;
}

.category-row + .category-row {
  border-top: 1px solid var(--color-border);
}

.category-left {
  display: flex;
  align-items: center;
  gap: 8px;
}

.color-swatch.small {
  width: 22px;
  height: 22px;
}

.category-label {
  font-size: 13px;
  color: var(--color-text);
}

.category-count {
  font-size: 12px;
  color: var(--color-text-secondary);
  white-space: nowrap;
}
</style>
