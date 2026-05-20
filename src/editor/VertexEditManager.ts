import { Group, Ellipse } from 'leafer-ui'
import { DragEvent } from 'leafer-ui'
import type { Section, ShapeObject, AreaObject, PathPoint } from '../types'
import { pathPointsToSvgPath } from '../viewer/geometry'

// 支持的编辑目标类型
export type EditKind = 'path' | 'polygon' | 'shape' | 'area' | 'rect' | 'ellipse'

export interface VertexEditManagerOptions {
  leafer: any
  getScale: () => number
  getSyncing: () => boolean
  setSyncing: (v: boolean) => void
  saveHistory: () => void

  // path 分区（borderType='path'）
  updateSectionBorderPathPoints?: (sectionId: string, pathPoints: PathPoint[]) => void
  // polygon 分区（borderType='polygon'）
  updateSectionBorderPoints?: (sectionId: string, points: number[], arcDepths?: number[]) => void
  // 形状（ShapeObject: polygon/polyline）
  updateShapePoints?: (id: string, points: number[], arcDepths?: number[]) => void
  // 区域（AreaObject）
  updateAreaPoints?: (id: string, points: number[], arcDepths?: number[]) => void
}

interface VertexHandle {
  ellipse: Ellipse
  index: number
}

interface EdgeHandle {
  ellipse: Ellipse
  /** PathPoint 索引（边的起点） */
  index: number
}

/** 工作区 — 所有类型统一为 world-space PathPoint[] */
interface Workspace {
  kind: EditKind
  dataId: string
  points: PathPoint[]   // world-space 坐标
  offsetX: number       // 原点偏移（shapes/sections 的相对坐标基准；areas 为 0）
  offsetY: number
  element: any          // Leafer 元素引用
}

/**
 * 统一顶点/弧边编辑器。
 * 内部使用 PathPoint[] 格式，拖拽时直接修改工作副本 + Leafer 元素属性，
 * 拖拽结束后一次性写入 Store。
 */
export class VertexEditManager {
  private opts: VertexEditManagerOptions
  private handleGroup: Group
  private vertexHandles: VertexHandle[] = []
  private edgeHandles: EdgeHandle[] = []
  private _isDragging = false
  private _workspace: Workspace | null = null
  private _boundOnZoom: (() => void) | null = null

  constructor(opts: VertexEditManagerOptions) {
    this.opts = opts
    this.handleGroup = new Group({ id: 'vertex-edit-handles', zIndex: 9999 })
    opts.leafer.add(this.handleGroup)

    this._boundOnZoom = () => { this._updateHandleScale() }
    opts.leafer.on('zoom.end', this._boundOnZoom)
  }

  get isDragging(): boolean { return this._isDragging }
  get isActive(): boolean { return this._workspace !== null }
  get activeKind(): EditKind | null { return this._workspace?.kind ?? null }

  // ==================== 入口 ====================

  /** 为 path 分区显示顶点编辑手柄 */
  enterForPathSection(section: Section, element: any): void {
    if (!section.borderPathPoints?.length) return
    if (!this.handleGroup.leafer) {
      this.opts.leafer.add(this.handleGroup)
    }
    this.hideVertices()

    const ox = section.borderX ?? 0
    const oy = section.borderY ?? 0
    const pts: PathPoint[] = section.borderPathPoints.map(p => ({
      x: ox + p.x,
      y: oy + p.y,
      type: p.type,
      arcDepth: p.arcDepth,
    }))

    this._workspace = {
      kind: 'path', dataId: section.id,
      points: pts, offsetX: ox, offsetY: oy,
      element,
    }
    this._createAllHandles(pts)
  }

