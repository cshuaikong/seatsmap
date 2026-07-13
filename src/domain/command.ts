/**
 * Command 模式基础设施
 *
 * 目标：替代 historyStore 的完整快照，改为记录可逆的操作命令，
 * 从而降低大场馆的内存占用并支持更细粒度的 undo/redo。
 *
 * 当前为试点阶段：先定义接口和一个通用 Invoker，后续逐步把
 * venueDataStore 的 mutation 迁移为 Command。
 */

export interface Command {
  /** 命令名称，用于调试/日志 */
  readonly name: string
  /** 执行命令 */
  execute(): void
  /** 撤销命令 */
  undo(): void
}

export interface CommandStack {
  /** 执行一条新命令，并清空当前位置之后的 redo 历史 */
  execute(command: Command): void
  /** 撤销上一条命令 */
  undo(): void
  /** 重做下一条命令 */
  redo(): void
  /** 是否可撤销 */
  readonly canUndo: boolean
  /** 是否可重做 */
  readonly canRedo: boolean
  /** 清空历史 */
  reset(): void
}

/** 简单的命令执行器（Invoker） */
export function createCommandStack(maxHistory = 50): CommandStack {
  const commands: Command[] = []
  let index = -1

  return {
    execute(command: Command) {
      command.execute()
      // 删除当前位置之后的所有命令
      if (index < commands.length - 1) {
        commands.splice(index + 1)
      }
      commands.push(command)
      if (commands.length > maxHistory) {
        commands.shift()
      } else {
        index++
      }
    },
    undo() {
      if (index < 0) return
      commands[index].undo()
      index--
    },
    redo() {
      if (index >= commands.length - 1) return
      index++
      commands[index].execute()
    },
    get canUndo() {
      return index >= 0
    },
    get canRedo() {
      return index < commands.length - 1
    },
    reset() {
      commands.length = 0
      index = -1
    },
  }
}
