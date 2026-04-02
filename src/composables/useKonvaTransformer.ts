/**
 * @file useKonvaTransformer.ts
 * @brief Konva Transformer + 统一拖拽系统 Composable
 *
 * 职责：
 * 1. 初始化并管理 Transformer（旋转/缩放）
 * 2. transformend 后将变换结果同步到 store
 * 3. 统一拖拽系统（多选性能优化：dragLayer 切换）
 * 4. 拖拽结束后将位移同步到 store
 *
 * 从 KonvaRenderer.vue 拆分出来
 */

import Konva from 'konva'
import { useVenueStore } from '../stores/venueStore'
import type { SeatRow, ShapeObject, TextObject, AreaObject, CanvasImage } from '../types'

// ==================== 类型定义 ====================

export interface DragAllItem {
  node: Konva.Node
  startX: number
  startY: number
}

export interface UnifiedDragState {
  active: boolean
  startScreenX: number
  startScreenY: number
  currentX: number
  currentY: number
  items: DragAllItem[]
  useDragLayer: boolean
}

export interface UseKonvaTransformerOptions {
  overlayLayer: Konva.Layer | null
  mainLayer: Konva.Layer | null
  dragLayer: Konva.Layer | null
  stage: Konva.Stage | null
  nodeMap: Map<string, Konva.Node>
  /** 同步完成后触发 watch 的防重入标志，由外部传入 setter */
  setIsSyncing: (val: boolean) => void
}

export interface UseKonvaTransformerReturn {
  transformer: Konva.Transformer | null
  unifiedDragState: UnifiedDragState
  /** 初始化 Transformer（挂载后调用） */
  initTransformer: () => void
  /** 根据 store 选中状态更新 Transformer 节点 */
  updateTransformer: (forceUpdate?: boolean) => void
  /** 开始统一拖拽 */
  startDragAll: (screenPos: { x: number; y: number }, isRotation?: boolean) => void
  /** 拖拽进行中更新 */
  updateDragAll: (screenPos: { x: number; y: number }) => void
  /** 结束拖拽并同步到 store */
  endDragAll: () => boolean
}

// ==================== Main Composable ====================