  /** 为 polygon 分区显示顶点编辑手柄 */
  enterForPolygonSection(section: Section, element: any): void {
    if (!section.borderPoints?.length) return
    if (!this.handleGroup.leafer) {
      this.opts.leafer.add(this.handleGroup)
    }
    this.hideVertices()

    const ox = section.borderX ?? 0
    const oy = section.borderY ?? 0
    const n = section.borderPoints.length / 2
    const arcDepths = section.borderArcDepths ?? new Array(n).fill(0)
    const pts: PathPoint[] = []
    for (let i = 0; i < n; i++) {
      pts.push({
        x: ox + section.borderPoints[i * 2],
        y: oy + section.borderPoints[i * 2 + 1],
        type: Math.abs(arcDepths[i] ?? 0) > 0.005 ? 'arc' : 'line',
        arcDepth: arcDepths[i] ?? 0,
      })
    }

    this._workspace = {
      kind: 'polygon', dataId: section.id,
      points: pts, offsetX: ox, offsetY: oy,
      element,
    }
    this._createAllHandles(pts)
  }

  /** 为 polygon/polyline ShapeObject 显示顶点编辑手柄 */
  enterForShape(shape: ShapeObject, element: any): void {
    if (!shape.points?.length) return
    if (!this.handleGroup.leafer) {
      this.opts.leafer.add(this.handleGroup)
    }
    this.hideVertices()

    const ox = shape.x ?? 0
    const oy = shape.y ?? 0
    const n = shape.points.length / 2
    const arcDepths = shape.arcDepths ?? new Array(n).fill(0)
    const pts: PathPoint[] = []
    for (let i = 0; i < n; i++) {
      pts.push({
        x: ox + shape.points[i * 2],
        y: oy + shape.points[i * 2 + 1],
        type: Math.abs(arcDepths[i] ?? 0) > 0.005 ? 'arc' : 'line',
        arcDepth: arcDepths[i] ?? 0,
      })
    }

    this._workspace = {
      kind: 'shape', dataId: shape.id,
      points: pts, offsetX: ox, offsetY: oy,
      element,
    }
    this._createAllHandles(pts)
  }

  /** 为 AreaObject 显示顶点编辑手柄 */
  enterForArea(area: AreaObject, element: any): void {
    if (!area.points?.length) return
    if (!this.handleGroup.leafer) {
      this.opts.leafer.add(this.handleGroup)
    }
    this.hideVertices()

    const n = area.points.length / 2
    const arcDepths = area.arcDepths ?? new Array(n).fill(0)
    const pts: PathPoint[] = []
    for (let i = 0; i < n; i++) {
      pts.push({
        x: area.points[i * 2],
        y: area.points[i * 2 + 1],
        type: Math.abs(arcDepths[i] ?? 0) > 0.005 ? 'arc' : 'line',
        arcDepth: arcDepths[i] ?? 0,
      })
    }

    this._workspace = {
      kind: 'area', dataId: area.id,
      points: pts, offsetX: 0, offsetY: 0,
      element,
    }
    this._createAllHandles(pts)
  }

  /** 移除所有手柄，退出顶点编辑 */
  hideVertices(): void {
    this.vertexHandles.forEach(h => h.ellipse.remove())
    this.vertexHandles = []
    this.edgeHandles.forEach(h => h.ellipse.remove())
    this.edgeHandles = []
    this._workspace = null
  }

  /** 外部移动/旋转元素后更新手柄位置 */
  updatePositions(): void {
    // 当前架构中，分区/形状/区域不会在顶点编辑期间被外部移动
    // 此方法供未来扩展
  }

  // ==================== 手柄创建 ====================

