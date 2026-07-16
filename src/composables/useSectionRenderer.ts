import { Group, Path, Text } from 'leafer-ui'
import { PointerEvent as LP } from 'leafer-ui'
import { darkenColor } from '../utils/pathUtils'

export interface SectionItemData {
  id: string
  path: string
  x: number
  y: number
  fill: string
  stroke?: string
  strokeWidth?: number
  name?: string
  rotation?: number
}

export interface SectionRendererCtx {
  getLeafer: () => any
  getEditor: () => any
  getS: () => number
  getFocusedSectionId: () => string | null
}

/** 从 SVG path 字符串中解析坐标范围，返回中心点 */
function getPathCenterFromString(pathStr: string): { x: number; y: number } | null {
  if (!pathStr) return null
  const nums = pathStr.match(/[-+]?\d*\.?\d+/g)
  if (!nums || nums.length < 2) return null
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
  for (let i = 0; i < nums.length - 1; i += 2) {
    const x = parseFloat(nums[i])
    const y = parseFloat(nums[i + 1])
    if (isNaN(x) || isNaN(y)) continue
    if (x < minX) minX = x; if (x > maxX) maxX = x
    if (y < minY) minY = y; if (y > maxY) maxY = y
  }
  if (!isFinite(minX)) return null
  return { x: minX + (maxX - minX) / 2, y: minY + (maxY - minY) / 2 }
}

