/**
 * 共享类型定义 —— 前端 UI 与后端 API 契约
 * 后端负责数据真实性与鉴权，前端仅做展示与操作发起
 */

// ==================== 用户 ====================

export interface User {
  id: string
  email: string
  name: string
  avatar?: string
  created_at?: string
}

// ==================== 组织 / 团队 ====================

export interface Organization {
  id: string
  name: string
  owner_id: string
  plan?: 'free' | 'pro' | 'enterprise'
  created_at?: string
}

// ==================== 场馆 ====================

export interface Venue {
  id: string
  org_id?: string
  name: string
  data_json?: Record<string, any>
  cover_url?: string
  is_public?: boolean
  sections?: VenueSection[]
  created_at?: string
  updated_at?: string
}

export interface VenueSection {
  id: string
  name: string
  rows?: VenueRow[]
  [key: string]: any
}

export interface VenueRow {
  id: string
  label: string
  seats?: Seat[]
  [key: string]: any
}

// ==================== 座位 ====================

export interface Seat {
  id: string
  row_id: string
  label: string
  x: number
  y: number
  status?: 'available' | 'locked' | 'sold'
  [key: string]: any
}

// ==================== 场馆成员 / 角色 ====================

export type VenueRole = 'owner' | 'editor' | 'viewer'

export interface VenueMember {
  id: string
  venue_id: string
  user_id: string
  role: VenueRole
}

// ==================== 图片资源 ====================

export interface ImageAsset {
  id: string
  venue_id: string
  url: string
  uploaded_by: string
  created_at?: string
}

// ==================== 分享链接 ====================

export interface ShareLink {
  id: string
  venue_id: string
  token: string
  expires_at?: string
  readonly: boolean
}

// ==================== API 响应 ====================

export interface ApiResponse<T = any> {
  code?: number
  data?: T
  message?: string
}
