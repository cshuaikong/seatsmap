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

export class PathVertexManager {
  private opts: PathVertexManagerOptions
  private handleGroup: Group
  private handles: VertexHandle[] = []
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

  /** 为选中分区显示顶点编辑手柄 */
  showVertices(section: Section, pathEl: Path): void {
    this.hideVertices()

    if (!section.borderPathPoints || section.borderPathPoints.length === 0) return

    const baseX = section.borderX ?? 0
    const baseY = section.borderY ?? 0
    const scale = this.opts.getScale()
    const logicalRadius = 4 / Math.max(scale, 0.05)

    this._activeSectionId = section.id
    this._activePathElement = pathEl

    section.borderPathPoints.forEach((pt, index) => {
      const worldX = baseX + pt.x
      const worldY = baseY + pt.y

      const ellipse = new Ellipse({
        id: `vertex-${section.id}-${index}`,
        x: worldX,
        y: worldY,
        width: logicalRadius * 2,
        height: logicalRadius * 2,
        fill: '#3b82f6',
        stroke: '#ffffff',
        strokeWidth: 1,
        draggable: true,
        cursor: 'move',
        hitFill: 'all',
        zIndex: 1000,
      })

      // 监听拖拽事件
      ellipse.on(DragEvent.START, () => {
        this._onDragStart()
      })

      ellipse.on(DragEvent.DRAG, (e: any) => {
        this._onDragMove(index, e)
      })

      ellipse.on(DragEvent.END, () => {
        this._onDragEnd(section)
      })

      this.handleGroup.add(ellipse)
      this.handles.push({ ellipse, sectionId: section.id, index })
    })
  }

  /** 移除所有顶点手柄 */
  hideVertices(): void {
    this.handles.forEach(h => {
      h.ellipse.remove()
    })
    this.handles = []
    this._activeSectionId = null
    this._activePathElement = null
  }

  /** 更新手柄位置（分区移动后调用） */
  updatePositions(section: Section): void {
    if (!section.borderPathPoints) return

    const baseX = section.borderX ?? 0
    const baseY = section.borderY ?? 0

    this.handles.forEach(h => {
      if (h.sectionId !== section.id) return
      const pt = section.borderPathPoints![h.index]
      if (!pt) return
      h.ellipse.x = baseX + pt.x
      h.ellipse.y = baseY + pt.y
    })
  }

  private _updateHandleScale(): void {
    const scale = this.opts.getScale()
    const logicalRadius = 4 / Math.max(scale, 0.05)

    this.handles.forEach(h => {
      h.ellipse.width = logicalRadius * 2
      h.ellipse.height = logicalRadius * 2
    })
  }

  private _onDragStart(): void {
    this._isDragging = true
    this.opts.setSyncing(true)
  }

  private _onDragMove(index: number, _e: any): void {
    const section = this._activeSectionId
      ? this.opts.getSection(this._activeSectionId)
      : undefined
    if (!section || !section.borderPathPoints) return

    const handle = this.handles.find(h => h.index === index)
    if (!handle) return

    const baseX = section.borderX ?? 0
    const baseY = section.borderY ?? 0

    // 更新 PathPoint
    const nx = (handle.ellipse.x ?? baseX) - baseX
    const ny = (handle.ellipse.y ?? baseY) - baseY
    section.borderPathPoints[index] = {
      ...section.borderPathPoints[index],
      x: nx,
      y: ny,
    }

    // 实时更新 Path 元素
    if (this._activePathElement) {
      const d = pathPointsToSvgPath(section.borderPathPoints)
      try {
        ;(this._activePathElement as any).path = d
      } catch {
        // Path 元素可能没有 .path setter，用 setAttr 兼容
        this._activePathElement.setAttr?.('path', d)
      }
    }
  }

  private _onDragEnd(section: Section): void {
    this._isDragging = false

    if (section.borderPathPoints) {
      this.opts.updateSectionBorder(section.id, {
        borderPathPoints: [...section.borderPathPoints],
      })
      this.opts.saveHistory()
    }

    this.opts.setSyncing(false)
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
