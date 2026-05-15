import { Group, Ellipse } from 'leafer-ui'
import { DragEvent } from 'leafer-ui'
import type { ShapeObject, AreaObject } from '../types'
import { pathPointsToSvgPath, flatToPathPoints, hasArcs } from '../viewer/geometry'

export interface ShapeVertexManagerOptions {
  leafer: any
  getScale: () => number
  getSyncing: () => boolean
  setSyncing: (v: boolean) => void
  saveHistory: () => void
  /** 更新 shape points 到 store */
  updateShapePoints: (id: string, points: number[]) => void
  /** 更新 area points 到 store */
  updateAreaPoints: (id: string, points: number[]) => void
  /** 更新 section polygon 边框点到 store */
  updateSectionPoints?: (sectionId: string, points: number[]) => void
  /** 更新 shape arcDepths 到 store */
  updateShapeArcDepths?: (id: string, arcDepths: number[]) => void
  /** 更新 area arcDepths 到 store */
  updateAreaArcDepths?: (id: string, arcDepths: number[]) => void
  /** 更新 section borderArcDepths 到 store */
  updateSectionArcDepths?: (sectionId: string, arcDepths: number[]) => void
}

interface VertexHandle {
  ellipse: Ellipse
  index: number
  kind: 'shape' | 'area'
  dataId: string
}

interface EdgeHandle {
  ellipse: Ellipse
  /** 边起点的顶点索引 */
  index: number
  kind: 'shape' | 'area' | 'sectionPolygon'
  dataId: string
}

export class ShapeVertexManager {
  private opts: ShapeVertexManagerOptions
  private handleGroup: Group
  private handles: VertexHandle[] = []
  private edgeHandles: EdgeHandle[] = []
  private _isDragging = false
  private _activeEl: any = null
  private _activeData: ShapeObject | AreaObject | null = null
  private _activeKind: 'shape' | 'area' | 'sectionPolygon' | null = null
  private _activeArcDepths: number[] | null = null
  private _boundOnZoom: (() => void) | null = null

  constructor(opts: ShapeVertexManagerOptions) {
    this.opts = opts
    this.handleGroup = new Group({ id: 'shape-vertex-handles' })
    opts.leafer.add(this.handleGroup)

    this._boundOnZoom = () => { this._updateHandleScale() }
    opts.leafer.on('zoom.end', this._boundOnZoom)
  }

  get isDragging(): boolean {
    return this._isDragging
  }

  get handleKind(): 'shape' | 'area' | 'sectionPolygon' | null {
    return this._activeKind
  }

  /** 为 polygon/polyline 形状显示顶点编辑手柄 */
  showShapeVertices(shape: ShapeObject, el: any): void {
    this.hideVertices()
    if (!shape.points || shape.points.length < 2) return

    const scale = this.opts.getScale()
    const logicalRadius = 4 / Math.max(scale, 0.05)
    const ox = shape.x ?? 0
    const oy = shape.y ?? 0
    const n = shape.points.length / 2

    this._activeEl = el
    this._activeData = shape
    this._activeKind = 'shape'
    this._activeArcDepths = shape.arcDepths ? [...shape.arcDepths] : new Array(n).fill(0)

    // 顶点手柄
    for (let i = 0; i < n; i++) {
      const h = this._createVertexHandle(
        `svertex-${shape.id}-${i}`,
        ox + shape.points[i * 2],
        oy + shape.points[i * 2 + 1],
        logicalRadius,
        i,
        'shape',
        shape.id,
      )
      this.handles.push(h)
    }

    // 弧边手柄
    if (n >= 2) this._buildEdgeHandles(logicalRadius)
  }

  /** 为 area 区域显示顶点编辑手柄 */
  showAreaVertices(area: AreaObject, el: any): void {
    this.hideVertices()
    if (!area.points || area.points.length < 2) return

    const scale = this.opts.getScale()
    const logicalRadius = 4 / Math.max(scale, 0.05)
    const n = area.points.length / 2

    this._activeEl = el
    this._activeData = area
    this._activeKind = 'area'
    this._activeArcDepths = area.arcDepths ? [...area.arcDepths] : new Array(n).fill(0)

    for (let i = 0; i < n; i++) {
      const h = this._createVertexHandle(
        `avertex-${area.id}-${i}`,
        area.points[i * 2],
        area.points[i * 2 + 1],
        logicalRadius,
        i,
        'area',
        area.id,
      )
      this.handles.push(h)
    }

    if (n >= 2) this._buildEdgeHandles(logicalRadius)
  }

