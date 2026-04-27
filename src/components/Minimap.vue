<template>
  <div ref="containerRef" class="minimap">
    <canvas ref="canvasRef"></canvas>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue'

const props = defineProps<{
  seatMapViewer: any  // SeatMapViewer 的 ref
  venue: any  // VenueData，用于获取分区信息
}>()

const containerRef = ref<HTMLDivElement>()
const canvasRef = ref<HTMLCanvasElement>()

// 缓存 venueBounds，只在第一次计算，避免缩放时跳动
let cachedVenueBounds: { x: number; y: number; width: number; height: number } | null = null

// 响应式尺寸：根据容器宽度计算，最大 200px
const minimapSize = computed(() => {
  const containerWidth = containerRef.value?.clientWidth || 200
  return Math.min(containerWidth, 200)
})

// 渲染 Minimap
const renderMinimap = () => {
  if (!props.seatMapViewer || !canvasRef.value) return
  
  const canvas = canvasRef.value
  const size = minimapSize.value
  canvas.width = size * 2  // 2倍分辨率，更清晰
  canvas.height = size * 0.65 * 2  // 4:3 比例
  
  const ctx = canvas.getContext('2d')!
  ctx.clearRect(0, 0, canvas.width, canvas.height)
  
  // 获取舞台状态
  const stageState = props.seatMapViewer.getStageState()
  
  // 【关键】使用缓存的 venueBounds，只在第一次计算，避免缩放时跳动
  if (!cachedVenueBounds) {
    cachedVenueBounds = props.seatMapViewer.getVenueBounds()
  }
  const venueBounds = cachedVenueBounds
  
  const selectedSeats = props.seatMapViewer.getSelectedSeats()
  
  // 如果没有内容，不渲染
  if (!venueBounds || venueBounds.width === 0 || venueBounds.height === 0) return
  
  // 计算 Minimap 的缩放比例，让内容完全居中显示，不留太多空白
  const padding = 5 * 2  // 减少内边距，2倍分辨率
  const minimapWidth = canvas.width - padding * 2
  const minimapHeight = canvas.height - padding * 2
  
  // 计算基础缩放：让所有内容刚好适应 Minimap（不留太多空白）
  const minimapScaleX = minimapWidth / venueBounds!.width
  const minimapScaleY = minimapHeight / venueBounds!.height
  const minimapScale = Math.min(minimapScaleX, minimapScaleY)
  
  // 计算内容在 Minimap 中的偏移（完全居中）
  const contentWidth = venueBounds!.width * minimapScale
  const contentHeight = venueBounds!.height * minimapScale
  const offsetX = padding + (minimapWidth - contentWidth) / 2
  const offsetY = padding + (minimapHeight - contentHeight) / 2
  
  // 1. 先绘制白色背景
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  
  // 2. 绘制分区轮廓（完整显示，固定大小，带透明度）
  if (props.venue?.sections) {
    props.venue.sections.forEach((section: any) => {
      if (!section.borderType || section.borderType === 'none') return
      
      ctx.fillStyle = section.borderFill || 'rgba(128, 128, 128, 0.15)'
      ctx.strokeStyle = section.borderStroke || '#808080'
      ctx.lineWidth = 1 * 2
      
      const baseX = offsetX + ((section.borderX || 0) - venueBounds!.x) * minimapScale
      const baseY = offsetY + ((section.borderY || 0) - venueBounds!.y) * minimapScale
      
      if (section.borderType === 'rect') {
        ctx.fillRect(
          baseX,
          baseY,
          (section.borderWidth || 100) * minimapScale,
          (section.borderHeight || 100) * minimapScale
        )
        ctx.strokeRect(
          baseX,
          baseY,
          (section.borderWidth || 100) * minimapScale,
          (section.borderHeight || 100) * minimapScale
        )
      } else if (section.borderType === 'ellipse') {
        ctx.beginPath()
        ctx.ellipse(
          baseX + (section.borderRadiusX || 50) * minimapScale,
          baseY + (section.borderRadiusY || 50) * minimapScale,
          (section.borderRadiusX || 50) * minimapScale,
          (section.borderRadiusY || 50) * minimapScale,
          0,
          0,
          Math.PI * 2
        )
        ctx.fill()
        ctx.stroke()
      } else if (section.borderType === 'polygon' && section.borderPoints) {
        ctx.beginPath()
        section.borderPoints.forEach((point: number, index: number) => {
          const x = baseX + point * minimapScale
          const y = baseY + (section.borderPoints![index + 1]) * minimapScale
          if (index === 0) {
            ctx.moveTo(x, y)
          } else if (index % 2 === 0) {
            ctx.lineTo(x, y)
          }
        })
        ctx.closePath()
        ctx.fill()
        ctx.stroke()
      } else if (section.borderType === 'path' && section.borderPathPoints) {
        ctx.beginPath()
        section.borderPathPoints.forEach((point: any, index: number) => {
          const x = baseX + point.x * minimapScale
          const y = baseY + point.y * minimapScale
          if (index === 0) {
            ctx.moveTo(x, y)
          } else {
            ctx.lineTo(x, y)
          }
        })
        ctx.closePath()
        ctx.fill()
        ctx.stroke()
      }
    })
  }
  
  // 3. 绘制已选座位（红色圆点）
  ctx.fillStyle = '#ef4444'
  selectedSeats.forEach((seat: { x: number; y: number }) => {
    ctx.beginPath()
    ctx.arc(
      offsetX + (seat.x - venueBounds!.x) * minimapScale,
      offsetY + (seat.y - venueBounds!.y) * minimapScale,
      3 * 2,  // 2倍分辨率
      0,
      Math.PI * 2
    )
    ctx.fill()
  })
  
  // 4. 计算视口在世界坐标中的位置和大小
  const viewportWorldX = -stageState.position.x / stageState.scale
  const viewportWorldY = -stageState.position.y / stageState.scale
  const viewportWorldW = stageState.width / stageState.scale
  const viewportWorldH = stageState.height / stageState.scale
  
  // 计算视口在 Minimap 中的位置和大小
  const viewportX = offsetX + (viewportWorldX - venueBounds!.x) * minimapScale
  const viewportY = offsetY + (viewportWorldY - venueBounds!.y) * minimapScale
  const viewportW = viewportWorldW * minimapScale
  const viewportH = viewportWorldH * minimapScale
  
  // 5. 绘制视口外的灰色蒙层（半透明，覆盖在图形上）
  ctx.fillStyle = 'rgba(0, 0, 0, 0.5)'
  
  // 上方蒙层
  ctx.fillRect(0, 0, canvas.width, viewportY)
  // 下方蒙层
  ctx.fillRect(0, viewportY + viewportH, canvas.width, canvas.height - viewportY - viewportH)
  // 左侧蒙层
  ctx.fillRect(0, viewportY, viewportX, viewportH)
  // 右侧蒙层
  ctx.fillRect(viewportX + viewportW, viewportY, canvas.width - viewportX - viewportW, viewportH)
  
  // 6. 绘制视口边框（蓝色）
  ctx.strokeStyle = '#3b82f6'
  ctx.lineWidth = 3 * 2
  ctx.strokeRect(viewportX, viewportY, viewportW, viewportH)
}

// 监听舞台变化
let interval: number | null = null

onMounted(() => {
  // 延迟渲染，确保 SeatMapViewer 已初始化
  setTimeout(() => {
    renderMinimap()
  }, 500)
  
  // 定时更新（100ms）
  interval = setInterval(renderMinimap, 100)
})

onUnmounted(() => {
  if (interval) {
    clearInterval(interval)
  }
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

/* 移动端适配 */
@media (max-width: 768px) {
  .minimap {
    top: 8px;
    right: 8px;
    max-width: 150px;
    border-radius: 6px;
  }
}
</style>
