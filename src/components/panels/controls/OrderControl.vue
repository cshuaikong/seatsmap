<template>
  <div class="order-control-wrapper">
    <!-- EN: Order -->
    <label class="input-label">层级</label>
    <div class="order-buttons">
      <button
        class="order-btn"
        @click="emit('bring-front')"
        title="置于顶层"
      >
        <Icon icon="lucide:arrow-up-to-line" class="order-icon" />
      </button>
      <button
        class="order-btn"
        @click="emit('send-back')"
        title="置于底层"
      >
        <Icon icon="lucide:arrow-down-to-line" class="order-icon" />
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Icon } from '@iconify/vue'

const emit = defineEmits<{
  'bring-front': []
  'send-back': []
}>()
</script>

<style scoped>
.order-control-wrapper {
  display: flex;
  align-items: center;
  gap: 12px;
}

.input-label {
  font-size: 12px;
  color: #666;
  min-width: 60px;
  flex-shrink: 0;
}

.order-buttons {
  display: flex;
  gap: 6px;
}

.order-btn {
  width: 28px;
  height: 28px;
  border: 1px solid #d0d0d0;
  border-radius: 4px;
  background: #fff;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #666;
  transition: all 0.15s ease;
  padding: 0;
}

.order-btn:hover {
  background: #f5f5f5;
  border-color: #aaa;
  color: #333;
}

.order-btn:active {
  background: #e8e8e8;
}

.order-icon {
  width: 14px;
  height: 14px;
}
</style>
