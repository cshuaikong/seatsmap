import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import type { 
  ChartData, 
  Section, 
  SeatRow, 
  Seat, 
  Category, 
  Stage,
  Point,
  ToolType,
  SnapType,
  RowToolOptions
} from '../types'
import { generateId } from '../utils/id'

export const useChartStore = defineStore('chart', () => {
  // ==================== State ====================
  
  const chart = ref<ChartData>({
    id: generateId(),
    name: '新建座位图',
    width: 2000,
    height: 1500,
    sections: [],
    categories: [
      { id: generateId(), name: '默认类别', color: '#4CAF50', accessible: false }
    ],
    stage: null
  })

  // 编辑器状态
  const currentTool = ref<ToolType>('select')
  const zoom = ref(1)
  const pan = ref<Point>({ x: 0, y: 0 })
  const snapType = ref<SnapType>('grid')
  const snapGridSize = ref(20)
  
  // 选中状态
  const selectedSeatIds = ref<string[]>([])
  const selectedRowIds = ref<string[]>([])
  const selectedSectionIds = ref<string[]>([])
  
  // 显示选项
  const showGrid = ref(true)
  const showSeatLabels = ref(true)
  const showRowLabels = ref(true)

  // ==================== Getters ====================
  
  const selectedSeats = computed(() => {
    const seats: Seat[] = []
    chart.value.sections.forEach(section => {
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
    chart.value.sections.forEach(section => {
      section.rows.forEach(row => {
        if (selectedRowIds.value.includes(row.id)) {
          rows.push(row)
        }
      })
    })
    return rows
  })

  const selectedSections = computed(() => {
    return chart.value.sections.filter(s => selectedSectionIds.value.includes(s.id))
  })

  const hasSelection = computed(() => 
    selectedSeatIds.value.length > 0 || 
    selectedRowIds.value.length > 0 || 
    selectedSectionIds.value.length > 0
  )

  const seatCount = computed(() => {
    let count = 0
    chart.value.sections.forEach(s => {
      s.rows.forEach(r => {
        count += r.seats.length
      })
    })
    return count
  })

  // ==================== Actions ====================

  // 工具切换
  function setTool(tool: ToolType) {
    currentTool.value = tool
    // 切换工具时清除选择（除了选择工具）
    if (tool !== 'select') {
      clearSelection()
    }
  }

  // 选择相关
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
    } else if (!selectedSectionIds.value.includes(sectionId)) {
      selectedSectionIds.value.push(sectionId)
    }
  }

  function clearSelection() {
    selectedSeatIds.value = []
    selectedRowIds.value = []
    selectedSectionIds.value = []
  }

  // 移动选中座位
  function moveSelectedSeats(delta: Point) {
    const seats = chart.value.sections
      .flatMap(section => section.rows.flatMap(row => row.seats))
      .filter(seat => selectedSeatIds.value.includes(seat.id))
    
    seats.forEach(seat => {
      seat.x += delta.x
      seat.y += delta.y
    })
  }

  // 添加区域
  function addSection(section: Omit<Section, 'id'>) {
    const newSection: Section = {
      ...section,
      id: generateId()
    }
    chart.value.sections.push(newSection)
    return newSection.id
  }

  // 添加排
  function addRow(sectionId: string, options: RowToolOptions, startPoint: Point) {
    const section = chart.value.sections.find(s => s.id === sectionId)
    if (!section) return

    const rowId = generateId()
    const seats: Seat[] = []
    
    for (let i = 0; i < options.seatCount; i++) {
      // 计算座位位置（考虑曲线）
      const angle = (i / (options.seatCount - 1) - 0.5) * options.curve
      const seatX = startPoint.x + i * options.seatSpacing * Math.cos(angle)
      const seatY = startPoint.y + i * options.seatSpacing * Math.sin(angle)
      
      const seatNumber = options.numberDirection === 'asc' 
        ? options.startNumber + i 
        : options.startNumber + options.seatCount - 1 - i

      seats.push({
        id: generateId(),
        label: String(seatNumber),
        x: seatX,
        y: seatY,
        radius: 12,
        shape: 'circle',
        rotation: 0,
        categoryId: section.categoryId,
        rowId,
        sectionId
      })
    }

    const newRow: SeatRow = {
      id: rowId,
      label: options.rowLabel || '',
      seats,
      sectionId
    }

    section.rows.push(newRow)
    return rowId
  }

  // 删除选中项
  function deleteSelected() {
    // 删除选中的座位
    chart.value.sections.forEach(section => {
      section.rows.forEach(row => {
        row.seats = row.seats.filter(seat => !selectedSeatIds.value.includes(seat.id))
      })
      // 删除空排
      section.rows = section.rows.filter(row => row.seats.length > 0)
    })

    // 删除选中的排
    chart.value.sections.forEach(section => {
      section.rows = section.rows.filter(row => !selectedRowIds.value.includes(row.id))
    })

    // 删除选中的区域
    chart.value.sections = chart.value.sections.filter(
      section => !selectedSectionIds.value.includes(section.id)
    )

    clearSelection()
  }

  // 视图控制
  function setZoom(newZoom: number) {
    zoom.value = Math.max(0.1, Math.min(5, newZoom))
  }

  function setPan(newPan: Point) {
    pan.value = newPan
  }

  function resetView() {
    zoom.value = 1
    pan.value = { x: 0, y: 0 }
  }

  // 更新图表属性
  function updateChart(updates: Partial<ChartData>) {
    Object.assign(chart.value, updates)
  }

  // 更新区域属性
  function updateSection(sectionId: string, updates: Partial<Section>) {
    const section = chart.value.sections.find(s => s.id === sectionId)
    if (section) {
      Object.assign(section, updates)
    }
  }

  // 更新座位属性
  function updateSeat(seatId: string, updates: Partial<Seat>) {
    for (const section of chart.value.sections) {
      for (const row of section.rows) {
        const seat = row.seats.find(s => s.id === seatId)
        if (seat) {
          Object.assign(seat, updates)
          return
        }
      }
    }
  }

  // 添加类别
  function addCategory(category: Omit<Category, 'id'>) {
    const newCategory: Category = {
      ...category,
      id: generateId()
    }
    chart.value.categories.push(newCategory)
    return newCategory.id
  }

  // 更新类别
  function updateCategory(categoryId: string, updates: Partial<Category>) {
    const category = chart.value.categories.find(c => c.id === categoryId)
    if (category) {
      Object.assign(category, updates)
    }
  }

  // 删除类别
  function deleteCategory(categoryId: string) {
    const index = chart.value.categories.findIndex(c => c.id === categoryId)
    if (index > -1) {
      chart.value.categories.splice(index, 1)
    }
  }

  // 设置舞台
  function setStage(stage: Stage | null) {
    chart.value.stage = stage
  }

  return {
    // State
    chart,
    currentTool,
    zoom,
    pan,
    snapType,
    snapGridSize,
    selectedSeatIds,
    selectedRowIds,
    selectedSectionIds,
    showGrid,
    showSeatLabels,
    showRowLabels,
    
    // Getters
    selectedSeats,
    selectedRows,
    selectedSections,
    hasSelection,
    seatCount,
    
    // Actions
    setTool,
    selectSeat,
    selectRow,
    selectSection,
    clearSelection,
    moveSelectedSeats,
    addSection,
    addRow,
    deleteSelected,
    setZoom,
    setPan,
    resetView,
    updateChart,
    updateSection,
    updateSeat,
    addCategory,
    updateCategory,
    deleteCategory,
    setStage
  }
})