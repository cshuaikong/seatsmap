<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'
import SeatMapDesigner from 'seatmap-designer'
import 'seatmap-designer/style.css'
import { saveVenue, uploadImage } from '../api/index.js'

const emit = defineEmits(['dirty', 'save', 'error'])

const editorRef = ref(null)
let designer = null

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
    saveHandler: saveVenue,
    uploadHandler: uploadImage,
  })

  designer.on('dirty', (v) => emit('dirty', v))
  designer.on('save', (p) => emit('save', p))
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
