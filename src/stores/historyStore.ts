import { ref, computed } from 'vue'
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
    historyIndex.value--
    venueDataStore.importVenueData(history.value[historyIndex.value])
    editorStore.clearSelection()
  }

  function redo() {
    if (!canRedo.value) return
    historyIndex.value++
    venueDataStore.importVenueData(history.value[historyIndex.value])
    editorStore.clearSelection()
  }

  function reset() {
    history.value = []
    historyIndex.value = -1
  }

  // ==================== Return ====================

  return {
    history,
    historyIndex,
    canUndo,
    canRedo,
    initHistory,
    saveHistory,
    undo,
    redo,
    reset,
  }
})
