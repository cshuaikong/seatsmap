<template>
  <div class="demo-page">
    <!-- 顶部导航栏 -->
    <header class="demo-header">
      <div class="header-left">
        <h1 class="logo">座位图演示</h1>
        <span class="version">v1.0</span>
      </div>
      <div class="header-right">
        <button class="btn-back" @click="$router.push('/designer')">
          返回编辑器
        </button>
      </div>
    </header>

    <!-- 主内容区 -->
    <main class="demo-content">
      <PreviewModal 
        :visible="true"
        :venue="demoVenue"
        @close="$router.push('/designer')"
      />
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import PreviewModal from './PreviewModal.vue'
import type { VenueData } from '../types'

// 演示用的座位图数据
const demoVenue = ref<VenueData>({
  id: 'demo-venue',
  name: '演示场馆',
  venueType: 'WITH_SECTIONS',
  sections: [
    {
      id: 'section-1',
      name: 'A区',
      borderType: 'rect',
      borderX: 100,
      borderY: 100,
      borderWidth: 400,
      borderHeight: 300,
      borderFill: 'rgba(232, 93, 76, 0.1)',
      borderStroke: '#e85d4c',
      rows: [
        {
          id: 'row-1',
          label: 'A1',
          seats: Array.from({ length: 20 }, (_, i) => ({
            id: `seat-1-${i}`,
            label: `${i + 1}`,
            x: 120 + i * 25,
            y: 150,
            categoryKey: 'cat-1',
            status: 'available',
            objectType: 'seat' as const
          }))
        },
        {
          id: 'row-2',
          label: 'A2',
          seats: Array.from({ length: 20 }, (_, i) => ({
            id: `seat-2-${i}`,
            label: `${i + 1}`,
            x: 120 + i * 25,
            y: 200,
            categoryKey: 'cat-1',
            status: 'available',
            objectType: 'seat' as const
          }))
        },
        {
          id: 'row-3',
          label: 'A3',
          seats: Array.from({ length: 20 }, (_, i) => ({
            id: `seat-3-${i}`,
            label: `${i + 1}`,
            x: 120 + i * 25,
            y: 250,
            categoryKey: 'cat-1',
            status: 'available',
            objectType: 'seat' as const
          }))
        }
      ]
    },
    {
      id: 'section-2',
      name: 'B区',
      borderType: 'rect',
      borderX: 550,
      borderY: 100,
      borderWidth: 400,
      borderHeight: 300,
      borderFill: 'rgba(34, 165, 89, 0.1)',
      borderStroke: '#22a559',
      rows: [
        {
          id: 'row-4',
          label: 'B1',
          seats: Array.from({ length: 20 }, (_, i) => ({
            id: `seat-4-${i}`,
            label: `${i + 1}`,
            x: 570 + i * 25,
            y: 150,
            categoryKey: 'cat-2',
            status: 'available',
            objectType: 'seat' as const
          }))
        },
        {
          id: 'row-5',
          label: 'B2',
          seats: Array.from({ length: 20 }, (_, i) => ({
            id: `seat-5-${i}`,
            label: `${i + 1}`,
            x: 570 + i * 25,
            y: 200,
            categoryKey: 'cat-2',
            status: 'available',
            objectType: 'seat' as const
          }))
        }
      ]
    }
  ],
  categories: [
    { key: 'cat-1', label: 'VIP区', color: '#e85d4c' },
    { key: 'cat-2', label: '普通区', color: '#22a559' }
  ],
  baseScale: 1
})
</script>

<style scoped>
.demo-page {
  width: 100vw;
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: #faf9f7;
}

.demo-header {
  height: 64px;
  padding: 0 32px;
  background: #ffffff;
  border-bottom: 1px solid rgba(45, 42, 38, 0.08);
  display: flex;
  align-items: center;
  justify-content: space-between;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.header-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.logo {
  font-size: 20px;
  font-weight: 700;
  color: #2d2a26;
  margin: 0;
}

.version {
  padding: 4px 8px;
  background: rgba(232, 93, 76, 0.1);
  color: #e85d4c;
  font-size: 12px;
  font-weight: 600;
  border-radius: 4px;
}

.btn-back {
  padding: 8px 16px;
  background: #ffffff;
  color: #2d2a26;
  border: 1px solid rgba(45, 42, 38, 0.15);
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-back:hover {
  background: #faf9f7;
  border-color: rgba(45, 42, 38, 0.3);
}

.demo-content {
  flex: 1;
  position: relative;
  overflow: hidden;
}

/* 让 PreviewModal 占满整个内容区 */
.demo-content :deep(.preview-modal) {
  width: 100%;
  height: 100%;
  border-radius: 0;
  box-shadow: none;
}
</style>
