export interface RenderPlan {
  /** null = 全量重建所有分区，Set = 仅重建指定 section */
  dirtySectionIds: Set<string> | null
  dirtyAllSeats: boolean
  dirtyLabels: boolean
}

/**
 * 脏区追踪器（section 级粒度）。
 * 每个 Store mutation 调用对应的 mark 方法，
 * consume() 返回需要重建的内容并重置脏标记。
 */
export class DirtyTracker {
  private _dirtySections = new Set<string>()
  private _dirtyAllSections = false
  private _dirtyAllSeats = false
  private _dirtyLabels = false

  /** 标记单个 section 脏（重建该分区及其座位） */
  markSection(id: string): void {
    if (!this._dirtyAllSections) {
      this._dirtySections.add(id)
    }
  }

  /** 标记所有分区脏（全量边框重建） */
  markAllSections(): void {
    this._dirtyAllSections = true
    this._dirtySections.clear()
  }

  /** 标记座位脏（全量座位重建） */
  markAllSeats(): void {
    this._dirtyAllSeats = true
  }

  /** 标记标签脏（增量更新标签位置/内容） */
  markLabels(): void {
    this._dirtyLabels = true
  }

  /** 消费脏标记，返回 RenderPlan 并重置内部状态 */
  consume(): RenderPlan {
    const plan: RenderPlan = {
      dirtySectionIds: this._dirtyAllSections ? null : new Set(this._dirtySections),
      dirtyAllSeats: this._dirtyAllSeats,
      dirtyLabels: this._dirtyLabels,
    }
    this._dirtySections.clear()
    this._dirtyAllSections = false
    this._dirtyAllSeats = false
    this._dirtyLabels = false
    return plan
  }

  /** 是否全干净（无待渲染变更） */
  get isClean(): boolean {
    return !this._dirtyAllSections && this._dirtySections.size === 0
        && !this._dirtyAllSeats && !this._dirtyLabels
  }
}

/**
 * rAF 节流调度器。
 * 多次 requestUpdate 在同一帧内合并为一次执行。
 */
export class RenderScheduler {
  private _rafId: number | null = null
  private _cb: (() => void) | null = null

  /** 请求更新（rAF 节流，同帧多次调用只执行一次） */
  requestUpdate(cb: () => void): void {
    this._cb = cb
    if (this._rafId === null) {
      this._rafId = requestAnimationFrame(() => {
        this._rafId = null
        this._cb?.()
      })
    }
  }

  /** 立即执行并取消待执行的 rAF */
  flush(): void {
    if (this._rafId !== null) {
      cancelAnimationFrame(this._rafId)
      this._rafId = null
    }
    this._cb?.()
  }
}
