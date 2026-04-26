<template>
  <Teleport to="body">
    <Transition name="preview-fade">
      <div v-if="visible" class="preview-modal-overlay" @click.self="onClose">
        <div class="preview-modal">
          <!-- 头部 -->
          <div class="preview-header">
            <button class="close-btn" @click="onClose">
              <Icon icon="lucide:x" class="close-icon" />
            </button>
            <h3 class="preview-title">Preview</h3>
          </div>

          <!-- 预览内容 -->
          <div class="preview-content" v-if="visible">
            <SeatMapViewer
              :venue="venue"
              :selectable="true"
              v-model:selected-seat-ids="selectedSeats"
              @seat-click="onSeatClick"
              class="preview-viewer"
            />
          </div>

          <!-- 底部信息 -->
          <div class="preview-footer">
            <div class="selected-count">
              已选择 {{ selectedSeats.length }} 个座位
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { Icon } from '@iconify/vue'
import SeatMapViewer from './SeatMapViewer.vue'
import type { VenueData, Seat, SeatRow, Section } from '../types'

const props = defineProps<{
  visible: boolean
  venue: VenueData
}>()

const emit = defineEmits<{
  close: []
}>()

const selectedSeats = ref<string[]>([])
const hoveredSeat = ref<Seat | null>(null)

// 关闭预览
const onClose = () => {
  selectedSeats.value = []
  hoveredSeat.value = null
  emit('close')
}

// 获取分类名称
const getCategoryLabel = (key: string | number): string => {
  const category = props.venue.categories.find(c => c.key === key)
  return category?.label || '未分类'
}

// 座位点击 - 只更新悬停状态，选择逻辑由 SeatMapViewer 处理
const onSeatClick = (seat: Seat, row: SeatRow, section: Section) => {
  hoveredSeat.value = seat
}
</script>

<style scoped>
.preview-modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 20px;
}

.preview-modal {
  background: white;
  border-radius: 16px;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
  width: 90vw;
  max-width: 1200px;
  height: 85vh;
  max-height: 900px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.preview-header {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px 20px;
  border-bottom: 1px solid #e5e5e5;
  position: relative;
}

.close-btn {
  position: absolute;
  left: 16px;
  width: 32px;
  height: 32px;
  border: none;
  background: #f5f5f5;
  border-radius: 8px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.close-btn:hover {
  background: #e0e0e0;
}

.close-icon {
  width: 18px;
  height: 18px;
  color: #666;
}

.preview-title {
  font-size: 16px;
  font-weight: 600;
  color: #333;
  margin: 0;
}

.preview-content {
  flex: 1;
  padding: 40px;
  overflow: auto;
  display: flex;
  justify-content: center;
  align-items: center;
  position: relative;
  /* 设计师风格网格底纹 */
  background-color: #f8fafc;
  background-image: 
    radial-gradient(#e2e8f0 1px, transparent 1px),
    linear-gradient(to right, #f1f5f9 1px, transparent 1px),
    linear-gradient(to bottom, #f1f5f9 1px, transparent 1px);
  background-size: 20px 20px, 40px 40px, 40px 40px;
}

.preview-viewer {
  width: 100%;
  height: 100%;
  border: none !important;
  background: transparent;
  border-radius: 12px;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
  cursor: grab;
}

.preview-viewer:active {
  cursor: grabbing;
}

.preview-footer {
  padding: 16px 24px;
  border-top: 1px solid #f1f5f9;
  background: white;
  min-height: 48px;
  display: flex;
  align-items: center;
  font-family: system-ui, -apple-system, sans-serif;
}

.seat-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.seat-label {
  font-weight: 600;
  color: #333;
}

.seat-category {
  color: #666;
  font-size: 13px;
}

.selected-count {
  color: #666;
  font-size: 14px;
}

/* 过渡动画 */
.preview-fade-enter-active,
.preview-fade-leave-active {
  transition: opacity 0.3s ease;
}

.preview-fade-enter-from,
.preview-fade-leave-to {
  opacity: 0;
}

.preview-fade-enter-active .preview-modal,
.preview-fade-leave-active .preview-modal {
  transition: transform 0.3s ease, opacity 0.3s ease;
}

.preview-fade-enter-from .preview-modal,
.preview-fade-leave-to .preview-modal {
  transform: scale(0.95);
  opacity: 0;
}
</style>