export function useSectionRenderer(ctx: SectionRendererCtx) {
  const sectionGroupMap = new Map<string, any>()
  let allPaths: any[] = []

  /** 获取 SectionGroup 的 body Path（填充形状），优先用缓存 */
  function getSectionBody(group: any): any {
    if (!group) return undefined
    if (group.__body) return group.__body
    const body = group.children?.find((c: any) => c.tag === 'Path' && c.__sectionGroup === group)
    if (body) group.__body = body
    return body
  }

  /** 计算分区中心点：优先用 body.boxBounds，否则解析 path 字符串 */
  function getSectionCenter(group: any): { x: number; y: number } | null {
    const body = getSectionBody(group)
    const bb = body?.boxBounds
    if (bb && (bb.width > 0 || bb.height > 0)) {
      return { x: bb.x + bb.width / 2, y: bb.y + bb.height / 2 }
    }
    const rawPath = body?.__rawPath as string | undefined
    return rawPath ? getPathCenterFromString(rawPath) : null
  }

  function createNameText(group: any, text: string, center: { x: number; y: number }): any {
    const nameText = new Text({
      text,
      x: center.x, y: center.y,
      fontSize: 14,
      fill: '#374151',
      fontWeight: '500',
      textAlign: 'center',
      verticalAlign: 'middle',
      editable: false,
      hittable: false,
      around: 'center',
      opacity: 0,
    })
    ;(nameText as any).__sectionNameText = true
    group.add(nameText)
    ;(group as any).__nameText = nameText
    return nameText
  }

  function updateNameTextsLOD(): void {
    const s = ctx.getS()
    sectionGroupMap.forEach((group: any) => {
      let nameText = group.__nameText
      if (!nameText) {
        const text = group.__sectionName || ''
        if (!text) return
        const center = getSectionCenter(group)
        if (!center) return
        nameText = createNameText(group, text, center)
      }
      if (s < 0.8) {
        nameText.opacity = 0
        return
      }
      const center = getSectionCenter(group)
      if (center) {
        nameText.x = center.x
        nameText.y = center.y
        nameText.fontSize = Math.max(8, Math.min(28, 14 / s))
        nameText.opacity = 1
      }
    })
  }

  function createPolygonItem(p: SectionItemData): any {
    const leafer = ctx.getLeafer()
    if (!leafer) return

    // 查找或创建 SectionGroup
    let sectionGroup = sectionGroupMap.get(p.id)
    if (!sectionGroup) {
      sectionGroup = new Group({
        id: `section-group-${p.id}`,
        x: p.x ?? 0,
        y: p.y ?? 0,
        rotation: p.rotation ?? 0,
        editable: true,
        draggable: true,
        hittable: true,
        hitChildren: false,
        zIndex: 0,
      })
      ;(sectionGroup as any).__sectionGroup = true
      ;(sectionGroup as any).__sectionId = p.id
      ;(sectionGroup as any).__sectionName = p.name
      sectionGroupMap.set(p.id, sectionGroup)
      leafer.add(sectionGroup)

      // 非 focus 模式下直接点选 SectionGroup；focus 模式下交给子元素处理
      sectionGroup.on(LP.BEFORE_DOWN, (e: any) => {
        if (ctx.getFocusedSectionId()) return
        const ed = ctx.getEditor()
        if (!ed) return
        if (e.shiftKey) {
          ed.hasItem(sectionGroup) ? ed.removeItem(sectionGroup) : ed.addItem(sectionGroup)
        } else {
          ed.target = sectionGroup
        }
        e.stop()
      })
    } else {
      // 增量更新：同步位置和名称
      sectionGroup.x = p.x ?? 0
      sectionGroup.y = p.y ?? 0
      sectionGroup.rotation = p.rotation ?? 0
      ;(sectionGroup as any).__sectionName = p.name
    }

    // 分区填充形状（body）作为子元素，坐标相对 Group
    const existingBody = sectionGroup.children?.find((c: any) => c.tag === 'Path' && !c.__sectionBorder)
    if (existingBody) {
      existingBody.path = p.path
      existingBody.fill = p.fill
      existingBody.stroke = p.stroke || darkenColor(p.fill, 20)
      ;(existingBody as any).__rawPath = p.path
    } else {
      const body = new Path({
        id: p.id,
        path: p.path,
        x: 0, y: 0,
        fill: p.fill,
        stroke: p.stroke || darkenColor(p.fill, 20),
        strokeWidth: p.strokeWidth ?? 1,
        strokeAlign: 'inside',
        zIndex: 0,
        editable: false,
        draggable: false,
        hittable: false,
      })
      ;(body as any).__sectionGroup = sectionGroup
      ;(body as any).__rawPath = p.path
      sectionGroup.add(body)
      ;(sectionGroup as any).__body = body
      allPaths.push(body)
    }

    // 选中高亮边框（作为 Group 子元素，随 Group 自动移动/旋转）
    const existingBorder = sectionGroup.children?.find((c: any) => c.tag === 'Path' && c.__sectionBorder)
    if (existingBorder) {
      existingBorder.path = p.path
      ;(existingBorder as any).__rawPath = p.path
    } else {
      const border = new Path({
        path: p.path,
        x: 0, y: 0,
        fill: 'transparent',
        stroke: '#3b82f6',
        strokeWidth: 2 / ctx.getS(),
        strokeAlign: 'center',
        zIndex: 1,
        editable: false,
        draggable: false,
        hittable: false,
        visible: false,
      })
      ;(border as any).__sectionBorder = true
      ;(border as any).__rawPath = p.path
      sectionGroup.add(border)
      ;(sectionGroup as any).__selectionBorder = border
    }

    // 分区名称文本（不可选中，显示于分区中心，响应缩放，初始隐藏防闪烁）
    // 没有名称或拿不到中心点都不创建，避免空文本 / (0,0) 撑大 Group 包围盒
    const existingNameText = (sectionGroup as any).__nameText
    const sectionName = p.name || ''
    if (existingNameText) {
      existingNameText.text = sectionName
    } else if (sectionName) {
      const center = getSectionCenter(sectionGroup)
      if (center) createNameText(sectionGroup, sectionName, center)
    }

    return sectionGroup
  }

  function clearAllSectionGroups(): void {
    sectionGroupMap.forEach(g => {
      try { ctx.getLeafer()?.remove(g) } catch (_) {}
    })
    sectionGroupMap.clear()
    allPaths = []
  }

  function updateSelectionBorders(selectedGroups: Set<any> | any[]): void {
    const set = selectedGroups instanceof Set ? selectedGroups : new Set(selectedGroups)
    sectionGroupMap.forEach((group) => {
      const border = (group as any).__selectionBorder
      if (border) border.visible = set.has(group)
    })
  }

  function updateBorderStrokeWidth(scale: number): void {
    sectionGroupMap.forEach((group) => {
      const border = (group as any).__selectionBorder
      if (border) border.strokeWidth = 2 / scale
    })
  }

  return {
    sectionGroupMap,
    allPaths,
    createPolygonItem,
    updateNameTextsLOD,
    clearAllSectionGroups,
    updateSelectionBorders,
    updateBorderStrokeWidth,
    getGroup: (id: string) => sectionGroupMap.get(id),
    getBody: (id: string) => getSectionBody(sectionGroupMap.get(id)),
  }
}
