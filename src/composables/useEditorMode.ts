export interface ToolHandler {
  enter?: () => void
  exit?: () => void
  onClick?: (x: number, y: number) => boolean
  onMove?: (x: number, y: number) => void
  isActive?: () => boolean
}

export function useEditorMode(onToolChange: (tool: string) => void) {
  const tools = new Map<string, ToolHandler>()
  let current = 'select'

  function register(name: string, handler: ToolHandler): void {
    tools.set(name, handler)
  }

  function switchTo(name: string): void {
    if (current === name) return
    const old = tools.get(current)
    if (old?.isActive?.()) return
    old?.exit?.()
    current = name
    tools.get(name)?.enter?.()
  }

  function handleClick(x: number, y: number): boolean {
    const h = tools.get(current)
    if (!h?.onClick) return false
    if (h.isActive && !h.isActive()) return false
    return h.onClick(x, y)
  }

  function handleMove(x: number, y: number): void {
    const h = tools.get(current)
    if (!h?.onMove) return
    if (h.isActive && !h.isActive()) return
    h.onMove(x, y)
  }

  function cancelCurrent(): void {
    tools.get(current)?.exit?.()
    current = 'select'
    onToolChange('select')
  }

  function exitCurrent(): void {
    tools.get(current)?.exit?.()
    current = 'select'
  }

  function getCurrent(): string {
    return current
  }

  return { register, switchTo, handleClick, handleMove, cancelCurrent, exitCurrent, getCurrent }
}
