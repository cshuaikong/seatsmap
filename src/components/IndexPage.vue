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
        <div
          v-for="(item, i) in seatMaps"
          :key="getVenueId(item)"
          class="venue-card"
          :class="{ 'venue-card--active': i === activeIndex }"
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
          :venue-data="venueData"
          :options="{}"
          embedded
          @save="onSaveVenue"
        />
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Icon } from '@iconify/vue'
import SeatMapDesigner from './SeatMapDesigner.vue'
import { fetchSeatMaps, fetchSeatMapData, editVenue, getVenueId, type SeatMapEntry } from '../api/seatMap'

const DEFAULT_COLORS = ['#e0f2fe', '#fef3c7', '#f1f5f9', '#fce7f3', '#e0e7ff', '#d1fae5']

const seatMaps = ref<SeatMapEntry[]>([])

const route = useRoute()
const router = useRouter()

const activeIndex = computed(() => {
  const id = route.query.venue
  if (!id) return 0
  const idx = seatMaps.value.findIndex(m => getVenueId(m) === id)
  return idx >= 0 ? idx : 0
})

const venueData = ref<any>({})
const loading = ref(false)

function onCardClick(index: number) {
  const vid = getVenueId(seatMaps.value[index])
  router.push({ query: { venue: vid } })
}

async function refreshCurrentData() {
  const entry = seatMaps.value[activeIndex.value]
  if (!entry) {
    venueData.value = {}
    return
  }
  const vid = getVenueId(entry)
  if (!vid) {
    console.warn('[IndexPage] 列表项缺少 ID 字段:', entry)
    venueData.value = {}
    return
  }
  console.log('[IndexPage] fetchSeatMapData, venue_id:', vid)
  loading.value = true
  try {
    venueData.value = await fetchSeatMapData(vid)
    console.log('[IndexPage] venueData 加载成功, sections:', (venueData.value as any)?.sections?.length)
  } catch (e) {
    console.error('[IndexPage] 加载座位图数据失败:', e)
    venueData.value = {}
  } finally {
    loading.value = false
  }
}

onMounted(async () => {
  try {
    seatMaps.value = await fetchSeatMaps()
  } catch (e) {
    console.error('加载座位图列表失败:', e)
  }
  refreshCurrentData()
})

watch(() => route.query.venue, () => {
  refreshCurrentData()
})

async function onSaveVenue(data: any) {
  try {
    await editVenue(data)
    console.log('[IndexPage] 保存成功')
    alert('保存成功')
  } catch (e) {
    console.error('[IndexPage] 保存失败:', e)
    alert('保存失败：' + (e instanceof Error ? e.message : '未知错误'))
  }
}
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

.header-right {
  display: flex;
  align-items: center;
  gap: 6px;
}

.hdr-btn {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 6px 14px;
  border: 1px solid var(--color-border, #e2e8f0);
  border-radius: 6px;
  background: #fff;
  font-size: 13px;
  color: var(--color-text-secondary, #475569);
  cursor: pointer;
  transition: background 0.15s;
}
.hdr-btn:hover {
  background: var(--color-bg-tertiary, #f1f5f9);
}
.hdr-btn :deep(svg) {
  width: 15px;
  height: 15px;
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

.venue-badge {
  position: absolute;
  top: 6px;
  right: 6px;
  font-size: 10px;
  padding: 2px 7px;
  border-radius: 10px;
  background: var(--color-accent, #6366f1);
  color: #fff;
  font-weight: 600;
}

/* ==================== Main ==================== */

.main-area {
  flex: 1;
  overflow: hidden;
  min-width: 0;
}
</style>
