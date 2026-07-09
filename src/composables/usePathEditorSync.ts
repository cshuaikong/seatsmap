import { watch } from 'vue'
import type { Section, SeatRow, Seat } from '../types'
import { useVenueStore } from '../stores/venueStore'
import { nanoid } from 'nanoid'

export interface PathEditorSyncCtx {
  getLeafer: () => any
  getEditor: () => any
  getSectionGroupMap: () => Map<string, any>
  getSeatRowGroups: () => any[]
  getFocusedSectionId: () => string | null
  rebuildSeatRow: (group: any, newData: any, endCenter?: { x: number; y: number }, anchorFromEnd?: boolean) => void
}

/**
 * PathEditor <-> venueStore 双向同步桥
 *
 * 方向1 (画布→Store)：选中画布对象时，将当前状态推送到 venueStore，使 RightPanel 显示正确的属性面板。
 * 方向2 (Store→画布)：RightPanel 修改属性 → venueStore 变更 → 反向应用到画布元素。
 */
export function usePathEditorSync(ctx: PathEditorSyncCtx) {
  let isSyncingToStore = false
  let isApplyingToCanvas = false

  // ==================== 工具函数 ====================

  /** 获取 SectionGroup 内的 Path 子元素（边框） */
  function getPathChild(group: any): any | null {
    return group?.children?.find((c: any) => c.tag === 'Path') ?? null
  }

  /** 从 SectionGroup 提取 Section 数据（世界坐标） */
  function extractSectionData(group: any): Partial<Section> & { id: string } {
    const pathChild = getPathChild(group)
    return {
      id: group.__sectionId,
      name: group.__sectionName || '',
      type: 'path',
      x: +(group.x ?? 0).toFixed(2),
      y: +(group.y ?? 0).toFixed(2),
      rotation: +(group.rotation ?? 0).toFixed(2),
      fill: pathChild?.fill ?? '#d1d5db',
      stroke: pathChild?.stroke ?? '#9ca3af',
      path: pathChild?.path ?? '',
      width: pathChild?.width ?? 100,
      height: pathChild?.height ?? 100,
      opacity: +(group.opacity ?? 1).toFixed(2),
      zIndex: group.zIndex ?? 0,
    }
  }

  /** 确保 Section 存在于 venueStore（不存在则创建，存在则更新关键属性） */
  function upsertSectionInStore(store: ReturnType<typeof useVenueStore>, data: Partial<Section> & { id: string }): void {
    const existing = store.venue.sections.find(s => s.id === data.id)
    if (existing) {
      // 更新可变属性（保留 rows/其他已有数据）
      if (data.name !== undefined) existing.name = data.name
      if (data.fill !== undefined) existing.fill = data.fill
      if (data.stroke !== undefined) existing.stroke = data.stroke
      if (data.x !== undefined) existing.x = data.x
      if (data.y !== undefined) existing.y = data.y
      if (data.rotation !== undefined) existing.rotation = data.rotation
      if (data.opacity !== undefined) existing.opacity = data.opacity
      if (data.zIndex !== undefined) existing.zIndex = data.zIndex
      if (data.width !== undefined) (existing as any).width = data.width
      if (data.height !== undefined) (existing as any).height = data.height
      if (data.type !== undefined) (existing as any).type = data.type
      if (data.path !== undefined) (existing as any).path = data.path
    } else {
      // 创建新 section
      store.venue.sections.push({
        id: data.id,
        name: data.name || '',
        rows: [],
        type: 'path' as any,
        x: data.x ?? 0,
        y: data.y ?? 0,
        rotation: data.rotation ?? 0,
        fill: data.fill ?? '#d1d5db',
        stroke: data.stroke ?? '#9ca3af',
        path: (data as any).path ?? '',
        width: data.width ?? 100,
        height: data.height ?? 100,
        opacity: data.opacity ?? 1,
        zIndex: data.zIndex ?? 0,
      })
    }
  }

  /** 从座位排 Group 提取 SeatRow 数据（世界坐标） */
  function extractRowData(group: any): { row: Partial<SeatRow> & { id: string }; sectionId: string; seats: Partial<Seat>[] } {
    const rowData = group.__seatRowData
    const ellipses = (group.__seatEllipses || []) as any[]
    const barPts = (group.__bar as any)?.points ?? []
    const sectionId = group.__sectionId

    // 计算世界坐标（复用 buildVenueData 中的逻辑）
    const sectionGroupMap = ctx.getSectionGroupMap()
    const sectionGroup = sectionId ? sectionGroupMap.get(sectionId) : null
    const sX = sectionGroup?.x ?? 0
    const sY = sectionGroup?.y ?? 0
    const sRot = ((sectionGroup?.rotation ?? 0) * Math.PI) / 180
    const cosS = Math.cos(sRot)
    const sinS = Math.sin(sRot)

    const rowGX = group.x ?? 0
    const rowGY = group.y ?? 0
    const _barPt0 = barPts[0] ?? rowData?.x ?? 0
    const _barPt1 = barPts[1] ?? rowData?.y ?? 0
    const rowLocalX = rowGX + _barPt0
    const rowLocalY = rowGY + _barPt1
    const rowWorldX = sX + rowLocalX * cosS - rowLocalY * sinS
    const rowWorldY = sY + rowLocalX * sinS + rowLocalY * cosS

    // 世界行方向
    const _fbX = rowData ? _barPt0 + rowData.ux * rowData.spacing * (rowData.count - 1) : _barPt0
    const _fbY = rowData ? _barPt1 + rowData.uy * rowData.spacing * (rowData.count - 1) : _barPt1
    const beLX = rowGX + (barPts[2] ?? _fbX)
    const beLY = rowGY + (barPts[3] ?? _fbY)
    const beWX = sX + beLX * cosS - beLY * sinS
    const beWY = sY + beLX * sinS + beLY * cosS
    const worldRowRot = Math.atan2(beWY - rowWorldY, beWX - rowWorldX)

    // 提取座位数据（世界坐标 → 行局部坐标）
    const cosWRR = Math.cos(-worldRowRot)
    const sinWRR = Math.sin(-worldRowRot)

    // 座位分类继承：默认分类(1)自动从分区填充色匹配
    const sectionPath = sectionGroup?.children?.find((c: any) => c.tag === 'Path')
    const sectionFill = sectionPath?.fill ?? ''
    let inheritedCatKey: string | number | null = null
    if (sectionFill) {
      const store = useVenueStore()
      const cat = (store.venue.categories ?? []).find((c: any) => c.color === sectionFill)
      if (cat) inheritedCatKey = cat.key
    }

    const seats: Partial<Seat>[] = ellipses.map((ell: any) => {
      const ellLocalX = rowGX + (ell.x ?? 0)
      const ellLocalY = rowGY + (ell.y ?? 0)
      const eWX = sX + ellLocalX * cosS - ellLocalY * sinS
      const eWY = sY + ellLocalX * sinS + ellLocalY * cosS
      const wx = eWX - rowWorldX
      const wy = eWY - rowWorldY
      const rawCatKey = ell.__categoryKey
      const categoryKey = (rawCatKey != null && rawCatKey !== 1) ? rawCatKey : (inheritedCatKey ?? rawCatKey ?? 1)
      return {
        id: ell.__seatId || nanoid(8),
        label: ell.__sourceSeat?.label || '',
        x: +(wx * cosWRR - wy * sinWRR).toFixed(2),
        y: +(wx * sinWRR + wy * cosWRR).toFixed(2),
        categoryKey,
        status: 'available' as const,
        objectType: 'seat' as const,
      }
    })

    const row: Partial<SeatRow> & { id: string } = {
      id: group.__rowId || nanoid(8),
      label: group.__rowLabel || '',
      x: +rowWorldX.toFixed(2),
      y: +rowWorldY.toFixed(2),
      rotation: +(worldRowRot * 180 / Math.PI).toFixed(2),
      curve: +(group.__curve ?? 0).toFixed(2),
      seatSpacing: group.__seatSpacing ?? rowData?.spacing ?? 28,
      rowSpacing: group.__rowSpacing,
      seats: seats as Seat[],
    }

    return { row, sectionId, seats }
  }

  /** 确保 Row 存在于 venueStore 的指定 section 中 */
  function upsertRowInStore(
    store: ReturnType<typeof useVenueStore>,
    sectionId: string,
    rowData: Partial<SeatRow> & { id: string },
    seats: Partial<Seat>[],
  ): void {
    const section = store.venue.sections.find(s => s.id === sectionId)
    if (!section) return

    const existingRow = section.rows.find(r => r.id === rowData.id)
    if (existingRow) {
      // 更新已有 row 属性
      if (rowData.label !== undefined) existingRow.label = rowData.label
      if (rowData.x !== undefined) existingRow.x = rowData.x
      if (rowData.y !== undefined) existingRow.y = rowData.y
      if (rowData.rotation !== undefined) existingRow.rotation = rowData.rotation
      if (rowData.curve !== undefined) existingRow.curve = rowData.curve
      if (rowData.seatSpacing !== undefined) existingRow.seatSpacing = rowData.seatSpacing
      existingRow.rowSpacing = rowData.rowSpacing
      if (seats.length > 0) existingRow.seats = seats as Seat[]
    } else {
      // 添加新 row
      section.rows.push({
        ...rowData,
        seats: seats as Seat[],
      } as SeatRow)
    }
  }

  // ==================== 选中同步（画布 → Store） ====================

  function syncSelectionToStore(): void {
    const editor = ctx.getEditor()
    const list: any[] = editor?.list ?? []
    const store = useVenueStore()
    const focusedId = ctx.getFocusedSectionId()

    isSyncingToStore = true

    if (list.length === 0) {
      store.clearSelection()
      isSyncingToStore = false
      return
    }

    // 分类选中元素（使用数组保持顺序）
    const sectionGroups: any[] = []
    const seatRowGroups: any[] = []

    for (const el of list) {
      if (el.__sectionGroup === true) {
        sectionGroups.push(el)
      } else if (el.__seatRow) {
        seatRowGroups.push(el)
      }
    }

    // 分区编辑模式下：seat row Groups 选中
    if (focusedId && seatRowGroups.length > 0 && sectionGroups.length === 0) {
      // 从选中排的实际画布位置计算行间距
      if (seatRowGroups.length >= 2) {
        const sectionGroup = ctx.getSectionGroupMap().get(focusedId) ?? null
        const worldPositions = seatRowGroups.map(g => computeRowWorldPos(g, sectionGroup))
        // 取相邻排的世界距离作为行间距
        for (let i = 0; i < seatRowGroups.length; i++) {
          const next = i < worldPositions.length - 1 ? worldPositions[i + 1] : null
          const prev = i > 0 ? worldPositions[i - 1] : null
          let spacing: number | undefined
          if (next) {
            spacing = +Math.hypot(next.wx - worldPositions[i].wx, next.wy - worldPositions[i].wy).toFixed(2)
          } else if (prev) {
            spacing = +Math.hypot(worldPositions[i].wx - prev.wx, worldPositions[i].wy - prev.wy).toFixed(2)
          }
          if (spacing != null && spacing > 0) {
            seatRowGroups[i].__rowSpacing = spacing
          }
        }
      }
      for (const g of seatRowGroups) {
        const sid = g.__sectionId
        if (sid) {
          const sectionGroup = ctx.getSectionGroupMap().get(sid)
          if (sectionGroup) {
            const secData = extractSectionData(sectionGroup)
            upsertSectionInStore(store, secData)
          }
          const { row, seats } = extractRowData(g)
          upsertRowInStore(store, sid, row, seats)
        }
      }

      // 选中所有排（多选）
      store.clearSelection()
      for (let i = 0; i < seatRowGroups.length; i++) {
        const rid = seatRowGroups[i].__rowId
        if (rid) {
          store.selectRow(rid, i > 0)
        }
      }
    }
    // SectionGroup 选中
    else if (sectionGroups.length > 0) {
      for (const g of sectionGroups) {
        const secData = extractSectionData(g)
        upsertSectionInStore(store, secData)
      }

      // 清除其他选中类型
      store.clearSelection()
      for (let i = 0; i < sectionGroups.length; i++) {
        const sid = sectionGroups[i].__sectionId
        if (sid) {
          if (i === 0) {
            store.selectSection(sid, false)
          } else {
            // 多选：直接 push 到 selectedSectionIds（避免 selectSection 清除前面的）
            if (!store.selectedSectionIds.includes(sid)) {
              store.selectedSectionIds.push(sid)
            }
          }
        }
      }
    }

    isSyncingToStore = false
  }

  // ==================== 变换同步（画布 → Store） ====================

  function syncTransformToStore(): void {
    const editor = ctx.getEditor()
    const list: any[] = editor?.list ?? []
    const store = useVenueStore()
    const focusedId = ctx.getFocusedSectionId()

    if (list.length === 0) return

    isSyncingToStore = true

    for (const el of list) {
      // SectionGroup 拖拽/旋转
      if (el.__sectionGroup === true) {
        const sectionId = el.__sectionId
        if (sectionId) {
          const section = store.venue.sections.find(s => s.id === sectionId)
          if (section) {
            const oldSX = section.x as number
            const oldSY = section.y as number
            const oldSRot = ((section.rotation ?? 0) as number) * Math.PI / 180

            section.x = +(el.x ?? 0).toFixed(2)
            section.y = +(el.y ?? 0).toFixed(2)
            section.rotation = +(el.rotation ?? 0).toFixed(2)

            const newSX = section.x as number
            const newSY = section.y as number
            const newSRot = ((section.rotation ?? 0) as number) * Math.PI / 180

            // 同步更新子 row 世界坐标，防止 applyRowProperty 用旧坐标反算错位
            if (section.rows) {
              const cosOld = Math.cos(oldSRot), sinOld = Math.sin(oldSRot)
              const cosNew = Math.cos(newSRot), sinNew = Math.sin(newSRot)
              for (const row of section.rows) {
                if (row.x == null || row.y == null) continue
                const dx = (row.x as number) - oldSX
                const dy = (row.y as number) - oldSY
                const localX = dx * cosOld + dy * sinOld
                const localY = -dx * sinOld + dy * cosOld
                row.x = +(newSX + localX * cosNew - localY * sinNew).toFixed(2)
                row.y = +(newSY + localX * sinNew + localY * cosNew).toFixed(2)
              }
            }
          }
        }
      }
      // 座位排 Group 拖拽/旋转
      else if (el.__seatRow && focusedId) {
        const sectionId = el.__sectionId
        if (sectionId) {
          // 重新计算世界坐标
          const { row } = extractRowData(el)
          const section = store.venue.sections.find(s => s.id === sectionId)
          if (section) {
            const existingRow = section.rows.find(r => r.id === row.id)
            if (existingRow) {
              existingRow.x = row.x ?? existingRow.x
              existingRow.y = row.y ?? existingRow.y
              existingRow.rotation = row.rotation ?? existingRow.rotation
            }
          }
        }
      }
    }

    isSyncingToStore = false
  }

  // ==================== 属性应用（Store → 画布） ====================

  /** 将 venueStore 中 section 的属性变更应用到画布元素 */
  function applySectionProperty(sectionId: string, store: ReturnType<typeof useVenueStore>): void {
    const section = store.venue.sections.find(s => s.id === sectionId)
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
  function applyRowProperty(rowId: string, store: ReturnType<typeof useVenueStore>): void {
    // 查找 row 所在的 section
    let rowStore: SeatRow | null = null
    for (const s of store.venue.sections) {
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
    const categories = store.venue.categories ?? []
    for (let i = 0; i < Math.min(ellipses.length, storeSeats.length); i++) {
      const ell = ellipses[i]
      const storeSeat = storeSeats[i] as any
      // categoryKey → fill
      const storeCatKey = String(storeSeat.categoryKey ?? 1)
      const ellCatKey = String(ell.__categoryKey ?? 1)
      if (storeCatKey !== ellCatKey) {
        const cat = categories.find((c: any) => String(c.key) === storeCatKey)
        ell.__categoryKey = storeCatKey
        if (cat?.color) ell.fill = cat.color
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
    const store = useVenueStore()
    const categories = store.venue.categories ?? []
    const seatRowGroups = ctx.getSeatRowGroups()

    for (const group of seatRowGroups) {
      const ellipses = (group.__seatEllipses || []) as any[]
      for (const ell of ellipses) {
        const catKey = String(ell.__categoryKey ?? '1')
        const cat = categories.find(c => String(c.key) === catKey)
        if (cat?.color && ell.fill !== cat.color) {
          ell.fill = cat.color
        }
      }
    }
  }

  /**
   * 监听 store 变更并应用到画布。
   * 在 PathEditor onMounted 中调用一次即可。
   * 返回 cleanup 函数 (unwatch)。
   */
  function watchStoreAndApply(): () => void {
    const store = useVenueStore()

    const stopSections = watch(
      () => store.venue.sections,
      (newSections) => {
        if (isSyncingToStore || isApplyingToCanvas) return

        isApplyingToCanvas = true

        // 遍历所有 section 检查属性变更
        for (const section of newSections) {
          applySectionProperty(section.id, store)

          // 遍历 rows
          if (section.rows) {
            for (const row of section.rows) {
              applyRowProperty(row.id, store)
            }
          }
        }

        isApplyingToCanvas = false
      },
      { deep: true },
    )

    // 分类颜色变更 → 画布座位 fill 同步
    const stopCategories = watch(
      () => store.venue.categories,
      () => {
        if (isSyncingToStore) return
        isApplyingToCanvas = true
        applyCategoryToSeatElements()
        isApplyingToCanvas = false
      },
      { deep: true },
    )

    return () => { stopSections(); stopCategories() }
  }

  /** 从画布 Group 坐标计算 row 参考点的世界位置 */
  function computeRowWorldPos(rowGroup: any, sGroup: any | null): { wx: number; wy: number } {
    const barPts: number[] = (rowGroup.__bar as any)?.points ?? []
    const barOx = barPts[0] ?? 0
    const barOy = barPts[1] ?? 0
    const rowGX = rowGroup.x ?? 0
    const rowGY = rowGroup.y ?? 0

    const inSection = sGroup && rowGroup.parent === sGroup
    if (inSection) {
      const sX = sGroup.x ?? 0
      const sY = sGroup.y ?? 0
      const sRot = ((sGroup.rotation ?? 0) * Math.PI) / 180
      const cosS = Math.cos(sRot)
      const sinS = Math.sin(sRot)
      const localX = rowGX + barOx
      const localY = rowGY + barOy
      return {
        wx: sX + localX * cosS - localY * sinS,
        wy: sY + localX * sinS + localY * cosS,
      }
    }
    return { wx: rowGX + barOx, wy: rowGY + barOy }
  }

  /**
   * 将所有画布上的 SectionGroup 同步到 venueStore（初始加载/重新渲染时调用）。
   */
  function syncAllSectionsToStore(): void {
    const store = useVenueStore()
    const sectionGroupMap = ctx.getSectionGroupMap()
    const seatRowGroups = ctx.getSeatRowGroups()

    isSyncingToStore = true

    sectionGroupMap.forEach((group, sectionId) => {
      const secData = extractSectionData(group)
      upsertSectionInStore(store, secData)

      const sectionRows = seatRowGroups.filter((g: any) => g.__sectionId === sectionId)
      for (const rowGroup of sectionRows) {
        const { row, seats } = extractRowData(rowGroup)
        upsertRowInStore(store, sectionId, row, seats)
      }
    })

    isSyncingToStore = false
  }

  return {
    syncSelectionToStore,
    syncTransformToStore,
    syncAllSectionsToStore,
    watchStoreAndApply,
    // 暴露用于手动控制同步标志
    get isSyncingToStore() { return isSyncingToStore },
    setSyncingToStore(v: boolean) { isSyncingToStore = v },
  }
}
