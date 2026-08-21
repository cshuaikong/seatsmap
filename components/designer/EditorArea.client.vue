<script setup>
import { ref, nextTick } from 'vue'
import { SeatMapDesignerVue } from 'seatmap-designer'
import 'seatmap-designer/style.css'

const emit = defineEmits(['dirty', 'save', 'ready'])

const designerRef = ref(null)

const { saveVenue, uploadImage } = useApi()

/**
 * 保存回调
 * 把 saveVenue 包装一层：保存成功（契约：返回 true）后复刻旧版 save 事件，
 * 携带本次保存的请求载荷通知父级（用于首存后更新地址栏 venue_id、刷新列表）。
 */
async function handleSave(payload) {
  const ok = await saveVenue(payload)
  if (ok === true) emit('save', payload)
  return ok
}

const designerOptions = {
  zoom: { max: 100 },
}

/**
 * 喂入数据：已有场馆调用 setData，新建调用 newVenue
 * @param {Object|null} venue  场馆主体（含 sections），null = 空白新建
 * @param {Array}      seatlist 座位列表
 */
function initVenue(venue, seatlist) {
  const designer = designerRef.value
  if (!designer) return
  if (venue?.sections) {
    designer.setData(venue, seatlist)
  } else {
    designer.newVenue(venue || undefined)
  }
}

async function handleReady() {
  await nextTick()
  emit('ready')
}

defineExpose({ initVenue })
</script>

<template>
  <main class="editor">
    <SeatMapDesignerVue
      ref="designerRef"
      class="designer-container"
      :save-handler="handleSave"
      :upload-handler="uploadImage"
      :options="designerOptions"
      @dirty="emit('dirty', $event)"
      @ready="handleReady"
    />
  </main>
</template>

<style scoped>
.editor {
  flex: 1;
  display: flex;
  overflow: hidden;
  min-width: 0;
}

.designer-container {
  width: 100%;
  height: 100%;
}
</style>
