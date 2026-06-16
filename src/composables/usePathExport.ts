import { rotatePath } from '../utils/pathUtils'

const r = (n: number) => +n.toFixed(2)

export function exportPNG(leafer: any): void {
  const cv = leafer?.canvas?.view as HTMLCanvasElement | undefined
  if (!cv) return
  const url = cv.toDataURL('image/png')
  downloadURL(url, 'canvas.png')
}

export function exportSVG(leafer: any, allPaths: any[]): void {
  const w = leafer?.width ?? 1000, h = leafer?.height ?? 700
  let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">`
  for (const p of allPaths) {
    const d = rotatePath(p.path, p.rotation ?? 0)
    svg += `<path d="${d}" fill="${p.fill}" stroke="${p.stroke}" stroke-width="2" transform="translate(${r(p.x)},${r(p.y)})"/>`
  }
  svg += '</svg>'
  downloadFile('canvas.svg', svg)
}

function downloadFile(filename: string, content: string): void {
  const blob = new Blob([content], { type: 'application/octet-stream' })
  downloadURL(URL.createObjectURL(blob), filename)
}

function downloadURL(url: string, filename: string): void {
  const a = document.createElement('a')
  a.href = url; a.download = filename
  document.body.appendChild(a); a.click()
  document.body.removeChild(a)
}
