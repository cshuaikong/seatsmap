/**
 * 颜色工具函数
 */

/** 颜色加深 */
export function darkenColor(color: string, percent: number): string {
  const num = parseInt(color.replace('#', ''), 16)
  const amt = Math.round(2.55 * percent)
  const R = Math.max((num >> 16) - amt, 0)
  const G = Math.max((num >> 8 & 0x00FF) - amt, 0)
  const B = Math.max((num & 0x0000FF) - amt, 0)
  return '#' + (0x1000000 + R * 0x10000 + G * 0x100 + B).toString(16).slice(1)
}

/** 从 venue 分类列表中获取颜色 */
export function getCategoryColor(
  categoryKey: string | number,
  categories: Array<{ key: string | number; color: string }>
): string {
  if (categoryKey === 0 || categoryKey === '0') return '#BDBDBD'
  const category = categories.find(c => String(c.key) === String(categoryKey))
  return category?.color || '#9E9E9E'
}
