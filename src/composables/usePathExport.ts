const r = (n: number) => +n.toFixed(2)

export function exportPNG(leafer: any): void {
  const cv = leafer?.canvas?.view as HTMLCanvasElement | undefined
  if (!cv) return
  const url = cv.toDataURL('image/png')
  downloadURL(url, 'canvas.png')
}

export function exportSVG(leafer: any, sectionGroupMap: Map<string, any>): void {
  const w = leafer?.width ?? 1000, h = leafer?.height ?? 700
  let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">`
  sectionGroupMap.forEach((group) => {
    const pathChild = group.children?.find((c: any) => c.tag === 'Path')
    if (!pathChild) return
    const d = pathChild.path
    const gx = r(group.x ?? 0)
    const gy = r(group.y ?? 0)
    const rot = r(group.rotation ?? 0)
    const transform = rot !== 0
      ? `translate(${gx},${gy}) rotate(${rot})`
      : `translate(${gx},${gy})`
    svg += `<path d="${d}" fill="${pathChild.fill}" stroke="${pathChild.stroke}" stroke-width="2" transform="${transform}"/>`
  })
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
