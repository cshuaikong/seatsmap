/**
 * @file useKonvaViewport.ts
 * @brief Konva 视口管理 Composable
 *
 * 职责：
 * 1. 滚轮缩放（handleWheel）
 * 2. 视口边界计算（getViewportBounds）
 * 3. 视口剔除优化（updateViewportCulling）
 *
 * 从 KonvaRenderer.vue 拆分出来
 */

import Konva from 'konva'

// ==================== 常量 ====================

const VIEWPORT_PADDING = 200 // 视口外扩像素
const MIN_SCALE = 0.001  // 最小缩放 0.1%，几乎无限制
const MAX_SCALE = 500    // 最大缩放 500x，几乎无限制

// ==================== 类型定义 ====================

export interface ViewportBounds {
  minX: number
  maxX: number
  minY: number
  maxY: number
}

export interface UseKonvaViewportOptions {
  stage: Konva.Stage | null
  mainLayer: Konva.Layer | null
  nodeMap: Map<string, Konva.Node>
  /** 缩放变化回调（用于同步外部状态） */
  onScaleChange?: (scale: number) => void
}

export interface UseKonvaViewportReturn {
  /** 滚轮缩放处理 */
  handleWheel: (e: Konva.KonvaEventObject<WheelEvent>) => void
  /** 获取视口边界 */
  getViewportBounds: () => ViewportBounds | null
  /** 更新视口剔除 */
  updateViewportCulling: () => void
  /** 检查节点是否在视口内 */
  isNodeInViewport: (node: Konva.Node, viewport: ViewportBounds) => boolean
}

// ==================== Main Composable ====================

export function useKonvaViewport(options: UseKonvaViewportOptions): UseKonvaViewportReturn {
  const { stage, mainLayer, nodeMap, onScaleChange } = options

  // ==================== 滚轮缩放 ====================

  const handleWheel = (e: Konva.KonvaEventObject<WheelEvent>) => {
    if (!stage) return

    const oldScale = stage.scaleX()
    const pointer = stage.getPointerPosition()
    if (!pointer) return

    // 计算新的缩放比例
    const scaleBy = 1.1
    const direction = e.evt.deltaY > 0 ? -1 : 1
    const newScale = direction > 0 ? oldScale * scaleBy : oldScale / scaleBy

    // 限制缩放范围
    if (newScale < MIN_SCALE || newScale > MAX_SCALE) return

    // 计算鼠标位置对应的舞台坐标
    const mousePointTo = {
      x: (pointer.x - stage.x()) / oldScale,
      y: (pointer.y - stage.y()) / oldScale
    }

    // 应用新的缩放
    stage.scale({ x: newScale, y: newScale })

    // 计算新的位置，使鼠标指向的点保持不变
    const newPos = {
      x: pointer.x - mousePointTo.x * newScale,
      y: pointer.y - mousePointTo.y * newScale
    }

    stage.position(newPos)
    onScaleChange?.(newScale)

    // 更新视口剔除
    updateViewportCulling()
    mainLayer?.batchDraw()
  }

  // ==================== 视口边界计算 ====================

  const getViewportBounds = (): ViewportBounds | null => {
    if (!stage) return null

    const width = stage.width()
    const height = stage.height()
    const scale = stage.scaleX()
    const x = stage.x()
    const y = stage.y()

    // 计算视口在舞台坐标系中的边界
    const minX = (-x - VIEWPORT_PADDING) / scale
    const maxX = (-x + width + VIEWPORT_PADDING) / scale
    const minY = (-y - VIEWPORT_PADDING) / scale
    const maxY = (-y + height + VIEWPORT_PADDING) / scale

    return { minX, maxX, minY, maxY }
  }

  // ==================== 视口剔除 ====================

  const updateViewportCulling = () => {
    if (!stage || !mainLayer) return

    const viewport = getViewportBounds()
    if (!viewport) return

    // 批量更新可见性
    nodeMap.forEach((node) => {
      const shouldBeVisible = isNodeInViewport(node, viewport)
      if (node.visible() !== shouldBeVisible) {
        node.visible(shouldBeVisible)
      }
    })

    mainLayer.batchDraw()
  }

  // ==================== 节点视口检测 ====================

  const isNodeInViewport = (node: Konva.Node, viewport: ViewportBounds): boolean => {
    const rect = node.getClientRect()
    return (
      rect.x + rect.width >= viewport.minX &&
      rect.x <= viewport.maxX &&
      rect.y + rect.height >= viewport.minY &&
      rect.y <= viewport.maxY
    )
  }

  // ==================== Return ====================

  return {
    handleWheel,
    getViewportBounds,
    updateViewportCulling,
    isNodeInViewport
  }
}
