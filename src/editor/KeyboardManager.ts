export interface KeyboardManagerOptions {
  onUndo: () => void
  onRedo: () => void
  onDelete: () => void
  onEscape: () => void
  onDuplicate?: () => void
  onGroup?: () => void
  onUngroup?: () => void
  /** 获取当前正在绘图的状态标志 */
  isDrawingActive?: () => boolean
  /** 绘图时撤销最后顶点 */
  undoLastPoint?: () => void
}

export class KeyboardManager {
  private opts: KeyboardManagerOptions
  private _handler: ((e: KeyboardEvent) => void) | null = null

  constructor(opts: KeyboardManagerOptions) {
    this.opts = opts
  }

  listen(): void {
    this._handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement
      // 不拦截输入框中的按键
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        return
      }

      const meta = e.metaKey || e.ctrlKey

      // Ctrl/Cmd+Z → Undo / 绘图时撤销最后顶点
      if (meta && e.key === 'z' && !e.shiftKey) {
        e.preventDefault()
        if (this.opts.isDrawingActive?.() && this.opts.undoLastPoint) {
          this.opts.undoLastPoint()
        } else {
          this.opts.onUndo()
        }
        return
      }

      // Ctrl/Cmd+Shift+Z 或 Ctrl+Y → Redo
      if ((meta && e.key === 'z' && e.shiftKey) || (meta && e.key === 'y')) {
        e.preventDefault()
        this.opts.onRedo()
        return
      }

      // Delete/Backspace → 删除选中
      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault()
        this.opts.onDelete()
        return
      }

      // Ctrl/Cmd+D → 复制选中元素
      if (meta && e.key === 'd' && !e.shiftKey) {
        e.preventDefault()
        this.opts.onDuplicate?.()
        return
      }

      // Ctrl/Cmd+G → 编组 / Ctrl+Shift+G → 取消编组
      if (meta && e.key === 'g') {
        e.preventDefault()
        if (e.shiftKey) {
          this.opts.onUngroup?.()
        } else {
          this.opts.onGroup?.()
        }
        return
      }

      // Escape → 取消选择 / 取消绘图
      if (e.key === 'Escape') {
        e.preventDefault()
        this.opts.onEscape()
        return
      }
    }

    window.addEventListener('keydown', this._handler)
  }

  unlisten(): void {
    if (this._handler) {
      window.removeEventListener('keydown', this._handler)
      this._handler = null
    }
  }
}
