<script setup>
import { ref, computed, watch } from 'vue'

definePageMeta({
  layout: 'console',
  ssr: false,
})

const route = useRoute()
const router = useRouter()

const areaRef = ref(null)
const sidebarRef = ref(null)
const hasDirty = ref(false)
const loading = ref(false)

const venueId = computed(() => route.params.id)

const { fetchVenueDetail, fetchVenueSeats } = useApi()

// 动态设置页面标题
useHead({
  title: computed(() =>
    venueId.value ? `场馆编辑 - SeatsMap` : '新建场馆 - SeatsMap'
  ),
})

/** 加载已有场馆 */
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
  } finally {
    setTimeout(() => { loading.value = false }, 300)
  }
}

/** 切换前拦截脏状态 */
function confirmDiscard() {
  return !hasDirty.value || confirm('当前场馆有未保存的改动，切换后将丢失。确定继续吗？')
}

/** 选择场馆 */
function handleSelectVenue(id) {
  if (!confirmDiscard() || id === venueId.value) return
  router.push(`/console/venues/${id}`)
  openVenue(id)
}

/** 新增场馆 */
function handleAddVenue() {
  if (!confirmDiscard()) return
  router.push('/console/venues/new')
  areaRef.value?.initVenue()
}

/** 保存成功 */
function onSave(payload) {
  const id = payload?.venue?.id
  if (id && id !== venueId.value) {
    router.replace(`/console/venues/${id}`)
  }
  sidebarRef.value?.loadList()
}

// 编辑器就绪后才执行首次加载
function onEditorReady() {
  const id = venueId.value
  if (id && id !== 'new') {
    openVenue(id)
  } else {
    areaRef.value?.initVenue()
  }
}

// 监听路由变化（从列表点击进入编辑）
watch(venueId, (newId) => {
  if (newId && newId !== 'new') {
    openVenue(newId)
  } else {
    areaRef.value?.initVenue()
  }
})
</script>

<template>
  <div class="main">
    <DesignerVenueSidebar
      ref="sidebarRef"
      :active-venue-id="venueId"
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

.loading-fade-enter-active { transition: opacity 0.25s ease; }
.loading-fade-leave-active { transition: opacity 0.4s ease; }
.loading-fade-enter-from,
.loading-fade-leave-to { opacity: 0; }
</style>