  private _createAllHandles(pts: PathPoint[]): void {
    const scale = this.opts.getScale()
    const r = 4 / Math.max(scale, 0.05)
    const er = r * 1.7

    // 顶点手柄
    pts.forEach((pt, index) => {
      const ellipse = new Ellipse({
        id: `vertex-${index}`,
        x: pt.x, y: pt.y,
        width: r * 2, height: r * 2,
        around: 'center',
        fill: '#3b82f6', stroke: '#ffffff', strokeWidth: 1,
        draggable: true, cursor: 'move', hitFill: 'all', zIndex: 1000,
      })
      ellipse.on(DragEvent.START, () => { this._onDragStart() })
      ellipse.on(DragEvent.DRAG, () => { this._onVertexDrag(index) })
      ellipse.on(DragEvent.END, () => { this._onDragEnd() })

      this.handleGroup.add(ellipse)
      this.vertexHandles.push({ ellipse, index })
    })

    // 边弧手柄
    const n = pts.length
    for (let i = 0; i < n; i++) {
      const a = pts[i]
      const b = pts[(i + 1) % n]
      if (!a || !b) continue

      const ax = a.x, ay = a.y
      const bx = b.x, by = b.y
      const mx = (ax + bx) / 2
      const my = (ay + by) / 2

      const dx = bx - ax
      const dy = by - ay
      const edgeLen = Math.hypot(dx, dy) || 1
      const nx = dy / edgeLen
      const ny = -dx / edgeLen
      const ad = a.arcDepth ?? 0
      const hx = mx + nx * ad * (edgeLen * 0.5)
      const hy = my + ny * ad * (edgeLen * 0.5)

      const edgeHandle = new Ellipse({
        id: `edge-${i}`,
        x: hx, y: hy,
        width: er, height: er,
        around: 'center',
        fill: '#22c55e', stroke: '#ffffff', strokeWidth: 1,
        draggable: true, cursor: 'grab', hitFill: 'all', zIndex: 999,
      })
      edgeHandle.on(DragEvent.START, () => { this._onDragStart() })
      edgeHandle.on(DragEvent.DRAG, () => { this._onEdgeDrag(i) })
      edgeHandle.on(DragEvent.END, () => { this._onDragEnd() })

      this.handleGroup.add(edgeHandle)
      this.edgeHandles.push({ ellipse: edgeHandle, index: i })
    }
  }

  // ==================== 顶点拖拽 ====================

  private _onVertexDrag(index: number): void {
    const ws = this._workspace
    if (!ws) return
    const handle = this.vertexHandles.find(h => h.index === index)
    if (!handle) return

    const hx: number = handle.ellipse.x ?? 0
    const hy: number = handle.ellipse.y ?? 0
    ws.points[index] = {
      ...ws.points[index],
      x: hx,
      y: hy,
    }

    // 相邻两条边的弧手柄需要跟随移动
    const n = ws.points.length
    this._repositionEdgeHandle((index - 1 + n) % n, ws.points)
    this._repositionEdgeHandle(index, ws.points)

    this._syncElement()
  }

  /** 根据当前顶点位置重新计算某个弧边手柄的坐标 */
  private _repositionEdgeHandle(edgeIndex: number, pts: PathPoint[]): void {
    const handle = this.edgeHandles.find(h => h.index === edgeIndex)
    if (!handle) return
    const n = pts.length
    const a = pts[edgeIndex]
    const b = pts[(edgeIndex + 1) % n]
    if (!a || !b) return

    const ax = a.x, ay = a.y
    const bx = b.x, by = b.y
    const mx = (ax + bx) / 2
    const my = (ay + by) / 2
    const dx = bx - ax
    const dy = by - ay
    const edgeLen = Math.hypot(dx, dy) || 1
    const nx = dy / edgeLen
    const ny = -dx / edgeLen
    const ad = a.arcDepth ?? 0

    handle.ellipse.x = mx + nx * ad * (edgeLen * 0.5)
    handle.ellipse.y = my + ny * ad * (edgeLen * 0.5)
  }

  // ==================== 边弧拖拽 ====================

  private _onEdgeDrag(edgeIndex: number): void {
    const ws = this._workspace
    if (!ws) return
    const handle = this.edgeHandles.find(h => h.index === edgeIndex)
    if (!handle) return

    const pts = ws.points
    const n = pts.length
    const a = pts[edgeIndex]
    const b = pts[(edgeIndex + 1) % n]
    if (!a || !b) return

    const ax = a.x, ay = a.y
    const bx = b.x, by = b.y
    const mx = (ax + bx) / 2
    const my = (ay + by) / 2
    const hx: number = handle.ellipse.x ?? mx
    const hy: number = handle.ellipse.y ?? my

    const dx = bx - ax
    const dy = by - ay
    const edgeLen = Math.hypot(dx, dy) || 1
    const nx = dy / edgeLen
    const ny = -dx / edgeLen

    const proj = (hx - mx) * nx + (hy - my) * ny
    const arcDepth = Math.max(-1, Math.min(1, proj / (edgeLen * 0.5)))

    a.type = Math.abs(arcDepth) > 0.005 ? 'arc' : 'line'
    a.arcDepth = arcDepth

    // 吸附
    handle.ellipse.x = mx + nx * arcDepth * (edgeLen * 0.5)
    handle.ellipse.y = my + ny * arcDepth * (edgeLen * 0.5)

    this._syncElement()
  }