export function useKonvaTransformer(options: UseKonvaTransformerOptions): UseKonvaTransformerReturn {
  const { overlayLayer, mainLayer, dragLayer, stage, nodeMap, setIsSyncing } = options
  const venueStore = useVenueStore()

  // ==================== State ====================

  let transformer: Konva.Transformer | null = null
  let dragAnimationFrameId: number | null = null

  const unifiedDragState: UnifiedDragState = {
    active: false,
    startScreenX: 0,
    startScreenY: 0,
    currentX: 0,
    currentY: 0,
    items: [],
    useDragLayer: false
  }

  // ==================== Transformer 初始化 ====================

  const initTransformer = () => {
    if (!overlayLayer) return

    transformer = new Konva.Transformer({
      rotateEnabled: true,
      resizeEnabled: true,
      rotationSnaps: [0, 45, 90, 135, 180, 225, 270, 315],
      rotationSnapTolerance: 5,
      padding: 0,
      visible: false,

      borderStroke: '#3b82f6',
      borderStrokeWidth: 1,

      anchorFill: '#ffffff',
      anchorStroke: '#3b82f6',
      anchorStrokeWidth: 1.5,
      anchorSize: 8,

      rotateAnchorOffset: 30,
      rotateAnchorCursor: 'crosshair'
    })

    // transformend：同步变换结果到 store
    transformer.on('transformend', () => {
      setIsSyncing(true)

      const nodes = transformer?.nodes() || []
      nodes.forEach((node) => {
        syncNodeTransformToStore(node)
      })

      updateTransformer(true)

      setTimeout(() => setIsSyncing(false), 0)
    })

    overlayLayer.add(transformer)
  }

  // ==================== 同步变换结果到 store ====================

  const syncNodeTransformToStore = (node: Konva.Node) => {
    const rowData = node.getAttr('rowData') as SeatRow
    const shapeData = node.getAttr('shapeData') as ShapeObject
    const textData = node.getAttr('textData') as TextObject
    const areaData = node.getAttr('areaData') as AreaObject
    const imageData = node.getAttr('canvasImageData') as CanvasImage

    if (imageData) {
      const scaleX = node.scaleX()
      const scaleY = node.scaleY()
      const newWidth = imageData.width * scaleX
      const newHeight = imageData.height * scaleY

      node.scaleX(1)
      node.scaleY(1)
      ;(node as Konva.Image).width(newWidth)
      ;(node as Konva.Image).height(newHeight)

      const updatedImage = { ...imageData, x: node.x(), y: node.y(), width: newWidth, height: newHeight, rotation: node.rotation() }
      node.setAttr('canvasImageData', updatedImage)

      venueStore.updateCanvasImage(imageData.id, {
        x: node.x(), y: node.y(), width: newWidth, height: newHeight, rotation: node.rotation()
      })
    } else if (rowData) {
      venueStore.updateRow(rowData.id, {
        x: node.x(), y: node.y(), rotation: node.rotation()
      })
      node.scaleX(1)
      node.scaleY(1)
    } else if (shapeData) {
      const scaleX = node.scaleX()
      const scaleY = node.scaleY()
      const updates: any = { x: node.x(), y: node.y(), rotation: node.rotation() }

      if (shapeData.type === 'rect' || shapeData.type === 'ellipse') {
        updates.width = (shapeData.width || 100) * scaleX
        updates.height = (shapeData.height || 100) * scaleY
      }

      venueStore.updateShape(shapeData.id, updates)
      node.scaleX(1)
      node.scaleY(1)
    } else if (textData) {
      const scaleX = node.scaleX()
      const scaleY = node.scaleY()
      const avgScale = (scaleX + scaleY) / 2
      const updates: any = { x: node.x(), y: node.y(), rotation: node.rotation() }

      if (avgScale !== 1) {
        updates.fontSize = Math.round((textData.fontSize || 16) * avgScale)
      }

      venueStore.updateText(textData.id, updates)
      node.scaleX(1)
      node.scaleY(1)
    } else if (areaData) {
      const scaleX = node.scaleX()
      const scaleY = node.scaleY()
      const dx = node.x()
      const dy = node.y()

      if (dx !== 0 || dy !== 0 || scaleX !== 1 || scaleY !== 1) {
        const newPoints = areaData.points.map((val: number, idx: number) =>
          idx % 2 === 0 ? val * scaleX + dx : val * scaleY + dy
        )
        venueStore.updateArea(areaData.id, { points: newPoints })
        node.position({ x: 0, y: 0 })
        node.scaleX(1)
        node.scaleY(1)
      }
    }
  }

  // ==================== 更新 Transformer 节点 ====================

  const updateTransformer = (forceUpdate = false) => {
    if (!transformer) return

    const selectedNodes: Konva.Node[] = []

    venueStore.selectedRowIds.forEach(id => {
      const node = nodeMap.get(id)
      if (node) {
        selectedNodes.push(node)
        node.draggable(true)
      }
    })

    venueStore.selectedShapeIds.forEach(id => {
      const node = nodeMap.get(id)
      if (node) selectedNodes.push(node)
    })

    venueStore.selectedTextIds.forEach(id => {
      const node = nodeMap.get(id)
      if (node) selectedNodes.push(node)
    })

    venueStore.selectedAreaIds.forEach(id => {
      const node = nodeMap.get(id)
      if (node) selectedNodes.push(node)
    })

    if (venueStore.selectedImageId) {
      const node = nodeMap.get(venueStore.selectedImageId)
      if (node) selectedNodes.push(node)
    }

    // 未选中的排禁用拖拽
    nodeMap.forEach((node, id) => {
      const name = node.name() || ''
      if (name.includes('row-shape')) {
        node.draggable(venueStore.selectedRowIds.includes(id))
      }
    })

    if (selectedNodes.length > 0) {
      const currentNodes = transformer.nodes()

      const isImageOnly = venueStore.selectedImageId !== null &&
        venueStore.selectedRowIds.length === 0 &&
        venueStore.selectedShapeIds.length === 0 &&
        venueStore.selectedTextIds.length === 0 &&
        venueStore.selectedAreaIds.length === 0

      if (isImageOnly) {
        transformer.setAttrs({
          resizeEnabled: true,
          keepRatio: true,
          enabledAnchors: ['top-left', 'top-right', 'bottom-left', 'bottom-right']
        })
      } else {
        transformer.setAttrs({
          resizeEnabled: false,
          keepRatio: false,
          enabledAnchors: []
        })
      }

      if (forceUpdate ||
        currentNodes.length !== selectedNodes.length ||
        !currentNodes.every((node, i) => node === selectedNodes[i])) {
        transformer.nodes(selectedNodes)
        transformer.visible(true)
      }
      transformer.forceUpdate()
    } else {
      transformer.nodes([])
      transformer.visible(false)
    }

    if (selectedNodes.length > 0) {
      overlayLayer?.moveToTop()
    }

    overlayLayer?.batchDraw()
  }

  // ==================== 统一拖拽系统 ====================

  const startDragAll = (screenPos: { x: number; y: number }, isRotation = false) => {
    if (!transformer) return

    const selectedNodes = transformer.nodes()
    if (selectedNodes.length === 0) return

    unifiedDragState.active = true
    unifiedDragState.startScreenX = screenPos.x
    unifiedDragState.startScreenY = screenPos.y
    unifiedDragState.useDragLayer = !isRotation
    unifiedDragState.items = selectedNodes.map(node => ({
      node,
      startX: node.x(),
      startY: node.y()
    }))

    if (dragLayer && mainLayer && unifiedDragState.useDragLayer) {
      unifiedDragState.items.forEach(item => {
        const currentRotation = item.node.rotation()
        item.node.moveTo(dragLayer)
        item.node.rotation(currentRotation)
      })
      dragLayer.visible(true)
      dragLayer.listening(false)
      dragLayer.batchDraw()
    }

    if (stage) stage.container().style.cursor = 'grabbing'
  }

  const updateDragAll = (screenPos: { x: number; y: number }) => {
    if (!unifiedDragState.active || !stage) return

    unifiedDragState.currentX = screenPos.x
    unifiedDragState.currentY = screenPos.y

    if (dragAnimationFrameId) return

    dragAnimationFrameId = requestAnimationFrame(() => {
      dragAnimationFrameId = null
      if (!unifiedDragState.active || !stage) return

      const scaleVal = stage.scaleX()
      const dx = (screenPos.x - unifiedDragState.startScreenX) / scaleVal
      const dy = (screenPos.y - unifiedDragState.startScreenY) / scaleVal

      unifiedDragState.items.forEach(item => {
        item.node.setAttrs({ x: item.startX + dx, y: item.startY + dy })
      })

      if (unifiedDragState.useDragLayer) {
        dragLayer?.batchDraw()
      } else {
        mainLayer?.batchDraw()
      }

      transformer?.forceUpdate()
      overlayLayer?.batchDraw()
    })
  }

  /** @returns 是否有实际移动（用于外部判断 justDragged） */
  const endDragAll = (): boolean => {
    if (!unifiedDragState.active) return false

    if (dragAnimationFrameId) {
      cancelAnimationFrame(dragAnimationFrameId)
      dragAnimationFrameId = null
    }

    if (dragLayer && mainLayer && unifiedDragState.useDragLayer) {
      unifiedDragState.items.forEach(item => {
        const currentRotation = item.node.rotation()
        item.node.moveTo(mainLayer)
        item.node.rotation(currentRotation)
      })
      dragLayer.visible(false)
    }

    const moved = unifiedDragState.items.some(item =>
      Math.abs(item.node.x() - item.startX) > 2 ||
      Math.abs(item.node.y() - item.startY) > 2
    )

    unifiedDragState.active = false
    unifiedDragState.useDragLayer = false

    if (stage) stage.container().style.cursor = 'default'

    if (moved) {
      setIsSyncing(true)

      unifiedDragState.items.forEach(item => {
        syncNodeDragToStore(item)
      })

      updateTransformer(true)
      setTimeout(() => setIsSyncing(false), 0)
    }

    unifiedDragState.items = []

    mainLayer?.batchDraw()
    overlayLayer?.batchDraw()

    return moved
  }

  // ==================== 同步拖拽位移到 store ====================

  const syncNodeDragToStore = (item: DragAllItem) => {
    const { node } = item
    const rowData = node.getAttr('rowData') as SeatRow
    const shapeData = node.getAttr('shapeData') as ShapeObject
    const textData = node.getAttr('textData') as TextObject
    const areaData = node.getAttr('areaData') as AreaObject
    const imageData = node.getAttr('canvasImageData') as CanvasImage

    if (imageData) {
      const updatedImgData = { ...imageData, x: node.x(), y: node.y(), rotation: node.rotation() }
      node.setAttr('canvasImageData', updatedImgData)
      venueStore.updateCanvasImage(imageData.id, { x: node.x(), y: node.y(), rotation: node.rotation() })
    } else if (rowData) {
      venueStore.updateRow(rowData.id, { x: node.x(), y: node.y(), rotation: node.rotation() })
    } else if (shapeData) {
      const scaleX = node.scaleX()
      const scaleY = node.scaleY()
      const updates: any = { x: node.x(), y: node.y(), rotation: node.rotation() }

      if (shapeData.type === 'rect' || shapeData.type === 'ellipse') {
        updates.width = (shapeData.width || 100) * scaleX
        updates.height = (shapeData.height || 100) * scaleY
      }

      venueStore.updateShape(shapeData.id, updates)
      node.scaleX(1)
      node.scaleY(1)
    } else if (textData) {
      const scaleX = node.scaleX()
      const scaleY = node.scaleY()
      const avgScale = (scaleX + scaleY) / 2
      const updates: any = { x: node.x(), y: node.y(), rotation: node.rotation() }

      if (avgScale !== 1) {
        updates.fontSize = Math.round((textData.fontSize || 16) * avgScale)
      }

      venueStore.updateText(textData.id, updates)
      node.scaleX(1)
      node.scaleY(1)
    } else if (areaData) {
      const dx = node.x()
      const dy = node.y()
      if (dx !== 0 || dy !== 0) {
        const newPoints = areaData.points.map((val: number, idx: number) =>
          idx % 2 === 0 ? val + dx : val + dy
        )
        venueStore.updateArea(areaData.id, { points: newPoints })
        node.position({ x: 0, y: 0 })
      }
    }
  }

  // ==================== Return ====================

  return {
    get transformer() { return transformer },
    unifiedDragState,
    initTransformer,
    updateTransformer,
    startDragAll,
    updateDragAll,
    endDragAll
  }
}
