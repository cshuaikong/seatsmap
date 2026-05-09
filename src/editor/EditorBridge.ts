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
  getNodeMeta: (id: string) => ElementMeta | undefined
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
}

export class EditorBridge {
  private opts: EditorBridgeOptions
  private _unlisten: (() => void) | null = null

  constructor(opts: EditorBridgeOptions) {
    this.opts = opts
  }

  /** 启动监听 Editor 事件 */
  listen(): void {
    const { editor } = this.opts

    const onSelect = (_e: any) => {
      if (this.opts.getSyncing()) return
      this._syncSelectionToStore()
    }

    const onMove = (e: any) => {
      if (this.opts.getSyncing()) return
      this._syncTransformToStore(e)
    }

    const onScale = (e: any) => {
      if (this.opts.getSyncing()) return
      this._syncScaleToStore(e)
    }

    const onRotate = (e: any) => {
      if (this.opts.getSyncing()) return
      this._syncRotationToStore(e)
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
      const meta = this.opts.getNodeMeta(id)
      if (meta) {
        const el = (editor.leafer as any)?.findId?.(id) || (editor.app as any)?.findId?.(id)
        if (el) elements.push(el)
      }
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
      const elId = el.id || el.getAttr?.('id') || ''
      const meta = this.opts.getNodeMeta(elId)
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

  /** 移动变换 → Store */
  private _syncTransformToStore(e: any): void {
    const target = e.target || e.editTarget
    if (!target) return

    const elId = target.id || ''
    const meta = this.opts.getNodeMeta(elId)
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
        this.opts.updateShapeData(meta.id, x, y, width, height, rotation)
        break
      }
      case 'text': {
        const fontSize = target.fontSize ?? target.getAttr?.('fontSize') ?? meta.textData?.fontSize ?? 14
        this.opts.updateTextData(meta.id, x, y, fontSize, rotation)
        break
      }
      case 'section': {
        const width = target.width ?? 0
        const height = target.height ?? 0
        this.opts.updateSectionBorder(meta.id, x, y, width, height)
        break
      }
    }

    this.opts.saveHistory()
    this.opts.setSyncing(false)
  }

  /** 缩放变换 → Store */
  private _syncScaleToStore(e: any): void {
    const target = e.target || e.editTarget
    if (!target) return

    const elId = target.id || ''
    const meta = this.opts.getNodeMeta(elId)
    if (!meta) return

    this.opts.setSyncing(true)

    switch (meta.kind) {
      case 'shape':
      case 'section': {
        const width = target.width ?? 100
        const height = target.height ?? 100
        this.opts.updateShapeData(meta.id, target.x ?? 0, target.y ?? 0, width, height, target.rotation ?? 0)
        break
      }
      case 'text': {
        const fontSize = target.fontSize ?? meta.textData?.fontSize ?? 14
        this.opts.updateTextData(meta.id, target.x ?? 0, target.y ?? 0, fontSize, target.rotation ?? 0)
        break
      }
    }

    this.opts.saveHistory()
    this.opts.setSyncing(false)
  }

  /** 旋转变换 → Store */
  private _syncRotationToStore(e: any): void {
    const target = e.target || e.editTarget
    if (!target) return

    const elId = target.id || ''
    const meta = this.opts.getNodeMeta(elId)
    if (!meta) return

    this.opts.setSyncing(true)

    switch (meta.kind) {
      case 'row':
        this.opts.updateRowPosition(meta.id, target.x ?? 0, target.y ?? 0, target.rotation ?? 0)
        break
      case 'shape':
        this.opts.updateShapeData(meta.id, target.x ?? 0, target.y ?? 0, undefined, undefined, target.rotation ?? 0)
        break
      case 'text':
        this.opts.updateTextData(meta.id, target.x ?? 0, target.y ?? 0, undefined, target.rotation ?? 0)
        break
    }

    this.opts.saveHistory()
    this.opts.setSyncing(false)
  }
}
