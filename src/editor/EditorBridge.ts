import type { Editor } from '@leafer-in/editor'
import { EditorEvent, EditorMoveEvent, EditorScaleEvent, EditorRotateEvent } from '@leafer-in/editor'
import type { VenueData, SeatRow, ShapeObject, TextObject, AreaObject } from '../types'

export type ElementKind = 'section' | 'row' | 'seat' | 'shape' | 'text' | 'area' | 'image'

export interface ElementMeta {
  kind: ElementKind
  id: string
  sectionId?: string
  rowData?: SeatRow
  shapeData?: ShapeObject
  textData?: TextObject
  areaData?: AreaObject
}

export interface EditorBridgeOptions {
  editor: Editor
  getVenue: () => VenueData
  selectSection: (id: string) => void
  selectRow: (id: string) => void
  selectSeat: (id: string) => void
  selectShape: (id: string) => void
  selectText: (id: string) => void
  selectArea: (id: string) => void
  clearSelection: () => void
  updateRowPosition: (id: string, x: number, y: number, rotation: number) => void
  updateShapeData: (id: string, x: number, y: number, width?: number, height?: number, rotation?: number) => void
  updateTextData: (id: string, x: number, y: number, fontSize?: number, rotation?: number) => void
  updateAreaData: (id: string, points: number[]) => void
  updateSectionBorder: (id: string, x: number, y: number, width?: number, height?: number) => void
  saveHistory: () => void
  /** 同步回流防重入标志 */
  getSyncing: () => boolean
  setSyncing: (v: boolean) => void
  /** 防抖存档回调（由外部管理以保证 isSyncing 正确时序） */
  requestSaveHistory: () => void
}

export class EditorBridge {
  private opts: EditorBridgeOptions
  private _unlisten: (() => void) | null = null

  constructor(opts: EditorBridgeOptions) {
    this.opts = opts
  }

  /** 获取当前被编辑的元素（Editor 原生属性，比事件 target 更可靠） */
  private _getEditTarget(): any {
    const { editor } = this.opts
    const e: any = editor
    return e.element || e.editTarget || e.list?.[0] || null
  }

  /** 将 shape/text 在 section group 内的相对坐标转回世界坐标 */
  private _toWorld(meta: ElementMeta, x: number, y: number): { x: number; y: number } {
    if (!meta.sectionId) return { x, y }
    const section = this.opts.getVenue().sections.find(s => s.id === meta.sectionId)
    return {
      x: x + (section?.borderX ?? 0),
      y: y + (section?.borderY ?? 0),
    }
  }

  /** 启动监听 Editor 事件 */
  listen(): void {
    const { editor } = this.opts

    const onSelect = (_e: any) => {
      if (this.opts.getSyncing()) return
      this._syncSelectionToStore()
    }

    const onMove = (_e: any) => {
      if (this.opts.getSyncing()) return
      this._syncTransformToStore()
    }

    const onScale = (_e: any) => {
      if (this.opts.getSyncing()) return
      this._syncScaleToStore()
    }

    const onRotate = (_e: any) => {
      if (this.opts.getSyncing()) return
      this._syncRotationToStore()
    }

    editor.on(EditorEvent.SELECT, onSelect)
    editor.on(EditorMoveEvent.MOVE, onMove)
    editor.on(EditorScaleEvent.SCALE, onScale)
    editor.on(EditorRotateEvent.ROTATE, onRotate)

    this._unlisten = () => {
      editor.off(EditorEvent.SELECT, onSelect)
      editor.off(EditorMoveEvent.MOVE, onMove)
      editor.off(EditorScaleEvent.SCALE, onScale)
      editor.off(EditorRotateEvent.ROTATE, onRotate)
    }
  }

  /** 停止监听 */
  unlisten(): void {
    this._unlisten?.()
    this._unlisten = null
  }

  /** 从 Store 选中状态同步到 Editor */
  syncStoreToEditor(selectedIds: string[]): void {
    const { editor } = this.opts
    if (!editor) return

    if (selectedIds.length === 0) {
      editor.cancel()
      return
    }

    // 通过 ID 查找对应的 Leafer 元素
    const elements: any[] = []
    selectedIds.forEach(id => {
      const el = (editor.leafer as any)?.findId?.(id) || (editor.app as any)?.findId?.(id)
      if (el?.__meta) elements.push(el)
    })

    if (elements.length > 0) {
      this.opts.setSyncing(true)
      editor.select(elements)
      this.opts.setSyncing(false)
    }
  }

  /** 将 Editor 选中元素同步到 Store */
  private _syncSelectionToStore(): void {
    const { editor } = this.opts
    const selected = editor.list || []

    this.opts.setSyncing(true)

    // 清除当前选中的 partition
    this.opts.clearSelection()

    if (selected.length === 0) {
      this.opts.setSyncing(false)
      return
    }

    selected.forEach((el: any) => {
      const meta: ElementMeta | undefined = el?.__meta
      if (!meta) return

      switch (meta.kind) {
        case 'section':
          this.opts.selectSection(meta.id)
          break
        case 'row':
          this.opts.selectRow(meta.id)
          break
        case 'seat':
          this.opts.selectSeat(meta.id)
          break
        case 'shape':
          this.opts.selectShape(meta.id)
          break
        case 'text':
          this.opts.selectText(meta.id)
          break
        case 'area':
          this.opts.selectArea(meta.id)
          break
      }
    })

    this.opts.setSyncing(false)
  }