  /** 为 polygon 分区边框显示顶点编辑手柄 */
  showSectionPolygonVertices(sectionId: string, borderPoints: number[], borderX: number, borderY: number, el: any, borderArcDepths?: number[]): void {
    this.hideVertices()
    if (!borderPoints || borderPoints.length < 2) return

    const scale = this.opts.getScale()
    const logicalRadius = 4 / Math.max(scale, 0.05)
    const n = borderPoints.length / 2

    this._activeEl = el
    this._activeData = null
    this._activeKind = 'sectionPolygon'
    this._activeArcDepths = borderArcDepths ? [...borderArcDepths] : new Array(n).fill(0)
    ;(this as any)._sectionId = sectionId
    ;(this as any)._sectionBorderX = borderX
    ;(this as any)._sectionBorderY = borderY
    ;(this as any)._sectionPoints = [...borderPoints]

    for (let i = 0; i < n; i++) {
      const h = this._createVertexHandle(
        `sectvertex-${sectionId}-${i}`,
        borderX + borderPoints[i * 2],
        borderY + borderPoints[i * 2 + 1],
        logicalRadius,
        i,
        'sectionPolygon' as any,
        sectionId,
      )
      this.handles.push(h)
    }

    if (n >= 2) this._buildEdgeHandles(logicalRadius)
  }

  /** 隐藏所有顶点和弧边手柄 */
  hideVertices(): void {
    this.handles.forEach(h => h.ellipse.remove())
    this.handles = []
    this.edgeHandles.forEach(h => h.ellipse.remove())
    this.edgeHandles = []
    this._activeEl = null
    this._activeData = null
    this._activeKind = null
    this._activeArcDepths = null
    ;(this as any)._sectionId = null
    ;(this as any)._sectionPoints = null
  }

  // ==================== 顶点手柄 ====================

  private _createVertexHandle(
    id: string,
    x: number, y: number,
    radius: number,
    index: number,
    kind: 'shape' | 'area',
    dataId: string,
  ): VertexHandle {
    const ellipse = new Ellipse({
      id,
      x, y,
      width: radius * 2,
      height: radius * 2,
      fill: '#3b82f6',
      stroke: '#ffffff',
      strokeWidth: 1,
      draggable: true,
      cursor: 'move',
      hitFill: 'all',
      zIndex: 1000,
    })

    ellipse.on(DragEvent.START, (_e: any) => { this._onDragStart() })
    ellipse.on(DragEvent.DRAG, (_e: any) => { this._onDragMove(index) })
    ellipse.on(DragEvent.END, (_e: any) => { this._onDragEnd() })

    this.handleGroup.add(ellipse)
    return { ellipse, index, kind, dataId }
  }

  private _onVertexDragMove(index: number): void {
    const handle = this.handles.find(h => h.index === index)
    if (!handle || !this._activeEl) return

    const hx: number = (handle.ellipse as any).x ?? 0
    const hy: number = (handle.ellipse as any).y ?? 0

    let localX: number
    let localY: number
    let pts: number[]

    if (handle.kind === 'shape') {
      const shape = this._activeData as ShapeObject
      if (!shape) return
      localX = hx - (shape.x ?? 0)
      localY = hy - (shape.y ?? 0)
      pts = shape.points ?? []
    } else if (handle.kind === 'area') {
      const area = this._activeData as AreaObject
      if (!area) return
      localX = hx
      localY = hy
      pts = area.points ?? []
    } else {
      const bx = (this as any)._sectionBorderX ?? 0
      const by = (this as any)._sectionBorderY ?? 0
      localX = hx - bx
      localY = hy - by
      pts = (this as any)._sectionPoints as number[]
      if (!pts) return
    }

    const newPoints: number[] = [...pts]
    newPoints[index * 2] = localX
    newPoints[index * 2 + 1] = localY

    if (handle.kind === 'shape' || handle.kind === 'area') {
      ;(this._activeData as any).points = newPoints
    } else {
      ;(this as any)._sectionPoints = newPoints
    }

    this._syncElement(newPoints)
  }

  // ==================== 弧边手柄 ====================

