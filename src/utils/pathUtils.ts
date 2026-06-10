const r = (n: number) => +n.toFixed(2)

export function darkenColor(hex: string, percent: number): string {
  let _r = parseInt(hex.slice(1, 3), 16)
  let g = parseInt(hex.slice(3, 5), 16)
  let b = parseInt(hex.slice(5, 7), 16)
  _r = Math.floor(_r * (1 - percent / 100))
  g = Math.floor(g * (1 - percent / 100))
  b = Math.floor(b * (1 - percent / 100))
  return `#${((1 << 24) + (_r << 16) + (g << 8) + b).toString(16).slice(1)}`
}

export function rotatePath(d: string, angle: number): string {
  if (!angle) return d
  const rad = (angle * Math.PI) / 180
  const c = Math.cos(rad), s = Math.sin(rad)
  const rot = (x: number, y: number) => [r(x * c - y * s), r(x * s + y * c)]
  const cmds = d.match(/[MLCZA][^MLCZA]*/gi)
  if (!cmds) return d
  const parts: string[] = []
  for (const cmd of cmds) {
    const nums = cmd.slice(1).trim().split(/[\s,]+/).map(Number).filter((n: any) => !isNaN(n))
    const type = cmd[0]
    if (type === 'M' || type === 'L') {
      const [rx, ry] = rot(nums[0], nums[1])
      parts.push(`${type}${rx},${ry}`)
    } else if (type === 'A') {
      const [rx, ry] = rot(nums[5], nums[6])
      parts.push(`A${r(nums[0])},${r(nums[1])} ${nums[2]} ${nums[3]} ${nums[4]} ${rx},${ry}`)
    } else if (type === 'C') {
      const [rx1, ry1] = rot(nums[0], nums[1])
      const [rx2, ry2] = rot(nums[2], nums[3])
      const [rx3, ry3] = rot(nums[4], nums[5])
      parts.push(`C${rx1},${ry1} ${rx2},${ry2} ${rx3},${ry3}`)
    } else if (type === 'Z') {
      parts.push('Z')
    }
  }
  return parts.join('')
}

export function sampleArc(
  x1: number, y1: number, x2: number, y2: number,
  R: number, sweep: number, n: number,
): { x: number; y: number }[] {
  const chord = Math.hypot(x2 - x1, y2 - y1)
  if (chord < 0.001 || R * 2 < chord) return [{ x: x1, y: y1 }, { x: x2, y: y2 }]
  const h = chord / 2
  const da = Math.sqrt(Math.max(0, R * R - h * h))
  const mx = (x1 + x2) / 2, my = (y1 + y2) / 2
  const nx = -(y2 - y1) / chord, ny = (x2 - x1) / chord
  const cx = mx + nx * da * (sweep ? 1 : -1)
  const cy = my + ny * da * (sweep ? 1 : -1)
  let a1 = Math.atan2(y1 - cy, x1 - cx)
  let a2 = Math.atan2(y2 - cy, x2 - cx)
  if (sweep && a2 <= a1) a2 += 2 * Math.PI
  if (!sweep && a2 >= a1) a2 -= 2 * Math.PI
  const pts: { x: number; y: number }[] = []
  for (let i = 0; i <= n; i++) {
    const a = a1 + (a2 - a1) * (i / n)
    pts.push({ x: cx + R * Math.cos(a), y: cy + R * Math.sin(a) })
  }
  return pts
}

export function toWorld(lx: number, ly: number, ox: number, oy: number, rad: number) {
  const c = Math.cos(rad), s = Math.sin(rad)
  return { x: ox + lx * c - ly * s, y: oy + lx * s + ly * c }
}

export function toLocal(wx: number, wy: number, ox: number, oy: number, rad: number) {
  const c = Math.cos(rad), s = Math.sin(rad)
  const dx = wx - ox, dy = wy - oy
  return { x: dx * c + dy * s, y: -dx * s + dy * c }
}
