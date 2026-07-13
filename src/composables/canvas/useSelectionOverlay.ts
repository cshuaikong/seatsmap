import { ref } from 'vue'
import { Path } from 'leafer-ui'
import type { LeaferUI } from '../../types/leafer-meta'

/**
 * 选中高亮覆盖层
 *
 * 职责：当 Editor 选中 Section 时，在其上方绘制一个贴合形状的蓝色边框。
 * 因为 Leafer Editor 的 editBox 是矩形，无法贴合多边形分区。
 */
export interface SelectionOverlayCtx {
  getEditor: () => any
  getLeafer: () => any
  getScale: () => number
  getVertexEditing: () => boolean
}

export interface SectionBorder {
  border: any
  group: LeaferUI
}

export function useSelectionOverlay(ctx: SelectionOverlayCtx) {
  const sectionBorders = ref<SectionBorder[]>([])

  /** 清理所有蓝色边框 */
  function clearBorders() {
    sectionBorders.value.forEach(b => b.border.remove())
    sectionBorders.value = []
  }

  /** 为当前 Editor 选中的 Section 绘制边框 */
  function drawBorders() {
    const editor = ctx.getEditor()
    const leafer = ctx.getLeafer()
    if (!editor || !leafer) return

    const list: any[] = editor.list ?? []
    const s = ctx.getScale()

    for (const el of list) {
      if (!el?.__sectionGroup) continue

      const isGroup = el.__sectionGroup === true
      const group: LeaferUI = isGroup ? el : el.__sectionGroup
      const pathChild = isGroup
        ? group.children?.find((c: any) => c.tag === 'Path')
        : el

      if (!pathChild || !group) continue

      const border = new Path({
        id: `section-border-${group.__sectionId}`,
        path: pathChild.path,
        x: group.x ?? 0,
        y: group.y ?? 0,
        rotation: group.rotation ?? 0,
        fill: 'transparent',
        stroke: '#3b82f6',
        strokeWidth: 2 / s,
        editable: false,
        draggable: false,
        hittable: false,
        zIndex: 998,
      })
      leafer.add(border)
      sectionBorders.value.push({ border, group })
    }
  }

  /** Editor 选中变化时调用：清理旧边框 + 绘制新边框 */
  function sync() {
    if (!ctx.getVertexEditing()) {
      clearBorders()
    }
    drawBorders()
  }

  /** 拖拽/旋转时同步边框位置 */
  function updatePositions() {
    sectionBorders.value.forEach(({ border, group }) => {
      border.x = group.x
      border.y = group.y
      border.rotation = group.rotation
    })
  }

  /** 缩放变化时更新边框线宽 */
  function updateStrokeWidth(s: number) {
    sectionBorders.value.forEach(b => {
      b.border.strokeWidth = 2 / s
    })
  }

  return {
    sectionBorders,
    clearBorders,
    drawBorders,
    sync,
    updatePositions,
    updateStrokeWidth,
  }
}