  private _buildEdgeHandles(radius: number): void {
    const pts = this._getActivePoints()
    const n = pts.length / 2
    if (n < 2) return

    for (let i = 0; i < n; i++) {
      const ax = pts[i * 2]
      const ay = pts[i * 2 + 1]
      const bx = pts[(i + 1) % n * 2]
      const by = pts[(i + 1) % n * 2 + 1]
      if (ax === undefined || ay === undefined || bx === undefined || by === undefined) continue

      const mx = (ax + bx) / 2
      const my = (ay + by) / 2

      const dx = bx - ax
      const dy = by - ay
      const edgeLen = Math.hypot(dx, dy) || 1
      const nx = dy / edgeLen
      const ny = -dx / edgeLen
      const ad = this._activeArcDepths?.[i] ?? 0
      const hx = mx + nx * ad * (edgeLen * 0.5)
      const hy = my + ny * ad * (edgeLen * 0.5)

      const edgeHandle = new Ellipse({
        id: `edge-${this._activeKind}-${this._getActiveDataId()}-${i}`,
        x: hx, y: hy,
        width: radius * 1.7,
        height: radius * 1.7,
        around: 'center',
        fill: '#22c55e',
        stroke: '#ffffff',
        strokeWidth: 1,
        draggable: true,
        cursor: 'grab',
        hitFill: 'all',
        zIndex: 999,
      })

      edgeHandle.on(DragEvent.START, () => { this._onDragStart() })
      edgeHandle.on(DragEvent.DRAG, () => { this._onEdgeDragMove(i) })
      edgeHandle.on(DragEvent.END, () => { this._onDragEnd() })

      this.handleGroup.add(edgeHandle)
      this.edgeHandles.push({
        ellipse: edgeHandle,
        index: i,
        kind: this._activeKind === 'sectionPolygon' ? 'sectionPolygon' : this._activeKind!,
        dataId: this._getActiveDataId(),
      })
    }
  }

  private _onEdgeDragMove(edgeIndex: number): void {
    const handle = this.edgeHandles.find(h => h.index === edgeIndex)
    if (!handle || !this._activeArcDepths) return

    const pts = this._getActivePoints()
    const n = pts.length / 2
    const ax = pts[edgeIndex * 2]
    const ay = pts[edgeIndex * 2 + 1]
    const bx = pts[(edgeIndex + 1) % n * 2]
    const by = pts[(edgeIndex + 1) % n * 2 + 1]
    if (ax === undefined || ay === undefined || bx === undefined || by === undefined) return

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

    this._activeArcDepths[edgeIndex] = arcDepth

    // 把手柄吸附到合法弧深位置
    handle.ellipse.x = mx + nx * arcDepth * (edgeLen * 0.5)
    handle.ellipse.y = my + ny * arcDepth * (edgeLen * 0.5)

    this._syncElement(pts)
  }

  // ==================== 元素同步 ====================

  /** 更新 Leafer 元素：优先用 path（支持弧线），回退到 points */
  private _syncElement(points: number[]): void {
    if (!this._activeEl) return
    const el = this._activeEl as any

    if (hasArcs(this._activeArcDepths ?? undefined)) {
      // 有弧线 → 用 SVG path
      const pathPoints = flatToPathPoints(points, this._activeArcDepths ?? undefined)
      const d = pathPointsToSvgPath(pathPoints)
      try {
        el.path = d
      } catch {
        el.setAttr?.('path', d)
      }
      // 同时更新 points 以保持兼容
      el.points = points
    } else {
      // 无弧线 → 用 points
      el.points = points
      // 如果是 Path 元素，也更新 path
      if (el.tag === 'Path') {
        const pathPoints = flatToPathPoints(points)
        const d = pathPointsToSvgPath(pathPoints)
        try { el.path = d } catch { el.setAttr?.('path', d) }
      }
    }
  }

  // ==================== 拖拽生命周期 ====================

  private _onDragStart(): void {
    this._isDragging = true
    this.opts.setSyncing(true)
  }

  private _onDragMove(index: number): void {
    this._onVertexDragMove(index)
  }

  private _onDragEnd(): void {
    this._isDragging = false

    if (this._activeKind === 'shape') {
      const shape = this._activeData as ShapeObject
      const pts = shape.points
      if (pts) this.opts.updateShapePoints(shape.id, [...pts])
      if (this._activeArcDepths) {
        shape.arcDepths = [...this._activeArcDepths]
        this.opts.updateShapeArcDepths?.(shape.id, [...this._activeArcDepths])
      }
      this.opts.saveHistory()
    } else if (this._activeKind === 'area') {
      const area = this._activeData as AreaObject
      const pts = area.points
      if (pts) this.opts.updateAreaPoints(area.id, [...pts])
      if (this._activeArcDepths) {
        area.arcDepths = [...this._activeArcDepths]
        this.opts.updateAreaArcDepths?.(area.id, [...this._activeArcDepths])
      }
      this.opts.saveHistory()
    } else if (this._activeKind === 'sectionPolygon') {
      const pts = (this as any)._sectionPoints as number[] | undefined
      if (pts && this.opts.updateSectionPoints) {
        this.opts.updateSectionPoints((this as any)._sectionId, [...pts])
      }
      if (this._activeArcDepths && this.opts.updateSectionArcDepths) {
        this.opts.updateSectionArcDepths((this as any)._sectionId, [...this._activeArcDepths])
      }
      this.opts.saveHistory()
    }

    this.opts.setSyncing(false)
  }

