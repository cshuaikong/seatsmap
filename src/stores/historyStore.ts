import { ref, computed, watch } from 'vue'
import { defineStore } from 'pinia'
import { useVenueDataStore } from './venueDataStore'
import { useEditorStore } from './editorStore'
import type { VenueData } from '../types'

/**
 * 撤销/重做历史 Store
 *
 * 职责：基于 venueDataStore 的完整数据快照实现 undo/redo。
 * 当前使用深拷贝快照，后续可演进为 Command 模式。
 */
export const useHistoryStore = defineStore('history', () => {
  // ==================== State ====================

  const history = ref<VenueData[]>([])
  const historyIndex = ref(-1)
  const MAX_HISTORY = 50

  const venueDataStore = useVenueDataStore()
  const editorStore = useEditorStore()

  // ==================== Getters ====================

  const canUndo = computed(() => historyIndex.value > 0)
  const canRedo = computed(() => historyIndex.value < history.value.length - 1)

  let isRestoring = false
  let isPaused = false
  let pendingSaveTimer: ReturnType<typeof setTimeout> | null = null

  // ==================== Actions ====================

  function initHistory() {
    if (historyIndex.value !== -1) return
    history.value.push(venueDataStore.exportVenueData())
    historyIndex.value = 0
  }

  function saveHistory() {
    if (historyIndex.value === -1) {
      initHistory()
      return
    }

    // 删除当前索引之后的历史（如果有）
    if (historyIndex.value < history.value.length - 1) {
      history.value = history.value.slice(0, historyIndex.value + 1)
    }

    // 添加新状态
    history.value.push(venueDataStore.exportVenueData())

    // 限制历史记录数量
    if (history.value.length > MAX_HISTORY) {
      history.value.shift()
    } else {
      historyIndex.value++
    }
  }

  function undo() {
    if (!canUndo.value) return
    isRestoring = true
    historyIndex.value--
    venueDataStore.importVenueData(history.value[historyIndex.value])
    editorStore.clearSelection()
    isRestoring = false
  }

  function redo() {
    if (!canRedo.value) return
    isRestoring = true
    historyIndex.value++
    venueDataStore.importVenueData(history.value[historyIndex.value])
    editorStore.clearSelection()
    isRestoring = false
  }

  function reset() {
    history.value = []
    historyIndex.value = -1
    if (pendingSaveTimer) {
      clearTimeout(pendingSaveTimer)
      pendingSaveTimer = null
    }
  }

  /** 暂停历史记录（例如拖拽过程中） */
  function pauseRecording() {
    isPaused = true
    if (pendingSaveTimer) {
      clearTimeout(pendingSaveTimer)
      pendingSaveTimer = null
    }
  }

  /** 恢复历史记录并立即保存当前状态 */
  function resumeRecording() {
    if (!isPaused) return
    isPaused = false
    saveHistory()
  }

  /** 延迟自动保存：把连续快速变更合并为一次历史记录 */
  function scheduleSave() {
    if (isRestoring || isPaused) return
    if (pendingSaveTimer) clearTimeout(pendingSaveTimer)
    pendingSaveTimer = setTimeout(() => {
      pendingSaveTimer = null
      saveHistory()
    }, 300)
  }

  // 监听 venue 数据变化，自动记录历史（undo/redo 恢复期间跳过）
  watch(() => venueDataStore.venue, () => {
    scheduleSave()
  }, { deep: true })

  // ==================== Return ====================

  return {
    history,
    historyIndex,
    canUndo,
    canRedo,
    initHistory,
    saveHistory,
    scheduleSave,
    pauseRecording,
    resumeRecording,
    undo,
    redo,
    reset,
  }
})
