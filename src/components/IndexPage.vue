<template>
  <div class="app-shell">
    <!-- 头部菜单栏 -->
    <header class="app-header">
      <div class="header-left">
        <Icon icon="lucide:layout-dashboard" class="header-logo" />
        <span class="app-title">座位图管理</span>
      </div>
    </header>

    <!-- 新建场馆弹框 -->
    <div v-if="isCreateModalOpen" class="modal-overlay" @click.self="closeCreateModal">
      <div class="modal-card">
        <div class="modal-header">
          <Icon icon="lucide:plus-circle" class="modal-icon" />
          <span>新增场馆</span>
        </div>
        <div class="modal-body">
          <label class="modal-label">场馆名称</label>
          <input
            v-model="newVenueName"
            class="modal-input"
            placeholder="请输入场馆名称"
            @keydown.enter="confirmCreateVenue"
          />
        </div>
        <div class="modal-footer">
          <button class="modal-btn modal-btn--secondary" @click="closeCreateModal">取消</button>
          <button class="modal-btn modal-btn--primary" :disabled="!newVenueName.trim() || creating" @click="confirmCreateVenue">
            {{ creating ? '创建中...' : '确定' }}
          </button>
        </div>
      </div>
    </div>

    <!-- 主体：左侧列表 + 右侧设计器 -->
    <div class="app-body">
      <aside class="sidebar">
        <button class="sidebar-add-btn" @click="openCreateModal">
          <Icon icon="lucide:plus" class="add-btn-icon" />
          <span>新增场馆</span>
        </button>
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
import { fetchSeatMaps, fetchSeatMapData, editVenue, createVenue, getVenueId, type SeatMapEntry } from '../api/seatMap'
import { nanoid } from 'nanoid'

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

const isCreateModalOpen = ref(false)
const newVenueName = ref('')
const creating = ref(false)

function openCreateModal() {
  newVenueName.value = ''
  isCreateModalOpen.value = true
}

function closeCreateModal() {
  isCreateModalOpen.value = false
}

async function confirmCreateVenue() {
  const name = newVenueName.value.trim()
  if (!name || creating.value) return

  creating.value = true
  try {
    const id = nanoid()
    const venue = {
      id,
      name,
      type: 'WITH_SECTION',
      categories: [
        { key: 1, label: '普通区', color: '#4CAF50', accessible: false },
        { key: 2, label: 'VIP区', color: '#E91E63', accessible: false },
        { key: 3, label: '轮椅区', color: '#2196F3', accessible: true }
      ],
      sections: [],
      scale: 1
    }

    const res = await createVenue(venue)
    const realId = res?.id || res?.venue_id || id

    // 刷新列表并切换到新场馆
    seatMaps.value = await fetchSeatMaps()
    router.push({ query: { venue: realId } })
    closeCreateModal()
  } catch (e) {
    console.error('[IndexPage] 创建场馆失败:', e)
    alert('创建失败：' + (e instanceof Error ? e.message : '未知错误'))
  } finally {
    creating.value = false
  }
}

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
  loading.value = true
  try {
    venueData.value = await fetchSeatMapData(vid)
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

/* ==================== Modal ==================== */

.modal-overlay {
  position: fixed;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(45, 42, 38, 0.45);
  z-index: 100;
}

.modal-card {
  width: 360px;
  padding: 20px;
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 20px 50px rgba(45, 42, 38, 0.18);
}

.modal-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 18px;
  font-size: 16px;
  font-weight: 600;
  color: var(--color-text);
}

.modal-icon {
  width: 20px;
  height: 20px;
  color: var(--color-accent);
}

.modal-label {
  display: block;
  margin-bottom: 8px;
  font-size: 13px;
  color: var(--color-text-secondary);
}

.modal-input {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  font-size: 14px;
  outline: none;
  transition: border-color 0.15s;
}

.modal-input:focus {
  border-color: var(--color-accent);
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 20px;
}

.modal-btn {
  padding: 8px 16px;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  border: 1px solid transparent;
  transition: opacity 0.15s;
}

.modal-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.modal-btn--primary {
  background: var(--color-accent);
  color: #fff;
}

.modal-btn--secondary {
  background: var(--color-bg-tertiary);
  color: var(--color-text-secondary);
  border-color: var(--color-border);
}
</style>
