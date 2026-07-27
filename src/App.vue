<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import TopHeader from './components/TopHeader.vue'
import LeftSidebar from './components/LeftSidebar.vue'
import EditorArea from './components/EditorArea.vue'
import { fetchVenueDetail, fetchVenueSeats } from './api/index.js'

const route = useRoute()
const router = useRouter()

const areaRef = ref(null)
const hasDirty = ref(false)
const listKey = ref(0)
const loading = ref(false)

const activeVenueId = computed(() => route.query.venue_id || null)

/** 加载已有场馆：两请求并行，到齐后一次喂入 */
async function openVenue(id) {
  loading.value = true
  try {
    const [detailRes, seatsRes] = await Promise.all([
      fetchVenueDetail(id),
      fetchVenueSeats(id),
    ])
    const raw = detailRes.data?.data ?? detailRes.data ?? null
    const venue = raw?.venue ?? null
    if (!venue) throw new Error('场馆数据为空')

    const seatsData = seatsRes.data?.data ?? seatsRes.data ?? {}
    const seatlist = seatsData.seatlist ?? seatsData ?? []

    areaRef.value?.initVenue(venue, seatlist)
  } catch (e) {
    alert(`场馆加载失败：${id}`)
    areaRef.value?.initVenue(null)
    router.push({ query: {} })
  } finally {
    // 数据喂入后稍延迟关闭遮罩，确保画布已完成首帧渲染
    setTimeout(() => { loading.value = false }, 300)
  }
}

/** 切换前拦截脏状态 */
function confirmDiscard() {
  return !hasDirty.value || confirm('当前场馆有未保存的改动，切换后将丢失。确定继续吗？')
}

/** 选择场馆 */
function handleSelectVenue(venueId) {
  if (!confirmDiscard() || venueId === activeVenueId.value) return
  router.push({ query: { venue_id: venueId } })
  openVenue(venueId)
}

/** 新增场馆 */
function handleAddVenue() {
  if (!confirmDiscard()) return
  router.push({ query: {} })
  areaRef.value?.initVenue()
}

/** 保存成功：新建首存后把 id 写回地址栏，刷新列表 */
function onSave(payload) {
  const id = payload?.venue?.id
  if (id && id !== activeVenueId.value) {
    router.push({ query: { venue_id: id } })
  }
  listKey.value++
}

// 首次挂载：有参则加载，无参则空白
onMounted(() => {
  const id = activeVenueId.value
  if (id) openVenue(id)
  else areaRef.value?.initVenue()
})
</script>

<template>
  <div class="layout">
    <TopHeader />
    <div class="main">
      <LeftSidebar
        :key="listKey"
        :active-venue-id="activeVenueId"
        @add-venue="handleAddVenue"
        @select-venue="handleSelectVenue"
      />
      <EditorArea
        ref="areaRef"
        @dirty="(v) => (hasDirty = v)"
        @save="onSave"
        @error="(e) => console.error(e)"
      />

      <!-- 加载进度遮罩 -->
      <Transition name="loading-fade">
        <div v-if="loading" class="loading-overlay">
          <div class="loading-spinner">
            <svg class="spinner" viewBox="0 0 50 50">
              <circle class="spinner-track" cx="25" cy="25" r="20" fill="none" stroke-width="4" />
              <circle class="spinner-head" cx="25" cy="25" r="20" fill="none" stroke-width="4" stroke-linecap="round" />
            </svg>
            <span class="loading-text">加载场馆数据…</span>
          </div>
        </div>
      </Transition>
    </div>
  </div>
</template>

<style scoped>
.layout {
  display: flex;
  flex-direction: column;
  height: 100vh;
  overflow: hidden;
  background: #f5f5f5;
}

.main {
  display: flex;
  flex: 1;
  overflow: hidden;
  position: relative;
}

/* ==================== 加载遮罩 ==================== */
.loading-overlay {
  position: absolute;
  inset: 0;
  z-index: 100;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.75);
  backdrop-filter: blur(6px);
  -webkit-backdrop-filter: blur(6px);
}

.loading-spinner {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
}

.spinner {
  width: 48px;
  height: 48px;
  animation: spin 0.9s linear infinite;
}

.spinner-track {
  stroke: #e8e8e8;
}

.spinner-head {
  stroke: #4a7cff;
  stroke-dasharray: 90 150;
  stroke-dashoffset: 0;
  animation: dash 1.4s ease-in-out infinite;
}

.loading-text {
  font-size: 13px;
  color: #888;
  letter-spacing: 0.5px;
}

@keyframes spin {
  100% { transform: rotate(360deg); }
}

@keyframes dash {
  0%   { stroke-dasharray: 1 150; stroke-dashoffset: 0; }
  50%  { stroke-dasharray: 90 150; stroke-dashoffset: -35; }
  100% { stroke-dasharray: 90 150; stroke-dashoffset: -124; }
}

/* ==================== 过渡动画 ==================== */
.loading-fade-enter-active {
  transition: opacity 0.25s ease;
}
.loading-fade-leave-active {
  transition: opacity 0.4s ease;
}
.loading-fade-enter-from,
.loading-fade-leave-to {
  opacity: 0;
}
</style>
