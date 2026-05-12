import { Group, Ellipse } from 'leafer-ui'
import { DragEvent } from 'leafer-ui'
import type { ShapeObject, AreaObject } from '../types'

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
}

interface VertexHandle {
  ellipse: Ellipse
  index: number
  kind: 'shape' | 'area'
  dataId: string
}

export class ShapeVertexManager {
  private opts: ShapeVertexManagerOptions
  private handleGroup: Group
  private handles: VertexHandle[] = []
  private _isDragging = false
  private _activeEl: any = null
  private _activeData: ShapeObject | AreaObject | null = null
  private _activeKind: 'shape' | 'area' | null = null
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

  /** 为 polygon/polyline 形状显示顶点编辑手柄 */
  showShapeVertices(shape: ShapeObject, el: any): void {
    this.hideVertices()
    if (!shape.points || shape.points.length < 2) return

    const scale = this.opts.getScale()
    const logicalRadius = 4 / Math.max(scale, 0.05)
    const ox = shape.x ?? 0
    const oy = shape.y ?? 0

    this._activeEl = el
    this._activeData = shape
    this._activeKind = 'shape'

    for (let i = 0; i < shape.points.length; i += 2) {
      const h = this._createHandle(
        `svertex-${shape.id}-${i / 2}`,
        ox + shape.points[i],
        oy + shape.points[i + 1],
        logicalRadius,
        i / 2,
        'shape',
        shape.id,
      )
      this.handles.push(h)
    }
  }

  /** 为 area 区域显示顶点编辑手柄 */
  showAreaVertices(area: AreaObject, el: any): void {
    this.hideVertices()
    if (!area.points || area.points.length < 2) return

    const scale = this.opts.getScale()
    const logicalRadius = 4 / Math.max(scale, 0.05)

    this._activeEl = el
    this._activeData = area
    this._activeKind = 'area'

    for (let i = 0; i < area.points.length; i += 2) {
      const h = this._createHandle(
        `avertex-${area.id}-${i / 2}`,
        area.points[i],
        area.points[i + 1],
        logicalRadius,
        i / 2,
        'area',
        area.id,
      )
      this.handles.push(h)
    }
  }

  /** 为 polygon 分区边框显示顶点编辑手柄 */
  showSectionPolygonVertices(sectionId: string, borderPoints: number[], borderX: number, borderY: number, el: any): void {
    this.hideVertices()
    if (!borderPoints || borderPoints.length < 2) return

    const scale = this.opts.getScale()
    const logicalRadius = 4 / Math.max(scale, 0.05)

    this._activeEl = el
    this._activeData = null
    this._activeKind = null
    ;(this as any)._sectionId = sectionId
    ;(this as any)._sectionBorderX = borderX
    ;(this as any)._sectionBorderY = borderY
    ;(this as any)._sectionPoints = [...borderPoints]

    for (let i = 0; i < borderPoints.length; i += 2) {
      const h = this._createHandle(
        `sectvertex-${sectionId}-${i / 2}`,
        borderX + borderPoints[i],
        borderY + borderPoints[i + 1],
        logicalRadius,
        i / 2,
        'sectionPolygon' as any,
        sectionId,
      )
      this.handles.push(h)
    }
  }

  /** 隐藏所有顶点手柄 */
  hideVertices(): void {
    console.log('[ShapeVertex] hideVertices called, handle count:', this.handles.length)
    this.handles.forEach(h => h.ellipse.remove())
    this.handles = []
    this._activeEl = null
    this._activeData = null
    this._activeKind = null
    ;(this as any)._sectionId = null
    ;(this as any)._sectionPoints = null
  }

  private _createHandle(
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

  private _onDragStart(): void {
    this._isDragging = true
    this.opts.setSyncing(true)
  }

  private _onDragMove(index: number): void {
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
      // sectionPolygon
      const bx = (this as any)._sectionBorderX ?? 0
      const by = (this as any)._sectionBorderY ?? 0
      localX = hx - bx
      localY = hy - by
      pts = (this as any)._sectionPoints as number[]
      if (!pts) return
    }

    // 更新数据模型中的 points
    const newPoints: number[] = [...pts]
    newPoints[index * 2] = localX
    newPoints[index * 2 + 1] = localY

    if (handle.kind === 'shape' || handle.kind === 'area') {
      ;(this._activeData as any).points = newPoints
    } else {
      ;(this as any)._sectionPoints = newPoints
    }

    // 实时更新 Leafer 元素
    ;(this._activeEl as any).points = newPoints
  }

  private _onDragEnd(): void {
    this._isDragging = false

    if (this._activeKind === 'shape') {
      const pts = (this._activeData as ShapeObject).points
      if (pts) this.opts.updateShapePoints((this._activeData as ShapeObject).id, [...pts])
      this.opts.saveHistory()
    } else if (this._activeKind === 'area') {
      const pts = (this._activeData as AreaObject).points
      if (pts) this.opts.updateAreaPoints((this._activeData as AreaObject).id, [...pts])
      this.opts.saveHistory()
    } else if ((this as any)._sectionId) {
      const pts = (this as any)._sectionPoints as number[] | undefined
      if (pts && this.opts.updateSectionPoints) {
        this.opts.updateSectionPoints((this as any)._sectionId, [...pts])
        this.opts.saveHistory()
      }
    }

    this.opts.setSyncing(false)
  }

  private _updateHandleScale(): void {
    const scale = this.opts.getScale()
    const logicalRadius = 4 / Math.max(scale, 0.05)

    this.handles.forEach(h => {
      h.ellipse.width = logicalRadius * 2
      h.ellipse.height = logicalRadius * 2
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
    } else if (this._activeKind === 'area') {
      const area = this._activeData as AreaObject
      if (!area) return
      const pts = area.points ?? []
      this.handles.forEach(h => {
        h.ellipse.x = pts[h.index * 2] ?? 0
        h.ellipse.y = pts[h.index * 2 + 1] ?? 0
      })
    } else if ((this as any)._sectionId) {
      const bx = (this as any)._sectionBorderX ?? 0
      const by = (this as any)._sectionBorderY ?? 0
      const pts = (this as any)._sectionPoints as number[] | undefined
      if (!pts) return
      this.handles.forEach(h => {
        h.ellipse.x = bx + (pts[h.index * 2] ?? 0)
        h.ellipse.y = by + (pts[h.index * 2 + 1] ?? 0)
      })
    }
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
