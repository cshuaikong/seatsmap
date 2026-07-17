import { EditorEvent } from '@leafer-in/editor'

export interface SelectionManagerCtx {
  getEditor: () => any
  getFocusedSectionId: () => string | null
  getSectionGroupMap: () => Map<string, any>
  getVertexTarget: () => any
}

export function useSelectionManager(ctx: SelectionManagerCtx): void {
  const editor = ctx.getEditor()
  if (!editor) return

  function isAuxiliaryElement(el: any): boolean {
    if (!el) return false
    if (el.id?.startsWith?.('section-border-')) return true
    if (el.__sectionBorder || el.__sectionNameText || el.__rowLabelText || el.__seatLabelText) return true
    return false
  }

  function normalizeSingle(target: any): any | false {
    if (!target) return target

    // 顶点编辑模式：禁止选中座位排，其他保持原样
    if (ctx.getVertexTarget()) {
      if (target?.__seatRow) return false
      return target
    }

    const focusedId = ctx.getFocusedSectionId?.()

    // 分区聚焦模式
    if (focusedId) {
      // 忽略 SectionGroup 本身（应由子元素或 BEFORE_DOWN 处理）
      if (target?.__sectionGroup === true) return false

      // 可见的单个座位圆直接选中
      if (target?.__seatId) return target

      // 命中座位排内部元素时归一为排 Group
      let node = target
      while (node) {
        if (node?.__seatRow) {
          // 仅允许选中当前 focus 分区下的排
          return node.__sectionId === focusedId ? node : false
        }
        node = node.parent
      }

      // 非当前分区的 seatRow 禁止选中
      if (target?.__seatRow && target?.__sectionId !== focusedId) return false

      return target
    }

    // 非分区聚焦模式：禁止选中任何座位排/座位
    let node = target
    while (node) {
      if (node === editor) return false
      if (node?.__seatRow || node?.__seatId) return false
      // 命中 SectionGroup 子元素时归一到 Group
      if (node?.__sectionGroup === true) return node
      node = node.parent
    }
    if (target?.__sectionGroup && target?.__sectionGroup !== true) {
      return target.__sectionGroup
    }

    return target
  }

  function beforeSelect(target: any): any | false {
    if (!target) return target

    const focusedId = ctx.getFocusedSectionId?.()

    if (Array.isArray(target)) {
      const seen = new Set<any>()
      const result: any[] = []

      for (const t of target) {
        if (isAuxiliaryElement(t)) continue
        let normalized = normalizeSingle(t)
        if (normalized === false || !normalized) continue
        if (isAuxiliaryElement(normalized)) continue

        // focus 模式下只保留当前分区内的元素
        if (focusedId) {
          let belongs = normalized.__sectionId === focusedId
          let p = normalized.parent
          while (!belongs && p) {
            if (p.__sectionId === focusedId) { belongs = true; break }
            p = p.parent
          }
          if (!belongs) continue
        }

        if (seen.has(normalized)) continue
        seen.add(normalized)
        result.push(normalized)
      }

      return result.length ? result : false
    }

    return normalizeSingle(target)
  }

  // 注入 beforeSelect hook（运行时修改 config 即可生效）
  editor.config = Object.assign({}, editor.config, {
    beforeSelect: (data: { target: any }) => beforeSelect(data.target),
  })

  // 选中状态变化时同步 editBox 的可见性与事件穿透
  function syncEditBoxState(): void {
    const eb = editor.editBox
    if (!eb) return
    const list: any[] = editor.list ?? []

    if (list.length > 0 && list.some((el: any) => el.__seatId)) {
      // 单座选中：不需要 editBox，避免遮挡相邻座位
      eb.visible = false
      eb.hittable = false
      return
    }

    if (list.length > 0 && list.every((el: any) => el.__seatRow)) {
      // 座位排选中：保留 editBox 用于拖拽/旋转，但让事件能穿透到子座位圆
      eb.visible = true
      editor.hittable = true
      editor.hitSelf = false
      editor.hitChildren = true
      eb.hittable = true
      eb.hitSelf = false
      eb.hitChildren = true
      if (eb.rect) eb.rect.hittable = false
      return
    }

    // 默认状态：恢复 editBox 正常交互
    eb.visible = true
    editor.hittable = true
    editor.hitSelf = true
    editor.hitChildren = true
    eb.hittable = true
    eb.hitSelf = true
    eb.hitChildren = true
    if (eb.rect) eb.rect.hittable = true
  }

  editor.on(EditorEvent.SELECT, syncEditBoxState)

  // Editor 内部在 SELECT 事件后仍会调用 editBox.update 刷新显示，
  // 这里覆盖 update 以保证座位圆选中时 editBox 保持隐藏。
  // 这是当前唯一保留的 Editor 内部方法覆盖，范围仅限于 editBox 显示状态。
  const editBox = editor.editBox
  if (editBox) {
    const _origUpdate = editBox.update.bind(editBox)
    editBox.update = function (...args: any[]) {
      try { _origUpdate.apply(this, args) } catch (_) {}
      syncEditBoxState()
    }
  }
}
