<template>
  <div class="test-container">
    <h2>旋转功能测试</h2>
    <div ref="container" class="canvas-container"></div>
    <div class="controls">
      <button @click="addRect">添加矩形 (Group)</button>
      <button @click="addRow">添加排组 (Shape)</button>
      <button @click="clear">清空</button>
      <p>点击选中，Shift+点击多选，拖动旋转锚点旋转</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import Konva from 'konva'

const container = ref<HTMLDivElement>()
let stage: Konva.Stage | null = null
let layer: Konva.Layer | null = null
let transformer: Konva.Transformer | null = null
let selectedNodes: Konva.Node[] = []

onMounted(() => {
  if (!container.value) return

  // 创建 Stage
  stage = new Konva.Stage({
    container: container.value,
    width: 800,
    height: 600,
  })

  // 创建 Layer
  layer = new Konva.Layer()
  stage.add(layer)

  // 创建 Transformer
  transformer = new Konva.Transformer({
    rotateEnabled: true,
    resizeEnabled: false,
    rotationSnaps: [0, 45, 90, 135, 180, 225, 270, 315],
    padding: 0,  // 移除内边距
    borderStroke: '#0066ff',  // 蓝色边框
    borderStrokeWidth: 1,
  })
  layer.add(transformer)

  // 点击空白处取消选中
  stage.on('click', (e) => {
    if (e.target === stage) {
      selectedNodes = []
      transformer!.nodes([])
      layer!.draw()
    }
  })

  layer.draw()
})

// 添加矩形 (Group 方案)
const addRect = () => {
  if (!layer || !transformer) return

  const group = new Konva.Group({
    x: 200 + Math.random() * 100,
    y: 200 + Math.random() * 100,
    draggable: true,
  })

  const rect = new Konva.Rect({
    width: 100,
    height: 60,
    fill: 'rgba(156, 163, 175, 0.6)',
    cornerRadius: 8,
  })

  const clickArea = new Konva.Rect({
    width: 100,
    height: 60,
    fill: 'transparent',
  })

  group.add(rect, clickArea)

  // 点击选中（支持多选）
  group.on('click', (e) => {
    e.cancelBubble = true
    const isMulti = (e.evt as MouseEvent).shiftKey
    if (isMulti) {
      // 多选
      const index = selectedNodes.indexOf(group)
      if (index === -1) {
        selectedNodes.push(group)
      } else {
        selectedNodes.splice(index, 1)
      }
    } else {
      // 单选
      selectedNodes = [group]
    }
    transformer!.nodes(selectedNodes)
    layer!.draw()
  })

  layer.add(group)
  layer.draw()
}

// 添加排组 (Shape 方案)
const addRow = () => {
  if (!layer || !transformer) return

  const seats = []
  for (let i = 0; i < 10; i++) {
    seats.push({
      x: i * 15 + 6,  // 加 6，让座位不超出左边框
      y: 6,           // 加 6，让座位垂直居中
      status: 'available',
    })
  }

  // 计算边界（包含座位半径）
  // 座位坐标范围: x = 0 ~ 135, y = 0
  // 座位半径 6，所以实际范围: x = -6 ~ 141, y = -6 ~ 6
  const width = 9 * 15 + 12  // 147 (135 + 左右半径)
  const height = 12  // 12 (上下半径)
  
  const shape = new Konva.Shape({
    x: 200 + Math.random() * 100,
    y: 200 + Math.random() * 100,
    draggable: true,
    width: width,
    height: height,
    transformsEnabled: 'all',
    seatsData: seats,
  })

  // sceneFunc: 绘制座位
  shape.sceneFunc((context, shape) => {
    const seatsData = shape.getAttr('seatsData') as any[]
    const radius = 6

    // 绘制边框（显示包围盒范围，从0,0开始）
    context.beginPath()
    context.strokeStyle = '#ef4444'
    context.lineWidth = 1
    context.setLineDash([3, 3])
    context.rect(0, 0, 147, 12)
    context.stroke()
    context.setLineDash([])

    // 绘制座位
    context.beginPath()
    context.fillStyle = '#22c55e'
    seatsData.forEach((seat) => {
      context.moveTo(seat.x + radius, seat.y)
      context.arc(seat.x, seat.y, radius, 0, Math.PI * 2)
    })
    context.fill()

    // 座位边框
    context.strokeStyle = '#22c55e'
    context.lineWidth = 1
    seatsData.forEach((seat) => {
      context.beginPath()
      context.arc(seat.x, seat.y, radius, 0, Math.PI * 2)
      context.stroke()
    })
  })

  // hitFunc: 点击检测（从 0,0 开始）
  shape.hitFunc((context, shape) => {
    context.beginPath()
    context.rect(0, 0, width, height)
    context.fillStrokeShape(shape)
  })

  // 点击选中（支持多选）
  shape.on('click', (e) => {
    e.cancelBubble = true
    const isMulti = (e.evt as MouseEvent).shiftKey
    if (isMulti) {
      const index = selectedNodes.indexOf(shape)
      if (index === -1) {
        selectedNodes.push(shape)
      } else {
        selectedNodes.splice(index, 1)
      }
    } else {
      selectedNodes = [shape]
    }
    transformer!.nodes(selectedNodes)
    
    // 调试：打印包围盒信息
    const rect = shape.getClientRect()
    console.log('Shape x/y:', shape.x(), shape.y())
    console.log('Shape getClientRect:', rect)
    console.log('Shape width/height:', shape.width(), shape.height())
    console.log('位置偏差 x:', rect.x - shape.x(), 'y:', rect.y - shape.y())
    
    layer!.draw()
  })

  layer.add(shape)
  layer.draw()
}

// 清空
const clear = () => {
  if (!layer || !transformer) return
  selectedNodes = []
  transformer.nodes([])
  layer.destroyChildren()
  layer.add(transformer)
  layer.draw()
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
</style>
