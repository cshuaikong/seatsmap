import { ref } from 'vue'
import type { Leafer } from 'leafer-ui'
import { ZoomEvent } from 'leafer-ui'

export interface ViewControlOptions {
  getLeafer: () => Leafer | null
  getS: () => number
}

export function useViewControl(options: ViewControlOptions) {
  const scale = ref(1)

  function fitContent(): void {
    const l = options.getLeafer() as any
    if (l?.zoom) {
      l.zoom('fit', 50, undefined, true)
    }
    setTimeout(() => { scale.value = options.getS() }, 350)
  }

  function resetView(): void {
    const l = options.getLeafer() as any
    if (l?.zoom) {
      l.zoom('set', 1, undefined, true)
    }
    const leafer = options.getLeafer()
    if (leafer) {
      leafer.x = 0
      leafer.y = 0
    }
    ;(leafer as any)?.__updateViewPort?.()
    scale.value = 1
  }

  function onZoomEnd(): void {
    scale.value = options.getS()
  }

  function bindZoomEvents(leafer: Leafer): void {
    leafer.on(ZoomEvent.END, onZoomEnd)
  }

  function unbindZoomEvents(leafer: Leafer): void {
    leafer.off(ZoomEvent.END, onZoomEnd)
  }

  return {
    scale,
    fitContent,
    resetView,
    onZoomEnd,
    bindZoomEvents,
    unbindZoomEvents,
  }
}
