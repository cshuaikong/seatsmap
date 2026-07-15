<template>
  <div class="app-shell">
    <!-- 头部菜单栏 -->
    <header class="app-header">
      <div class="header-left">
        <Icon icon="lucide:layout-dashboard" class="header-logo" />
        <span class="app-title">座位图管理</span>
      </div>
    </header>

    <!-- 主体：左侧列表 + 右侧设计器 -->
    <div class="app-body">
      <aside class="sidebar">
        <button
          class="sidebar-add-btn"
          :class="{ 'sidebar-add-btn--active': isNewVenueActive }"
          @click="onNewVenue"
        >
          <Icon icon="lucide:plus" class="add-btn-icon" />
          <span>新增场馆</span>
        </button>
        <div
          v-for="(item, i) in venueList"
          :key="getVenueId(item)"
          class="venue-card"
          :class="{ 'venue-card--active': !isNewVenueActive && i === activeIndex }"
          @click="onCardClick(i)"
        >
          <div class="venue-preview" :style="{ background: item.color || DEFAULT_COLORS[i % DEFAULT_COLORS.length] }">
            <Icon icon="lucide:map-pin" class="venue-icon" />
          </div>
          <div class="venue-name">{{ item.name }}</div>
        </div>
      </aside>

      <main class="main-area">
        <SeatMapDesigner
          ref="designerRef"
          :venue-data="venueData"
          :seat-list="seatList"
          :options="designerOptions"
          embedded
          @save="onSaveVenue"
        />
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
// ==================== Imports ====================
import { ref, shallowRef, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Icon } from '@iconify/vue'
import SeatMapDesigner from './SeatMapDesigner.vue'
import {
  fetchSeatMaps,
  fetchSeatMapData,
  fetchSeatList,
  editVenue,
  getVenueId,
  type VenueListItem,
} from '../api/seatMap'

type SeatMapDesignerProps = InstanceType<typeof SeatMapDesigner>['$props']

// ==================== Constants ====================
const DEFAULT_COLORS = ['#e0f2fe', '#fef3c7', '#f1f5f9', '#fce7f3', '#e0e7ff', '#d1fae5']

// ==================== Router ====================
const route = useRoute()
const router = useRouter()

// ==================== State: venue list ====================
const venueList = ref<VenueListItem[]>([])

// ==================== State: current venue ====================
const venueData = shallowRef<any>({})

const seatList = shallowRef<any[]>([])

const designerOptions = ref<SeatMapDesignerProps['options']>({})

const designerRef = ref<InstanceType<typeof SeatMapDesigner>>()

const isNewVenueActive = ref(false)

const activeIndex = computed(() => {
  const id = route.query.venue
  if (!id) return 0
  const idx = venueList.value.findIndex(m => getVenueId(m) === id)
  return idx >= 0 ? idx : 0
})

// ==================== Helpers ====================
function showError(context: string, e: unknown) {
  const msg = e instanceof Error ? e.message : '未知错误'
  console.error(`[IndexPage] ${context}:`, e)
  alert(`${context}：${msg}`)
}

// ==================== Data fetching ====================
async function refreshCurrentData() {
  const entry = venueList.value[activeIndex.value]
  if (!entry) {
    venueData.value = {}
    seatList.value = []
    return
  }
  const vid = getVenueId(entry)
  if (!vid) {
    venueData.value = {}
    seatList.value = []
    return
  }
  try {
    const [venue, seats] = await Promise.all([
      fetchSeatMapData(vid),
      fetchSeatList(vid),
    ])
    venueData.value = venue.venue || {}
    seatList.value =  seats.seatlist || []
  } catch (e) {
    showError('数据加载失败', e)
    venueData.value = {}
    seatList.value = []
  }
}

// ==================== Actions: venue list ====================
function onCardClick(index: number) {
  isNewVenueActive.value = false
  const vid = getVenueId(venueList.value[index])
  router.push({ query: { venue: vid } })
}

// ==================== Actions: new venue ====================
function onNewVenue() {
  isNewVenueActive.value = true
  designerRef.value?.clearCanvas()
}

// ==================== Actions: save ====================
async function onSaveVenue(data: any) {
  try {
    await editVenue(data)
    alert('保存成功')
  } catch (e) {
    showError('保存失败', e)
  }
}

// ==================== Lifecycle & watchers ====================
onMounted(async () => {
  venueList.value = await fetchSeatMaps()
  refreshCurrentData()
})

watch(() => route.query.venue, () => {
  refreshCurrentData()
})
</script>

<style scoped>
.app-shell {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: var(--color-bg, #f8fafc);
  overflow: hidden;
  font-family: var(--font-sans, system-ui, -apple-system, sans-serif);
}

/* ==================== Header ==================== */

.app-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 48px;
  padding: 0 20px;
  background: #fff;
  border-bottom: 1px solid var(--color-border, #e2e8f0);
  flex-shrink: 0;
  z-index: 20;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 10px;
}

.header-logo {
  width: 22px;
  height: 22px;
  color: var(--color-accent, #6366f1);
}

.app-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--color-text, #1e293b);
  letter-spacing: -0.01em;
}

/* ==================== Body ==================== */

.app-body {
  display: flex;
  flex: 1;
  overflow: hidden;
  min-height: 0;
}

/* ==================== Sidebar ==================== */

.sidebar {
  width: 200px;
  flex-shrink: 0;
  padding: 16px 12px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  background: var(--color-bg-secondary, #f1f5f9);
  border-right: 1px solid var(--color-border, #e2e8f0);
  overflow-y: auto;
}

.sidebar-add-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  width: 100%;
  padding: 10px;
  border: 1px dashed var(--color-border);
  border-radius: 10px;
  background: #fff;
  font-size: 13px;
  font-weight: 500;
  color: var(--color-text-secondary);
  cursor: pointer;
  transition: all 0.15s;
}

.sidebar-add-btn:hover {
  border-color: var(--color-accent);
  color: var(--color-accent);
  background: var(--color-accent-soft);
}

.sidebar-add-btn--active {
  border-color: var(--color-accent, #6366f1);
  color: var(--color-accent, #6366f1);
  background: rgba(99, 102, 241, 0.12);
}

.add-btn-icon {
  width: 16px;
  height: 16px;
}

.venue-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 10px 8px 12px;
  border-radius: 10px;
  background: #fff;
  border: 2px solid transparent;
  cursor: pointer;
  transition: border-color 0.2s, box-shadow 0.2s, transform 0.15s;
  position: relative;
}
.venue-card:hover {
  border-color: #cbd5e1;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  transform: translateY(-1px);
}
.venue-card--active {
  border-color: var(--color-accent, #6366f1);
  box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.12);
}

.venue-preview {
  width: 160px;
  height: 100px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.venue-icon {
  width: 36px;
  height: 36px;
  color: rgba(0, 0, 0, 0.18);
}

.venue-name {
  font-size: 13px;
  font-weight: 500;
  color: var(--color-text, #1e293b);
  text-align: center;
  line-height: 1.3;
}

/* ==================== Main ==================== */

.main-area {
  flex: 1;
  overflow: hidden;
  min-width: 0;
}
</style>
