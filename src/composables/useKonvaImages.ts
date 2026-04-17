/**
 * @file useKonvaImages.ts
 * @brief Konva 图片渲染管理 Composable
 * 
 * 负责底图/图片的加载、缓存、渲染和交互
 */

import Konva from 'konva'
import type { CanvasImage, Position } from '../types'
import { useVenueStore } from '../stores/venueStore'

// ==================== 模块级状态 ====================

const imageCache = new Map<string, HTMLImageElement>()

// ==================== 类型定义 ====================

export interface ImageRenderOptions {
  mainLayer: Konva.Layer | null
  stage: Konva.Stage | null
  nodeMap: Map<string, Konva.Node>
  tfm: {
    updateTransformer: (force?: boolean) => void
    startDragAll: (pointer: Position) => void
  } | null
  isDrawingMode: () => boolean
  isSelecting?: () => boolean  // 框选状态检查
}

// ==================== 核心函数 ====================

/**
 * 渲染所有图片
 */
export function renderImages(options: ImageRenderOptions): void {
  const { mainLayer } = options
  if (!mainLayer) return

  const venueStore = useVenueStore()
  const images = venueStore.canvasImages
  if (!images || images.length === 0) return

  images.forEach(canvasImage => {
    // 检查缓存
    const cachedImage = imageCache.get(canvasImage.src)
    if (cachedImage && cachedImage.complete) {
      createImageNode(canvasImage, cachedImage, options)
      return
    }

    // 异步加载图片
    const imageObj = new Image()
    imageObj.onload = () => {
      imageCache.set(canvasImage.src, imageObj)
      createImageNode(canvasImage, imageObj, options)
    }
    imageObj.onerror = () => {
      console.error('[图片] 加载失败:', canvasImage.fileName)
    }
    imageObj.src = canvasImage.src
  })
}

/**
 * 创建图片节点
 */
export function createImageNode(
  canvasImage: CanvasImage,
  imageObj: HTMLImageElement,
  options: ImageRenderOptions
): void {
  const { mainLayer, nodeMap, stage, tfm, isDrawingMode } = options
  if (!mainLayer) return

  const venueStore = useVenueStore()

  // 防止重复创建：如果已存在则直接更新属性
  const existing = nodeMap.get(canvasImage.id) as Konva.Image | undefined
  if (existing) {
    existing.x(canvasImage.x)
    existing.y(canvasImage.y)
    existing.width(canvasImage.width)
    existing.height(canvasImage.height)
    existing.rotation(canvasImage.rotation || 0)
    existing.opacity(canvasImage.opacity ?? 1)
    existing.zIndex(canvasImage.zIndex ?? 0)
    // 锁定时禁止事件穿透，解锁时恢复
    existing.listening(!canvasImage.locked)
    existing.setAttr('canvasImageData', canvasImage)
    mainLayer.batchDraw()
    return
  }

  const konvaImage = new Konva.Image({
    x: canvasImage.x,
    y: canvasImage.y,
    width: canvasImage.width,
    height: canvasImage.height,
    rotation: canvasImage.rotation || 0,
    opacity: canvasImage.opacity ?? 1,
    image: imageObj,
    id: `image-${canvasImage.id}`,
    name: 'canvas-image',
    // 锁定时不响应事件
    listening: !canvasImage.locked
  })

  // 设置层级（必须在添加到图层后生效）
  konvaImage.zIndex(canvasImage.zIndex ?? 0)

  konvaImage.setAttr('canvasImageData', canvasImage)

  // 图片点击选中
  konvaImage.on('mousedown', (e) => {
    if (e.evt.button !== 0) return
    if (isDrawingMode()) return
    if (options.isSelecting?.()) return  // 框选模式下不触发选中

    // 实时读取最新锁定状态
    const latestData = konvaImage.getAttr('canvasImageData') as CanvasImage
    if (latestData?.locked) return

    e.cancelBubble = true

    const isAlreadySelected = venueStore.selectedImageId === latestData.id
    if (!isAlreadySelected) {
      const additive = e.evt.shiftKey
      venueStore.selectCanvasImage(latestData.id, additive)
      tfm?.updateTransformer(true)
    }

    // 启动统一拖拽
    if (stage && tfm) {
      const pointer = stage.getPointerPosition()
      if (pointer) {
        tfm.startDragAll(pointer)
      }
    }
  })

  // 注册到 nodeMap
  nodeMap.set(canvasImage.id, konvaImage)
  mainLayer.add(konvaImage)
  mainLayer.batchDraw()
}

/**
 * 同步图片节点（响应数据变化）
 */
export function syncImageNodes(
  newImages: CanvasImage[],
  options: ImageRenderOptions
): void {
  const { mainLayer, nodeMap } = options
  if (!mainLayer) return

  const currentIds = new Set(newImages.map(img => img.id))

  // 删除不存在的图片节点
  mainLayer.children?.forEach(node => {
    if (node.name() === 'canvas-image') {
      const id = node.id().replace('image-', '')
      if (!currentIds.has(id)) {
        node.destroy()
        nodeMap.delete(id)
      }
    }
  })

  // 更新或创建图片
  newImages.forEach(img => {
    const existingNode = nodeMap.get(img.id) as Konva.Image | undefined

    if (existingNode) {
      // 更新现有节点
      const cachedImage = imageCache.get(img.src)
      if (cachedImage && cachedImage.complete) {
        existingNode.image(cachedImage)
      }
      existingNode.x(img.x)
      existingNode.y(img.y)
      existingNode.width(img.width)
      existingNode.height(img.height)
      existingNode.rotation(img.rotation || 0)
      existingNode.opacity(img.opacity ?? 1)
      existingNode.zIndex(img.zIndex ?? 0)
      existingNode.listening(!img.locked)
      existingNode.setAttr('canvasImageData', img)
      mainLayer.batchDraw()
    } else {
      // 创建新节点
      const cachedImage = imageCache.get(img.src)
      if (cachedImage && cachedImage.complete) {
        createImageNode(img, cachedImage, options)
      } else {
        // 异步加载
        const imageObj = new Image()
        imageObj.onload = () => {
          imageCache.set(img.src, imageObj)
          createImageNode(img, imageObj, options)
        }
        imageObj.src = img.src
      }
    }
  })
}

/**
 * 清除图片缓存
 */
export function clearImageCache(): void {
  imageCache.clear()
}

/**
 * 获取缓存的图片
 */
export function getCachedImage(src: string): HTMLImageElement | undefined {
  return imageCache.get(src)
}
