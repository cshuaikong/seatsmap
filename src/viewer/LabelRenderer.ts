import { Text } from 'leafer-ui'

/**
 * 管理标签的反向缩放，使其在任意缩放级别下保持视觉大小恒定。
 */
export class LabelRenderer {
  private labels: Map<string, Text> = new Map()
  private sectionLabels: Text[] = []
  private rowLabels: Text[] = []

  /** 注册分区标签 */
  registerSectionLabel(id: string, text: Text): void {
    this.labels.set(id, text)
    this.sectionLabels.push(text)
  }

  /** 注册排标签 */
  registerRowLabel(id: string, text: Text): void {
    this.labels.set(id, text)
    this.rowLabels.push(text)
  }

  /** 根据当前缩放更新所有标签的反向缩放 */
  update(scale: number): void {
    // 分区标签：1.2 / sqrt(scale)，范围 0.3~2.5
    this.sectionLabels.forEach(text => {
      if (scale < 1.0) {
        text.visible = false
      } else {
        text.visible = true
        const vs = 1.2 / Math.sqrt(Math.max(0.1, scale))
        const safe = Math.max(0.3, Math.min(2.5, vs))
        text.scaleX = safe
        text.scaleY = safe
      }
    })

    // 排标签：1 / scale，范围 0.1~5
    this.rowLabels.forEach(text => {
      const vs = 1 / Math.max(0.1, scale)
      const safe = Math.max(0.1, Math.min(5, vs))
      text.scaleX = safe
      text.scaleY = safe
    })
  }

  /** 清除所有标签 */
  clear(): void {
    this.labels.clear()
    this.sectionLabels.length = 0
    this.rowLabels.length = 0
  }
}
