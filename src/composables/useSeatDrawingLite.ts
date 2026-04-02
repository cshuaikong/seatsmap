/**
 * @file useSeatDrawingLite.ts
 * @brief 座位绘制核心逻辑精简版（适用于 KonvaRenderer）
 * 
 * 核心设计：
 * 1. 统一状态机：idle → first → idle
 * 2. 统一预览函数：createSeatCursorPreview + createSeatRowPreview
 * 3. 统一提交函数：submitSeatRow
 */

import { ref, type Ref } from 'vue'
import type { Position, Seat } from '../types'

// ==================== 类型定义 ====================

export type DrawStep = 'idle' | 'first'

export interface SeatDrawingState {
  step: DrawStep
  startPoint: Position | null
}

export interface UseSeatDrawingLiteOptions {
  SEAT_RADIUS: number
  SEAT_SPACING: number
  
  /** 添加预览元素 */
  addPreviewElement: (el: any) => void
  
  /** 清除所有预览 */
  clearDrawingPreview: () => void
  
  /** 批量绘制 overlayLayer */
  batchDrawOverlay: () => void
  
  /** 获取或创建默认 section ID */
  getOrCreateDefaultSection: () => string
  
  /** 添加排到 store */
  addRowToStore: (sectionId: string, row: any) => void
  
  /** 生成唯一 ID */
  generateId: () => string
}

