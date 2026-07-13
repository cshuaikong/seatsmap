import { ref, computed, watch } from 'vue'
import { defineStore } from 'pinia'
import { useVenueDataStore } from './venueDataStore'
import { useEditorStore } from './editorStore'
import { createCommandStack } from '../domain/command'
import type { Command } from '../domain/command'

/**
 * 撤销/重做历史 Store
 *
 * 当前仍基于 venue 完整快照实现 undo/redo，同时内置 CommandStack
 * 作为迁移目标。外部可通过 execute(command) 记录精确命令，未命令化的
 * 操作仍由 auto-save 快照兜底。
 */
export const useHistoryStore = defineStore('history', () => {
  const venueDataStore = useVenueDataStore()
  const editorStore = useEditorStore()

  const MAX_HISTORY = 50

  // ==================== Snapshot history (legacy) ====================

  const history = ref<any[]>([])
  const historyIndex = ref(-1)

  const canUndoSnapshot = computed(() => historyIndex.value > 0)
  const canRedoSnapshot = computed(() => historyIndex.value < history.value.length - 1)

  let isRestoring = false
  let isPaused = false
  let pendingSaveTimer: ReturnType<typeof setTimeout> | null = null

  function saveSnapshot() {
    if (historyIndex.value === -1) {
      history.value.push(venueDataStore.exportVenueData())
      historyIndex.value = 0
      return
    }
    if (historyIndex.value < history.value.length - 1) {
      history.value = history.value.slice(0, historyIndex.value + 1)
    }
    history.value.push(venueDataStore.exportVenueData())
    if (history.value.length > MAX_HISTORY) {
      history.value.shift()
    } else {
      historyIndex.value++
    }
  }

  function scheduleSave() {
    if (isRestoring || isPaused) return
    if (pendingSaveTimer) clearTimeout(pendingSaveTimer)
    pendingSaveTimer = setTimeout(() => {
      pendingSaveTimer = null
      saveSnapshot()
    }, 300)
  }

  function undoSnapshot() {
    if (!canUndoSnapshot.value) return
    isRestoring = true
    historyIndex.value--
    venueDataStore.importVenueData(history.value[historyIndex.value])
    editorStore.clearSelection()
    isRestoring = false
  }

  function redoSnapshot() {
    if (!canRedoSnapshot.value) return
    isRestoring = true
    historyIndex.value++
    venueDataStore.importVenueData(history.value[historyIndex.value])
    editorStore.clearSelection()
    isRestoring = false
  }

  function resetSnapshots() {
    history.value = []
    historyIndex.value = -1
    if (pendingSaveTimer) {
      clearTimeout(pendingSaveTimer)
      pendingSaveTimer = null
    }
  }

  watch(() => venueDataStore.venue, () => {
    scheduleSave()
  }, { deep: true })

  // ==================== Command history (migration target) ====================

  const commandStack = createCommandStack(MAX_HISTORY)

  const canUndoCommand = computed(() => commandStack.canUndo)
  const canRedoCommand = computed(() => commandStack.canRedo)

  function execute(command: Command) {
    commandStack.execute(command)
  }

  function undoCommand() {
    editorStore.clearSelection()
    commandStack.undo()
  }

  function redoCommand() {
    editorStore.clearSelection()
    commandStack.redo()
  }

  function resetCommands() {
    commandStack.reset()
  }

  // ==================== Unified API ====================

  const canUndo = computed(() => canUndoSnapshot.value || canUndoCommand.value)
  const canRedo = computed(() => canRedoSnapshot.value || canRedoCommand.value)

  function undo() {
    if (canUndoCommand.value) undoCommand()
    else undoSnapshot()
  }

  function redo() {
    if (canRedoCommand.value) redoCommand()
    else redoSnapshot()
  }

  function reset() {
    resetSnapshots()
    resetCommands()
  }

  /** 拖拽等已知 before 状态的场景用 */
  function pauseRecording() {
    isPaused = true
    if (pendingSaveTimer) {
      clearTimeout(pendingSaveTimer)
      pendingSaveTimer = null
    }
  }

  function resumeRecording() {
    if (!isPaused) return
    isPaused = false
    saveSnapshot()
  }

  return {
    canUndo,
    canRedo,
    undo,
    redo,
    reset,
    execute,
    pauseRecording,
    resumeRecording,
  }
})
