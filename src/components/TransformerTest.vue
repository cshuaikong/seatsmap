<template>
  <div class="test-container">
    <h3>Transformer 选择框更新测试</h3>
    <div ref="containerRef" class="canvas-container"></div>
    <div class="controls">
      <button @click="increaseWidth">增加宽度</button>
      <button @click="decreaseWidth">减少宽度</button>
      <button @click="updateTransformer">手动更新 Transformer</button>
      <button @click="clearCacheAndUpdate">清除缓存并更新</button>
    </div>
    <div class="info">
      <p>Shape width: {{ currentWidth }}</p>
      <p>Transformer 应该跟随 shape 大小变化</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import Konva from 'konva'

const containerRef = ref<HTMLDivElement>()
let stage: Konva.Stage | null = null
let layer: Konva.Layer | null = null
let shape: Konva.Shape | null = null
let transformer: Konva.Transformer | null = null

const currentWidth = ref(100)

onMounted(() => {
  if (!containerRef.value) return

  stage = new Konva.Stage({
    container: containerRef.value,
    width: 800,
    height: 600
  })

  layer = new Konva.Layer()
  stage.add(layer)

  // 创建一个简单的 shape
  shape = new Konva.Shape({
    x: 100,
    y: 100,
    width: 100,
    height: 50,
    fill: '#3b82f6',
    draggable: true,
    sceneFunc: (context, shape) => {
      const width = shape.width()
      const height = shape.height()
      context.beginPath()
      context.rect(0, 0, width, height)
      context.fillStrokeShape(shape)
    }
  })

  layer.add(shape)

  // 创建 Transformer
  transformer = new Konva.Transformer({
    resizeEnabled: true,
    rotateEnabled: true
  })
  layer.add(transformer)
  transformer.nodes([shape])

  layer.draw()
})

const increaseWidth = () => {
  if (!shape) return
  currentWidth.value += 50
  shape.width(currentWidth.value)
  layer?.batchDraw()
  console.log('增加宽度到:', currentWidth.value)
}

const decreaseWidth = () => {
  if (!shape) return
  currentWidth.value = Math.max(50, currentWidth.value - 50)
  shape.width(currentWidth.value)
  layer?.batchDraw()
  console.log('减少宽度到:', currentWidth.value)
}

const updateTransformer = () => {
  if (!transformer) return
  console.log('调用 transformer.update()')
  transformer.update()
  layer?.batchDraw()
}

const clearCacheAndUpdate = () => {
  if (!transformer || !shape) return
  console.log('清除缓存并更新')
  
  // 方法1: 清除 shape 缓存
  if ((shape as any).clearCache) {
    (shape as any).clearCache()
    console.log('shape.clearCache() 调用成功')
  }
  
  // 方法2: 重新设置 nodes
  const nodes = transformer.nodes()
  transformer.nodes([])
  transformer.nodes(nodes)
  
  // 方法3: 调用 update
  transformer.update()
  layer?.batchDraw()
}
</script>

<style scoped>
.test-container {
  padding: 20px;
}

.canvas-container {
  border: 1px solid #ccc;
  width: 800px;
  height: 600px;
  background: #f9fafb;
}

.controls {
  margin-top: 10px;
}

button {
  margin-right: 10px;
  padding: 8px 16px;
  cursor: pointer;
}

.info {
  margin-top: 10px;
  color: #666;
}
</style>
