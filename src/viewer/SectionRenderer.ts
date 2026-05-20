import { Group, Rect, Ellipse, Polygon, Line, Path, Text } from 'leafer-ui'
import type { Section, ShapeObject, TextObject, AreaObject } from '../types'
import { pathPointsToSvgPath, flatToPathPoints, hasArcs } from './geometry'

/**
 * 渲染分区边框、形状、文本和区域对象。
 * 所有元素添加到传入的 group 中。
 */
export interface SectionRenderOptions {
  /** 是否允许交互（编辑器模式需设为 true） */
  interactive?: boolean
}

export class SectionRenderer {
  /**
   * 渲染分区的所有非座位内容（边框 + 形状 + 文本 + 区域）
   * 返回包含边框等的 Group
   */
  static render(section: Section, options: SectionRenderOptions = {}): Group {
    const interactive = options.interactive ?? false
    const ox = section.borderX ?? 0
    const oy = section.borderY ?? 0

    // section group 定位到分区坐标，所有子元素使用相对坐标，移动 group 即可带动全部子元素
    const group = new Group({
      id: interactive ? `section-${section.id}` : `section-group-${section.id}`,
      x: ox,
      y: oy,
      hittable: interactive,
      editable: interactive,
    })

    if (interactive && (section.borderType === 'polygon' || section.borderType === 'path')) {
      ;(group as any).editConfig = { resizeable: false }
    }

    // 1. 边框（相对 group 在 0,0）
    if (section.borderType && section.borderType !== 'none') {
      const border = SectionRenderer.createBorder(section, interactive)
      if (border) group.add(border)
    }

    // 2. 形状（转为相对坐标）
    section.shapes?.forEach(shape => {
      const el = SectionRenderer.createShape(shape, interactive, ox, oy)
      if (el) group.add(el)
    })

    // 3. 文本（转为相对坐标）
    section.texts?.forEach(text => {
      const el = SectionRenderer.createText(text, interactive, ox, oy)
      if (el) group.add(el)
    })

    // 4. 区域（转为相对坐标）
    section.areas?.forEach(area => {
      const el = SectionRenderer.createArea(area, interactive, ox, oy)
      if (el) group.add(el)
    })

    // 5. 分区名称标签（转为相对坐标）
    if (section.name && section.borderType && section.borderType !== 'none') {
      const label = SectionRenderer.createSectionLabel(section, ox, oy)
      if (label) group.add(label)
    }

    return group
  }

  /** 创建分区边框元素（相对 group 原点即 0,0） */
  private static createBorder(section: Section, editable: boolean): Rect | Ellipse | Polygon | Path | null {
    const fill = section.borderFill || 'rgba(128,128,128,0.15)'
    const stroke = section.borderStroke || '#808080'
    const strokeWidth = editable ? 0 : 0

    const id = `section-border-${section.id}`
    const base = { id, fill, stroke, strokeWidth, opacity: section.borderOpacity ?? 1, editable: false }

    switch (section.borderType) {
      case 'rect':
        return new Rect({
          ...base,
          x: 0,
          y: 0,
          width: section.borderWidth ?? 100,
          height: section.borderHeight ?? 100,
        })
      case 'ellipse':
        return new Ellipse({
          ...base,
          x: (section.borderRadiusX ?? 50),
          y: (section.borderRadiusY ?? 50),
          width: (section.borderRadiusX ?? 50) * 2,
          height: (section.borderRadiusY ?? 50) * 2,
        })
      case 'polygon':
        if (!section.borderPoints) return null
        if (hasArcs(section.borderArcDepths)) {
          const pts = flatToPathPoints(section.borderPoints, section.borderArcDepths)
          const d = pathPointsToSvgPath(pts)
          return new Path({
            ...base,
            x: 0, y: 0,
            path: d,
          })
        }
        return new Polygon({
          ...base,
          x: 0, y: 0,
          points: section.borderPoints,
        })
      case 'path':
        if (!section.borderPathPoints) return null
        const d = pathPointsToSvgPath(section.borderPathPoints)
        return new Path({
          ...base,
          x: 0, y: 0,
          path: d,
        })
      default:
        return null
    }
  }

