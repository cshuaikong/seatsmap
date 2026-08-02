<script setup>
import { ref, onMounted, watch } from 'vue'
import { fetchVenueList, deleteVenue } from '../api/index.js'

const props = defineProps({
  activeVenueId: { type: String, default: null },
})

const emit = defineEmits(['add-venue', 'select-venue'])

const venues = ref([])
const loading = ref(false)
const errorMsg = ref('')

async function loadList() {
  loading.value = true
  errorMsg.value = ''
  try {
    const res = await fetchVenueList()
    const list = res.data?.data ?? res.data ?? []
    venues.value = Array.isArray(list) ? list : []
  } catch (e) {
    errorMsg.value = e.message || '加载失败'
  } finally {
    loading.value = false
  }
}

function handleAdd() {
  emit('add-venue')
}

function handleSelect(venue) {
  emit('select-venue', venue.id)
}

async function handleDelete(id) {
  if (!confirm('确认删除该场馆？')) return
  try {
    await deleteVenue(id)
    venues.value = venues.value.filter(v => v.id !== id)
    // 如果删除的是当前选中场馆，通知父组件
    if (props.activeVenueId === id) {
      emit('add-venue')
    }
  } catch (e) {
    alert(e.message || '删除失败')
  }
}

onMounted(() => {
  loadList()
})
</script>

<template>
  <aside class="sidebar">
    <div class="sidebar-header">
      <span class="title">场馆列表</span>
      <button class="add-btn" @click="handleAdd">新增</button>
    </div>

    <div v-if="loading" class="status-msg">加载中…</div>
    <div v-else-if="errorMsg" class="status-msg error">{{ errorMsg }}</div>

    <div v-else class="venue-list">
      <div
        v-for="venue in venues"
        :key="venue.id"
        :class="['venue-card', { active: activeVenueId === venue.id }]"
        @click="handleSelect(venue)"
      >
        <div class="venue-info">
          <span class="venue-name">{{ venue.name }}</span>
          <button class="delete-btn" @click.stop="handleDelete(venue.id)">删除</button>
        </div>
      </div>
    </div>
  </aside>
</template>

<style scoped>
.sidebar {
  width: 220px;
  background: #fff;
  border-right: 1px solid #e8e8e8;
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
}

.sidebar-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px 10px;
}

.title {
  font-size: 14px;
  font-weight: 600;
  color: #333;
}

.add-btn {
  padding: 3px 12px;
  border: 1px solid #4a7cff;
  background: #fff;
  color: #4a7cff;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
  transition: all 0.2s;
}

.add-btn:hover {
  background: #4a7cff;
  color: #fff;
}

.status-msg {
  padding: 20px 16px;
  font-size: 13px;
  color: #999;
  text-align: center;
}

.status-msg.error {
  color: #e44;
}

.venue-list {
  flex: 1;
  overflow-y: auto;
  padding: 0 12px 12px;
}

.venue-card {
  border: 1px solid #e8e8e8;
  border-radius: 8px;
  padding: 8px;
  margin-bottom: 10px;
  cursor: pointer;
  transition: all 0.2s;
}

.venue-card:hover {
  border-color: #c0c0c0;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.06);
}

.venue-card.active {
  border-color: #4a7cff;
  background: #f0f5ff;
}

.venue-info {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.venue-name {
  font-size: 13px;
  color: #333;
  font-weight: 500;
}

.delete-btn {
  padding: 2px 10px;
  border: 1px solid #ffcccc;
  background: #fff;
  color: #e44;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
  transition: all 0.2s;
}

.delete-btn:hover {
  background: #e44;
  color: #fff;
  border-color: #e44;
}
</style>
