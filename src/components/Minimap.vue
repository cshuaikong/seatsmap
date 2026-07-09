<template>
  <div ref="containerRef" class="minimap">
    <canvas ref="canvasRef"></canvas>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, computed } from 'vue'

const props = defineProps<{
  seatMapViewer: any
  venue: any
}>()

const containerRef = ref<HTMLDivElement>()
const canvasRef = ref<HTMLCanvasElement>()

let cachedVenueBounds: { x: number; y: number; width: number; height: number } | null = null
let staticCanvas: HTMLCanvasElement | null = null
let lastState = ''
let rafId = 0

const minimapSize = computed(() => {
  const w = containerRef.value?.clientWidth || 200
  return Math.min(w, 200)
})

// ========== 静态层：分区轮廓（只在数据就绪时构建一次） ==========

const buildStaticLayer = (): boolean => {
  if (!props.venue?.sections) return false

  if (!cachedVenueBounds) {
    cachedVenueBounds = props.seatMapViewer?.getVenueBounds?.()
  }
  const vb = cachedVenueBounds
  if (!vb || vb.width === 0 || vb.height === 0) return false

  const size = minimapSize.value
  const dpr = (window.devicePixelRatio || 1) * 2
  const w = Math.round(size * dpr)
  const h = Math.round(size * 0.65 * dpr)

  if (!staticCanvas) {
    staticCanvas = document.createElement('canvas')
  }
  staticCanvas.width = w
  staticCanvas.height = h

  const ctx = staticCanvas.getContext('2d')!
  ctx.clearRect(0, 0, w, h)

  const padding = 5 * dpr
  const mw = w - padding * 2
  const mh = h - padding * 2
  const minimapScale = Math.min(mw / vb.width, mh / vb.height)
  const contentW = vb.width * minimapScale
  const contentH = vb.height * minimapScale
  const ox = padding + (mw - contentW) / 2
  const oy = padding + (mh - contentH) / 2

  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, w, h)

  props.venue.sections.forEach((section: any) => {
    if (!section.borderType || section.borderType === 'none') return

    ctx.fillStyle = section.fill || 'rgba(128, 128, 128, 0.15)'
    ctx.strokeStyle = section.stroke || '#808080'
    ctx.lineWidth = 1 * dpr

    const bx = ox + ((section.x || 0) - vb.x) * minimapScale
    const by = oy + ((section.y || 0) - vb.y) * minimapScale

    if (section.borderType === 'rect') {
      ctx.fillRect(bx, by, (section.width || 100) * minimapScale, (section.height || 100) * minimapScale)
      ctx.strokeRect(bx, by, (section.width || 100) * minimapScale, (section.height || 100) * minimapScale)
    } else if (section.borderType === 'ellipse') {
      ctx.beginPath()
      ctx.ellipse(
        bx + (section.radiusX || 50) * minimapScale,
        by + (section.radiusY || 50) * minimapScale,
        (section.radiusX || 50) * minimapScale,
        (section.radiusY || 50) * minimapScale,
        0, 0, Math.PI * 2,
      )
      ctx.fill()
      ctx.stroke()
    } else if (section.borderType === 'path' && section.path) {
      ctx.save()
      ctx.translate(bx, by)
      ctx.scale(minimapScale, minimapScale)
      const p = new Path2D(section.path)
      ctx.fill(p)
      ctx.stroke(p)
      ctx.restore()
    }
  })

  return true
}

// ========== 动态层：视口框 + 已选座位 ==========

const drawDynamicLayer = () => {
  const canvas = canvasRef.value
  if (!canvas) return

  if (!staticCanvas) {
    if (!buildStaticLayer()) return
  }

  const viewer = props.seatMapViewer
  if (!viewer) return

  const stageState = viewer.getStageState?.()
  const selected = viewer.getSelectedSeats?.() || []
  if (!stageState) return

  const stateKey = `${stageState.scale}|${stageState.position.x}|${stageState.position.y}|${selected.length}`
  if (stateKey === lastState) return
  lastState = stateKey

  const vb = cachedVenueBounds!
  const dpr = (window.devicePixelRatio || 1) * 2
  const size = minimapSize.value
  const w = Math.round(size * dpr)
  const h = Math.round(size * 0.65 * dpr)
  canvas.width = w
  canvas.height = h

  const ctx = canvas.getContext('2d')!
  ctx.drawImage(staticCanvas, 0, 0)

  const padding = 5 * dpr
  const mw = w - padding * 2
  const mh = h - padding * 2
  const minimapScale = Math.min(mw / vb.width, mh / vb.height)
  const contentW = vb.width * minimapScale
  const contentH = vb.height * minimapScale
  const ox = padding + (mw - contentW) / 2
  const oy = padding + (mh - contentH) / 2

  // 已选座位
  ctx.fillStyle = '#ef4444'
  selected.forEach((seat: { x: number; y: number }) => {
    ctx.beginPath()
    ctx.arc(
      ox + (seat.x - vb.x) * minimapScale,
      oy + (seat.y - vb.y) * minimapScale,
      3 * dpr, 0, Math.PI * 2,
    )
    ctx.fill()
  })

  // 视口在世界坐标中的位置
  const vx = -stageState.position.x / stageState.scale
  const vy = -stageState.position.y / stageState.scale
  const vw = stageState.width / stageState.scale
  const vh = stageState.height / stageState.scale

  const vpX = ox + (vx - vb.x) * minimapScale
  const vpY = oy + (vy - vb.y) * minimapScale
  const vpW = vw * minimapScale
  const vpH = vh * minimapScale

  // 蒙层
  ctx.fillStyle = 'rgba(0, 0, 0, 0.5)'
  ctx.fillRect(0, 0, w, vpY)
  ctx.fillRect(0, vpY + vpH, w, h - vpY - vpH)
  ctx.fillRect(0, vpY, vpX, vpH)
  ctx.fillRect(vpX + vpW, vpY, w - vpX - vpW, vpH)

  // 视口边框
  ctx.strokeStyle = '#3b82f6'
  ctx.lineWidth = 3 * dpr
  ctx.strokeRect(vpX, vpY, vpW, vpH)
}

// ========== 渲染循环 ==========

const loop = () => {
  drawDynamicLayer()
  rafId = requestAnimationFrame(loop)
}

onMounted(() => {
  setTimeout(() => {
    buildStaticLayer()
    rafId = requestAnimationFrame(loop)
  }, 500)
})

onUnmounted(() => {
  cancelAnimationFrame(rafId)
})

watch(() => props.venue, () => {
  cachedVenueBounds = null
  staticCanvas = null
  setTimeout(() => buildStaticLayer(), 100)
})
</script>

<style scoped>
.minimap {
  position: absolute;
  top: 16px;
  right: 16px;
  width: 100%;
  max-width: 200px;
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  overflow: hidden;
  border: 1px solid #e5e7eb;
}

canvas {
  display: block;
  width: 100%;
  height: auto;
}

@media (max-width: 768px) {
  .minimap {
    top: 8px;
    right: 8px;
    max-width: 150px;
    border-radius: 6px;
  }
}
</style>
