/**
 * 工具注册表
 *
 * 职责：把左侧工具栏的按钮从硬编码模板中解耦。
 * 每个工具只描述“是什么”，不描述“怎么做”；具体行为仍由 PathEditor 中的
 * composables 处理，避免一次重构过多。
 */

export type ToolId =
  | 'select'
  | 'node'
  | 'selectseat'
  | 'seat-row'
  | 'seat-diagonal'
  | 'drawPolygon'
  | 'text'
  | 'image'

export type ToolCategory =
  | 'selection'
  | 'seat'
  | 'section'
  | 'annotation'
  | 'operation'

export interface ToolContext {
  venueType: string
  sectionFocused: boolean
}

export interface ToolConfig {
  id: ToolId
  label: string
  title: string
  iconSet: 'iconfont' | 'iconify'
  iconValue: string
  category: ToolCategory
  shortcut?: string
  visible: (ctx: ToolContext) => boolean
}

export const ALL_TOOLS: ToolConfig[] = [
  {
    id: 'select',
    label: '选择',
    title: '选择工具 (V)',
    iconSet: 'iconfont',
    iconValue: 'icon-shubiaojiantoumoshi',
    category: 'selection',
    shortcut: 'V',
    visible: () => true,
  },
  {
    id: 'node',
    label: '节点编辑',
    title: '节点编辑 (E)',
    iconSet: 'iconfont',
    iconValue: 'icon-a-4404035571',
    category: 'selection',
    shortcut: 'E',
    visible: () => true,
  },
  {
    id: 'selectseat',
    label: '选择座位',
    title: '选择座位',
    iconSet: 'iconfont',
    iconValue: 'icon-selectseat',
    category: 'selection',
    visible: () => true,
  },
  {
    id: 'seat-row',
    label: '单行座位',
    title: '单行座位',
    iconSet: 'iconfont',
    iconValue: 'icon-dorwrow',
    category: 'seat',
    visible: (ctx) => ctx.venueType === 'SIMPLE' || ctx.sectionFocused,
  },
  {
    id: 'seat-diagonal',
    label: '多行座位',
    title: '多行座位',
    iconSet: 'iconfont',
    iconValue: 'icon-drowmultrows',
    category: 'seat',
    visible: (ctx) => ctx.venueType === 'SIMPLE' || ctx.sectionFocused,
  },
  {
    id: 'drawPolygon',
    label: '绘制分区',
    title: '绘制分区',
    iconSet: 'iconfont',
    iconValue: 'icon-duobianxing',
    category: 'section',
    visible: (ctx) => ctx.venueType !== 'SIMPLE',
  },
  {
    id: 'text',
    label: '文字',
    title: '文字',
    iconSet: 'iconfont',
    iconValue: 'icon-wenzi',
    category: 'annotation',
    visible: () => false,
  },
  {
    id: 'image',
    label: '图片',
    title: '图片',
    iconSet: 'iconfont',
    iconValue: 'icon-tupian',
    category: 'annotation',
    visible: () => false,
  },
]

/** 根据当前上下文返回可见且按 category 分组的工具 */
export function getVisibleTools(ctx: ToolContext): ToolConfig[] {
  return ALL_TOOLS.filter(tool => tool.visible(ctx))
}

/** 按 category 把工具分组，用于渲染 toolbar-section */
export function groupToolsByCategory(tools: ToolConfig[]): Map<ToolCategory, ToolConfig[]> {
  const groups = new Map<ToolCategory, ToolConfig[]>()
  for (const tool of tools) {
    const list = groups.get(tool.category) ?? []
    list.push(tool)
    groups.set(tool.category, list)
  }
  return groups
}

/** 决定两个 category 之间是否需要 divider */
export function needsDividerBefore(category: ToolCategory, previousCategory?: ToolCategory): boolean {
  if (!previousCategory) return false
  return category !== previousCategory
}
