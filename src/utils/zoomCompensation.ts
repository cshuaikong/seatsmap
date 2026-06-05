/**
 * 缩放视觉统一 —— 选择框、控制点、手柄在缩放时保持恒定屏幕像素尺寸。
 *
 * 使用方式：在 ZoomEvent.END 中调用 compensateZoom(editor, scale, extraHandles)
 */

const BASE_POINT_SIZE = 6   // 编辑器控制点屏幕像素
const MAX_POINT_SIZE = 8    // 放大时控制点尺寸上限
const BASE_STROKE_WIDTH = 1 // 描边屏幕像素
const BASE_HANDLE_SIZE = 6  // 顶点/边弧手柄屏幕像素

export function compensateZoom(editor: any, scale: number, extraHandles?: any[]): void {
  const s = Math.max(scale, 0.02)
  const scaledPointSize = Math.min(BASE_POINT_SIZE / s, MAX_POINT_SIZE)
  const scaledStrokeWidth = BASE_STROKE_WIDTH / s

  // 1. Editor config
  if (editor?.config) {
    editor.config.pointSize = scaledPointSize
    editor.config.strokeWidth = scaledStrokeWidth
    if (!editor.config.resizeLine) editor.config.resizeLine = {}
    editor.config.resizeLine.strokeWidth = scaledStrokeWidth
  }

  // 2. EditBox 手柄实时更新
  if (editor?.list?.length > 0) {
    editor.editBox?.load?.()
    editor.editBox?.update?.()
  }
  const eb = editor?.editBox as any
  if (eb) {
    ;[...(eb.rotatePoints || []), eb.circle].forEach((p: any) => {
      if (p) { p.width = scaledPointSize; p.height = scaledPointSize }
    })
  }

  // 3. 额外手柄（顶点编辑、边弧等）
  if (extraHandles) {
    const handleSize = BASE_HANDLE_SIZE / s
    const handleStroke = BASE_STROKE_WIDTH / s
    extraHandles.forEach(h => {
      if (h) {
        h.width = handleSize
        h.height = handleSize
        h.strokeWidth = handleStroke
      }
    })
  }
}