  /** 创建形状对象（shape coords 为世界坐标，转为相对 group 坐标） */
  private static createShape(shape: ShapeObject, editable: boolean, ox: number, oy: number): Rect | Ellipse | Polygon | Line | null {
    const id = `shape-${shape.id}`
    const rx = shape.x - ox
    const ry = shape.y - oy
    if (shape.type === 'rect') {
      return new Rect({
        id,
        x: rx, y: ry,
        width: shape.width ?? 100, height: shape.height ?? 100,
        fill: shape.fill || 'rgba(156,163,175,0.6)',
        stroke: shape.stroke, strokeWidth: shape.strokeWidth,
        rotation: shape.rotation ?? 0,
        cornerRadius: shape.cornerRadius,
        opacity: shape.opacity,
        editable,
      })
    }
    if (shape.type === 'ellipse') {
      return new Ellipse({
        id,
        x: rx + (shape.width ?? 100) / 2,
        y: ry + (shape.height ?? 100) / 2,
        width: shape.width ?? 100, height: shape.height ?? 100,
        fill: shape.fill || 'rgba(156,163,175,0.6)',
        stroke: shape.stroke, strokeWidth: shape.strokeWidth,
        rotation: shape.rotation ?? 0,
        opacity: shape.opacity,
        editable,
      })
    }
    if (shape.type === 'polygon' && shape.points) {
      if (hasArcs(shape.arcDepths)) {
        const pts = flatToPathPoints(shape.points, shape.arcDepths)
        const d = pathPointsToSvgPath(pts)
        const pathEl = new Path({
          id,
          x: rx, y: ry,
          path: d,
          fill: shape.fill || 'rgba(156,163,175,0.6)',
          stroke: shape.stroke, strokeWidth: shape.strokeWidth,
          rotation: shape.rotation ?? 0,
          opacity: shape.opacity,
          editable,
        })
        ;(pathEl as any).editConfig = { resizeable: false }
        return pathEl
      }
      const poly = new Polygon({
        id,
        x: rx, y: ry,
        points: shape.points,
        fill: shape.fill || 'rgba(156,163,175,0.6)',
        stroke: shape.stroke, strokeWidth: shape.strokeWidth,
        rotation: shape.rotation ?? 0,
        opacity: shape.opacity,
        editable,
      })
      ;(poly as any).editConfig = { resizeable: false }
      return poly
    }
    if (shape.type === 'polyline' && shape.points) {
      if (hasArcs(shape.arcDepths)) {
        const pts = flatToPathPoints(shape.points, shape.arcDepths)
        const d = pathPointsToSvgPath(pts).replace(/ Z$/, '')
        const pathEl = new Path({
          id,
          x: rx, y: ry,
          path: d,
          stroke: shape.stroke || shape.fill || '#808080',
          strokeWidth: shape.strokeWidth || 1,
          rotation: shape.rotation ?? 0,
          opacity: shape.opacity,
          editable,
        })
        ;(pathEl as any).editConfig = { resizeable: false }
        return pathEl
      }
      const line = new Line({
        id,
        x: rx, y: ry,
        points: shape.points,
        stroke: shape.stroke || shape.fill || '#808080',
        strokeWidth: shape.strokeWidth || 1,
        rotation: shape.rotation ?? 0,
        opacity: shape.opacity,
        editable,
      })
      ;(line as any).editConfig = { resizeable: false }
      return line
    }
    return null
  }

  /** 创建文本对象（text coords 为世界坐标，转为相对 group 坐标） */
  private static createText(text: TextObject, editable: boolean, ox: number, oy: number): Text | null {
    return new Text({
      id: `text-${text.id}`,
      x: text.x - ox, y: text.y - oy,
      text: text.text || text.caption || '',
      fontSize: text.fontSize ?? 14,
      fill: text.fill || text.textColor || '#333',
      rotation: text.rotation ?? 0,
      width: text.width,
      height: text.height,
      textAlign: text.align || 'center',
      fontFamily: text.fontFamily,
      fontStyle: text.fontStyle,
      editable,
    })
  }

  /** 创建区域对象（area points 为世界坐标，转为相对 group 坐标） */
  private static createArea(area: AreaObject, editable: boolean, ox: number, oy: number): Polygon | Path | null {
    if (!area.points) return null
    const relPoints = area.points.map((p, i) => i % 2 === 0 ? p - ox : p - oy)
    if (hasArcs(area.arcDepths)) {
      const pts = flatToPathPoints(relPoints, area.arcDepths)
      const d = pathPointsToSvgPath(pts)
      const pathEl = new Path({
        id: `area-${area.id}`,
        path: d,
        fill: area.fill || 'rgba(100,100,100,0.3)',
        opacity: area.opacity,
        editable,
      })
      ;(pathEl as any).editConfig = { resizeable: false }
      return pathEl
    }
    const areaPoly = new Polygon({
      id: `area-${area.id}`,
      points: relPoints,
      fill: area.fill || 'rgba(100,100,100,0.3)',
      opacity: area.opacity,
      editable,
    })
    ;(areaPoly as any).editConfig = { resizeable: false }
    return areaPoly
  }

  /** 创建分区名称标签（居中，相对 group 坐标） */
  private static createSectionLabel(section: Section, ox: number, oy: number): Text | null {
    let cx = 0
    let cy = 0

    if (section.borderType === 'rect') {
      cx = (section.borderWidth ?? 100) / 2
      cy = (section.borderHeight ?? 100) / 2
    } else if (section.borderType === 'ellipse') {
      cx = (section.borderRadiusX ?? 50) / 2
      cy = (section.borderRadiusY ?? 50) / 2
    } else if (section.borderType === 'polygon' && section.borderPoints) {
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
      for (let i = 0; i < section.borderPoints.length; i += 2) {
        minX = Math.min(minX, section.borderPoints[i])
        minY = Math.min(minY, section.borderPoints[i + 1])
        maxX = Math.max(maxX, section.borderPoints[i])
        maxY = Math.max(maxY, section.borderPoints[i + 1])
      }
      cx = (minX + maxX) / 2
      cy = (minY + maxY) / 2
    } else if (section.borderType === 'path' && section.borderPathPoints) {
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
      section.borderPathPoints.forEach(p => {
        minX = Math.min(minX, p.x); maxX = Math.max(maxX, p.x)
        minY = Math.min(minY, p.y); maxY = Math.max(maxY, p.y)
      })
      cx = (minX + maxX) / 2
      cy = (minY + maxY) / 2
    }

    return new Text({
      x: cx, y: cy,
      text: section.name,
      fontSize: 10,
      fontStyle: 'bold',
      fill: 'rgba(102,102,102,0.6)',
      textAlign: 'center',
      verticalAlign: 'middle',
    })
  }
}
