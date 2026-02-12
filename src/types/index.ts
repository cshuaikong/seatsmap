export interface Position {
  x: number
  y: number
}

export interface Seat {
  id: string
  label: string
  x: number
  y: number
  radius: number
  categoryId: string
  rowId: string
  sectionId: string
}

export interface Row {
  id: string
  label: string
  x: number
  y: number
  rotation: number
  seats: Seat[]
}

export interface Section {
  id: string
  name: string
  x: number
  y: number
  rotation: number
  rows: Row[]
}

export interface Category {
  id: string
  name: string
  color: string
  accessible: boolean
}

export interface ChartData {
  name: string
  width: number
  height: number
  sections: Section[]
  categories: Category[]
}

export type ToolType = 'select' | 'pan' | 'seat' | 'row' | 'section' | 'stage' | 'text' | 'image' | 'shape'