  // ==================== 元素同步 ====================

  private _syncElement(): void {
    const ws = this._workspace
    if (!ws) return

    // 工作区存的是世界坐标，需转回元素局部坐标（元素本身有 x/y offset）
    const localPts: PathPoint[] = ws.points.map(p => ({
      ...p,
      x: p.x - ws.offsetX,
      y: p.y - ws.offsetY,
    }))

    const d = pathPointsToSvgPath(localPts)
    const el = ws.element as any
    try {
      el.path = d
    } catch {
      el.setAttr?.('path', d)
    }
    // 同时更新 points（Polygon 元素兼容）
    const flat: number[] = []
    for (const p of localPts) { flat.push(p.x, p.y) }
    try { el.points = flat } catch { /* Path 元素可能没有 points */ }
  }

  // ==================== 拖拽生命周期 ====================

  private _onDragStart(): void {
    this._isDragging = true
    this.opts.setSyncing(true)
  }

  private _onDragEnd(): void {
    this._isDragging = false
    const ws = this._workspace
    if (!ws) { this.opts.setSyncing(false); return }

    this._commit(ws)
    this.opts.setSyncing(false)
  }

  /** 将工作区数据写回 Store */
  private _commit(ws: Workspace): void {
    const ox = ws.offsetX
    const oy = ws.offsetY

    switch (ws.kind) {
      case 'path': {
        // 转为相对坐标的 PathPoint[]
        const rel: PathPoint[] = ws.points.map(p => ({
          x: p.x - ox,
          y: p.y - oy,
          type: p.type,
          arcDepth: p.arcDepth,
        }))
        this.opts.updateSectionBorderPathPoints?.(ws.dataId, rel)
        break
      }
      case 'polygon': {
        const { flat, ads } = this._toFlat(ws.points, ox, oy)
        this.opts.updateSectionBorderPoints?.(ws.dataId, flat, ads.length > 0 ? ads : undefined)
        break
      }
      case 'shape': {
        const { flat, ads } = this._toFlat(ws.points, ox, oy)
        this.opts.updateShapePoints?.(ws.dataId, flat, ads.length > 0 ? ads : undefined)
        break
      }
      case 'area': {
        const { flat, ads } = this._toFlat(ws.points, 0, 0)
        this.opts.updateAreaPoints?.(ws.dataId, flat, ads.length > 0 ? ads : undefined)
        break
      }
    }
    this.opts.saveHistory()
  }

  /** PathPoint[] → { flat: number[], ads: number[] }，坐标转为相对 */
  private _toFlat(pts: PathPoint[], ox: number, oy: number): { flat: number[]; ads: number[] } {
    const flat: number[] = []
    const ads: number[] = []
    for (const p of pts) {
      flat.push(p.x - ox, p.y - oy)
      ads.push(p.arcDepth ?? 0)
    }
    return { flat, ads }
  }

  // ==================== 缩放适配 ====================

  private _updateHandleScale(): void {
    const scale = this.opts.getScale()
    const r = 4 / Math.max(scale, 0.05)
    this.vertexHandles.forEach(h => {
      h.ellipse.width = r * 2
      h.ellipse.height = r * 2
    })
    this.edgeHandles.forEach(h => {
      h.ellipse.width = r * 1.7
      h.ellipse.height = r * 1.7
    })
  }

  // ==================== 销毁 ====================

  destroy(): void {
    this.hideVertices()
    if (this._boundOnZoom) {
      this.opts.leafer.off('zoom.end', this._boundOnZoom)
      this._boundOnZoom = null
    }
    this.handleGroup.remove()
  }
}
