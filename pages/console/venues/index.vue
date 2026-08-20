<script setup>
import { ref, onMounted } from 'vue'

definePageMeta({
  layout: 'console',
  ssr: false,
})

useHead({
  title: '我的场馆 - SeatsMap',
})

const { fetchVenueList, deleteVenue } = useApi()

const venues = ref([])
const loading = ref(false)
const errorMsg = ref('')

async function loadList() {
  loading.value = true
  errorMsg.value = ''
  try {
    const res = await fetchVenueList()
    const list = res?.data ?? res ?? []
    venues.value = Array.isArray(list) ? list : []
  } catch (e) {
    errorMsg.value = e.message || '加载失败'
  } finally {
    loading.value = false
  }
}

async function handleDelete(id) {
  if (!confirm('确认删除该场馆？此操作不可恢复。')) return
  try {
    await deleteVenue(id)
    venues.value = venues.value.filter(v => v.id !== id)
  } catch (e) {
    alert(e.message || '删除失败')
  }
}

onMounted(() => {
  loadList()
})
</script>

<template>
  <div class="venues-page">
    <div class="venues-header">
      <h1>我的场馆</h1>
      <NuxtLink to="/console/venues/new" class="add-btn">+ 新建场馆</NuxtLink>
    </div>

    <div v-if="loading" class="status-msg">加载中…</div>
    <div v-else-if="errorMsg" class="status-msg error">{{ errorMsg }}</div>

    <div v-else-if="venues.length === 0" class="empty-state">
      <p>还没有场馆</p>
      <NuxtLink to="/console/venues/new" class="add-btn">创建第一个场馆</NuxtLink>
    </div>

    <div v-else class="venue-grid">
      <NuxtLink
        v-for="venue in venues"
        :key="venue.id"
        :to="`/console/venues/${venue.id}`"
        class="venue-card"
      >
        <div class="venue-name">{{ venue.name }}</div>
        <div class="venue-actions">
          <button class="delete-btn" @click.prevent="handleDelete(venue.id)">删除</button>
        </div>
      </NuxtLink>
    </div>
  </div>
</template>

<style scoped>
.venues-page {
  flex: 1;
  padding: 32px;
  overflow-y: auto;
  max-width: 960px;
  margin: 0 auto;
  width: 100%;
}

.venues-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 24px;
}

.venues-header h1 {
  font-size: 22px;
  font-weight: 600;
  color: #333;
  margin: 0;
}

.add-btn {
  padding: 8px 20px;
  border: 1px solid #4a7cff;
  background: #4a7cff;
  color: #fff;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  text-decoration: none;
  transition: all 0.2s;
}

.add-btn:hover {
  background: #3a6ae8;
  text-decoration: none;
}

.status-msg {
  padding: 40px 16px;
  font-size: 14px;
  color: #999;
  text-align: center;
}

.status-msg.error {
  color: #e44;
}

.empty-state {
  text-align: center;
  padding: 60px 20px;
  color: #999;
}

.empty-state p {
  margin: 0 0 16px;
  font-size: 15px;
}

.venue-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 16px;
}

.venue-card {
  border: 1px solid #e8e8e8;
  border-radius: 10px;
  padding: 16px;
  cursor: pointer;
  transition: all 0.2s;
  text-decoration: none;
  color: inherit;
  background: #fff;
}

.venue-card:hover {
  border-color: #4a7cff;
  box-shadow: 0 2px 12px rgba(74, 124, 255, 0.1);
  text-decoration: none;
}

.venue-name {
  font-size: 15px;
  font-weight: 500;
  color: #333;
  margin-bottom: 8px;
}

.venue-actions {
  display: flex;
  justify-content: flex-end;
}

.delete-btn {
  padding: 3px 12px;
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
