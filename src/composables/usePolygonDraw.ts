import { Rect, Path } from 'leafer-ui'

const r = (n: number) => +n.toFixed(2)
const DRAW_CLOSE_THRESHOLD = 15

export interface PolygonDrawCtx {
  getLeafer: () => any
  getEditor: () => any
  getCanvas: () => HTMLCanvasElement | null
  getAllPaths: () => any[]
  getS: () => number
  setPanEnabled: (v: boolean) => void
  onFinish: (pathData: { id: string; path: string; points: { x: number; y: number }[] }) => void
  onToolChange: (tool: string) => void
}

export function usePolygonDraw(ctx: PolygonDrawCtx) {
  let points: { x: number; y: number }[] = []
  let previewPath: any = null
  let vertexDots: any[] = []

  function enter(): void {
    const allPaths = ctx.getAllPaths()
    allPaths.forEach((p: any) => { p.hittable = false })
    const editor = ctx.getEditor()
    if (editor) (editor as any).hittable = false
    editor?.cancel()
    ctx.setPanEnabled(false)
    const canvas = ctx.getCanvas()
    if (canvas) canvas.style.cursor = 'crosshair'
  }

  function exit(): void {
    previewPath?.remove()
    previewPath = null
    vertexDots.forEach(d => d.remove())
    vertexDots = []
    points = []
    const allPaths = ctx.getAllPaths()
    allPaths.forEach((p: any) => { p.hittable = true })
    const editor = ctx.getEditor()
    if (editor) (editor as any).hittable = true
    ctx.setPanEnabled(true)
    const canvas = ctx.getCanvas()
    if (canvas) canvas.style.cursor = ''
  }

  function cancel(): void {
    exit()
  }

  function isNearFirstPoint(x: number, y: number): boolean {
    if (points.length < 3) return false
    const first = points[0]
    return Math.hypot(x - first.x, y - first.y) < DRAW_CLOSE_THRESHOLD
  }

  function addPoint(x: number, y: number): void {
    points.push({ x, y })
    const leafer = ctx.getLeafer()
    if (!leafer) return
    const hs = Math.max(ctx.getS(), 0.02)
    const size = 6 / hs
    const dot = new Rect({
      width: size, height: size,
      fill: '#3b82f6', stroke: '#fff', strokeWidth: 1.5 / hs,
      x, y,
      around: 'center',
      draggable: false, hittable: false,
    })
    leafer.add(dot)
    vertexDots.push(dot)
  }

  function updatePreview(mx: number, my: number): void {
    const leafer = ctx.getLeafer()
    if (!leafer) return
    previewPath?.remove()
    previewPath = null
    if (points.length === 0) return

    const pts = [...points, { x: mx, y: my }]
    let d = `M${r(pts[0].x)},${r(pts[0].y)}`
    for (let i = 1; i < pts.length; i++) {
      d += `L${r(pts[i].x)},${r(pts[i].y)}`
    }
    if (points.length > 2 && isNearFirstPoint(mx, my)) {
      d += 'Z'
    }

    const hs = Math.max(ctx.getS(), 0.02)
    previewPath = new Path({
      path: d,
      fill: 'rgba(59,130,246,0.12)',
      stroke: '#3b82f6',
      strokeWidth: 1.5 / hs,
      editable: false, draggable: false, hittable: false,
    })
    leafer.add(previewPath)
  }

  function finish(): void {
    const pts = points
    let d = `M${r(pts[0].x)},${r(pts[0].y)}`
    for (let i = 1; i < pts.length; i++) {
      d += `L${r(pts[i].x)},${r(pts[i].y)}`
    }
    d += 'Z'

    const id = `section-${Date.now()}`
    ctx.onFinish({ id, path: d, points: [...pts] })
    exit()
    ctx.onToolChange('select')
  }

  function handleClick(worldX: number, worldY: number): void {
    if (points.length >= 3 && isNearFirstPoint(worldX, worldY)) {
      finish()
    } else {
      addPoint(worldX, worldY)
      if (points.length === 1) updatePreview(worldX, worldY)
    }
  }

  function handleMove(worldX: number, worldY: number): void {
    if (points.length === 0) return
    updatePreview(worldX, worldY)
  }

  return {
    enter,
    exit,
    cancel,
    handleClick,
    handleMove,
    isActive: () => points.length > 0,
    getPoints: () => points,
  }
}
