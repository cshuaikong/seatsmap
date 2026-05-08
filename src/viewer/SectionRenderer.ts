import { Group, Rect, Ellipse, Polygon, Line, Path, Text } from 'leafer-ui'
import type { Section, ShapeObject, TextObject, AreaObject } from '../types'
import { pathPointsToSvgPath } from './geometry'

/**
 * 渲染分区边框、形状、文本和区域对象。
 * 所有元素添加到传入的 group 中。
 */
export class SectionRenderer {
  /**
   * 渲染分区的所有非座位内容（边框 + 形状 + 文本 + 区域）
   * 返回包含边框等的 Group
   */
  static render(section: Section): Group {
    const group = new Group({ id: `section-${section.id}`, hittable: false })

    // 1. 边框
    if (section.borderType && section.borderType !== 'none') {
      const border = SectionRenderer.createBorder(section)
      if (border) group.add(border)
    }

    // 2. 形状
    section.shapes?.forEach(shape => {
      const el = SectionRenderer.createShape(shape)
      if (el) group.add(el)
    })

    // 3. 文本
    section.texts?.forEach(text => {
      const el = SectionRenderer.createText(text)
      if (el) group.add(el)
    })

    // 4. 区域
    section.areas?.forEach(area => {
      const el = SectionRenderer.createArea(area)
      if (el) group.add(el)
    })

    // 5. 分区名称标签
    if (section.name && section.borderType && section.borderType !== 'none') {
      const label = SectionRenderer.createSectionLabel(section)
      if (label) group.add(label)
    }

    return group
  }

  /** 创建分区边框元素 */
  private static createBorder(section: Section): Rect | Ellipse | Polygon | Path | null {
    const fill = section.borderFill || 'rgba(128,128,128,0.15)'
    const stroke = section.borderStroke || '#808080'
    const strokeWidth = 0 // 预览模式无边框

    const base = { fill, stroke, strokeWidth, opacity: section.borderOpacity ?? 1 }

    switch (section.borderType) {
      case 'rect':
        return new Rect({
          ...base,
          x: section.borderX ?? 0,
          y: section.borderY ?? 0,
          width: section.borderWidth ?? 100,
          height: section.borderHeight ?? 100,
        })
      case 'ellipse':
        return new Ellipse({
          ...base,
          x: section.borderX ?? 0,
          y: section.borderY ?? 0,
          width: (section.borderRadiusX ?? 50) * 2,
          height: (section.borderRadiusY ?? 50) * 2,
        })
      case 'polygon':
        if (!section.borderPoints) return null
        return new Polygon({
          ...base,
          x: section.borderX ?? 0,
          y: section.borderY ?? 0,
          points: section.borderPoints,
        })
      case 'path':
        if (!section.borderPathPoints) return null
        const d = pathPointsToSvgPath(section.borderPathPoints)
        return new Path({
          ...base,
          x: section.borderX ?? 0,
          y: section.borderY ?? 0,
          path: d,
        })
      default:
        return null
    }
  }

  /** 创建形状对象 */
  private static createShape(shape: ShapeObject): Rect | Ellipse | Polygon | Line | null {
    if (shape.type === 'rect') {
      return new Rect({
        x: shape.x, y: shape.y,
        width: shape.width ?? 100, height: shape.height ?? 100,
        fill: shape.fill || 'rgba(156,163,175,0.6)',
        stroke: shape.stroke, strokeWidth: shape.strokeWidth,
        rotation: shape.rotation ?? 0,
        cornerRadius: shape.cornerRadius,
        opacity: shape.opacity,
      })
    }
    if (shape.type === 'ellipse') {
      return new Ellipse({
        x: shape.x, y: shape.y,
        width: shape.width ?? 100, height: shape.height ?? 100,
        fill: shape.fill || 'rgba(156,163,175,0.6)',
        stroke: shape.stroke, strokeWidth: shape.strokeWidth,
        rotation: shape.rotation ?? 0,
        opacity: shape.opacity,
      })
    }
    if (shape.type === 'polygon' && shape.points) {
      return new Polygon({
        x: shape.x, y: shape.y,
        points: shape.points,
        fill: shape.fill || 'rgba(156,163,175,0.6)',
        stroke: shape.stroke, strokeWidth: shape.strokeWidth,
        rotation: shape.rotation ?? 0,
        opacity: shape.opacity,
      })
    }
    if (shape.type === 'polyline' && shape.points) {
      return new Line({
        x: shape.x, y: shape.y,
        points: shape.points,
        stroke: shape.stroke || shape.fill || '#808080',
        strokeWidth: shape.strokeWidth || 1,
        rotation: shape.rotation ?? 0,
        opacity: shape.opacity,
      })
    }
    return null
  }

  /** 创建文本对象 */
  private static createText(text: TextObject): Text | null {
    return new Text({
      x: text.x, y: text.y,
      text: text.text || text.caption || '',
      fontSize: text.fontSize ?? 14,
      fill: text.fill || text.textColor || '#333',
      rotation: text.rotation ?? 0,
      width: text.width,
      height: text.height,
      textAlign: text.align || 'center',
      fontFamily: text.fontFamily,
      fontStyle: text.fontStyle,
    })
  }

  /** 创建区域对象 */
  private static createArea(area: AreaObject): Polygon | null {
    if (!area.points) return null
    return new Polygon({
      points: area.points,
      fill: area.fill || 'rgba(100,100,100,0.3)',
      opacity: area.opacity,
    })
  }

  /** 创建分区名称标签（居中） */
  private static createSectionLabel(section: Section): Text | null {
    // 计算中心点
    let cx = section.borderX ?? 0
    let cy = section.borderY ?? 0

    if (section.borderType === 'rect') {
      cx += (section.borderWidth ?? 100) / 2
      cy += (section.borderHeight ?? 100) / 2
    } else if (section.borderType === 'ellipse') {
      cx += (section.borderRadiusX ?? 50) / 2
      cy += (section.borderRadiusY ?? 50) / 2
    } else if (section.borderType === 'polygon' && section.borderPoints) {
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
      for (let i = 0; i < section.borderPoints.length; i += 2) {
        minX = Math.min(minX, section.borderPoints[i])
        minY = Math.min(minY, section.borderPoints[i + 1])
        maxX = Math.max(maxX, section.borderPoints[i])
        maxY = Math.max(maxY, section.borderPoints[i + 1])
      }
      cx += (minX + maxX) / 2
      cy += (minY + maxY) / 2
    } else if (section.borderType === 'path' && section.borderPathPoints) {
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
      section.borderPathPoints.forEach(p => {
        minX = Math.min(minX, p.x); maxX = Math.max(maxX, p.x)
        minY = Math.min(minY, p.y); maxY = Math.max(maxY, p.y)
      })
      cx += (minX + maxX) / 2
      cy += (minY + maxY) / 2
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
