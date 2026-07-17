import { useEditorStore } from '../stores/editorStore'
import { useHistoryStore } from '../stores/historyStore'

export interface KeyboardShortcutCtx {
  getFocusedSectionId: () => string | null
  isVertexEditActive: () => boolean
  isSeatVertexEditActive: () => boolean
  exitSectionFocus: () => void
  exitVertexEdit: () => void
  exitSeatVertexEdit: () => void
  deleteSelected: () => void
  cancelCurrentTool: () => void
}

export function useKeyboardShortcuts(ctx: KeyboardShortcutCtx) {
  const editorStore = useEditorStore()
  const historyStore = useHistoryStore()

  function onKeyDown(e: KeyboardEvent): void {
    const isMod = e.ctrlKey || e.metaKey
    const tag = (e.target as HTMLElement)?.tagName
    const isTyping = tag === 'INPUT' || tag === 'TEXTAREA' || (e.target as HTMLElement)?.isContentEditable

    if (e.key === 'Escape') {
      if (ctx.getFocusedSectionId()) {
        ctx.exitSectionFocus()
        return
      }
      if (ctx.isSeatVertexEditActive()) {
        ctx.exitSeatVertexEdit()
        return
      }
      ctx.cancelCurrentTool()
    }

    if (e.key === 'Backspace' || e.key === 'Delete') {
      if (isTyping) return
      if (ctx.isSeatVertexEditActive()) return
      ctx.deleteSelected()
    }

    if (isMod && !isTyping) {
      const key = e.key.toLowerCase()
      if (key === 'c') {
        e.preventDefault()
        editorStore.copySelected()
        return
      }
      if (key === 'v') {
        e.preventDefault()
        editorStore.paste()
        return
      }
      if (key === 'z') {
        e.preventDefault()
        if (e.shiftKey) historyStore.redo()
        else historyStore.undo()
        return
      }
      if (key === 'y') {
        e.preventDefault()
        historyStore.redo()
        return
      }
    }
  }

  function bind(): void {
    document.addEventListener('keydown', onKeyDown)
  }

  function unbind(): void {
    document.removeEventListener('keydown', onKeyDown)
  }

  return {
    bind,
    unbind,
    onKeyDown,
  }
}
