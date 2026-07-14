import { watch } from 'vue'
import type { Section, SeatRow } from '../types'
import { useVenueDataStore } from '../stores/venueDataStore'
import { useEditorStore } from '../stores/editorStore'
import { darkenColor } from '../utils/color'

export interface PathEditorSyncCtx {
  getLeafer: () => any
  getEditor: () => any
  getSectionGroupMap: () => Map<string, any>
  getSeatRowGroups: () => any[]
  getFocusedSectionId: () => string | null
  rebuildSeatRow: (group: any, newData: any, endCenter?: { x: number; y: number }, anchorFromEnd?: boolean) => void
  refreshSeatLOD?: () => void
  /** 画布增量创建新 Section */
  createSection?: (section: Section) => void
  /** 画布增量创建若干 Row */
  createRows?: (sectionId: string, rows: SeatRow[]) => void
}

/**
 * PathEditor <-> split stores 同步桥
 *
 * 单向同步：store 是单一真相源，RightPanel/Command 修改 store 后，
 * 这里把变更应用到 Leafer 画布元素。
 * 选中变化时也会把 canvas 选中状态同步到 editorStore（但不反向写 venueDataStore）。
 */
export function usePathEditorSync(ctx: PathEditorSyncCtx) {
  const venueDataStore = useVenueDataStore()
  const editorStore = useEditorStore()

  let knownSectionIds = new Set<string>()
  let knownRowIds = new Set<string>()

  let isSyncingToStore = false
  let isApplyingToCanvas = false

  // ==================== 工具函数 ====================

  /** 获取 SectionGroup 内的 Path 子元素（边框） */
  function getPathChild(group: any): any | null {
    return group?.children?.find((c: any) => c.tag === 'Path') ?? null
  }

  // ==================== 选中同步（画布 → Store） ====================

  /** canvas 选中变化 → 同步到 editorStore（不再反向写 venueDataStore） */
  function syncSelectionToStore(): void {
    const editor = ctx.getEditor()
    const list: any[] = editor?.list ?? []

    if (isApplyingToCanvas) return
    isSyncingToStore = true

    if (list.length === 0) {
      editorStore.clearSelection()
      isSyncingToStore = false
      return
    }

    const sectionGroups: any[] = []
    const seatRowGroups: any[] = []
    const seatEllipses: any[] = []

    for (const el of list) {
      if (el.__sectionGroup === true) {
        sectionGroups.push(el)
      } else if (el.__seatRow) {
        seatRowGroups.push(el)
      } else if (el.__seatId) {
        seatEllipses.push(el)
      }
    }

    // 座位圆选中（优先级最高）
    if (seatEllipses.length > 0) {
      editorStore.clearSelection()
      for (let i = 0; i < seatEllipses.length; i++) {
        const sid = seatEllipses[i].__seatId
        if (sid) editorStore.selectSeat(sid, i > 0)
      }
      isSyncingToStore = false
      return
    }

    // 排选中
    if (seatRowGroups.length > 0 && sectionGroups.length === 0) {
      editorStore.clearSelection()
      for (let i = 0; i < seatRowGroups.length; i++) {
        const rid = seatRowGroups[i].__rowId
        if (rid) editorStore.selectRow(rid, i > 0)
      }
      isSyncingToStore = false
      return
    }

    // 分区选中
    if (sectionGroups.length > 0) {
      editorStore.clearSelection()
      for (let i = 0; i < sectionGroups.length; i++) {
        const sid = sectionGroups[i].__sectionId
        if (!sid) continue
        if (i === 0) {
          editorStore.selectSection(sid, false)
        } else if (!editorStore.selectedSectionIds.includes(sid)) {
          editorStore.selectedSectionIds.push(sid)
        }
      }
    }

    isSyncingToStore = false
  }

  // ==================== 变换收集（画布 → Command） ====================

  interface TransformUpdate {
    sectionId: string
    sectionUpdates: Partial<Section>
    rowUpdates: { rowId: string; updates: Partial<SeatRow> }[]
  }

  /** pointerup 时收集 editor.list 中元素的变换，不修改 store，交给 Command 提交 */
  function collectTransformUpdates(): TransformUpdate[] {
    const editor = ctx.getEditor()
    const list: any[] = editor?.list ?? []
    const focusedId = ctx.getFocusedSectionId()

    if (list.length === 0) return []

    const updates: TransformUpdate[] = []

    for (const el of list) {
      // SectionGroup 拖拽/旋转
      if (el.__sectionGroup === true) {
        const sectionId = el.__sectionId
        if (!sectionId) continue
        const section = venueDataStore.venue.sections.find(s => s.id === sectionId)
        if (!section) continue

        const oldSX = (section.x ?? 0) as number
        const oldSY = (section.y ?? 0) as number
        const oldSRot = ((section.rotation ?? 0) as number) * Math.PI / 180

        const newSX = +(el.x ?? 0).toFixed(2)
        const newSY = +(el.y ?? 0).toFixed(2)
        const newSRotDeg = +(el.rotation ?? 0).toFixed(2)
        const newSRot = (newSRotDeg * Math.PI) / 180

        const rowUpdates: { rowId: string; updates: Partial<SeatRow> }[] = []
        if (section.rows) {
          const cosOld = Math.cos(oldSRot), sinOld = Math.sin(oldSRot)
          const cosNew = Math.cos(newSRot), sinNew = Math.sin(newSRot)
          for (const row of section.rows) {
            if (row.x == null || row.y == null) continue
            const dx = (row.x as number) - oldSX
            const dy = (row.y as number) - oldSY
            const localX = dx * cosOld + dy * sinOld
            const localY = -dx * sinOld + dy * cosOld
            rowUpdates.push({
              rowId: row.id,
              updates: {
                x: +(newSX + localX * cosNew - localY * sinNew).toFixed(2),
                y: +(newSY + localX * sinNew + localY * cosNew).toFixed(2),
              },
            })
          }
        }

        updates.push({
          sectionId,
          sectionUpdates: { x: newSX, y: newSY, rotation: newSRotDeg },
          rowUpdates,
        })
      }
      // 座位排 Group 拖拽/旋转（仅在分区聚焦模式下）
      else if (el.__seatRow && focusedId) {
        const sectionId = el.__sectionId
        if (!sectionId) continue
        const sectionGroup = ctx.getSectionGroupMap().get(sectionId)
        if (!sectionGroup) continue
        const section = venueDataStore.venue.sections.find(s => s.id === sectionId)
        if (!section) continue
        const rowId = el.__rowId
        if (!rowId) continue
        const existingRow = section.rows.find(r => r.id === rowId)
        if (!existingRow) continue

        const rowData = el.__seatRowData as { x: number; y: number; ux: number; uy: number } | undefined
        if (!rowData) continue

        const sRot = ((sectionGroup.rotation ?? 0) as number) * Math.PI / 180
        const localRowX = rowData.x + (el.x ?? 0)
        const localRowY = rowData.y + (el.y ?? 0)
        const cosS = Math.cos(sRot), sinS = Math.sin(sRot)
        const worldX = +(sectionGroup.x + localRowX * cosS - localRowY * sinS).toFixed(2)
        const worldY = +(sectionGroup.y + localRowX * sinS + localRowY * cosS).toFixed(2)
        const baseRot = Math.atan2(rowData.uy, rowData.ux) * 180 / Math.PI
        const worldRot = +(baseRot + (sectionGroup.rotation ?? 0) + (el.rotation ?? 0)).toFixed(2)

        updates.push({
          sectionId,
          sectionUpdates: {},
          rowUpdates: [{
            rowId,
            updates: { x: worldX, y: worldY, rotation: worldRot },
          }],
        })
      }
    }

    return updates
  }

  // ==================== Store → 画布选中同步 ====================

  function applyStoreSelectionToCanvas(): void {
    const editor = ctx.getEditor()
    if (!editor) return
    const focusedId = ctx.getFocusedSectionId()

    const targets: any[] = []

    if (focusedId) {
      if (editorStore.selectedSeatIds.length > 0) {
        const seatSet = new Set(editorStore.selectedSeatIds)
        for (const g of ctx.getSeatRowGroups()) {
          const ellipses = (g.__seatEllipses || []) as any[]
          for (const e of ellipses) {
            if (e.__seatId && seatSet.has(e.__seatId)) targets.push(e)
          }
        }
      } else if (editorStore.selectedRowIds.length > 0) {
        const rowSet = new Set(editorStore.selectedRowIds)
        for (const g of ctx.getSeatRowGroups()) {
          if (g.__rowId && rowSet.has(g.__rowId)) targets.push(g)
        }
      }
    } else {
      if (editorStore.selectedSectionIds.length > 0) {
        const secSet = new Set(editorStore.selectedSectionIds)
        const sectionMap = ctx.getSectionGroupMap()
        for (const sid of editorStore.selectedSectionIds) {
          const g = sectionMap.get(sid)
          if (g && secSet.has(g.__sectionId)) targets.push(g)
        }
      }
    }

    isApplyingToCanvas = true
    try {
      editor.target = targets as any
    } catch (_) {}
    isApplyingToCanvas = false
  }


  // ==================== 属性应用（Store → 画布） ====================

  /** 将 venueStore 中 section 的属性变更应用到画布元素 */
  function applySectionProperty(sectionId: string): void {
    const section = venueDataStore.venue.sections.find(s => s.id === sectionId)
    if (!section) return

    const sectionGroupMap = ctx.getSectionGroupMap()
    const group = sectionGroupMap.get(sectionId)
    if (!group) return

    const pathChild = getPathChild(group)

    // 同步 path
    const secPath = (section as any).path
    if (secPath !== undefined && pathChild && pathChild.path !== secPath) {
      pathChild.path = secPath
    }
    // 同步 fill
    if (section.fill !== undefined && pathChild && pathChild.fill !== section.fill) {
      pathChild.fill = section.fill
    }
    // 同步 stroke
    if (section.stroke !== undefined && pathChild && pathChild.stroke !== section.stroke) {
      pathChild.stroke = section.stroke
    }
    // 同步 name → __sectionName + canvas text
    if (section.name !== undefined && group.__sectionName !== section.name) {
      group.__sectionName = section.name
      const nameText = group.__nameText
      if (nameText) {
        nameText.text = section.name || ''
      }
    }
    // 同步 opacity — 分区编辑模式下非聚焦分区由 enterSectionFocus 管理视觉状态，跳过 store→canvas 回写
    if (section.opacity !== undefined && group.opacity !== section.opacity) {
      const focusedId = ctx.getFocusedSectionId?.()
      if (!focusedId || sectionId === focusedId) {
        group.opacity = section.opacity
      }
    }
    // 同步 zIndex
    if (section.zIndex !== undefined && group.zIndex !== section.zIndex) {
      group.zIndex = section.zIndex
    }
    // 同步 type → readonly（只读分区不可编辑）
    if (section.type === 'none' && section.readonly === true) {
      // 只读分区不处理
    }
  }

  /** 将 venueStore 中 row 的属性变更应用到画布座位排 */
  function applyRowProperty(rowId: string): void {
    // 查找 row 所在的 section
    let rowStore: SeatRow | null = null
    for (const s of venueDataStore.venue.sections) {
      const r = s.rows.find(r => r.id === rowId)
      if (r) { rowStore = r; break }
    }
    if (!rowStore) return

    // 查找对应的 seat row Group
    const seatRowGroups = ctx.getSeatRowGroups()
    const group = seatRowGroups.find((g: any) => g.__rowId === rowId)
    if (!group) return

    const rowData = group.__seatRowData
    if (!rowData) return

    // 同步 curve
    const newCurve = rowStore.curve ?? 0
    if ((group.__curve ?? 0) !== newCurve) {
      group.__curve = newCurve
      ctx.rebuildSeatRow(group, { ...rowData })
    }

    // 同步 seatSpacing
    const newSpacing = rowStore.seatSpacing ?? rowData.spacing
    if (rowData.spacing !== newSpacing) {
      rowData.spacing = newSpacing
      group.__seatSpacing = newSpacing
      ctx.rebuildSeatRow(group, { ...rowData })
    }

    // 同步 count（座位数）
    const newCount = rowStore.seats?.length ?? rowData.count
    if (rowData.count !== newCount) {
      rowData.count = newCount
      ctx.rebuildSeatRow(group, { ...rowData })
    }

    // 同步 label
    if (rowStore.label !== undefined && group.__rowLabel !== rowStore.label) {
      group.__rowLabel = rowStore.label
      const labelText = (group as any).__labelText
      if (labelText) {
        labelText.text = rowStore.label || ''
      }
    }

    // 同步 seat categoryKey + label → 更新座位 fill 和标签文本
    const ellipses = (group.__seatEllipses || []) as any[]
    const storeSeats = rowStore.seats || []
    const categories = venueDataStore.venue.categories ?? []
    for (let i = 0; i < Math.min(ellipses.length, storeSeats.length); i++) {
      const ell = ellipses[i]
      const storeSeat = storeSeats[i] as any
      // categoryKey → fill
      const storeCatKey = String(storeSeat.categoryKey ?? 1)
      const ellCatKey = String(ell.__categoryKey ?? 1)
      if (storeCatKey !== ellCatKey) {
        const cat = categories.find((c: any) => String(c.key) === storeCatKey)
        ell.__categoryKey = storeCatKey
        if (cat?.color) {
          ell.fill = cat.color
          ell.stroke = darkenColor(cat.color, 30)
          ell.__originalStroke = ell.stroke
        }
      }
      // label → 标签文本
      const st = (ell as any).__labelText
      if (st) {
        const newLabel = storeSeat.label || ''
        if (st.text !== newLabel) {
          st.text = newLabel
          ;(ell as any).__sourceSeat.label = newLabel
        }
      }
    }

    // 标签/分类变化后刷新座位 LOD，确保标签显隐和选中高亮正确
    ctx.refreshSeatLOD?.()

    // 同步 rotation（排旋转）
    // 同步 rowSpacing / 位置（行间距变更时 RightPanel 会重算 x/y）
    if (rowStore.rowSpacing !== undefined && group.__rowSpacing !== rowStore.rowSpacing) {
      group.__rowSpacing = rowStore.rowSpacing
    }
    // 同步 row 位置（store → 画布，含 rowSpacing 变更附带的位置重算）
    if (rowStore.x !== undefined || rowStore.y !== undefined) {
      const bar = (group as any).__bar as any
      const barPts: number[] = bar?.points ?? []
      const barOx = barPts[0] ?? 0
      const barOy = barPts[1] ?? 0

      const sMap = ctx.getSectionGroupMap()
      const sId = group.__sectionId
      const sGroup = sId ? sMap.get(sId) : null
      // 仅在 Group 实际挂载在 SectionGroup 下时使用局部坐标
      const inSectionGroup = sGroup && group.parent === sGroup

      if (inSectionGroup) {
        const cosR = Math.cos(-(sGroup.rotation ?? 0) * Math.PI / 180)
        const sinR = Math.sin(-(sGroup.rotation ?? 0) * Math.PI / 180)
        const dx = (rowStore.x ?? 0) - (sGroup.x ?? 0)
        const dy = (rowStore.y ?? 0) - (sGroup.y ?? 0)
        const localX = dx * cosR - dy * sinR
        const localY = dx * sinR + dy * cosR
        group.x = localX - barOx
        group.y = localY - barOy
      } else {
        group.x = (rowStore.x ?? 0) - barOx
        group.y = (rowStore.y ?? 0) - barOy
      }
    }
  }

  /** 当分类 color/label 变更时，更新所有同分类座位的 fill */
  function applyCategoryToSeatElements(): void {
    const categories = venueDataStore.venue.categories ?? []
    const seatRowGroups = ctx.getSeatRowGroups()

    for (const group of seatRowGroups) {
      const ellipses = (group.__seatEllipses || []) as any[]
      for (const ell of ellipses) {
        const catKey = String(ell.__categoryKey ?? '1')
        const cat = categories.find(c => String(c.key) === catKey)
        if (cat?.color && ell.fill !== cat.color) {
          ell.fill = cat.color
          ell.stroke = darkenColor(cat.color, 30)
          ell.__originalStroke = ell.stroke
        }
      }
    }
    ctx.refreshSeatLOD?.()
  }

  /** 当 store 中的 section / row 被删除时，同步移除画布元素 */
  function removeMissingSectionsAndRows(newSections: Section[]): void {
    const sectionIds = new Set(newSections.map(s => s.id))
    const rowIds = new Set<string>()
    newSections.forEach(s => s.rows?.forEach(r => rowIds.add(r.id)))

    const sectionGroupMap = ctx.getSectionGroupMap()
    const seatRowGroups = ctx.getSeatRowGroups()

    // 移除已不存在的 section group
    sectionGroupMap.forEach((group, sid) => {
      if (sectionIds.has(sid)) return
      group.children?.slice().forEach((child: any) => {
        if (child.__seatRow) {
          const idx = seatRowGroups.indexOf(child)
          if (idx !== -1) seatRowGroups.splice(idx, 1)
        }
      })
      try { group.remove() } catch (_) {}
      sectionGroupMap.delete(sid)
    })

    // 移除已不存在的 row group
    seatRowGroups.slice().forEach((group: any) => {
      if (!group.__rowId || rowIds.has(group.__rowId)) return
      const idx = seatRowGroups.indexOf(group)
      if (idx !== -1) seatRowGroups.splice(idx, 1)
      try { group.parent?.remove(group) } catch (_) {}
    })
  }

  /**
   * 监听 store 变更并应用到画布。
   * 在 PathEditor onMounted 中调用一次即可。
   * 返回 cleanup 函数 (unwatch)。
   */
  function watchStoreAndApply(): () => void {
    initKnownIds()

    const stopSections = watch(
      () => venueDataStore.venue.sections,
      (newSections) => {
        if (isSyncingToStore || isApplyingToCanvas) return

        const currentSectionIds = new Set((newSections ?? []).map(s => s.id))
        const currentRowIds = new Set<string>()
        let newRowCount = 0
        ;(newSections ?? []).forEach(s => s.rows?.forEach(r => {
          currentRowIds.add(r.id)
          if (!knownRowIds.has(r.id)) newRowCount++
        }))

        const newSectionCount = (newSections ?? []).filter(s => !knownSectionIds.has(s.id)).length

        // 大批量加载：跳过昂贵的增量创建，交给 PathEditor.renderAll 一次性渲染
        if (newSectionCount > 5 || newRowCount > 100) {
          knownSectionIds = currentSectionIds
          knownRowIds = currentRowIds
          return
        }

        isApplyingToCanvas = true

        // 1) 增量创建新 Section
        for (const section of newSections ?? []) {
          if (!knownSectionIds.has(section.id)) {
            ctx.createSection?.(section)
          }
        }

        // 2) 增量创建新 Row
        for (const section of newSections ?? []) {
          const newRows = section.rows?.filter(r => !knownRowIds.has(r.id)) ?? []
          if (newRows.length > 0) {
            ctx.createRows?.(section.id, newRows)
          }
        }

        // 3) 同步删除：store 中消失的对象从画布移除
        removeMissingSectionsAndRows(newSections ?? [])

        // 4) 遍历所有 section 检查属性变更
        for (const section of newSections ?? []) {
          applySectionProperty(section.id)

          // 遍历 rows
          if (section.rows) {
            for (const row of section.rows) {
              applyRowProperty(row.id)
            }
          }
        }

        knownSectionIds = currentSectionIds
        knownRowIds = currentRowIds
        isApplyingToCanvas = false
      },
      { deep: true },
    )

    // 分类颜色变更 → 画布座位 fill 同步
    const stopCategories = watch(
      () => venueDataStore.venue.categories,
      () => {
        if (isSyncingToStore) return
        isApplyingToCanvas = true
        applyCategoryToSeatElements()
        isApplyingToCanvas = false
      },
      { deep: true },
    )

    // Store 选中变化 → 画布回显
    const stopSelectedRows = watch(
      () => editorStore.selectedRowIds,
      () => {
        if (isSyncingToStore || isApplyingToCanvas) return
        applyStoreSelectionToCanvas()
      },
      { deep: true },
    )
    const stopSelectedSections = watch(
      () => editorStore.selectedSectionIds,
      () => {
        if (isSyncingToStore || isApplyingToCanvas) return
        applyStoreSelectionToCanvas()
      },
      { deep: true },
    )
    const stopSelectedSeats = watch(
      () => editorStore.selectedSeatIds,
      () => {
        if (isSyncingToStore || isApplyingToCanvas) return
        applyStoreSelectionToCanvas()
      },
      { deep: true },
    )

    return () => { stopSections(); stopCategories(); stopSelectedRows(); stopSelectedSections(); stopSelectedSeats() }
  }

  function resetKnownIds() {
    knownSectionIds = new Set(venueDataStore.venue.sections.map(s => s.id))
    knownRowIds = new Set<string>()
    venueDataStore.venue.sections.forEach(s => s.rows?.forEach(r => knownRowIds.add(r.id)))
  }

  function initKnownIds() {
    resetKnownIds()
  }

  return {
    syncSelectionToStore,
    collectTransformUpdates,
    watchStoreAndApply,
    resetKnownIds,
    // 暴露用于手动控制同步标志
    get isSyncingToStore() { return isSyncingToStore },
    setSyncingToStore(v: boolean) { isSyncingToStore = v },
  }
}
