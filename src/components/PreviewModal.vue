<template>
  <Teleport to="body">
    <Transition name="preview-fade">
      <div v-if="visible" class="preview-overlay" @click.self="onClose">
        <div class="preview-box">
          <div class="preview-topbar">
            <span class="preview-label">预览</span>
            <button class="close-btn" @click="onClose">
              <Icon icon="lucide:x" />
            </button>
          </div>
          <div class="preview-body">
            <SeatMapViewer
              :venue="venue"
              :selectable="true"
              v-model:selected-seat-ids="selectedSeats"
              @seat-click="onSeatClick"
              class="preview-viewer"
            />
          </div>
          <div class="preview-bottombar">
            {{ selectedSeats.length ? `已选 ${selectedSeats.length} 座` : '点击座位选择' }}
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

const emit = defineEmits<{ close: [] }>()

const selectedSeats = ref<string[]>([])
const hoveredSeat = ref<Seat | null>(null)

const onClose = () => {
  selectedSeats.value = []
  hoveredSeat.value = null
  emit('close')
}

const onSeatClick = (seat: Seat, _row: SeatRow, _section: Section) => {
  hoveredSeat.value = seat
}
</script>

<style scoped>
.preview-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.preview-box {
  width: 420px;
  max-width: 94vw;
  height: 780px;
  max-height: 90vh;
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 8px 40px rgba(0, 0, 0, 0.18);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.preview-topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  border-bottom: 1px solid #f0f0f0;
}

.preview-label {
  font-size: 14px;
  font-weight: 600;
  color: #333;
}

.close-btn {
  width: 28px;
  height: 28px;
  border: none;
  background: transparent;
  border-radius: 6px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #999;
  transition: all 0.15s;
}

.close-btn:hover {
  background: #f0f0f0;
  color: #333;
}

.preview-body {
  flex: 1;
  overflow: hidden;
}

.preview-viewer {
  width: 100%;
  height: 100%;
  border: none;
  background: #fafafa;
}

.preview-bottombar {
  padding: 10px 16px;
  border-top: 1px solid #f0f0f0;
  font-size: 13px;
  color: #999;
  text-align: center;
}

.preview-fade-enter-active,
.preview-fade-leave-active {
  transition: opacity 0.2s ease;
}

.preview-fade-enter-from,
.preview-fade-leave-to {
  opacity: 0;
}
</style>
