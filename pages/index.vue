<script setup>
import { ref, computed } from 'vue'

definePageMeta({
  layout: 'console',
  ssr: false,
})

useHead({
  title: 'SeatsMap - 座位编排设计器',
})

const areaRef = ref(null)
const sidebarRef = ref(null)
const hasDirty = ref(false)
const listKey = ref(0)
const loading = ref(false)

const route = useRoute()
const router = useRouter()

const activeVenueId = computed(() => route.query.venue_id || null)

const { fetchVenueDetail, fetchVenueSeats } = useApi()

/** 加载已有场馆：两请求并行，到齐后一次喂入 */
async function openVenue(id) {
  loading.value = true
  try {
    const [detailRes, seatsRes] = await Promise.all([
      fetchVenueDetail(id),
      fetchVenueSeats(id),
    ])
    const raw = detailRes?.data ?? detailRes ?? null
    const venue = raw?.venue ?? null
    if (!venue) throw new Error('场馆数据为空')

    const seatsData = seatsRes?.data ?? seatsRes ?? {}
    const seatlist = seatsData.seatlist ?? seatsData ?? []

    areaRef.value?.initVenue(venue, seatlist)
  } catch (e) {
    alert(`场馆加载失败：${id}`)
    areaRef.value?.initVenue(null)
    router.push({ query: {} })
  } finally {
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

// 编辑器就绪后才执行首次加载
function onEditorReady() {
  const id = activeVenueId.value
  if (id) openVenue(id)
  else areaRef.value?.initVenue()
}
</script>

<template>
  <div class="main">
    <DesignerVenueSidebar
      :key="listKey"
      ref="sidebarRef"
      :active-venue-id="activeVenueId"
      @add-venue="handleAddVenue"
      @select-venue="handleSelectVenue"
    />
    <DesignerEditorArea
      ref="areaRef"
      @ready="onEditorReady"
      @dirty="(v) => (hasDirty = v)"
      @save="onSave"
      @error="(e) => console.error(e)"
    />

    <!-- 加载进度遮罩 -->
    <Transition name="loading-fade">
      <div v-if="loading" class="loading-overlay">
        <div class="loading-spinner">
          <span class="spinner-ring"></span>
          <span class="loading-text">加载场馆数据…</span>
        </div>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
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

.spinner-ring {
  width: 40px;
  height: 40px;
  border: 3px solid #e8e8e8;
  border-top-color: #4a7cff;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

.loading-text {
  font-size: 13px;
  color: #888;
  letter-spacing: 0.5px;
}

@keyframes spin {
  to { transform: rotate(360deg); }
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
