import { ref } from 'vue'
import type { VenueData, Section, SeatRow, Seat } from '../types'
import { useVenueStore } from '../stores/venueStore'

// 验证导入数据 — 兼容旧格式 { version, venue } 和新格式 (venue 直接)
function validateImportData(data: any): data is VenueData {
  if (!data || typeof data !== 'object') return false
  // 旧格式：{ version, venue }
  if (data.version === '1.0' && data.venue) {
    return Array.isArray(data.venue.sections) && Array.isArray(data.venue.categories)
  }
  // 新格式：venue 直接
  return Array.isArray(data.sections) && Array.isArray(data.categories)
}

export function useSeatMapIO() {
  const isImporting = ref(false)
  const lastError = ref<string | null>(null)

  // 导出座位图数据为 JSON 文件
  const exportSeatMap = async (venue: VenueData, fileName?: string): Promise<{ success: boolean; method: 'picker' | 'download' | null }> => {
    try {
      // 深拷贝，baseScale 优先使用 venue 自带的，否则从 store 取
      const store = useVenueStore()
      const venueCopy: any = JSON.parse(JSON.stringify(venue))
      if (venueCopy.baseScale == null) {
        venueCopy.baseScale = store.getBaseScale()
      }
      venueCopy.visualConfig = store.visualConfig

      const jsonStr = JSON.stringify(venueCopy, null, 2)
      const blob = new Blob([jsonStr], { type: 'application/json' })
      const defaultName = fileName || `seatmap-${venue.name || 'export'}-${Date.now()}.json`

      // 优先使用 File System Access API，让用户选择保存位置
      if ('showSaveFilePicker' in window) {
        try {
          const handle = await (window as any).showSaveFilePicker({
            suggestedName: defaultName,
            types: [
              {
                description: 'JSON 文件',
                accept: { 'application/json': ['.json'] }
              }
            ]
          })
          const writable = await handle.createWritable()
          await writable.write(blob)
          await writable.close()
          lastError.value = null
          return { success: true, method: 'picker' }
        } catch (err: any) {
          // 用户取消选择，不算错误
          if (err.name === 'AbortError') {
            return { success: false, method: null }
          }
          // 其他错误则回退到传统下载方式
          console.warn('File System Access API 失败，回退到传统下载:', err)
        }
      }

      // 传统下载方式（兼容不支持 showSaveFilePicker 的浏览器）
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = defaultName
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      lastError.value = null
      return { success: true, method: 'download' }
    } catch (error) {
      lastError.value = error instanceof Error ? error.message : '导出失败'
      console.error('导出失败:', error)
      return { success: false, method: null }
    }
  }

  // 导入座位图数据
  const importSeatMap = async (file: File): Promise<VenueData | null> => {
    isImporting.value = true
    lastError.value = null
    
    try {
      const text = await file.text()
      const data = JSON.parse(text)
      
      if (!validateImportData(data)) {
        throw new Error('无效的数据格式')
      }

      // 兼容旧格式 { version, venue } 和新格式 (venue 直接)
      const raw: any = data
      const venue: VenueData = raw.version === '1.0' && raw.venue ? raw.venue : raw
      if (!venue.id || !venue.name) {
        throw new Error('数据缺少必要字段')
      }
      
      // 确保所有 ID 都存在
      venue.sections.forEach((section: Section) => {
        if (!section.id) section.id = `section-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
        section.rows.forEach((row: SeatRow) => {
          if (!row.id) row.id = `row-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
          row.seats.forEach((seat: Seat) => {
            if (!seat.id) seat.id = `seat-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
          })
        })
      })
      
      return venue
    } catch (error) {
      lastError.value = error instanceof Error ? error.message : '导入失败'
      console.error('导入失败:', error)
      return null
    } finally {
      isImporting.value = false
    }
  }

  // 触发文件选择对话框
  const triggerImport = (): Promise<File | null> => {
    return new Promise((resolve) => {
      const input = document.createElement('input')
      input.type = 'file'
      input.accept = '.json,application/json'
      input.onchange = (e) => {
        const file = (e.target as HTMLInputElement).files?.[0] || null
        resolve(file)
      }
      input.click()
    })
  }

  return {
    exportSeatMap,
    importSeatMap,
    triggerImport,
    isImporting,
    lastError
  }
}
