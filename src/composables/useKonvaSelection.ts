/**
 * @file useKonvaSelection.ts
 * @brief Konva 框选功能 Composable
 * 
 * 职责：管理框选状态、框选框渲染、框选命中检测
 * 从 KonvaRenderer.vue 拆分出来
 */

import Konva from 'konva'

// ==================== 类型定义 ====================

export interface SelectionRect {
  x: number
  y: number
  width: number
  height: number
}

export interface SelectionResult {
  rowIds: string[]
  seatIds: string[]
  shapeIds: string[]
  textIds: string[]
  areaIds: string[]
  sectionIds: string[]
}

export interface UseKonvaSelectionOptions {
  /** Konva Stage 实例 */
  stage: Konva.Stage | null
  /** 覆盖层 Layer */
  overlayLayer: Konva.Layer | null
  /** 节点映射表 (id -> Konva Node) */
  nodeMap: Map<string, Konva.Node>
  /** 框选完成回调 */
  onSelectionEnd?: (result: SelectionResult, additive: boolean) => void
}

export interface UseKonvaSelectionReturn {
  /** 是否正在框选 */
  isSelecting: boolean
  /** 是否有拖动（用于区分框选和单击） */
  hasDragged: boolean
  /** 初始化框选框 */
  initSelectionRect: () => void
  /** 开始框选 */
  startBoxSelection: (screenPos: { x: number; y: number }) => void
  /** 更新框选框 */
  updateBoxSelection: (screenPos: { x: number; y: number }) => void
  /** 结束框选 */
  endBoxSelection: (additive: boolean) => void
  /** 重置框选状态 */
  resetSelectionState: () => void
}

// ==================== 框选框样式配置 ====================

const SELECTION_RECT_STYLE = {
  fill: 'rgba(59, 130, 246, 0.1)',
  stroke: '#3b82f6',
  strokeWidth: 1,
  dash: [4, 4],
  visible: false,
  listening: false
}

// ==================== 最小拖动距离 ====================

const MIN_DRAG_DISTANCE = 3

// ==================== 最小框选区域 ====================

const MIN_SELECTION_SIZE = 5

// ==================== Main Composable ====================

export function useKonvaSelection(options: UseKonvaSelectionOptions): UseKonvaSelectionReturn {
  const { stage, overlayLayer, nodeMap, onSelectionEnd } = options

  // ==================== State ====================

  let isSelecting = false
  let hasDragged = false
  let startX = 0
  let startY = 0
  let selectionRect: Konva.Rect | null = null

  // ==================== 初始化 ====================

  const initSelectionRect = () => {
    if (!overlayLayer) return

    selectionRect = new Konva.Rect(SELECTION_RECT_STYLE)
    overlayLayer.add(selectionRect)
  }

  // ==================== 框选操作 ====================

  const startBoxSelection = (screenPos: { x: number; y: number }) => {
    if (!selectionRect || !stage) return

    isSelecting = true
    hasDragged = false
    startX = screenPos.x
    startY = screenPos.y

    selectionRect.setAttrs({
      x: screenPos.x,
      y: screenPos.y,
      width: 0,
      height: 0,
      visible: true
    })

    overlayLayer?.batchDraw()
  }

  const updateBoxSelection = (screenPos: { x: number; y: number }) => {
    if (!selectionRect || !stage) return

    // 检查是否有拖动（移动超过阈值认为是框选）
    const dx = Math.abs(screenPos.x - startX)
    const dy = Math.abs(screenPos.y - startY)
    if (dx > MIN_DRAG_DISTANCE || dy > MIN_DRAG_DISTANCE) {
      hasDragged = true
    }

    // 使用屏幕坐标
    const x = Math.min(startX, screenPos.x)
    const y = Math.min(startY, screenPos.y)
    const width = Math.abs(screenPos.x - startX)
    const height = Math.abs(screenPos.y - startY)

    selectionRect.setAttrs({ x, y, width, height })
    overlayLayer?.batchDraw()
  }

  const endBoxSelection = (additive: boolean) => {
    if (!selectionRect || !stage) return

    isSelecting = false

    // 屏幕坐标 → 舞台坐标
    const selRect = screenToStageRect(selectionRect)

    // 框选区域太小，忽略
    if (selRect.width < MIN_SELECTION_SIZE || selRect.height < MIN_SELECTION_SIZE) {
      selectionRect.visible(false)
      overlayLayer?.batchDraw()
      return
    }

    // 执行命中检测
    const result = performHitTest(selRect)

    // 回调通知
    onSelectionEnd?.(result, additive)

    // 隐藏选择框
    selectionRect.visible(false)
    overlayLayer?.batchDraw()
  }

  // ==================== 坐标转换 ====================

  const screenToStageRect = (rect: Konva.Rect): SelectionRect => {
    const scale = stage!.scaleX()
    const stageX = stage!.x()
    const stageY = stage!.y()

    return {
      x: (rect.x() - stageX) / scale,
      y: (rect.y() - stageY) / scale,
      width: rect.width() / scale,
      height: rect.height() / scale
    }
  }

  // ==================== 命中检测 ====================

  const performHitTest = (selRect: SelectionRect): SelectionResult => {
    const result: SelectionResult = {
      rowIds: [],
      seatIds: [],
      shapeIds: [],
      textIds: [],
      areaIds: [],
      sectionIds: []
    }

    nodeMap.forEach((node, id) => {
      const nodeRect = node.getClientRect({ relativeTo: stage! })

      // AABB 相交检测
      const isIntersecting = (
        nodeRect.x < selRect.x + selRect.width &&
        nodeRect.x + nodeRect.width > selRect.x &&
        nodeRect.y < selRect.y + selRect.height &&
        nodeRect.y + nodeRect.height > selRect.y
      )

      if (isIntersecting) {
        const type = getNodeType(node)
        if (type) {
          result[`${type}Ids`].push(id)
        }
      }
    })

    return result
  }

  // ==================== 节点类型识别 ====================

  const getNodeType = (node: Konva.Node): 'row' | 'seat' | 'shape' | 'text' | 'area' | 'section' | null => {
    const name = node.name() || ''

    if (name.includes('row-shape')) return 'row'
    if (name.includes('seat-hit-area')) return 'seat'
    if (name.includes('shape-object')) return 'shape'
    if (name.includes('text-object')) return 'text'
    if (name.includes('area-object')) return 'area'
    
    // 分区边框节点
    const sectionId = node.getAttr('sectionId') as string
    if (sectionId && !node.getAttr('isSectionLabel')) return 'section'

    return null
  }

  // ==================== 重置 ====================

  const resetSelectionState = () => {
    isSelecting = false
    hasDragged = false
    if (selectionRect) {
      selectionRect.visible(false)
      overlayLayer?.batchDraw()
    }
  }

  // ==================== Return ====================

  return {
    get isSelecting() { return isSelecting },
    get hasDragged() { return hasDragged },
    initSelectionRect,
    startBoxSelection,
    updateBoxSelection,
    endBoxSelection,
    resetSelectionState
  }
}
