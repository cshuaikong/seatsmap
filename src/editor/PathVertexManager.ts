import { Group, Ellipse, Path } from 'leafer-ui'
import { DragEvent } from 'leafer-ui'
import type { Section } from '../types'
import { pathPointsToSvgPath } from '../viewer/geometry'

export interface PathVertexManagerOptions {
  leafer: any
  getSection: (id: string) => Section | undefined
  updateSectionBorder: (sectionId: string, border: Record<string, any>) => void
  saveHistory: () => void
  getScale: () => number
  getSyncing: () => boolean
  setSyncing: (v: boolean) => void
}

interface VertexHandle {
  ellipse: Ellipse
  sectionId: string
  index: number
}

interface EdgeHandle {
  ellipse: Ellipse
  sectionId: string
  /** 边起点的 PathPoint 索引 */
  index: number
}

export class PathVertexManager {
  private opts: PathVertexManagerOptions
  private handleGroup: Group
  private handles: VertexHandle[] = []
  private edgeHandles: EdgeHandle[] = []
  private _isDragging = false
  private _activeSectionId: string | null = null
  private _activePathElement: Path | null = null
  private _boundOnZoom: (() => void) | null = null

  constructor(opts: PathVertexManagerOptions) {
    this.opts = opts
    this.handleGroup = new Group({ id: 'path-vertex-handles' })
    opts.leafer.add(this.handleGroup)

    this._boundOnZoom = () => {
      this._updateHandleScale()
    }
    opts.leafer.on('zoom.end', this._boundOnZoom)
  }

  get isDragging(): boolean {
    return this._isDragging
  }

  get isActive(): boolean {
    return this._activeSectionId !== null
  }

