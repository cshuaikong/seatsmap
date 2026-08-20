<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'
import SeatMapDesigner from 'seatmap-designer'
import 'seatmap-designer/style.css'
import { saveVenue, uploadImage } from '../api/index.js'

const emit = defineEmits(['dirty', 'save', 'error'])

const editorRef = ref(null)
let designer = null

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

/**
 * 喂入数据：已有场馆调用 setData，新建调用 newVenue
 * @param {Object|null} venue  场馆主体（含 sections），null = 空白新建
 * @param {Array}      seatlist 座位列表
 */
function initVenue(venue, seatlist) {
  if (!designer) return
  if (venue?.sections) {
    designer.setData(venue, seatlist)
  } else {
    designer.newVenue(venue || undefined)
  }
}

onMounted(() => {
  designer = new SeatMapDesigner(editorRef.value, {
    // debug: true, // 性能排查时手动取消注释；控制台会输出归一化、首屏、进分区等耗时
    saveHandler: handleSave,
    uploadHandler: uploadImage,
    zoom: { max: 100 },
  })

  // 确保 zoom 配置生效（部分配置可能在内部树初始化后被覆盖）
  designer.setOptions({ zoom: { max: 100 } })

  designer.on('dirty', (v) => emit('dirty', v))
  // 新版组件已移除「save」事件，保存成功通知改由 handleSave 包装实现
  designer.on('error', (e) => emit('error', e))
})

onBeforeUnmount(() => {
  designer?.destroy()
  designer = null
})

defineExpose({ initVenue })
</script>

<template>
  <main class="editor">
    <div ref="editorRef" class="designer-container"></div>
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
