import { ref, computed, shallowRef } from 'vue'
import type { Seat, Position, SeatStatus } from '../types'
import { defaultSeatMapConfig } from '../types'
import { generateId } from '../utils/id'

// ==================== 绘制模式类型 ====================

// 数据驱动架构下的绘制模式（与 venueStore 配合）
export type DrawingToolMode =
  // 基础工具
  | 'select'
  | 'pan'
  // 座位绘制
  | 'draw_seat'        // 座位排绘制（直行/弧线）
  // 形状绘制
  | 'draw_rect'        // 矩形
  | 'draw_ellipse'     // 椭圆
  | 'draw_polygon'     // 多边形
  | 'draw_polyline'    // 折线
  | 'draw_sector'      // 扇形
  // 标注工具
  | 'draw_text'        // 文本
  | 'draw_area'        // 区域

// 兼容旧模式（保留原有类型）
export type ToolMode =
  // 基础工具
  | 'select' | 'pan'
  // 座位绘制工具
  | 'single-seat'      // 单座位
  | 'row-straight'     // 直行模式（两点式）
  | 'section'          // 三点式折线行
  | 'section-diagonal' // 对角区块模式
  // 形状绘制工具
  | 'drawCircle' | 'drawRect' | 'drawPolygon' | 'drawPolyline' | 'drawSector'
  // 标注工具
  | 'text' | 'image'
  // 兼容旧模式
  | 'drawRow' | 'drawSegmentRow' | 'drawMultiRow' | 'selectseat'
  | 'drawLine' | 'restroom' | 'drawRoundTable'
  | 'seat' | 'row' | 'section-old' | 'booth' | 'table' | 'shape' | 'stage' 
  | 'drawSeat' | 'drawFreehand' | 'drawLineRow' | 'drawArcRow' | 'drawText' | 'drawStage'
  // 数据驱动新模式
  | DrawingToolMode

// 绘制步骤（三点式绘制使用）
export type DrawStep = 'idle' | 'first' | 'second' | 'third'

export type DrawingState = 'idle' | 'placingSeat' | 'dragging' | 'drawing'

// ==================== 绘制状态类型 ====================

export interface DrawingPreviewState {
  isActive: boolean
  startPos: Position | null
  currentPos: Position | null
  points: Position[]  // 用于多边形/区域的多点绘制
}

// ==================== 几何计算工具 ====================

/** 计算两点间的单位向量和距离 */
export function getUnitVector(from: Position, to: Position): { ux: number; uy: number; dist: number } {
  const dx = to.x - from.x
  const dy = to.y - from.y
  const dist = Math.sqrt(dx * dx + dy * dy)
  if (dist < 0.001) return { ux: 1, uy: 0, dist: 0 }
  return { ux: dx / dist, uy: dy / dist, dist }
}

/** 计算两点间角度（度） */
export function getAngle(from: Position, to: Position): number {
  const dx = to.x - from.x
  const dy = to.y - from.y
  return Math.atan2(dy, dx) * 180 / Math.PI
}

/** 沿方向生成座位坐标列表 */
export function generateSeatsAlongLine(
  count: number,
  startX: number,
  startY: number,
  ux: number,
  uy: number,
  spacing: number,
  startIdOffset = 0
): Seat[] {
  const seats: Seat[] = []
  for (let i = 0; i < count; i++) {
    seats.push({
      id: generateId(),
      label: String(startIdOffset + i + 1),
      x: startX + ux * i * spacing,
      y: startY + uy * i * spacing,
      categoryKey: 1, // 默认分类
      status: 'available',
      objectType: 'seat'
    })
  }
  return seats
}

/** 计算矩形边界框 */
export function calculateBoundingBox(points: Position[]): { x: number; y: number; width: number; height: number } | null {
  if (points.length === 0) return null
  
  let minX = Infinity, minY = Infinity
  let maxX = -Infinity, maxY = -Infinity
  
  points.forEach(p => {
    minX = Math.min(minX, p.x)
    minY = Math.min(minY, p.y)
    maxX = Math.max(maxX, p.x)
    maxY = Math.max(maxY, p.y)
  })
  
  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY
  }
}

/** 将点数组转换为相对坐标（相对于中心点） */
export function toRelativePoints(points: Position[], centerX: number, centerY: number): number[] {
  return points.flatMap(p => [p.x - centerX, p.y - centerY])
}