  /** 为选中分区显示顶点编辑手柄 + 边弧手柄 */
  showVertices(section: Section, pathEl: Path): void {
    this.hideVertices()

    if (!section.pathPoints || section.pathPoints.length === 0) return

    const baseX = section.x ?? 0
    const baseY = section.y ?? 0
    const scale = this.opts.getScale()
    const logicalRadius = 4 / Math.max(scale, 0.05)

    this._activeSectionId = section.id
    this._activePathElement = pathEl

    const pts = section.pathPoints

    // 顶点手柄
    pts.forEach((pt, index) => {
      const worldX = baseX + pt.x
      const worldY = baseY + pt.y

      const ellipse = new Ellipse({
        id: `vertex-${section.id}-${index}`,
        x: worldX,
        y: worldY,
        width: logicalRadius * 2,
        height: logicalRadius * 2,
        around: 'center',
        fill: '#3b82f6',
        stroke: '#ffffff',
        strokeWidth: 1,
        draggable: true,
        cursor: 'move',
        hitFill: 'all',
        zIndex: 1000,
      })

      ellipse.on(DragEvent.START, () => { this._onDragStart() })
      ellipse.on(DragEvent.DRAG, (e: any) => { this._onDragMove(index, e) })
      ellipse.on(DragEvent.END, () => { this._onDragEnd(section) })

      this.handleGroup.add(ellipse)
      this.handles.push({ ellipse, sectionId: section.id, index })
    })

    // 边弧手柄 — 每对相邻顶点之间
    const n = pts.length
    if (n < 2) return

    for (let i = 0; i < n; i++) {
      const a = pts[i]
      const b = pts[(i + 1) % n]
      if (!a || !b) continue

      const ax = baseX + a.x
      const ay = baseY + a.y
      const bx = baseX + b.x
      const by = baseY + b.y

      const mx = (ax + bx) / 2
      const my = (ay + by) / 2

      // 边中点 + 弧深偏移
      const dx = bx - ax
      const dy = by - ay
      const edgeLen = Math.hypot(dx, dy) || 1
      const nx = dy / edgeLen   // 右法线，对齐 SVG sweepFlag=1
      const ny = -dx / edgeLen
      const ad = a.arcDepth ?? 0
      const hx = mx + nx * ad * (edgeLen * 0.5)
      const hy = my + ny * ad * (edgeLen * 0.5)

      const edgeHandle = new Ellipse({
        id: `edge-${section.id}-${i}`,
        x: hx, y: hy,
        width: logicalRadius * 1.7,
        height: logicalRadius * 1.7,
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
      edgeHandle.on(DragEvent.END, () => { this._onDragEnd(section) })

      this.handleGroup.add(edgeHandle)
      this.edgeHandles.push({ ellipse: edgeHandle, sectionId: section.id, index: i })
    }
  }

  /** 移除所有顶点和边弧手柄 */
  hideVertices(): void {
    this.handles.forEach(h => h.ellipse.remove())
    this.handles = []
    this.edgeHandles.forEach(h => h.ellipse.remove())
    this.edgeHandles = []
    this._activeSectionId = null
    this._activePathElement = null
  }

  /** 更新手柄位置（分区移动后调用） */
  updatePositions(section: Section): void {
    if (!section.pathPoints) return

    const baseX = section.x ?? 0
    const baseY = section.y ?? 0

    // 顶点手柄
    this.handles.forEach(h => {
      if (h.sectionId !== section.id) return
      const pt = section.pathPoints![h.index]
      if (!pt) return
      h.ellipse.x = baseX + pt.x
      h.ellipse.y = baseY + pt.y
    })

    // 边弧手柄
    const pts = section.pathPoints
    const n = pts.length
    this.edgeHandles.forEach(h => {
      if (h.sectionId !== section.id) return
      const a = pts[h.index]
      const b = pts[(h.index + 1) % n]
      if (!a || !b) return
      const ax = baseX + a.x
      const ay = baseY + a.y
      const bx = baseX + b.x
      const by = baseY + b.y
      const dx = bx - ax
      const dy = by - ay
      const edgeLen = Math.hypot(dx, dy) || 1
      const nx = dy / edgeLen
      const ny = -dx / edgeLen
      const ad = a.arcDepth ?? 0
      h.ellipse.x = (ax + bx) / 2 + nx * ad * (edgeLen * 0.5)
      h.ellipse.y = (ay + by) / 2 + ny * ad * (edgeLen * 0.5)
    })
  }

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

  // ==================== 顶点拖拽 ====================

  private _onDragStart(): void {
    this._isDragging = true
    this.opts.setSyncing(true)
  }

  private _onDragMove(index: number, _e: any): void {
    const section = this._activeSectionId
      ? this.opts.getSection(this._activeSectionId)
      : undefined
    if (!section || !section.pathPoints) return

    const handle = this.handles.find(h => h.index === index)
    if (!handle) return

    const baseX = section.x ?? 0
    const baseY = section.y ?? 0

    const nx = (handle.ellipse.x ?? baseX) - baseX
    const ny = (handle.ellipse.y ?? baseY) - baseY
    section.pathPoints[index] = {
      ...section.pathPoints[index],
      x: nx,
      y: ny,
    }

    this._syncPath()
  }

  // ==================== 边弧拖拽 ====================

  private _onEdgeDragMove(edgeIndex: number): void {
    const section = this._activeSectionId
      ? this.opts.getSection(this._activeSectionId)
      : undefined
    if (!section || !section.pathPoints) return

    const handle = this.edgeHandles.find(h => h.index === edgeIndex)
    if (!handle) return

    const pts = section.pathPoints
    const n = pts.length
    const a = pts[edgeIndex]
    const b = pts[(edgeIndex + 1) % n]
    if (!a || !b) return

    const baseX = section.x ?? 0
    const baseY = section.y ?? 0

    const ax = baseX + a.x
    const ay = baseY + a.y
    const bx = baseX + b.x
    const by = baseY + b.y

    const mx = (ax + bx) / 2
    const my = (ay + by) / 2
    const hx = handle.ellipse.x ?? mx
    const hy = handle.ellipse.y ?? my

    const dx = bx - ax
    const dy = by - ay
    const edgeLen = Math.hypot(dx, dy) || 1
    const nx = dy / edgeLen     // 右法线
    const ny = -dx / edgeLen

    const proj = (hx - mx) * nx + (hy - my) * ny
    const arcDepth = Math.max(-1, Math.min(1, proj / (edgeLen * 0.5)))

    a.type = Math.abs(arcDepth) > 0.005 ? 'arc' : 'line'
    a.arcDepth = arcDepth

    // 把手柄吸附到合法弧深位置
    handle.ellipse.x = mx + nx * arcDepth * (edgeLen * 0.5)
    handle.ellipse.y = my + ny * arcDepth * (edgeLen * 0.5)

    this._syncPath()
  }

  // ==================== 拖拽结束 ====================

  private _onDragEnd(section: Section): void {
    this._isDragging = false

    if (section.pathPoints) {
      this.opts.updateSectionBorder(section.id, {
        pathPoints: section.pathPoints.map(p => ({ ...p })),
      })
      this.opts.saveHistory()
    }

    this.opts.setSyncing(false)
  }

  /** 实时更新 Path 元素的 SVG path 数据 */
  private _syncPath(): void {
    const section = this._activeSectionId
      ? this.opts.getSection(this._activeSectionId)
      : undefined
    if (!section || !section.pathPoints || !this._activePathElement) return

    const d = pathPointsToSvgPath(section.pathPoints)
    try {
      ;(this._activePathElement as any).path = d
    } catch {
      this._activePathElement.setAttr?.('path', d)
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