  /** 解析被编辑元素的 meta */
  private _resolveMeta(target: any): ElementMeta | undefined {
    return target?.__meta
  }

  /** 移动变换 → Store */
  private _syncTransformToStore(): void {
    const target = this._getEditTarget()
    const meta = this._resolveMeta(target)
    if (!meta) return

    this.opts.setSyncing(true)

    const x = target.x ?? 0
    const y = target.y ?? 0
    const rotation = target.rotation ?? 0

    switch (meta.kind) {
      case 'row':
        this.opts.updateRowPosition(meta.id, x, y, rotation)
        break
      case 'shape': {
        const width = target.width ?? meta.shapeData?.width ?? 100
        const height = target.height ?? meta.shapeData?.height ?? 100
        const shapeType = meta.shapeData?.type
        const isCenterOrigin = shapeType === 'ellipse' || shapeType === 'sector'
        const world = this._toWorld(meta, x, y)
        const storeX = isCenterOrigin ? world.x - width / 2 : world.x
        const storeY = isCenterOrigin ? world.y - height / 2 : world.y
        this.opts.updateShapeData(meta.id, storeX, storeY, width, height, rotation)
        break
      }
      case 'text': {
        const fontSize = target.fontSize ?? target.getAttr?.('fontSize') ?? meta.textData?.fontSize ?? 14
        const world = this._toWorld(meta, x, y)
        this.opts.updateTextData(meta.id, world.x, world.y, fontSize, rotation)
        break
      }
      case 'section': {
        const width = target.width ?? 0
        const height = target.height ?? 0
        this.opts.updateSectionBorder(meta.id, x, y, width, height)
        break
      }
    }

    this.opts.setSyncing(false)
    this.opts.requestSaveHistory()
  }

  /** 缩放变换 → Store */
  private _syncScaleToStore(): void {
    const target = this._getEditTarget()
    const meta = this._resolveMeta(target)
    if (!meta) return

    this.opts.setSyncing(true)

    switch (meta.kind) {
      case 'shape': {
        const width = target.width ?? 100
        const height = target.height ?? 100
        const x = target.x ?? 0
        const y = target.y ?? 0
        const world = this._toWorld(meta, x, y)
        const shapeType = meta.shapeData?.type
        const isCenterOrigin = shapeType === 'ellipse' || shapeType === 'sector'
        const storeX = isCenterOrigin ? world.x - width / 2 : world.x
        const storeY = isCenterOrigin ? world.y - height / 2 : world.y
        this.opts.updateShapeData(meta.id, storeX, storeY, width, height, target.rotation ?? 0)
        break
      }
      case 'section': {
        const width = target.width ?? 100
        const height = target.height ?? 100
        const x = target.x ?? 0
        const y = target.y ?? 0
        this.opts.updateSectionBorder(meta.id, x, y, width, height)
        break
      }
      case 'text': {
        const fontSize = target.fontSize ?? meta.textData?.fontSize ?? 14
        const world = this._toWorld(meta, target.x ?? 0, target.y ?? 0)
        this.opts.updateTextData(meta.id, world.x, world.y, fontSize, target.rotation ?? 0)
        break
      }
    }

    this.opts.setSyncing(false)
    this.opts.requestSaveHistory()
  }

  /** 旋转变换 → Store */
  private _syncRotationToStore(): void {
    const target = this._getEditTarget()
    const meta = this._resolveMeta(target)
    if (!meta) return

    this.opts.setSyncing(true)

    switch (meta.kind) {
      case 'row':
        this.opts.updateRowPosition(meta.id, target.x ?? 0, target.y ?? 0, target.rotation ?? 0)
        break
      case 'shape': {
        const x = target.x ?? 0
        const y = target.y ?? 0
        const width = target.width ?? meta.shapeData?.width ?? 100
        const height = target.height ?? meta.shapeData?.height ?? 100
        const world = this._toWorld(meta, x, y)
        const shapeType = meta.shapeData?.type
        const isCenterOrigin = shapeType === 'ellipse' || shapeType === 'sector'
        const storeX = isCenterOrigin ? world.x - width / 2 : world.x
        const storeY = isCenterOrigin ? world.y - height / 2 : world.y
        this.opts.updateShapeData(meta.id, storeX, storeY, undefined, undefined, target.rotation ?? 0)
        break
      }
      case 'text': {
        const world = this._toWorld(meta, target.x ?? 0, target.y ?? 0)
        this.opts.updateTextData(meta.id, world.x, world.y, undefined, target.rotation ?? 0)
        break
      }
    }

    this.opts.setSyncing(false)
    this.opts.requestSaveHistory()
  }
}
