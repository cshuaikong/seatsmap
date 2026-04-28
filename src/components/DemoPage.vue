<template>
  <div class="demo-page">
    <!-- 顶部导航栏 -->
    <header class="demo-header">
      <div class="header-left">
        <h1 class="logo">座位图演示</h1>
        <span class="version">v1.0</span>
      </div>
      <div class="header-right">
        <!-- 已选座位计数（移动端显示） -->
        <div v-if="selectedSeats.length > 0" class="selected-badge">
          已选 {{ selectedSeats.length }} 个
        </div>
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

      <!-- 座位图 -->
      <div v-else-if="demoVenue" class="viewer-wrapper">
        <SeatMapViewer
          ref="seatMapViewerRef"
          :venue="demoVenue"
          :selectable="true"
          v-model:selected-seat-ids="selectedSeats"
          class="demo-viewer"
        />
        
        <!-- Minimap 小地图 -->
        <Minimap 
          v-if="seatMapViewerRef" 
          :seat-map-viewer="seatMapViewerRef"
          :venue="demoVenue"
          class="minimap-container"
        />
      </div>
    </main>

    <!-- 底部选中座位列表 -->
    <Transition name="slide-up">
      <div v-if="selectedSeats.length > 0" class="selected-seats-panel">
        <div class="panel-header">
          <h3>已选座位 ({{ selectedSeats.length }})</h3>
          <button class="btn-clear" @click="clearSelectedSeats">清空</button>
        </div>
        <div class="seats-list">
          <div 
            v-for="seatInfo in selectedSeatDetails" 
            :key="seatInfo.id"
            class="seat-item"
          >
            <!-- 左上角分类标签 -->
            <span class="seat-category-badge" :style="{ background: seatInfo.color }">
              {{ seatInfo.category }}
            </span>
            
            <!-- 座位信息 -->
            <div class="seat-info">
              <div class="seat-location">
                {{ seatInfo.section }}-{{ seatInfo.row }}-{{ seatInfo.label }}
              </div>
              <div class="seat-price">
                ￥{{ seatInfo.price }}
              </div>
            </div>
          </div>
        </div>
        
        <!-- 总价和支付按钮 -->
        <div class="panel-footer">
          <div class="price-info">
            <span class="price-label">合计</span>
            <span class="price-value">￥{{ totalPrice }}</span>
          </div>
          <button class="btn-pay" @click="handlePayment">
            立即支付
          </button>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import SeatMapViewer from './SeatMapViewer.vue'
import Minimap from './Minimap.vue'
import { useVenueStore } from '../stores/venueStore'
import type { VenueData, Seat, SeatRow, Section } from '../types'

const seatMapViewerRef = ref<InstanceType<typeof SeatMapViewer>>()
const demoVenue = ref<VenueData | null>(null)
const selectedSeats = ref<string[]>([])
const loading = ref(true)
const error = ref<string | null>(null)

// 计算属性：获取选中座位的详细信息
const selectedSeatDetails = computed(() => {
  if (!demoVenue.value) return []
  
  const details: Array<{
    id: string
    label: string
    row: string  // 添加排信息
    section: string  // 添加分区信息
    category: string
    color: string
    price: number  // 添加价格
  }> = []
  
  // 遍历所有分区和排，查找选中的座位
  demoVenue.value.sections.forEach(section => {
    section.rows?.forEach(row => {
      row.seats?.forEach(seat => {
        if (selectedSeats.value.includes(seat.id)) {
          // 查找座位的 category（类型兼容：string vs number）
          const category = demoVenue.value!.categories.find(
            cat => String(cat.key) === String(seat.categoryKey)
          )
          
          const categoryName = category?.label || '未分类'
          // 从分类数据中读取价格，如果未设置则默认为 0
          const price = category?.price ?? 0
          
          details.push({
            id: seat.id,
            label: seat.label || '无编号',
            row: row.label || '无排号',
            section: section.name || '未命名分区',
            category: categoryName,
            color: category?.color || '#999',
            price: price
          })
        }
      })
    })
  })
  
  return details
})

