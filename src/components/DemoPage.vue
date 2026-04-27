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
      <!-- 加载状态 -->
      <div v-if="loading" class="loading-state">
        <div class="loading-spinner"></div>
        <p>正在加载座位图数据...</p>
      </div>

      <!-- 错误状态 -->
      <div v-else-if="error" class="error-state">
        <p class="error-message">{{ error }}</p>
        <button class="btn-retry" @click="reload">重新加载</button>
      </div>

      <!-- 座位图预览 -->
      <PreviewModal 
        v-else-if="demoVenue"
        :visible="true"
        :venue="demoVenue"
        @close="$router.push('/designer')"
      />
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import PreviewModal from './PreviewModal.vue'
import type { VenueData } from '../types'

const demoVenue = ref<VenueData | null>(null)
const loading = ref(true)
const error = ref<string | null>(null)

// 从 JSON 文件加载数据
onMounted(async () => {
  try {
    // 使用分区座位数据
    const response = await fetch('/static/分区座位 全.json')
    if (!response.ok) {
      throw new Error('数据加载失败')
    }
    const data = await response.json()
    demoVenue.value = data
    loading.value = false
  } catch (err) {
    error.value = err instanceof Error ? err.message : '未知错误'
    loading.value = false
    console.error('加载座位图数据失败:', err)
  }
})

// 重新加载
const reload = () => {
  window.location.reload()
}
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

/* 加载状态 */
.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  gap: 16px;
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 3px solid rgba(232, 93, 76, 0.2);
  border-top-color: #e85d4c;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.loading-state p {
  font-size: 14px;
  color: #5c5854;
}

/* 错误状态 */
.error-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  gap: 16px;
}

.error-message {
  font-size: 14px;
  color: #ef4444;
}

.btn-retry {
  padding: 8px 16px;
  background: #e85d4c;
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-retry:hover {
  background: #f06b5a;
}
</style>
