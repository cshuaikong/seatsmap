import { sampleArc } from './pathUtils'

export function segHitsRect(
  ax: number, ay: number, bx: number, by: number,
  rx: number, ry: number, rw: number, rh: number,
): boolean {
  const rx2 = rx + rw, ry2 = ry + rh
  if (ax >= rx && ax <= rx2 && ay >= ry && ay <= ry2) return true
  if (bx >= rx && bx <= rx2 && by >= ry && by <= ry2) return true
  let t0 = 0, t1 = 1
  const dx = bx - ax, dy = by - ay
  const p = [-dx, dx, -dy, dy]
  const q = [ax - rx, rx2 - ax, ay - ry, ry2 - ay]
  for (let i = 0; i < 4; i++) {
    if (p[i] === 0) { if (q[i] < 0) return false }
    else {
      const t = q[i] / p[i]
      if (p[i] < 0) { if (t > t1) return false; if (t > t0) t0 = t }
      else { if (t < t0) return false; if (t < t1) t1 = t }
    }
  }
  return t0 <= t1
}

export function seatRowHitsRect(rowGroup: any, rx: number, ry: number, rw: number, rh: number): boolean {
  const bar = rowGroup.__bar
  const pts: number[] = bar?.points
  if (!pts || pts.length < 4) return false
  const w = rowGroup.__world
  if (!w) return false
  const r = rowGroup.__seatRadius ?? 0
  const prx = rx - r, pry = ry - r, prw = rw + r * 2, prh = rh + r * 2
  for (let i = 0; i < pts.length - 2; i += 2) {
    const wx1 = pts[i] * w.a + pts[i + 1] * w.c + w.e
    const wy1 = pts[i] * w.b + pts[i + 1] * w.d + w.f
    const wx2 = pts[i + 2] * w.a + pts[i + 3] * w.c + w.e
    const wy2 = pts[i + 2] * w.b + pts[i + 3] * w.d + w.f
    if (segHitsRect(wx1, wy1, wx2, wy2, prx, pry, prw, prh)) return true
  }
  return false
}

export function pathHitsRect(
  el: any,
  rx: number, ry: number, rw: number, rh: number,
  edgeCache: WeakMap<object, number[][]>,
): boolean {
  const d: string = el.path
  if (!d) return false

  let edges = edgeCache.get(el)
  if (!edges) {
    const cmds = d.match(/[MLQCZA][^MLQCZA]*/gi)
    if (!cmds) return false
    edges = []
    let cx = 0, cy = 0, startX = 0, startY = 0, px = 0, py = 0
    for (const cmd of cmds) {
      const nums = cmd.slice(1).trim().split(/[\s,]+/).map(Number).filter((n: any) => !isNaN(n))
      const type = cmd[0]
      if (type === 'M') {
        cx = nums[0]; cy = nums[1]; startX = cx; startY = cy
        px = cx; py = cy
      } else if (type === 'L') {
        edges.push([px, py, nums[0], nums[1]])
        cx = nums[0]; cy = nums[1]; px = cx; py = cy
      } else if (type === 'C') {
        const x0 = cx, y0 = cy
        for (let s = 1; s <= 8; s++) {
          const t = s / 8, u = 1 - t
          const qx = u*u*u*x0 + 3*u*u*t*nums[0] + 3*u*t*t*nums[2] + t*t*t*nums[4]
          const qy = u*u*u*y0 + 3*u*u*t*nums[1] + 3*u*t*t*nums[3] + t*t*t*nums[5]
          edges.push([px, py, qx, qy])
          px = qx; py = qy
        }
        cx = nums[4]; cy = nums[5]
      } else if (type === 'A') {
        const pts = sampleArc(px, py, nums[5], nums[6], nums[0], nums[4], 8)
        for (let s = 1; s < pts.length; s++) {
          edges.push([pts[s-1].x, pts[s-1].y, pts[s].x, pts[s].y])
        }
        cx = nums[5]; cy = nums[6]; px = cx; py = cy
      } else if (type === 'Z') {
        edges.push([px, py, startX, startY])
        cx = startX; cy = startY; px = startX; py = startY
      }
    }
    edgeCache.set(el, edges)
  }

  const w = el.__world
  if (!w) return false
  for (const e of edges) {
    const wx1 = e[0] * w.a + e[1] * w.c + w.e
    const wy1 = e[0] * w.b + e[1] * w.d + w.f
    const wx2 = e[2] * w.a + e[3] * w.c + w.e
    const wy2 = e[2] * w.b + e[3] * w.d + w.f
    if (segHitsRect(wx1, wy1, wx2, wy2, rx, ry, rw, rh)) return true
  }
  return false
}