// 计算总价
const totalPrice = computed(() => {
  return selectedSeatDetails.value.reduce((sum, seat) => sum + seat.price, 0)
})

// 处理支付
const handlePayment = () => {
  const seatCount = selectedSeats.value.length
  const total = totalPrice.value
  
  alert(`订单信息：
座位数：${seatCount} 个
总价：￥${total}

（这是演示功能，实际支付需要接入支付系统）`)
}

// 清空选中座位（性能优化）
const clearSelectedSeats = () => {
  // 调用 SeatMapViewer 的高效清空方法
  if (seatMapViewerRef.value?.clearAllSelection) {
    seatMapViewerRef.value.clearAllSelection()
  }
  
  // 快速清空数组
  selectedSeats.value = []
}

// 从 JSON 文件加载数据
onMounted(async () => {
  try {
    console.log('开始加载座位图数据...')
    // 使用分区座位数据
    const response = await fetch('/分区座位 全.json')
    console.log('响应状态:', response.status)
    
    if (!response.ok) {
      throw new Error(`HTTP 错误: ${response.status} ${response.statusText}`)
    }
    
    const jsonData = await response.json()
    console.log('JSON 数据 keys:', Object.keys(jsonData))
    
    // 数据结构是 { version, exportTime, venue }，需要提取 venue
    const data = jsonData.venue || jsonData
    console.log('座位图数据:', data)
    console.log('座位图数据 keys:', Object.keys(data))
    
    // 【关键】同步 visualConfig 到 store
    const store = useVenueStore()
    if ((data as any).visualConfig) {
      store.visualConfig = (data as any).visualConfig
      console.log('已同步 visualConfig:', (data as any).visualConfig)
    }
    
    // 【关键】同步 baseScale 到 venue
    if (data.baseScale) {
      data.baseScale = (data as any).baseScale
      console.log('已设置 baseScale:', data.baseScale)
    }
    
    demoVenue.value = data
    loading.value = false
  } catch (err) {
    console.error('加载座位图数据失败:', err)
    error.value = err instanceof Error ? err.message : '未知错误'
    loading.value = false
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

.header-right {
  display: flex;
  align-items: center;
  gap: 12px;
}

/* 已选座位徽章 */
.selected-badge {
  padding: 6px 12px;
  background: #e85d4c;
  color: white;
  border-radius: 20px;
  font-size: 14px;
  font-weight: 600;
}

/* 座位图容器 */
.demo-content {
  flex: 1;
  position: relative;
  overflow: hidden;
}

/* 座位图容器 */
.viewer-wrapper {
  width: 100%;
  height: 100%;
  position: relative;
}

/* Minimap 容器定位 */
.minimap-container {
  position: absolute;
  top: 16px;
  right: 16px;
  z-index: 10;
}

/* SeatMapViewer 样式，与 PreviewModal 一致 */
.demo-viewer {
  width: 100%;
  height: 100%;
  border: none !important;
  background: transparent;
  cursor: grab;
}

.demo-viewer:active {
  cursor: grabbing;
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

/* 底部选中座位列表面板 */
.selected-seats-panel {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background: white;
  border-top: 1px solid rgba(45, 42, 38, 0.08);
  box-shadow: 0 -4px 12px rgba(0, 0, 0, 0.1);
  max-height: 40vh;
  display: flex;
  flex-direction: column;
  z-index: 100;
}

.panel-header {
  padding: 16px 24px;
  border-bottom: 1px solid rgba(45, 42, 38, 0.08);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.panel-header h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: #2d2a26;
}

.btn-clear {
  padding: 6px 12px;
  background: transparent;
  color: #e85d4c;
  border: 1px solid #e85d4c;
  border-radius: 4px;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-clear:hover {
  background: #e85d4c;
  color: white;
}

/* 移动端适配 */
@media (max-width: 768px) {
  .selected-seats-panel {
    max-height: 50vh;
  }
  
  .panel-header {
    padding: 12px 16px;
  }
  
  .panel-header h3 {
    font-size: 15px;
  }
  
  .seats-list {
    padding: 12px 16px;
    gap: 8px;
  }
  
  .seat-item {
    padding: 10px 12px;
  }
  
  .seat-full-label {
    font-size: 13px;
  }
  
  .seat-item {
    padding: 8px 10px;
  }
  
  .seat-category-badge {
    font-size: 9px;
    padding: 2px 6px;
  }
  
  .seat-location {
    font-size: 12px;
  }
  
  .seat-price {
    font-size: 13px;
  }
  
  .panel-footer {
    padding: 12px 16px;
    flex-direction: row;  /* 改为横向布局 */
    gap: 12px;
  }
  
  .price-info {
    width: auto;  /* 不再占满宽度 */
    justify-content: flex-start;  /* 左对齐 */
  }
  
  .price-label {
    font-size: 13px;
  }
  
  .price-value {
    font-size: 20px;  /* 稍微缩小 */
  }
  
  .btn-pay {
    width: auto;  /* 改为自适应宽度 */
    padding: 10px 24px;  /* 调整内边距 */
    font-size: 14px;
    white-space: nowrap;  /* 不换行 */
  }
}

.seats-list {
  padding: 16px 24px;
  overflow-y: auto;
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  max-height: calc(40vh - 120px);  /* 减去 footer 高度 */
}

/* 底部总价和支付 */
.panel-footer {
  padding: 16px 24px;
  border-top: 1px solid rgba(45, 42, 38, 0.08);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  background: white;
}

.price-info {
  display: flex;
  align-items: baseline;
  gap: 8px;
}

.price-label {
  font-size: 14px;
  color: #666;
}

.price-value {
  font-size: 24px;
  font-weight: 700;
  color: #e74c3c;
}

.btn-pay {
  padding: 12px 32px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s;
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
}

.btn-pay:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(102, 126, 234, 0.4);
}

.btn-pay:active {
  transform: translateY(0);
}

.seat-item {
  display: flex;
  align-items: stretch;
  position: relative;
  padding: 10px 10px 10px 10px;
  background: #faf9f7;
  border-radius: 8px;
  border: 1px solid rgba(45, 42, 38, 0.08);
  min-width: 120px;
  max-width: 160px;
}

/* 左上角分类标签 */
.seat-category-badge {
  position: absolute;
  top: 0;
  left: 0;
  padding: 3px 8px;
  border-radius: 8px 0 8px 0;
  color: white;
  font-size: 10px;
  font-weight: 600;
  white-space: nowrap;
  line-height: 1;
}

.seat-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-top: 6px;  /* 给分类标签留空间 */
  align-items: center;  /* 左右居中 */
  text-align: center;   /* 文字居中 */
}

.seat-location {
  font-size: 13px;
  font-weight: 600;
  color: #2d2a26;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.seat-price {
  font-size: 14px;
  font-weight: 700;
  color: #e74c3c;
}

/* 滑入动画 */
.slide-up-enter-active,
.slide-up-leave-active {
  transition: transform 0.3s ease;
}

.slide-up-enter-from,
.slide-up-leave-to {
  transform: translateY(100%);
}

/* 响应式布局 - 手机端 */
@media (max-width: 768px) {
  .demo-header {
    padding: 0 16px;
    height: 56px;
  }
  
  .logo {
    font-size: 18px;
  }
  
  .version {
    display: none;
  }
  
  .btn-back {
    padding: 6px 12px;
    font-size: 13px;
  }
  
  .selected-badge {
    padding: 4px 10px;
    font-size: 13px;
  }
  
  .minimap-container {
    top: 8px;
    right: 8px;
  }
  
  .selected-seats-panel {
    max-height: 50vh;
  }
  
  .panel-header {
    padding: 12px 16px;
  }
  
  .seats-list {
    padding: 12px 16px;
    gap: 8px;
  }
  
  .seat-item {
    padding: 6px 10px;
  }
  
  .seat-label {
    font-size: 13px;
  }
  
  .seat-category {
    font-size: 11px;
  }
}
</style>
