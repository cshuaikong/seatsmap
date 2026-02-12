import { ref, computed } from 'vue'
import type { Row, Seat, Position } from '../types'

export type ToolMode = 'select' | 'pan' | 'seat' | 'row' | 'section' | 'booth' | 'table' | 'shape' | 'text' | 'image' | 'restroom'
export type DrawingState = 'idle' | 'placingStart' | 'placingEnd' | 'placed'

export function useDrawing() {
  // 当前工具模式
  const currentTool = ref<ToolMode>('select')
  
  // 绘制状态
  const drawingState = ref<DrawingState>('idle')
  
  // 正在创建的排
  const previewRow = ref<Row | null>(null)
  
  // 起点和终点位置
  const startPos = ref<Position>({ x: 0, y: 0 })
  const endPos = ref<Position>({ x: 0, y: 0 })
  
  // 所有已创建的排
  const rows = ref<Row[]>([])
  
  // 选中的排
  const selectedRowId = ref<string | null>(null)
  
  // 是否正在拖拽移动排
  const isDraggingRow = ref(false)
  const dragStartPos = ref<Position>({ x: 0, y: 0 })
  const draggedRowStartPos = ref<Position>({ x: 0, y: 0 })
  
  // 是否正在旋转
  const isRotating = ref(false)
  
  // 辅助线
  const guideLines = ref<{ x?: number; y?: number }>({})
  
  // 计算两点之间的距离
  const distance = computed(() => {
    const dx = endPos.value.x - startPos.value.x
    const dy = endPos.value.y - startPos.value.y
    return Math.sqrt(dx * dx + dy * dy)
  })
  
  // 计算角度
  const angle = computed(() => {
    const dx = endPos.value.x - startPos.value.x
    const dy = endPos.value.y - startPos.value.y
    return Math.atan2(dy, dx) * 180 / Math.PI
  })
  
  // 座位间距
  const SEAT_SPACING = 28
  
  // 计算辅助线
  function calculateGuideLines(pos: Position) {
    const guides: { x?: number; y?: number } = {}
    const SNAP_DISTANCE = 10
    
    // 检查是否靠近其他排的中心点
    for (const row of rows.value) {
      // X 轴对齐
      if (Math.abs(pos.x - row.x) < SNAP_DISTANCE) {
        guides.x = row.x
      }
      // Y 轴对齐
      if (Math.abs(pos.y - row.y) < SNAP_DISTANCE) {
        guides.y = row.y
      }
      
      // 检查排的两端
      if (row.seats.length > 0) {
        const firstSeat = row.seats[0]
        const lastSeat = row.seats[row.seats.length - 1]
        
        // 计算旋转后的座位位置
        const angleRad = (row.rotation * Math.PI) / 180
        const firstX = row.x + firstSeat.x * Math.cos(angleRad)
        const firstY = row.y + firstSeat.x * Math.sin(angleRad)
        const lastX = row.x + lastSeat.x * Math.cos(angleRad)
        const lastY = row.y + lastSeat.x * Math.sin(angleRad)
        
        if (Math.abs(pos.x - firstX) < SNAP_DISTANCE) guides.x = firstX
        if (Math.abs(pos.y - firstY) < SNAP_DISTANCE) guides.y = firstY
        if (Math.abs(pos.x - lastX) < SNAP_DISTANCE) guides.x = lastX
        if (Math.abs(pos.y - lastY) < SNAP_DISTANCE) guides.y = lastY
      }
    }
    
    guideLines.value = guides
    
    // 应用吸附
    const result = { ...pos }
    if (guides.x !== undefined) result.x = guides.x
    if (guides.y !== undefined) result.y = guides.y
    return result
  }
  
  // 生成预览排
  function generatePreviewRow() {
    const dist = distance.value
    const seatCount = Math.max(1, Math.floor(dist / SEAT_SPACING) + 1)
    const actualAngle = angle.value
    
    const seats: Seat[] = []
    for (let i = 0; i < seatCount; i++) {
      const x = i * SEAT_SPACING
      const y = 0
      
      seats.push({
        id: `preview-seat-${i}`,
        label: String(seatCount - i),
        x,
        y,
        radius: 12,
        categoryId: '1',
        rowId: 'preview',
        sectionId: 'preview'
      })
    }
    
    previewRow.value = {
      id: 'preview-row',
      label: '',
      x: startPos.value.x,
      y: startPos.value.y,
      rotation: actualAngle,
      seats
    }
  }
  
  // 开始放置（点击画布）
  function startPlacing(pos: Position) {
    if (currentTool.value !== 'seat') return
    
    // 应用辅助线吸附
    const snappedPos = calculateGuideLines(pos)
    startPos.value = snappedPos
    endPos.value = snappedPos
    drawingState.value = 'placingStart'
    generatePreviewRow()
  }
  
  // 更新终点位置（鼠标移动）
  function updatePlacing(pos: Position) {
    if (drawingState.value !== 'placingStart') return
    
    // 应用辅助线吸附
    const snappedPos = calculateGuideLines(pos)
    endPos.value = snappedPos
    generatePreviewRow()
  }
  
  // 完成放置（再次点击）
  function finishPlacing() {
    if (drawingState.value !== 'placingStart' || !previewRow.value) return
    
    // 创建正式的排
    const newRow: Row = {
      id: `row-${Date.now()}`,
      label: String.fromCharCode(65 + rows.value.length),
      x: previewRow.value.x,
      y: previewRow.value.y,
      rotation: previewRow.value.rotation,
      seats: previewRow.value.seats.map((seat, i) => ({
        ...seat,
        id: `seat-${Date.now()}-${i}`,
        rowId: `row-${Date.now()}`,
        sectionId: 'default'
      }))
    }
    
    rows.value.push(newRow)
    selectedRowId.value = newRow.id
    
    // 重置状态
    drawingState.value = 'idle'
    previewRow.value = null
    guideLines.value = {}
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
    
    // 应用辅助线吸附
    const newX = draggedRowStartPos.value.x + dx
    const newY = draggedRowStartPos.value.y + dy
    const snappedPos = calculateGuideLines({ x: newX, y: newY })
    
    row.x = snappedPos.x
    row.y = snappedPos.y
  }
  
  // 结束拖拽
  function endDragRow() {
    isDraggingRow.value = false
    guideLines.value = {}
  }
  
  // 更新排旋转角度
  function updateRowRotation(rowId: string, newRotation: number) {
    const row = rows.value.find(r => r.id === rowId)
    if (row) {
      row.rotation = newRotation
    }
  }
  
  // 设置工具
  function setTool(tool: ToolMode) {
    currentTool.value = tool
    if (tool !== 'seat') {
      drawingState.value = 'idle'
      previewRow.value = null
      guideLines.value = {}
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
    previewRow,
    rows,
    selectedRowId,
    selectedRow,
    isDraggingRow,
    guideLines,
    angle,
    distance,
    startPlacing,
    updatePlacing,
    finishPlacing,
    selectRow,
    startDragRow,
    updateDragRow,
    endDragRow,
    updateRowRotation,
    setTool
  }
}
