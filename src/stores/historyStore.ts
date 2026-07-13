import { computed } from 'vue'
import { defineStore } from 'pinia'
import { useEditorStore } from './editorStore'
import { createCommandStack } from '../domain/command'
import type { Command } from '../domain/command'

/**
 * 撤销/重做历史 Store
 *
 * 完全基于 Command 模式。所有会改变场馆数据的操作都应构造一个 Command
 * 并通过 execute(command) 执行，以获得精确的 undo/redo 能力。
 */
export const useHistoryStore = defineStore('history', () => {
  const editorStore = useEditorStore()

  const MAX_HISTORY = 50
  const commandStack = createCommandStack(MAX_HISTORY)

  const canUndo = computed(() => commandStack.canUndo)
  const canRedo = computed(() => commandStack.canRedo)

  function execute(command: Command) {
    editorStore.clearSelection()
    commandStack.execute(command)
  }

  function undo() {
    editorStore.clearSelection()
    commandStack.undo()
  }

  function redo() {
    editorStore.clearSelection()
    commandStack.redo()
  }

  function reset() {
    commandStack.reset()
  }

  return {
    canUndo,
    canRedo,
    execute,
    undo,
    redo,
    reset,
  }
})
