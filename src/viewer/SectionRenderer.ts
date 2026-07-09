import { Group, Rect, Ellipse, Polygon, Line, Path, Text } from 'leafer-ui'
import type { Section, ShapeObject, TextObject, AreaObject } from '../types'
import { pathPointsToSvgPath, flatToPathPoints, hasArcs, getSvgPathCenter } from './geometry'

/**
 * 渲染分区边框、形状、文本和区域对象。
 * 所有元素添加到传入的 group 中。
 */
export interface SectionRenderOptions {
  /** 是否允许交互（编辑器模式需设为 true） */
  interactive?: boolean
  /** 是否使用双图层边框（fill + stroke 分离，便于区分边框/主体点击） */
  dualLayer?: boolean
}

export class SectionRenderer {
  /**
   * 渲染分区的所有非座位内容（边框 + 形状 + 文本 + 区域）
   * 返回包含边框等的 Group
   */
  static render(section: Section, options: SectionRenderOptions = {}): Group {
    const interactive = options.interactive ?? false
    const dualLayer = options.dualLayer ?? false
    const ox = section.x ?? 0
    const oy = section.y ?? 0

    // section group 定位到分区坐标，所有子元素使用相对坐标，移动 group 即可带动全部子元素
    const group = new Group({
      id: interactive ? `section-${section.id}` : `section-group-${section.id}`,
      x: ox,
      y: oy,
      hittable: interactive,
      editable: interactive,
    })

    ;(group as any).__meta = { kind: 'section', id: section.id }

    // 编辑模式下配置编辑行为：分区禁用缩放手柄，保留移动和旋转
    if (interactive) {
      ;(group as any).editConfig = {
        resizeable: false,
      }
    }

    // 1. 边框（相对 group 在 0,0）
    const effectiveType = section.type
    if (effectiveType && effectiveType !== 'none') {
      if (dualLayer) {
        const dual = SectionRenderer.createDualBorder(section)
        if (dual) {
          const [fillEl, strokeEl] = dual
          group.add(fillEl)
          group.add(strokeEl)
        }
      } else {
        const border = SectionRenderer.createBorder(section, interactive)
        if (border) group.add(border)
      }
    }

    // 2. 形状
    section.shapes?.forEach(shape => {
      const el = SectionRenderer.createShape(shape, interactive, ox, oy)
      if (el) {
        ;(el as any).__meta = { kind: 'shape', id: shape.id, sectionId: section.id, shapeData: shape }
        group.add(el)
      }
    })

    // 3. 文本
    section.texts?.forEach(text => {
      const el = SectionRenderer.createText(text, interactive, ox, oy)
      if (el) {
        ;(el as any).__meta = { kind: 'text', id: text.id, sectionId: section.id, textData: text }
        group.add(el)
      }
    })

    // 4. 区域
    section.areas?.forEach(area => {
      const el = SectionRenderer.createArea(area, interactive, ox, oy)
      if (el) {
        ;(el as any).__meta = { kind: 'area', id: area.id, sectionId: section.id, areaData: area }
        group.add(el)
      }
    })

    // 5. 分区名称标签（转为相对坐标）
    if (section.name && effectiveType && effectiveType !== 'none') {
      const label = SectionRenderer.createSectionLabel(section, ox, oy)
      if (label) group.add(label)
    }

    return group
  }

  /** 创建分区边框元素（相对 group 原点即 0,0） */
  static createBorder(section: Section, editable: boolean): Rect | Ellipse | Path | null {
    const fill = section.fill || 'rgba(128,128,128,0.15)'
    const stroke = section.stroke || '#808080'
    const strokeWidth = editable ? 0 : 1.5

    const id = `section-border-${section.id}`
    const base = { id, fill, stroke, strokeWidth, opacity: section.opacity ?? 1, editable: false }
    const sectionType = section.type
    switch (sectionType) {
      case 'rect':
        return new Rect({
          ...base,
          x: 0,
          y: 0,
          width: section.width ?? 100,
          height: section.height ?? 100,
        })
      case 'ellipse':
        return new Ellipse({
          ...base,
          x: (section.radiusX ?? 50),
          y: (section.radiusY ?? 50),
          width: (section.radiusX ?? 50) * 2,
          height: (section.radiusY ?? 50) * 2,
        })
      case 'path': {
        let d = (section as any).path
        return new Path({ ...base, x: 0, y: 0, path: d })
      }
      default:
        return null
    }
  }

  /**
   * 创建双图层边框：fill 元素响应主体点击，stroke 元素响应边框点击。
   * 仅用于交互模式下的选中分区。
   */
  static createDualBorder(section: Section): [Rect | Ellipse | Path, Rect | Ellipse | Path] | null {
    const fillColor = section.fill || 'rgba(128,128,128,0.15)'
    const opacity = section.opacity ?? 1

    const fillBase = { fill: fillColor, strokeWidth: 0, opacity, editable: false, hitFill: 'all' as const, hitStroke: 'none' as const }
    // strokeWidth: 4 提供点击命中区；stroke: 'transparent' 默认不可见，高亮时改颜色
    const strokeBase = { fill: 'none' as const, stroke: 'transparent', strokeWidth: 4, opacity, editable: false, hitFill: 'none' as const, hitStroke: 'all' as const }

    const sectionType2 = section.type

    switch (sectionType2) {
      case 'rect': {
        const w = section.width ?? 100
        const h = section.height ?? 100
        return [
          new Rect({ id: `section-border-fill-${section.id}`, ...fillBase, x: 0, y: 0, width: w, height: h }),
          new Rect({ id: `section-border-stroke-${section.id}`, ...strokeBase, x: 0, y: 0, width: w, height: h }),
        ]
      }
      case 'ellipse': {
        const rx = section.radiusX ?? 50
        const ry = section.radiusY ?? 50
        return [
          new Ellipse({ id: `section-border-fill-${section.id}`, ...fillBase, x: rx, y: ry, width: rx * 2, height: ry * 2 }),
          new Ellipse({ id: `section-border-stroke-${section.id}`, ...strokeBase, x: rx, y: ry, width: rx * 2, height: ry * 2 }),
        ]
      }
      case 'path': {
        let d = (section as any).path
        if (!d && section.pathPoints?.length) {
          d = pathPointsToSvgPath(section.pathPoints)
        }
        if (!d) return null
        return [
          new Path({ id: `section-border-fill-${section.id}`, ...fillBase, x: 0, y: 0, path: d }),
          new Path({ id: `section-border-stroke-${section.id}`, ...strokeBase, x: 0, y: 0, path: d }),
        ]
      }
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

    const labelType = section.type

    if (labelType === 'rect') {
      cx = (section.width ?? 100) / 2
      cy = (section.height ?? 100) / 2
    } else if (labelType === 'ellipse') {
      cx = (section.radiusX ?? 50) / 2
      cy = (section.radiusY ?? 50) / 2
    } else if (labelType === 'path') {
      const d = (section as any).path as string | undefined
      const center = d ? getSvgPathCenter(d) : null
      if (center) { cx = center.cx; cy = center.cy }
    }

    return new Text({
      x: cx, y: cy,
      text: section.name,
      fontSize: 10,
      fontStyle: 'bold',
      fill: 'rgba(102,102,102,0.6)',
      textAlign: 'center',
      verticalAlign: 'middle',
      hittable: false,
    })
  }
}