  // ==================== 缩放适配 ====================

  private _updateHandleScale(): void {
    const scale = this.opts.getScale()
    const logicalRadius = 4 / Math.max(scale, 0.05)

    this.handles.forEach(h => {
      h.ellipse.width = logicalRadius * 2
      h.ellipse.height = logicalRadius * 2
    })
    this.edgeHandles.forEach(h => {
      h.ellipse.width = logicalRadius * 1.7
      h.ellipse.height = logicalRadius * 1.7
    })
  }

  /** 在元素移动/旋转后更新手柄世界坐标位置 */
  updatePositions(): void {
    if (!this._activeEl) return

    if (this._activeKind === 'shape') {
      const shape = this._activeData as ShapeObject
      if (!shape) return
      const ox = shape.x ?? 0
      const oy = shape.y ?? 0
      const pts = shape.points ?? []
      this.handles.forEach(h => {
        h.ellipse.x = ox + (pts[h.index * 2] ?? 0)
        h.ellipse.y = oy + (pts[h.index * 2 + 1] ?? 0)
      })
      this._updateEdgeHandlePositions(pts, ox, oy)
    } else if (this._activeKind === 'area') {
      const area = this._activeData as AreaObject
      if (!area) return
      const pts = area.points ?? []
      this.handles.forEach(h => {
        h.ellipse.x = pts[h.index * 2] ?? 0
        h.ellipse.y = pts[h.index * 2 + 1] ?? 0
      })
      this._updateEdgeHandlePositions(pts, 0, 0)
    } else if (this._activeKind === 'sectionPolygon') {
      const bx = (this as any)._sectionBorderX ?? 0
      const by = (this as any)._sectionBorderY ?? 0
      const pts = (this as any)._sectionPoints as number[] | undefined
      if (!pts) return
      this.handles.forEach(h => {
        h.ellipse.x = bx + (pts[h.index * 2] ?? 0)
        h.ellipse.y = by + (pts[h.index * 2 + 1] ?? 0)
      })
      this._updateEdgeHandlePositions(pts, bx, by)
    }
  }

  private _updateEdgeHandlePositions(pts: number[], offsetX: number, offsetY: number): void {
    const n = pts.length / 2
    this.edgeHandles.forEach(h => {
      const ax = offsetX + (pts[h.index * 2] ?? 0)
      const ay = offsetY + (pts[h.index * 2 + 1] ?? 0)
      const bx = offsetX + (pts[(h.index + 1) % n * 2] ?? 0)
      const by = offsetY + (pts[(h.index + 1) % n * 2 + 1] ?? 0)
      const dx = bx - ax
      const dy = by - ay
      const edgeLen = Math.hypot(dx, dy) || 1
      const nx = dy / edgeLen
      const ny = -dx / edgeLen
      const ad = this._activeArcDepths?.[h.index] ?? 0
      h.ellipse.x = (ax + bx) / 2 + nx * ad * (edgeLen * 0.5)
      h.ellipse.y = (ay + by) / 2 + ny * ad * (edgeLen * 0.5)
    })
  }

  // ==================== 辅助 ====================

  /** 获取当前激活元素的 world-space 顶点数组 */
  private _getActivePoints(): number[] {
    if (this._activeKind === 'shape') {
      const shape = this._activeData as ShapeObject
      if (!shape?.points) return []
      const ox = shape.x ?? 0
      const oy = shape.y ?? 0
      const result: number[] = []
      for (let i = 0; i < shape.points.length; i += 2) {
        result.push(ox + shape.points[i], oy + shape.points[i + 1])
      }
      return result
    }
    if (this._activeKind === 'area') {
      return (this._activeData as AreaObject)?.points ?? []
    }
    // sectionPolygon
    const bx = (this as any)._sectionBorderX ?? 0
    const by = (this as any)._sectionBorderY ?? 0
    const pts = (this as any)._sectionPoints as number[] | undefined
    if (!pts) return []
    const result: number[] = []
    for (let i = 0; i < pts.length; i += 2) {
      result.push(bx + pts[i], by + pts[i + 1])
    }
    return result
  }

  private _getActiveDataId(): string {
    if (this._activeKind === 'sectionPolygon') return (this as any)._sectionId ?? ''
    return (this._activeData as any)?.id ?? ''
  }

  destroy(): void {
    this.hideVertices()
    if (this._boundOnZoom) {
      this.opts.leafer.off('zoom.end', this._boundOnZoom)
      this._boundOnZoom = null
    }
    this.handleGroup.remove()
  }
}