/** 计算多边形中心点 */
export function calculatePolygonCenter(points: Position[]): Position {
  let sumX = 0, sumY = 0
  points.forEach(p => {
    sumX += p.x
    sumY += p.y
  })
  return {
    x: sumX / points.length,
    y: sumY / points.length
  }
}

// ==================== 主 Hook ====================

export function useDrawing() {
  // ==================== 基础状态 ====================
  
  // 当前工具模式
  const currentTool = ref<ToolMode>('select')
  
  // 绘制状态
  const drawingState = ref<DrawingState>('idle')
  
  // 鼠标位置（用于预览）
  const mousePos = ref<Position>({ x: 0, y: 0 })
  
  // 预览座位位置（吸附后的）
  const previewSeatPos = shallowRef<Position | null>(null)
  const previewSeatRotation = ref(0)
  
  // 是否显示预览
  const showPreview = ref(false)
  
  // 吸附目标信息
  interface RowInfo { id: string; x: number; y: number; rotation: number; seats: Seat[] }
  const snapInfo = ref<{ row: RowInfo | null; index: number }>({ row: null, index: -1 })
  
  // 所有已创建的排
  const rows = ref<RowInfo[]>([])
  
  // 选中的排
  const selectedRowId = ref<string | null>(null)
  
  // 是否正在拖拽
  const isDraggingRow = ref(false)
  const dragStartPos = ref<Position>({ x: 0, y: 0 })
  const draggedRowStartPos = ref<Position>({ x: 0, y: 0 })
  
  // ==================== 数据驱动绘制状态 ====================
  
  // 绘制步骤（用于多点绘制）
  const drawStep = ref<DrawStep>('idle')
  
  // 绘制点记录
  const drawPoints = ref<{
    first: Position | null
    second: Position | null
    third: Position | null
  }>({
    first: null,
    second: null,
    third: null
  })
  
  // 多边形/区域绘制点
  const polygonPoints = ref<Position[]>([])
  
  // 绘制预览状态
  const previewState = ref<DrawingPreviewState>({
    isActive: false,
    startPos: null,
    currentPos: null,
    points: []
  })
  
  // ==================== 常量配置 ====================
  
  // 座位间距（从 defaultSeatMapConfig 导入）
  const SEAT_SPACING = defaultSeatMapConfig.defaultSeatSpacing
  const ROW_SPACING = defaultSeatMapConfig.defaultRowSpacing
  const SNAP_DISTANCE = 40
  const MIN_SHAPE_SIZE = 10  // 最小形状尺寸
  const SNAP_TO_START_DISTANCE = 15  // 多边形闭合吸附距离
  
  // 节流控制
  let lastUpdateTime = 0
  
  // 将全局坐标转换为排的本地坐标
  function globalToLocal(px: number, py: number, row: RowInfo): Position {
    const dx = px - row.x
    const dy = py - row.y
    const angleRad = (-row.rotation * Math.PI) / 180
    const cos = Math.cos(angleRad)
    const sin = Math.sin(angleRad)
    
    return {
      x: dx * cos - dy * sin,
      y: dx * sin + dy * cos
    }
  }
  
  // 将本地坐标转换为全局坐标
  function localToGlobal(lx: number, ly: number, row: RowInfo): Position {
    const angleRad = (row.rotation * Math.PI) / 180
    const cos = Math.cos(angleRad)
    const sin = Math.sin(angleRad)
    
    return {
      x: row.x + lx * cos - ly * sin,
      y: row.y + lx * sin + ly * cos
    }
  }
  
  // 计算点到排线段的最短距离
  function distanceToRow(px: number, py: number, row: RowInfo): { distance: number; closestPoint: Position; t: number } | null {
    if (row.seats.length === 0) return null
    
    // 转换到本地坐标
    const local = globalToLocal(px, py, row)
    
    // 排线段：从 (0,0) 到 ((n-1)*spacing, 0)
    const rowLength = (row.seats.length - 1) * SEAT_SPACING
    
    // 计算点到线段的投影
    let t = 0
    if (rowLength > 0) {
      t = Math.max(0, Math.min(1, local.x / rowLength))
    }
    
    // 线段上最近的点（本地坐标）
    const closestLocalX = t * rowLength
    const closestLocalY = 0
    
    // 转换回全局坐标
    const closestGlobal = localToGlobal(closestLocalX, closestLocalY, row)
    
    // 计算距离
    const dx = px - closestGlobal.x
    const dy = py - closestGlobal.y
    const distance = Math.sqrt(dx * dx + dy * dy)
    
    return { distance, closestPoint: closestGlobal, t }
  }
  
  // 计算吸附位置
  function calculateSnapPosition(px: number, py: number): { pos: Position; rotation: number; snapRow: RowInfo | null; snapIndex: number } {
    let bestSnap: { pos: Position; rotation: number; snapRow: RowInfo | null; snapIndex: number; distance: number } | null = null
    
    // 检查所有排
    for (const row of rows.value) {
      const result = distanceToRow(px, py, row)
      if (!result) continue
      
      if (result.distance < SNAP_DISTANCE) {
        // 计算吸附的座位索引（在座位之间或端点）
        const seatCount = row.seats.length
        
        // 计算最近的座位位置索引
        let seatIndex = Math.round(result.t * (seatCount - 1))
        seatIndex = Math.max(0, Math.min(seatIndex, seatCount))
        
        // 计算该索引位置的全局坐标
        const snapLocalX = seatIndex * SEAT_SPACING
        const snapPos = localToGlobal(snapLocalX, 0, row)
        
        if (!bestSnap || result.distance < bestSnap.distance) {
          bestSnap = {
            pos: snapPos,
            rotation: row.rotation,
            snapRow: row,
            snapIndex: seatIndex,
            distance: result.distance
          }
        }
      }
    }
    
    if (bestSnap) {
      return {
        pos: bestSnap.pos,
        rotation: bestSnap.rotation,
        snapRow: bestSnap.snapRow,
        snapIndex: bestSnap.snapIndex
      }
    }
    
    // 没有吸附，返回鼠标位置
    return { pos: { x: px, y: py }, rotation: 0, snapRow: null, snapIndex: -1 }
  }
  
  // 更新鼠标位置
  function updateMousePos(pos: Position) {
    mousePos.value = pos
    
    if (currentTool.value !== 'seat') {
      showPreview.value = false
      previewSeatPos.value = null
      return
    }
    
    // 节流
    const now = performance.now()
    if (now - lastUpdateTime < 16) return
    lastUpdateTime = now
    
    // 计算吸附位置
    const result = calculateSnapPosition(pos.x, pos.y)
    
    previewSeatPos.value = result.pos
    previewSeatRotation.value = result.rotation
    snapInfo.value = { row: result.snapRow, index: result.snapIndex }
    showPreview.value = true
  }
  
  // 确认放置座位
  function confirmPlaceSeat() {
    if (!previewSeatPos.value) return
    
    const { row, index } = snapInfo.value
    
    // 创建座位的辅助函数
    const createSeat = (id: string, x: number, y: number, _rowId: string, label: string): Seat => ({
      id,
      label,
      x,
      y,
      categoryKey: 1,
      status: 'available' as SeatStatus,
      objectType: 'seat' as const
    })
    
    if (row && index >= 0) {
      // 在现有排中插入座位
      const newSeat = createSeat(
        `seat-${Date.now()}`,
        index * SEAT_SPACING,
        0,
        row.id,
        '?'
      )
      
      row.seats.splice(index, 0, newSeat)
      
      // 重新编号
      row.seats.forEach((seat: Seat, i: number) => {
        seat.x = i * SEAT_SPACING
        seat.label = String(row.seats.length - i)
      })
      
      selectedRowId.value = row.id
    } else {
      // 创建新排
      const newRowId = `row-${Date.now()}`
      const newRow: RowInfo = {
        id: newRowId,
        x: previewSeatPos.value!.x,
        y: previewSeatPos.value!.y,
        rotation: previewSeatRotation.value,
        seats: [createSeat(`seat-${Date.now()}`, 0, 0, newRowId, '1')]
      }
      rows.value.push(newRow)
      selectedRowId.value = newRow.id
    }
    
    // 继续放置
    snapInfo.value = { row: null, index: -1 }
  }
  
  // 选择排
  function selectRow(rowId: string | null) {
    selectedRowId.value = rowId
  }
  
  // 开始拖拽排
  function startDragRow(rowId: string, pos: Position) {
    if (currentTool.value !== 'select') return
    
    selectRow(rowId)
    const row = rows.value.find((r: RowInfo) => r.id === rowId)
    if (!row) return
    
    isDraggingRow.value = true
    dragStartPos.value = pos
    draggedRowStartPos.value = { x: row.x, y: row.y }
  }
  
  // 更新排位置
  function updateDragRow(currentPos: Position) {
    if (!isDraggingRow.value || !selectedRowId.value) return
    
    const row = rows.value.find((r: RowInfo) => r.id === selectedRowId.value)
    if (!row) return
    
    const dx = currentPos.x - dragStartPos.value.x
    const dy = currentPos.y - dragStartPos.value.y
    
    row.x = draggedRowStartPos.value.x + dx
    row.y = draggedRowStartPos.value.y + dy
  }
  
  // 结束拖拽
  function endDragRow() {
    isDraggingRow.value = false
  }
  
  // ==================== 数据驱动绘制方法 ====================
  
  /** 重置绘制状态 */
  function resetDrawingState() {
    drawStep.value = 'idle'
    drawPoints.value = { first: null, second: null, third: null }
    polygonPoints.value = []
    previewState.value = {
      isActive: false,
      startPos: null,
      currentPos: null,
      points: []
    }
    drawingState.value = 'idle'
  }
  
  /** 设置工具（增强版） */
  function setTool(tool: ToolMode) {
    // 如果切换工具，重置绘制状态
    if (currentTool.value !== tool) {
      resetDrawingState()
    }
    
    currentTool.value = tool
    
    // 根据工具类型设置状态
    switch (tool) {
      case 'seat':
      case 'single-seat':
        drawingState.value = 'placingSeat'
        showPreview.value = true
        break
      case 'draw_seat':
      case 'draw_rect':
      case 'draw_ellipse':
      case 'draw_polygon':
      case 'draw_polyline':
      case 'draw_sector':
      case 'draw_area':
        drawingState.value = 'drawing'
        showPreview.value = true
        break
      case 'draw_text':
        drawingState.value = 'drawing'
        showPreview.value = false
        break
      default:
        drawingState.value = 'idle'
        showPreview.value = false
        previewSeatPos.value = null
    }
  }
  
  /** 开始绘制（记录起点） */
  function startDrawing(pos: Position) {
    previewState.value.isActive = true
    previewState.value.startPos = { ...pos }
    previewState.value.currentPos = { ...pos }
  }
  
  /** 更新绘制位置 */
  function updateDrawing(pos: Position) {
    if (!previewState.value.isActive) return
    previewState.value.currentPos = { ...pos }
  }
  
  /** 完成绘制 */
  function finishDrawing() {
    previewState.value.isActive = false
  }
  
  /** 添加多边形点 */
  function addPolygonPoint(pos: Position) {
    polygonPoints.value.push({ ...pos })
  }
  
  /** 检查是否靠近起点（用于闭合多边形） */
  function isNearStartPoint(pos: Position, threshold = SNAP_TO_START_DISTANCE): boolean {
    if (polygonPoints.value.length === 0) return false
    const start = polygonPoints.value[0]
    const dx = pos.x - start.x
    const dy = pos.y - start.y
    return Math.sqrt(dx * dx + dy * dy) < threshold
  }
  
  /** 清除多边形点 */
  function clearPolygonPoints() {
    polygonPoints.value = []
  }
  
  // ==================== 计算属性 ====================
  
  // 获取选中的排
  const selectedRow = computed(() => {
    if (!selectedRowId.value) return null
    return rows.value.find((r: RowInfo) => r.id === selectedRowId.value) || null
  })
  
  // 是否正在绘制
  const isDrawing = computed(() => drawingState.value === 'drawing')
  
  // 当前是否为数据驱动绘制工具
  const isDataDrivenTool = computed(() => {
    const dataDrivenTools: DrawingToolMode[] = [
      'draw_seat', 'draw_rect', 'draw_ellipse', 'draw_polygon',
      'draw_polyline', 'draw_sector', 'draw_text', 'draw_area'
    ]
    return dataDrivenTools.includes(currentTool.value as DrawingToolMode)
  })
  
  return {
    // 基础状态
    currentTool,
    drawingState,
    mousePos,
    previewSeatPos,
    previewSeatRotation,
    showPreview,
    rows,
    selectedRowId,
    selectedRow,
    isDraggingRow,
    
    // 数据驱动绘制状态
    drawStep,
    drawPoints,
    polygonPoints,
    previewState,
    isDrawing,
    isDataDrivenTool,
    
    // 常量
    SEAT_SPACING,
    ROW_SPACING,
    MIN_SHAPE_SIZE,
    SNAP_TO_START_DISTANCE,
    
    // 方法
    updateMousePos,
    confirmPlaceSeat,
    selectRow,
    startDragRow,
    updateDragRow,
    endDragRow,
    setTool,
    resetDrawingState,
    startDrawing,
    updateDrawing,
    finishDrawing,
    addPolygonPoint,
    isNearStartPoint,
    clearPolygonPoints
  }
}
