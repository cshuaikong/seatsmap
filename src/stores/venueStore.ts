import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import { generateId } from '../utils/id'
import type { 
  VenueData, 
  Section, 
  SeatRow, 
  Seat, 
  Category,
  ShapeObject,
  TextObject,
  AreaObject,
  CanvasImage,
  SelectedObjectType,
  // 旧格式类型
  SeatLegacy,
  RowLegacy,
  SectionLegacy,
  CategoryLegacy
} from '../types'

export const useVenueStore = defineStore('venue', () => {
  // ==================== State ====================
  
  const venue = ref<VenueData>({
    id: generateId(),
    name: '未命名座位图',
    venueType: 'SIMPLE',
    categories: [
      { key: 1, label: '普通区', color: '#A5D6A7', accessible: false },  // 中绿
      { key: 2, label: 'VIP区', color: '#FF8A80', accessible: false },   // 中红
      { key: 3, label: '轮椅区', color: '#90CAF9', accessible: true }   // 中蓝
    ],
    sections: [],
    focalPoint: undefined
  })

  // 选中状态
  const selectedSeatIds = ref<string[]>([])
  const selectedRowIds = ref<string[]>([])
  const selectedSectionIds = ref<string[]>([])
  const selectedShapeIds = ref<string[]>([])
  const selectedTextIds = ref<string[]>([])
  const selectedAreaIds = ref<string[]>([])

  // 图片列表（支持多张）
  const canvasImages = ref<CanvasImage[]>([])
  const selectedImageId = ref<string | null>(null)

  // ==================== Getters ====================
  
  const totalSeats = computed(() => {
    let count = 0
    venue.value.sections.forEach(section => {
      section.rows.forEach(row => {
        count += row.seats.length
      })
    })
    return count
  })

  const availableSeats = computed(() => {
    let count = 0
    venue.value.sections.forEach(section => {
      section.rows.forEach(row => {
        row.seats.forEach(seat => {
          if (seat.status === 'available') count++
        })
      })
    })
    return count
  })

  const selectedSeats = computed(() => {
    const seats: Seat[] = []
    venue.value.sections.forEach(section => {
      section.rows.forEach(row => {
        row.seats.forEach(seat => {
          if (selectedSeatIds.value.includes(seat.id)) {
            seats.push(seat)
          }
        })
      })
    })
    return seats
  })

  const selectedRows = computed(() => {
    const rows: SeatRow[] = []
    venue.value.sections.forEach(section => {
      section.rows.forEach(row => {
        if (selectedRowIds.value.includes(row.id)) {
          rows.push(row)
        }
      })
    })
    return rows
  })

  const selectedShapes = computed(() => {
    const shapes: ShapeObject[] = []
    venue.value.sections.forEach(section => {
      if (section.shapes) {
        section.shapes.forEach(shape => {
          if (selectedShapeIds.value.includes(shape.id)) {
            shapes.push(shape)
          }
        })
      }
    })
    return shapes
  })

  const selectedTexts = computed(() => {
    const texts: TextObject[] = []
    venue.value.sections.forEach(section => {
      if (section.texts) {
        section.texts.forEach(text => {
          if (selectedTextIds.value.includes(text.id)) {
            texts.push(text)
          }
        })
      }
    })
    return texts
  })

  const selectedAreas = computed(() => {
    const areas: AreaObject[] = []
    venue.value.sections.forEach(section => {
      if (section.areas) {
        section.areas.forEach(area => {
          if (selectedAreaIds.value.includes(area.id)) {
            areas.push(area)
          }
        })
      }
    })
    return areas
  })

  const hasSelection = computed(() => 
    selectedSeatIds.value.length > 0 || 
    selectedRowIds.value.length > 0 || 
    selectedSectionIds.value.length > 0 ||
    selectedShapeIds.value.length > 0 ||
    selectedTextIds.value.length > 0 ||
    selectedAreaIds.value.length > 0
  )

  // ==================== Actions ====================

  // 添加区域
  function addSection(section: Omit<Section, 'id'>) {
    const newSection: Section = {
      ...section,
      id: generateId()
    }
    venue.value.sections.push(newSection)
    return newSection.id
  }

  // 添加排
  function addRow(sectionId: string, row: Omit<SeatRow, 'id'>) {
    const section = venue.value.sections.find(s => s.id === sectionId)
    if (!section) return

    const newRow: SeatRow = {
      ...row,
      id: generateId()
    }
    section.rows.push(newRow)
    return newRow.id
  }

  // 更新排属性
  function updateRow(rowId: string, updates: Partial<SeatRow>) {
    venue.value.sections.forEach(section => {
      const row = section.rows.find(r => r.id === rowId)
      if (row) {
        Object.assign(row, updates)
        
        // 如果更新了分类，同步更新该排下所有座位的分类
        const categoryId = (updates as any).categoryId
        if (categoryId !== undefined) {
          const normalizedKey = String(categoryId)
          row.seats.forEach(seat => {
            seat.categoryKey = normalizedKey
          })
        }
      }
    })
  }

  // 批量更新排
  function updateMultipleRows(rowIds: string[], updates: Partial<SeatRow>) {
    venue.value.sections.forEach(section => {
      section.rows.forEach(row => {
        if (rowIds.includes(row.id)) {
          Object.assign(row, updates)
          
          // 如果更新了分类，同步更新该排下所有座位的分类
          const categoryId = (updates as any).categoryId
          if (categoryId !== undefined) {
            const normalizedKey = String(categoryId)
            row.seats.forEach(seat => {
              seat.categoryKey = normalizedKey
            })
          }
        }
      })
    })
  }

  // 更新排的座位数（保持排的位置和角度不变，重新计算座位间距和位置）
  function updateRowSeatCount(rowId: string, newSeatCount: number) {
    venue.value.sections.forEach(section => {
      const row = section.rows.find(r => r.id === rowId)
      if (!row || row.seats.length === newSeatCount) return
      
      const currentCount = row.seats.length
      const currentSpacing = row.seatSpacing || 18
      
      // 计算排的总长度（保持不变）
      const totalLength = (currentCount - 1) * currentSpacing
      
      // 计算新的座位间距
      const newSpacing = newSeatCount > 1 ? totalLength / (newSeatCount - 1) : currentSpacing
      
      // 保存第一个座位的位置和分类信息
      const firstSeat = row.seats[0]
      const baseX = firstSeat.x
      const baseY = firstSeat.y
      const baseCategoryKey = firstSeat.categoryKey
      
      // 获取排的角度（从第一个座位到最后一个座位的方向）
      const lastSeat = row.seats[currentCount - 1]
      const angle = Math.atan2(lastSeat.y - firstSeat.y, lastSeat.x - firstSeat.x)
      
      // 重新生成座位
      row.seats = Array.from({ length: newSeatCount }, (_, i) => ({
        id: i < currentCount ? row.seats[i].id : generateId(),  // 保留原有ID
        label: String(i + 1),
        x: baseX + Math.cos(angle) * (newSpacing * i),
        y: baseY + Math.sin(angle) * (newSpacing * i),
        categoryKey: i < currentCount ? row.seats[i].categoryKey : baseCategoryKey,
        status: i < currentCount ? row.seats[i].status : 'available',
        objectType: 'seat' as const
      }))
      
      // 更新排的座位间距
      row.seatSpacing = newSpacing
    })
  }

  // 更新排的弧度
  function updateRowCurve(rowId: string, newCurve: number) {
    venue.value.sections.forEach(section => {
      const row = section.rows.find(r => r.id === rowId)
      if (!row || row.curve === newCurve) return
      
      // 更新弧度值
      row.curve = newCurve
    })
  }

  // 更新排的座位间距
  function updateRowSeatSpacing(rowId: string, newSpacing: number, resetCurve: boolean = false) {
    venue.value.sections.forEach(section => {
      const row = section.rows.find(r => r.id === rowId)
      if (!row) return
      
      const oldSpacing = row.seatSpacing || 18
      if (oldSpacing === newSpacing && !resetCurve) return
      
      // 如果需要重置弧度，先重置为0
      if (resetCurve) {
        row.curve = 0
      }
      
      // 更新座位间距
      row.seatSpacing = newSpacing
      
      // 重新计算座位位置（保持起点不动，尾部扩张）
      const seatCount = row.seats.length
      if (seatCount < 2) return
      
      // 获取第一个座位的位置作为起点
      const firstSeat = row.seats[0]
      const baseX = firstSeat.x
      const baseY = firstSeat.y
      
      // 获取排的方向（从第一个座位到最后一个座位的角度）
      const lastSeat = row.seats[seatCount - 1]
      const angle = Math.atan2(lastSeat.y - firstSeat.y, lastSeat.x - firstSeat.x)
      
      // 更新每个座位的位置（从起点开始重新分布）
      row.seats = row.seats.map((seat, i) => ({
        ...seat,
        x: baseX + Math.cos(angle) * (newSpacing * i),
        y: baseY + Math.sin(angle) * (newSpacing * i)
      }))
    })
  }

  // 更新座位
  function updateSeat(seatId: string, updates: Partial<Seat>) {
    venue.value.sections.forEach(section => {
      section.rows.forEach(row => {
        const seat = row.seats.find(s => s.id === seatId)
        if (seat) {
          Object.assign(seat, updates)
        }
      })
    })
  }

  // 批量更新座位分类
  function updateSeatsCategory(seatIds: string[], categoryKey: string | number) {
    const normalizedKey = String(categoryKey)
    venue.value.sections.forEach(section => {
      section.rows.forEach(row => {
        row.seats.forEach(seat => {
          if (seatIds.includes(seat.id)) {
            seat.categoryKey = normalizedKey
          }
        })
      })
    })
  }

  // 删除排
  function deleteRow(rowId: string) {
    venue.value.sections.forEach(section => {
      section.rows = section.rows.filter(r => r.id !== rowId)
    })
    // 同时清除选中状态
    selectedRowIds.value = selectedRowIds.value.filter(id => id !== rowId)
  }

  // 删除区域
  function deleteSection(sectionId: string) {
    venue.value.sections = venue.value.sections.filter(s => s.id !== sectionId)
    selectedSectionIds.value = selectedSectionIds.value.filter(id => id !== sectionId)
  }

  // ==================== Shape CRUD ====================

  function addShape(sectionId: string, shape: Omit<ShapeObject, 'id'>) {
    const section = venue.value.sections.find(s => s.id === sectionId)
    if (!section) return

    if (!section.shapes) {
      section.shapes = []
    }

    const newShape: ShapeObject = {
      ...shape,
      id: generateId()
    }
    section.shapes.push(newShape)
    return newShape.id
  }

  function updateShape(shapeId: string, updates: Partial<ShapeObject>) {
    venue.value.sections.forEach(section => {
      if (section.shapes) {
        const shape = section.shapes.find(s => s.id === shapeId)
        if (shape) {
          Object.assign(shape, updates)
        }
      }
    })
  }

  function deleteShape(shapeId: string) {
    venue.value.sections.forEach(section => {
      if (section.shapes) {
        section.shapes = section.shapes.filter(s => s.id !== shapeId)
      }
    })
    selectedShapeIds.value = selectedShapeIds.value.filter(id => id !== shapeId)
  }

  // ==================== Text CRUD ====================

  function addText(sectionId: string, text: Omit<TextObject, 'id'>) {
    const section = venue.value.sections.find(s => s.id === sectionId)
    if (!section) return

    if (!section.texts) {
      section.texts = []
    }

    const newText: TextObject = {
      ...text,
      id: generateId()
    }
    section.texts.push(newText)
    return newText.id
  }

  function updateText(textId: string, updates: Partial<TextObject>) {
    venue.value.sections.forEach(section => {
      if (section.texts) {
        const text = section.texts.find(t => t.id === textId)
        if (text) {
          Object.assign(text, updates)
        }
      }
    })
  }

  function deleteText(textId: string) {
    venue.value.sections.forEach(section => {
      if (section.texts) {
        section.texts = section.texts.filter(t => t.id !== textId)
      }
    })
    selectedTextIds.value = selectedTextIds.value.filter(id => id !== textId)
  }

  // ==================== Area CRUD ====================

  function addArea(sectionId: string, area: Omit<AreaObject, 'id'>) {
    const section = venue.value.sections.find(s => s.id === sectionId)
    if (!section) return

    if (!section.areas) {
      section.areas = []
    }

    const newArea: AreaObject = {
      ...area,
      id: generateId()
    }
    section.areas.push(newArea)
    return newArea.id
  }

  function updateArea(areaId: string, updates: Partial<AreaObject>) {
    venue.value.sections.forEach(section => {
      if (section.areas) {
        const area = section.areas.find(a => a.id === areaId)
        if (area) {
          Object.assign(area, updates)
        }
      }
    })
  }

  function deleteArea(areaId: string) {
    venue.value.sections.forEach(section => {
      if (section.areas) {
        section.areas = section.areas.filter(a => a.id !== areaId)
      }
    })
    selectedAreaIds.value = selectedAreaIds.value.filter(id => id !== areaId)
  }

  // ==================== 图片相关 ====================

  function addCanvasImage(image: CanvasImage) {
    canvasImages.value.push(image)
  }

  function updateCanvasImage(id: string, updates: Partial<CanvasImage>) {
    const index = canvasImages.value.findIndex(img => img.id === id)
    if (index !== -1) {
      canvasImages.value[index] = { ...canvasImages.value[index], ...updates }
    }
  }

  function removeCanvasImage(id: string) {
    canvasImages.value = canvasImages.value.filter(img => img.id !== id)
    if (selectedImageId.value === id) {
      selectedImageId.value = null
    }
  }

  function selectCanvasImage(id: string, additive = false) {
    if (!additive) {
      clearSelection()
    }
    selectedImageId.value = id
  }

  function clearCanvasImageSelection() {
    selectedImageId.value = null
  }

  // ==================== 选择相关 ====================

  function selectSeat(seatId: string, additive = false) {
    if (!additive) {
      selectedSeatIds.value = [seatId]
      selectedRowIds.value = []
      selectedSectionIds.value = []
    } else if (!selectedSeatIds.value.includes(seatId)) {
      selectedSeatIds.value.push(seatId)
    }
  }

  function selectRow(rowId: string, additive = false) {
    if (!additive) {
      selectedRowIds.value = [rowId]
      selectedSeatIds.value = []
      selectedSectionIds.value = []
    } else if (!selectedRowIds.value.includes(rowId)) {
      selectedRowIds.value.push(rowId)
    }
  }

  function selectSection(sectionId: string, additive = false) {
    if (!additive) {
      selectedSectionIds.value = [sectionId]
      selectedSeatIds.value = []
      selectedRowIds.value = []
      selectedShapeIds.value = []
      selectedTextIds.value = []
      selectedAreaIds.value = []
    } else if (!selectedSectionIds.value.includes(sectionId)) {
      selectedSectionIds.value.push(sectionId)
    }
  }

  function selectShape(shapeId: string, additive = false) {
    if (!additive) {
      selectedShapeIds.value = [shapeId]
      selectedSeatIds.value = []
      selectedRowIds.value = []
      selectedSectionIds.value = []
      selectedTextIds.value = []
      selectedAreaIds.value = []
    } else if (!selectedShapeIds.value.includes(shapeId)) {
      selectedShapeIds.value.push(shapeId)
    }
  }

  function selectText(textId: string, additive = false) {
    if (!additive) {
      selectedTextIds.value = [textId]
      selectedSeatIds.value = []
      selectedRowIds.value = []
      selectedSectionIds.value = []
      selectedShapeIds.value = []
      selectedAreaIds.value = []
    } else if (!selectedTextIds.value.includes(textId)) {
      selectedTextIds.value.push(textId)
    }
  }

  function selectArea(areaId: string, additive = false) {
    if (!additive) {
      selectedAreaIds.value = [areaId]
      selectedSeatIds.value = []
      selectedRowIds.value = []
      selectedSectionIds.value = []
      selectedShapeIds.value = []
      selectedTextIds.value = []
    } else if (!selectedAreaIds.value.includes(areaId)) {
      selectedAreaIds.value.push(areaId)
    }
  }

  function clearSelection() {
    selectedSeatIds.value = []
    selectedRowIds.value = []
    selectedSectionIds.value = []
    selectedShapeIds.value = []
    selectedTextIds.value = []
    selectedAreaIds.value = []
    selectedImageId.value = null
  }

  // ==================== 通用对象更新 ====================

  function updateObjectProperty(type: SelectedObjectType, id: string, updates: Record<string, any>) {
    switch (type) {
      case 'seat':
        updateSeat(id, updates)
        break
      case 'row':
        updateRow(id, updates)
        break
      case 'rect':
      case 'ellipse':
      case 'polygon':
      case 'sector':
      case 'polyline':
        updateShape(id, updates)
        break
      case 'text':
        updateText(id, updates)
        break
      case 'area':
        updateArea(id, updates)
        break
    }
  }

  // ==================== 分类管理 ====================

  function addCategory(category: Omit<Category, 'key'>) {
    const newCategory: Category = {
      ...category,
      key: generateId()
    }
    venue.value.categories.push(newCategory)
    return newCategory.key
  }

  function updateCategory(key: string | number, updates: Partial<Category>) {
    const category = venue.value.categories.find(c => String(c.key) === String(key))
    if (category) {
      Object.assign(category, updates)
    }
  }

  function deleteCategory(key: string | number) {
    venue.value.categories = venue.value.categories.filter(c => String(c.key) !== String(key))
  }

  // ==================== 导入导出 ====================

  /**
   * 导出场馆数据为可序列化的纯数据对象
   * 返回深拷贝，不包含运行时状态
   */
  function exportVenueData(): VenueData {
    return JSON.parse(JSON.stringify(venue.value))
  }

  /**
   * 从 JSON 数据导入场馆状态
   * 执行数据校验并为缺失字段填充默认值
   */
  function importVenueData(data: VenueData) {
    // 基本数据校验
    if (!data) {
      console.error('导入失败: 数据为空')
      return
    }
    
    if (!Array.isArray(data.sections)) {
      console.error('导入失败: sections 必须是数组')
      return
    }

    if (!Array.isArray(data.categories)) {
      console.error('导入失败: categories 必须是数组')
      return
    }

    // 清除选择状态
    clearSelection()

    // 为 section 填充默认值
    const normalizedSections: Section[] = data.sections.map(section => ({
      ...section,
      rows: Array.isArray(section.rows) ? section.rows : [],
      shapes: Array.isArray(section.shapes) ? section.shapes : [],
      texts: Array.isArray(section.texts) ? section.texts : [],
      areas: Array.isArray(section.areas) ? section.areas : []
    }))

    // 为 row 填充默认值
    normalizedSections.forEach(section => {
      section.rows = section.rows.map(row => ({
        ...row,
        seats: Array.isArray(row.seats) ? row.seats : []
      }))
    })

    // 更新场馆数据
    venue.value = {
      id: data.id || generateId(),
      name: data.name || '未命名座位图',
      venueType: data.venueType || 'SIMPLE',
      categories: data.categories.length > 0 ? data.categories : [
        { key: 1, label: '普通区', color: '#4CAF50', accessible: false },
        { key: 2, label: 'VIP区', color: '#E91E63', accessible: false },
        { key: 3, label: '轮椅区', color: '#2196F3', accessible: true }
      ],
      sections: normalizedSections,
      focalPoint: data.focalPoint
    }
  }

  /**
   * 将旧格式数据转换为新的 VenueData 格式
   * 兼容 SeatLegacy/RowLegacy/SectionLegacy/CategoryLegacy
   */
  function importLegacyData(data: any): VenueData {
    if (!data) {
      console.error('导入失败: 数据为空')
      return createDefaultVenue()
    }

    // 转换分类
    const categories: Category[] = []
    if (Array.isArray(data.categories)) {
      data.categories.forEach((cat: CategoryLegacy, index: number) => {
        categories.push({
          key: cat.id || index + 1,
          label: cat.name || '未命名分类',
          color: cat.color || '#4CAF50',
          accessible: cat.accessible || false
        })
      })
    }

    // 转换区块
    const sections: Section[] = []
    if (Array.isArray(data.sections)) {
      data.sections.forEach((sec: SectionLegacy) => {
        const section: Section = {
          id: sec.id || generateId(),
          name: sec.name || '未命名区块',
          x: sec.x || 0,
          y: sec.y || 0,
          rotation: sec.rotation || 0,
          rows: [],
          shapes: [],
          texts: [],
          areas: []
        }

        // 转换排
        if (Array.isArray(sec.rows)) {
          sec.rows.forEach((row: RowLegacy) => {
            const seatRow: SeatRow = {
              id: row.id || generateId(),
              label: row.label || '',
              x: row.x || 0,
              y: row.y || 0,
              rotation: row.rotation || 0,
              seats: []
            }

            // 转换座位
            if (Array.isArray(row.seats)) {
              row.seats.forEach((seat: SeatLegacy) => {
                seatRow.seats.push({
                  id: seat.id || generateId(),
                  label: seat.label || '',
                  x: seat.x || 0,
                  y: seat.y || 0,
                  categoryKey: seat.categoryId || seat.category || 1,
                  status: seat.status || 'available',
                  objectType: seat.isWheelchair ? 'wheelchair' : 'seat',
                  radius: seat.radius,
                  rowId: row.id,
                  sectionId: sec.id,
                  isAccessible: seat.isWheelchair || false,
                  isCompanionSeat: seat.isCompanion || false
                })
              })
            }

            section.rows.push(seatRow)
          })
        }

        sections.push(section)
      })
    }

    return {
      id: generateId(),
      name: data.name || '导入的座位图',
      venueType: 'SIMPLE',
      categories: categories.length > 0 ? categories : [
        { key: 1, label: '普通区', color: '#4CAF50', accessible: false },
        { key: 2, label: 'VIP区', color: '#E91E63', accessible: false },
        { key: 3, label: '轮椅区', color: '#2196F3', accessible: true }
      ],
      sections,
      focalPoint: undefined
    }
  }

  /**
   * 创建默认场馆数据
   */
  function createDefaultVenue(): VenueData {
    return {
      id: generateId(),
      name: '未命名座位图',
      venueType: 'SIMPLE',
      categories: [
        { key: 1, label: '普通区', color: '#4CAF50', accessible: false },
        { key: 2, label: 'VIP区', color: '#E91E63', accessible: false },
        { key: 3, label: '轮椅区', color: '#2196F3', accessible: true }
      ],
      sections: [],
      focalPoint: undefined
    }
  }

  // ==================== 重置 ====================

  /**
   * 清空画布，创建新场馆
   * 重置为初始状态，保留默认分类
   */
  function resetVenue() {
    venue.value = createDefaultVenue()
    clearSelection()
  }

  // ==================== 撤销/重做快照 ====================

  /**
   * 创建当前状态的快照（用于撤销/重做）
   * 返回 JSON 字符串
   */
  function createSnapshot(): string {
    return JSON.stringify(venue.value)
  }

  /**
   * 从快照恢复状态
   */
  function restoreSnapshot(snapshot: string) {
    try {
      const data = JSON.parse(snapshot) as VenueData
      importVenueData(data)
    } catch (error) {
      console.error('恢复快照失败:', error)
    }
  }

  return {
    // State
    venue,
    selectedSeatIds,
    selectedRowIds,
    selectedSectionIds,
    selectedShapeIds,
    selectedTextIds,
    selectedAreaIds,
    
    // Getters
    totalSeats,
    availableSeats,
    selectedSeats,
    selectedRows,
    selectedShapes,
    selectedTexts,
    selectedAreas,
    hasSelection,
    
    // Actions
    addSection,
    addRow,
    updateRow,
    updateMultipleRows,
    updateRowSeatCount,
    updateRowCurve,
    updateRowSeatSpacing,
    updateSeat,
    updateSeatsCategory,
    deleteRow,
    deleteSection,
    // Shape
    addShape,
    updateShape,
    deleteShape,
    // Text
    addText,
    updateText,
    deleteText,
    // Area
    addArea,
    updateArea,
    deleteArea,
    // Images
    canvasImages,
    selectedImageId,
    addCanvasImage,
    updateCanvasImage,
    removeCanvasImage,
    selectCanvasImage,
    clearCanvasImageSelection,
    // Selection
    selectSeat,
    selectRow,
    selectSection,
    selectShape,
    selectText,
    selectArea,
    clearSelection,
    updateObjectProperty,
    // Category
    addCategory,
    updateCategory,
    deleteCategory,
    // Import/Export
    importVenueData,
    exportVenueData,
    importLegacyData,
    resetVenue,
    // Snapshot
    createSnapshot,
    restoreSnapshot
  }
})
