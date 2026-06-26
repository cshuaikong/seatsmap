import { ref } from 'vue'
import { Rect, Ellipse, DragEvent } from 'leafer-ui'
import { toWorld, toLocal } from '../utils/pathUtils'

const r = (n: number) => +n.toFixed(2)

export interface VertexEditCtx {
  getLeafer: () => any
  getEditor: () => any
  getAllPaths: () => any[]
  getS: () => number
  setPanEnabled: (v: boolean) => void
  getEdgeCache: () => WeakMap<object, number[][]>
  getCurrentBorder: () => any
  getParentGroup?: () => any | null
  onToolChange: (tool: string) => void
}

export function useVertexEdit(ctx: VertexEditCtx) {
  const isEditing = ref(false)

  let target: any = null
  let handles: any[] = []
  let edgeHandles: any[] = []
  let verts: { x: number; y: number }[] = []
  let arcDepths: number[] = []

  function enterVertexEdit(pathEl: any): void {
    handles.forEach(h => h.remove())
    edgeHandles.forEach(h => h.remove())
    handles = []
    edgeHandles = []
    verts = []
    arcDepths = []
    target = pathEl
    isEditing.value = true
    const editor = ctx.getEditor()
    ;(editor as any).editBox.visible = false
    const allPaths = ctx.getAllPaths()
    allPaths.forEach((p: any) => { p.locked = true })
    ctx.setPanEnabled(false)

    const d: string = pathEl.path
    verts = []
    arcDepths = []
    let px = 0, py = 0
    const cmds = d.match(/[MLCA][^MLCAZ]*/gi)
    if (cmds) {
      for (const cmd of cmds) {
        const nums = cmd.slice(1).trim().split(/[\s,]+/).map(Number).filter((n: any) => !isNaN(n))
        const type = cmd[0]
        if (type === 'M') {
          verts.push({ x: nums[0], y: nums[1] })
          px = nums[0]; py = nums[1]
        } else if (type === 'L') {
          verts.push({ x: nums[0], y: nums[1] })
          arcDepths.push(0)
          px = nums[0]; py = nums[1]
        } else if (type === 'C') {
          verts.push({ x: nums[4], y: nums[5] })
          arcDepths.push(0)
          px = nums[4]; py = nums[5]
        } else if (type === 'A') {
          const x2 = nums[5], y2 = nums[6]
          verts.push({ x: x2, y: y2 })
          const R = nums[0], sweep = nums[4]
          const chord = Math.hypot(x2 - px, y2 - py) || 1
          const half = chord / 2
          if (R >= half) {
            const sagitta = R - Math.sqrt(R * R - half * half)
            arcDepths.push(sweep ? (2 * sagitta) / chord : -(2 * sagitta) / chord)
          } else {
            arcDepths.push(0)
          }
          px = x2; py = y2
        }
      }
      if (arcDepths.length < verts.length) {
        arcDepths.push(0)
      }
    }
    while (arcDepths.length < verts.length) arcDepths.push(0)

    if (verts.length > 1) {
      const first = verts[0], last = verts[verts.length - 1]
      if (Math.abs(first.x - last.x) < 0.01 && Math.abs(first.y - last.y) < 0.01) {
        verts.pop()
        if (arcDepths.length > verts.length) arcDepths.pop()
      }
    }
    arcDepths = arcDepths.slice(0, verts.length)

    createAllHandles()
  }

  function exitVertexEdit(silent?: boolean): void {
    handles.forEach(h => h.remove())
    edgeHandles.forEach(h => h.remove())
    handles = []
    edgeHandles = []
    verts = []
    arcDepths = []
    target = null
    isEditing.value = false
    const allPaths = ctx.getAllPaths()
    allPaths.forEach((p: any) => { p.locked = false })
    ctx.setPanEnabled(true)
    ;(ctx.getEditor() as any).editBox.visible = true
    if (!silent) {
      ctx.onToolChange('select')
    }
  }

  /** 获取 Path 在当前父级 Group 下的组合世界变换 */
  function getCombinedTransform(): { ox: number; oy: number; angle: number } {
    const parentGroup = ctx.getParentGroup?.()
    if (parentGroup) {
      return {
        ox: (parentGroup.x ?? 0) + (target?.x ?? 0),
        oy: (parentGroup.y ?? 0) + (target?.y ?? 0),
        angle: ((parentGroup.rotation ?? 0) + (target?.rotation ?? 0)) * Math.PI / 180,
      }
    }
    return {
      ox: target?.x ?? 0,
      oy: target?.y ?? 0,
      angle: (target?.rotation ?? 0) * Math.PI / 180,
    }
  }

  function createAllHandles(): void {
    const el = target
    if (!el) return
    const leafer = ctx.getLeafer()
    if (!leafer) return
    const { ox, oy, angle } = getCombinedTransform()
    const n = verts.length
    const hs = Math.max(ctx.getS(), 0.02)
    const handleSize = 6 / hs
    const handleStroke = 1 / hs

    for (let i = 0; i < n; i++) {
      const v = verts[i]
      const wp = toWorld(v.x, v.y, ox, oy, angle)
      const h = new Rect({
        x: wp.x, y: wp.y,
        width: handleSize, height: handleSize,
        fill: '#3b82f6', stroke: '#fff', strokeWidth: handleStroke,
        draggable: true, cursor: 'move',
        around: 'center',
      })
      ;(h as any).__vi = i

      h.on_(DragEvent.DRAG, () => {
        if (i >= verts.length) return
        const { ox: cox, oy: coy, angle: cangle } = getCombinedTransform()
        verts[i] = toLocal(h.x!, h.y!, cox, coy, cangle)
        rebuildPath()
        repositionEdgeHandles(i)
        repositionEdgeHandles((i - 1 + n) % n)
      })

      leafer.add(h)
      handles.push(h)
    }

    for (let i = 0; i < n; i++) {
      const a = verts[i], b = verts[(i + 1) % n]
      const midW = toWorld((a.x + b.x) / 2, (a.y + b.y) / 2, ox, oy, angle)
      const h = new Ellipse({
        x: midW.x, y: midW.y,
        width: handleSize, height: handleSize,
        fill: '#22c55e', stroke: '#fff', strokeWidth: handleStroke,
        draggable: true, cursor: 'move',
        around: 'center',
      })
      ;(h as any).__ei = i

      h.on_(DragEvent.DRAG, () => {
        const ca = verts[i], cb = verts[(i + 1) % n]
        if (!ca || !cb) return
        const { ox: cox, oy: coy, angle: cangle } = getCombinedTransform()
        const lp = toLocal(h.x!, h.y!, cox, coy, cangle)
        const hlx = lp.x, hly = lp.y
        const cmx = (ca.x + cb.x) / 2, cmy = (ca.y + cb.y) / 2
        const cdx = cb.x - ca.x, cdy = cb.y - ca.y
        const cLen = Math.hypot(cdx, cdy) || 1
        const cnx = cdy / cLen, cny = -cdx / cLen
        const proj = (hlx - cmx) * cnx + (hly - cmy) * cny
        arcDepths[i] = Math.max(-1, Math.min(1, proj / (cLen * 0.5)))
        repositionEdgeHandles(i)
        rebuildPath()
      })

      leafer.add(h)
      edgeHandles.push(h)
    }

    for (let i = 0; i < n; i++) repositionEdgeHandles(i)
  }

  function repositionEdgeHandles(edgeIndex: number): void {
    const el = target
    if (!el) return
    const { ox, oy, angle } = getCombinedTransform()
    const n = verts.length
    const ei = ((edgeIndex % n) + n) % n
    const h = edgeHandles[ei]
    if (!h) return
    const a = verts[ei], b = verts[(ei + 1) % n]
    const cmx = (a.x + b.x) / 2, cmy = (a.y + b.y) / 2
    const dx = b.x - a.x, dy = b.y - a.y
    const edgeLen = Math.hypot(dx, dy) || 1
    const arcDepth = arcDepths[ei] ?? 0
    const nx = dy / edgeLen, ny = -dx / edgeLen
    const wp = toWorld(cmx + nx * arcDepth * edgeLen * 0.5, cmy + ny * arcDepth * edgeLen * 0.5, ox, oy, angle)
    h.x = wp.x
    h.y = wp.y
  }

  function rebuildPath(): void {
    const el = target
    if (!el) return
    const n = verts.length
    if (n < 2) return
    let d = `M${r(verts[0].x)},${r(verts[0].y)}`
    for (let i = 0; i < n; i++) {
      const a = verts[i], b = verts[(i + 1) % n]
      const depth = arcDepths[i] ?? 0
      if (Math.abs(depth) > 0.0001) {
        const dx = b.x - a.x, dy = b.y - a.y
        const L = Math.hypot(dx, dy) || 1
        const sagitta = L * Math.abs(depth) * 0.5
        const halfChord = L / 2
        let R = (sagitta * sagitta + halfChord * halfChord) / (2 * Math.max(sagitta, 0.001))
        R = Math.max(R, halfChord)
        const sweep = depth > 0 ? 1 : 0
        d += `A${r(R)},${r(R)} 0 0 ${sweep} ${r(b.x)},${r(b.y)}`
      } else {
        d += `L${r(b.x)},${r(b.y)}`
      }
    }
    d += 'Z'
    try { el.path = d } catch (_) { el.setAttr?.('path', d) }
    const border = ctx.getCurrentBorder()
    if (border) border.path = d
    ctx.getEdgeCache().delete(el)
  }

  return {
    isEditing,
    enterVertexEdit,
    exitVertexEdit,
    getTarget: () => target,
    getHandles: () => handles,
    getEdgeHandles: () => edgeHandles,
    getVerts: () => verts,
    getArcDepths: () => arcDepths,
  }
}
