import { ref, computed, shallowRef } from 'vue'
import type { Row, Seat, Position } from '../types'

export type ToolMode = 'select' | 'pan' | 'seat' | 'row' | 'section' | 'booth' | 'table' | 'shape' | 'text' | 'image' | 'restroom'
export type DrawingState = 'idle' | 'placingSeat' | 'dragging'

export function useDrawing() {
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
  const snapInfo = ref<{ row: Row | null; index: number }>({ row: null, index: -1 })
  
  // 所有已创建的排
  const rows = ref<Row[]>([])
  
  // 选中的排
  const selectedRowId = ref<string | null>(null)
  
  // 是否正在拖拽
  const isDraggingRow = ref(false)
  const dragStartPos = ref<Position>({ x: 0, y: 0 })
  const draggedRowStartPos = ref<Position>({ x: 0, y: 0 })
  
  // 座位间距
  const SEAT_SPACING = 28
  const SNAP_DISTANCE = 40
  
  // 节流控制
  let lastUpdateTime = 0
  
  // 将全局坐标转换为排的本地坐标
  function globalToLocal(px: number, py: number, row: Row): Position {
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
  function localToGlobal(lx: number, ly: number, row: Row): Position {
    const angleRad = (row.rotation * Math.PI) / 180
    const cos = Math.cos(angleRad)
    const sin = Math.sin(angleRad)
    
    return {
      x: row.x + lx * cos - ly * sin,
      y: row.y + lx * sin + ly * cos
    }
  }
  
  // 计算点到排线段的最短距离
  function distanceToRow(px: number, py: number, row: Row): { distance: number; closestPoint: Position; t: number } | null {
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
  function calculateSnapPosition(px: number, py: number): { pos: Position; rotation: number; snapRow: Row | null; snapIndex: number } {
    let bestSnap: { pos: Position; rotation: number; snapRow: Row | null; snapIndex: number; distance: number } | null = null
    
    // 检查所有排
    for (const row of rows.value) {
      const result = distanceToRow(px, py, row)
      if (!result) continue
      
      if (result.distance < SNAP_DISTANCE) {
        // 计算吸附的座位索引（在座位之间或端点）
        const seatCount = row.seats.length
        const rowLength = (seatCount - 1) * SEAT_SPACING
        
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
    
    if (row && index >= 0) {
      // 在现有排中插入座位
      const newSeat: Seat = {
        id: `seat-${Date.now()}`,
        label: '?',
        x: index * SEAT_SPACING,
        y: 0,
        radius: 12,
        categoryId: row.seats[0]?.categoryId || '1',
        rowId: row.id,
        sectionId: row.sectionId || 'default'
      }
      
      row.seats.splice(index, 0, newSeat)
      
      // 重新编号
      row.seats.forEach((seat, i) => {
        seat.x = i * SEAT_SPACING
        seat.label = String(row.seats.length - i)
      })
      
      selectedRowId.value = row.id
    } else {
      // 创建新排
      const newRow: Row = {
        id: `row-${Date.now()}`,
        label: String.fromCharCode(65 + rows.value.length),
        x: previewSeatPos.value.x,
        y: previewSeatPos.value.y,
        rotation: previewSeatRotation.value,
        seats: [{
          id: `seat-${Date.now()}`,
          label: '1',
          x: 0,
          y: 0,
          radius: 12,
          categoryId: '1',
          rowId: `row-${Date.now()}`,
          sectionId: 'default'
        }]
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
    const row = rows.value.find(r => r.id === rowId)
    if (!row) return
    
    isDraggingRow.value = true
    dragStartPos.value = pos
    draggedRowStartPos.value = { x: row.x, y: row.y }
  }
  
  // 更新排位置
  function updateDragRow(currentPos: Position) {
    if (!isDraggingRow.value || !selectedRowId.value) return
    
    const row = rows.value.find(r => r.id === selectedRowId.value)
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
  
  // 设置工具
  function setTool(tool: ToolMode) {
    currentTool.value = tool
    
    if (tool === 'seat') {
      drawingState.value = 'placingSeat'
      showPreview.value = true
    } else {
      drawingState.value = 'idle'
      showPreview.value = false
      previewSeatPos.value = null
    }
  }
  
  // 获取选中的排
  const selectedRow = computed(() => {
    if (!selectedRowId.value) return null
    return rows.value.find(r => r.id === selectedRowId.value) || null
  })
  
  return {
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
    updateMousePos,
    confirmPlaceSeat,
    selectRow,
    startDragRow,
    updateDragRow,
    endDragRow,
    setTool
  }
}
