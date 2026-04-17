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
  /** 实时更新路径顶点手柄位置（拖拽中同步） */
  updatePathVertexHandlesPosition?: (sectionId: string, x: number, y: number) => void
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
  /** 更新选中视觉效果 */
  updateSelectionVisuals: () => void
}

// ==================== Main Composable ====================

export function useKonvaTransformer(options: UseKonvaTransformerOptions): UseKonvaTransformerReturn {
  const { overlayLayer, mainLayer, dragLayer, stage, nodeMap, setIsSyncing, updatePathVertexHandlesPosition } = options
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
      anchorStrokeWidth: 1,
      anchorSize: 6,  // 手柄大小从 8 改为 6
      anchorCornerRadius: 3,

      rotateAnchorOffset: 25,  // 旋转手柄偏移从 30 改为 25
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
    } else {
      // 处理分区标签节点（只同步位置，不参与缩放旋转）
      const isSectionLabel = node.getAttr('isSectionLabel') as boolean
      if (isSectionLabel) {
        // 标签只更新位置，保持文字不旋转
        node.rotation(0)
        node.scaleX(1)
        node.scaleY(1)
        return
      }
      
      // 处理分区边框节点
      const sectionId = node.getAttr('sectionId') as string
      if (sectionId) {
        const scaleX = node.scaleX()
        const scaleY = node.scaleY()
        const updates: any = { 
          borderX: node.x(), 
          borderY: node.y(),
          rotation: node.rotation()
        }
        
        // 对于矩形和椭圆，缩放会改变宽高/半径
        const borderType = node.getAttr('borderType') as string
        if (borderType === 'rect') {
          const width = node.getAttr('width') || 100
          const height = node.getAttr('height') || 100
          updates.borderWidth = width * scaleX
          updates.borderHeight = height * scaleY
        } else if (borderType === 'ellipse') {
          const radiusX = node.getAttr('radiusX') || 50
          const radiusY = node.getAttr('radiusY') || 50
          updates.borderRadiusX = radiusX * scaleX
          updates.borderRadiusY = radiusY * scaleY
        }
        
        venueStore.updateSectionBorder(sectionId, updates)
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

    // 添加选中的分区边框节点和标签
    venueStore.selectedSectionIds.forEach(id => {
      const borderNode = nodeMap.get('sectionBorder_' + id)
      const labelNode = nodeMap.get('sectionLabel_' + id)
      if (borderNode) {
        selectedNodes.push(borderNode)
        borderNode.draggable(true)
      }
      if (labelNode) {
        selectedNodes.push(labelNode)
        labelNode.draggable(true)
      }
    })

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
      // 清除缓存确保 Transformer 重新计算包围盒
      transformer.nodes().forEach(node => node.clearCache())
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

    // 确保所有节点处于可拖拽状态
    selectedNodes.forEach(node => node.draggable(true))

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
        
        // 如果是 Section 边框，实时更新顶点手柄位置
        const sectionId = item.node.getAttr('sectionId') as string
        const borderType = item.node.getAttr('borderType') as string
        if (sectionId && borderType && updatePathVertexHandlesPosition) {
          updatePathVertexHandlesPosition(sectionId, item.startX + dx, item.startY + dy)
        }
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

    const moved = unifiedDragState.items.some(item =>
      Math.abs(item.node.x() - item.startX) > 2 ||
      Math.abs(item.node.y() - item.startY) > 2
    )

    unifiedDragState.active = false
    unifiedDragState.useDragLayer = false

    if (stage) stage.container().style.cursor = 'default'

    if (moved) {
      // 先设置同步标志，阻止 watch 触发 renderAll（防止 destroy 正在操作的节点）
      setIsSyncing(true)

      // 再把节点移回 mainLayer（此时 isSyncingFromTransformer=true，watch 被阻断）
      if (dragLayer && mainLayer) {
        unifiedDragState.items.forEach(item => {
          // getParent() 为 null 表示节点已被 destroy/remove，跳过
          if (item.node.getParent() === null) return
          const currentRotation = item.node.rotation()
          item.node.moveTo(mainLayer)
          item.node.rotation(currentRotation)
        })
        dragLayer.visible(false)
      }

      // 先设置 isSyncing 为 false，让 store 更新能触发 renderAll
      setIsSyncing(false)
      
      unifiedDragState.items.forEach(item => {
        syncNodeDragToStore(item)
      })

      updateTransformer(true)
    } else {
      // 未移动：也要把节点移回 mainLayer
      if (dragLayer && mainLayer) {
        unifiedDragState.items.forEach(item => {
          if (item.node.getParent() === null) return
          const currentRotation = item.node.rotation()
          item.node.moveTo(mainLayer)
          item.node.rotation(currentRotation)
        })
        dragLayer.visible(false)
      }
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
    const sectionId = node.getAttr('sectionId') as string
    const borderType = node.getAttr('borderType') as string

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
    } else if (sectionId && borderType) {
      // Section 边框拖拽 - 更新 borderX, borderY
      // 需要获取相对于 Stage 的绝对坐标（因为节点可能在 dragLayer 中）
      const absolutePos = node.getAbsolutePosition()
      venueStore.updateSectionBorder(sectionId, { 
        borderX: absolutePos.x, 
        borderY: absolutePos.y,
        rotation: node.rotation() 
      })
    }
  }

  // ==================== 选中视觉效果 ====================

  const updateSelectionVisuals = () => {
    if (!mainLayer) return

    // 为所有节点移除选中效果
    nodeMap.forEach((node, id) => {
      const name = node.name() || ''

      if (name.includes('row-shape')) {
        // 排的选择效果在 sceneFunc 中处理
        node.setAttr('selected', venueStore.selectedRowIds.includes(id))
      } else if (name.includes('shape-object') || name.includes('area-object')) {
        const isSelected = venueStore.selectedShapeIds.includes(id) || venueStore.selectedAreaIds.includes(id)
        const shapeNode = node as Konva.Shape
        if (isSelected) {
          // 保存原始 stroke（如果还没保存的话）
          if (shapeNode.getAttr('_originalStroke') === undefined) {
            shapeNode.setAttr('_originalStroke', shapeNode.stroke())
            shapeNode.setAttr('_originalStrokeWidth', shapeNode.strokeWidth())
          }
          shapeNode.stroke('#3b82f6')
          shapeNode.strokeWidth(2)
        } else {
          // 恢复原始 stroke
          const origStroke = shapeNode.getAttr('_originalStroke')
          const origWidth = shapeNode.getAttr('_originalStrokeWidth')
          shapeNode.stroke(origStroke !== undefined ? origStroke : undefined)
          shapeNode.strokeWidth(origWidth !== undefined ? origWidth : 0)
          shapeNode.setAttr('_originalStroke', undefined)
          shapeNode.setAttr('_originalStrokeWidth', undefined)
        }
      } else if (name.includes('text-object')) {
        const isSelected = venueStore.selectedTextIds.includes(id)
        node.setAttr('selected', isSelected)
      }
    })

    // 重绘以更新选中效果
    mainLayer.batchDraw()
  }

  // ==================== Return ====================

  return {
    get transformer() { return transformer },
    unifiedDragState,
    initTransformer,
    updateTransformer,
    startDragAll,
    updateDragAll,
    endDragAll,
    updateSelectionVisuals
  }
}