export function useSeatDrawingLite(options: UseSeatDrawingLiteOptions) {
  const {
    SEAT_RADIUS,
    SEAT_SPACING,
    addPreviewElement,
    clearDrawingPreview,
    batchDrawOverlay,
    getOrCreateDefaultSection,
    addRowToStore,
    generateId
  } = options
  
  // 绘制状态
  const drawState: Ref<SeatDrawingState> = ref({
    step: 'idle',
    startPoint: null
  })
  
  // 辅助函数：计算单位向量
  const getUnitVector = (from: Position, to: Position) => {
    const dx = to.x - from.x
    const dy = to.y - from.y
    const dist = Math.sqrt(dx * dx + dy * dy)
    return {
      ux: dist < 0.001 ? 1 : dx / dist,
      uy: dist < 0.001 ? 0 : dy / dist,
      dist
    }
  }
  
  // ========== 核心函数 1: 创建鼠标跟随预览圆 ==========
  
  const createSeatCursorPreview = (pos: Position) => {
    clearDrawingPreview()
    
    // @ts-ignore - Konva.Circle
    const circle = new (window as any).Konva.Circle({
      x: pos.x,
      y: pos.y,
      radius: SEAT_RADIUS,
      fill: '#ffffff',
      stroke: '#3b82f6',
      strokeWidth: 1.5,
      opacity: 0.8,
      listening: false
    })
    
    addPreviewElement(circle)
    batchDrawOverlay()
  }
  
  // ========== 核心函数 2: 创建座位排预览 ==========
  
  const createSeatRowPreview = (startPos: Position, endPos: Position) => {
    const { ux, uy, dist } = getUnitVector(startPos, endPos)
    
    if (dist < SEAT_SPACING) return
    
    const count = Math.max(2, Math.floor(dist / SEAT_SPACING) + 1)
    
    clearDrawingPreview()
    
    // 1. 绘制辅助线
    // @ts-ignore - Konva.Line
    const line = new (window as any).Konva.Line({
      points: [startPos.x, startPos.y, endPos.x, endPos.y],
      stroke: '#3b82f6',
      strokeWidth: 1.5,
      dash: [6, 6],
      listening: false
    })
    addPreviewElement(line)
    
    // 2. 绘制起点标记
    // @ts-ignore - Konva.Circle
    const startDot = new (window as any).Konva.Circle({
      x: startPos.x,
      y: startPos.y,
      radius: 5,
      fill: '#3b82f6',
      stroke: '#fff',
      strokeWidth: 1.5,
      listening: false
    })
    addPreviewElement(startDot)
    
    // 3. 生成座位局部坐标
    const seats = Array.from({ length: count }, (_, i) => ({
      x: i * SEAT_SPACING,
      y: 0
    }))
    
    // 4. 计算边界
    let minX = Infinity, minY = Infinity
    let maxX = -Infinity, maxY = -Infinity
    
    seats.forEach(seat => {
      minX = Math.min(minX, seat.x - SEAT_RADIUS)
      minY = Math.min(minY, seat.y - SEAT_RADIUS)
      maxX = Math.max(maxX, seat.x + SEAT_RADIUS)
      maxY = Math.max(maxY, seat.y + SEAT_RADIUS)
    })
    
    const width = maxX - minX
    const height = maxY - minY
    const angle = Math.atan2(uy, ux) * 180 / Math.PI
    
    // 5. 绘制座位预览（使用 Shape 批次绘制）
    // @ts-ignore - Konva.Shape
    const shape = new (window as any).Konva.Shape({
      x: startPos.x,
      y: startPos.y,
      width,
      height,
      rotation: angle,
      listening: false,
      perfectDrawEnabled: false
    })
    
    shape.sceneFunc((ctx: any) => {
      seats.forEach((seat: any) => {
        ctx.beginPath()
        ctx.arc(seat.x, seat.y, SEAT_RADIUS, 0, Math.PI * 2)
        ctx.fillStyle = '#ffffff'
        ctx.fill()
        ctx.strokeStyle = '#3b82f6'
        ctx.lineWidth = 1.5
        ctx.stroke()
      })
    })
    
    addPreviewElement(shape)
    batchDrawOverlay()
  }
  
  // ========== 核心函数 3: 提交座位排 ==========
  
  const submitSeatRow = (startPos: Position, endPos: Position) => {
    const { ux, uy, dist } = getUnitVector(startPos, endPos)
    
    if (dist < SEAT_SPACING) {
      clearDrawingPreview()
      return null
    }
    
    const count = Math.max(2, Math.floor(dist / SEAT_SPACING) + 1)
    const angle = Math.atan2(uy, ux) * 180 / Math.PI
    
    // 生成座位数据
    const seats: Seat[] = Array.from({ length: count }, (_, i) => ({
      id: generateId(),
      label: String(i + 1),
      x: i * SEAT_SPACING + SEAT_RADIUS,
      y: SEAT_RADIUS,
      categoryKey: 1, // 默认分类
      status: 'available' as const,
      objectType: 'seat' as const
    }))
    
    // 添加到 store
    const sectionId = getOrCreateDefaultSection()
    addRowToStore(sectionId, {
      label: '',
      seats,
      x: startPos.x,
      y: startPos.y,
      rotation: angle,
      curve: 0,
      seatSpacing: SEAT_SPACING
    })
    
    clearDrawingPreview()
    return seats
  }
  
  // ========== 事件处理函数 ==========
  
  /** 处理鼠标点击 */
  const handleClick = (pos: Position) => {
    if (drawState.value.step === 'idle') {
      // 第一次点击：记录起点
      drawState.value.startPoint = { ...pos }
      drawState.value.step = 'first'
      clearDrawingPreview()
    } else if (drawState.value.step === 'first' && drawState.value.startPoint) {
      // 第二次点击：提交绘制
      submitSeatRow(drawState.value.startPoint, pos)
      drawState.value.step = 'idle'
      drawState.value.startPoint = null
    }
  }
  
  /** 处理鼠标移动（预览） */
  const handleMouseMove = (pos: Position) => {
    if (drawState.value.step === 'idle') {
      // idle 状态：显示鼠标跟随圆
      createSeatCursorPreview(pos)
    } else if (drawState.value.step === 'first' && drawState.value.startPoint) {
      // first 状态：显示排预览
      createSeatRowPreview(drawState.value.startPoint, pos)
    }
  }
  
  /** 取消绘制 */
  const cancel = () => {
    drawState.value.step = 'idle'
    drawState.value.startPoint = null
    clearDrawingPreview()
  }
  
  return {
    drawState,
    handleClick,
    handleMouseMove,
    cancel,
    // 导出工具函数（可选）
    createSeatCursorPreview,
    createSeatRowPreview,
    submitSeatRow
  }
}
