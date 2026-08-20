<script setup>
import { ref, onMounted, onBeforeUnmount, nextTick } from 'vue'
import SeatMapDesigner from 'seatmap-designer'
import 'seatmap-designer/style.css'

const emit = defineEmits(['dirty', 'save', 'ready'])

const editorRef = ref(null)
let designer = null

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

onMounted(async () => {
  // .client.vue 延迟渲染，需等 nextTick 确保模板 ref 已绑定到 DOM
  await nextTick()
  if (!editorRef.value) {
    console.error('[EditorArea] 缺少挂载容器 el')
    return
  }
  designer = new SeatMapDesigner(editorRef.value, {
    // debug: true,
    saveHandler: handleSave,
    uploadHandler: uploadImage,
    zoom: { max: 100 },
  })

  // 确保 zoom 配置生效
  designer.setOptions({ zoom: { max: 100 } })

  designer.on('dirty', (v) => emit('dirty', v))
  emit('ready')
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
