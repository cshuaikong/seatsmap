# 座位图编辑器图标库 (Seat Map Editor Icons)

本文档记录座位图编辑器项目中使用的所有 Iconify 图标，按照 seats.io 工具栏顺序排列。

## 工具栏图标顺序（从上到下）

### 1. 选择工具
| 图标名称 | Iconify 标识 | 用途 |
|---------|-------------|------|
| 选择工具 | `lucide:mouse-pointer-2` | 选择/拖拽模式 |

### 2-5. 绘制工具区（三种座位排列图标）
| 图标名称 | Iconify 标识 | 用途 | 说明 |
|---------|-------------|------|------|
| 单行座位 | `tabler:circles` | 绘制单行座位排 | 三个空心圆横排 ○ ○ ○ |
| 分段座位 | `ph:dots-six` | 绘制分段座位 | 横2圆+斜3圆 (L形布局) |
| 多行座位 | `tabler:grid-dots` | 绘制多行座位区 | 3x3圆点网格排列 |

### 6-11. 座位区工具
| 图标名称 | Iconify 标识 | 用途 | 说明 |
|---------|-------------|------|------|
| 圆形区域 | `lucide:circle` | 圆形座位区 | 圆圈 |
| 单行座位 | `tabler:dots` | 直线座位排 | 三个水平圆点 |
| 弧形座位 | `tabler:chart-arcs` | 弧形/曲线座位 | 弧线图标 |
| 方形区域 | `lucide:square` | 方形座位区 | 正方形 |
| 文字 | `lucide:letter-text` | 添加文字标签 | A字母 |
| 舞台 | `lucide:monitor` | 添加舞台 | 显示器图标 |

### 12. 线条工具
| 图标名称 | Iconify 标识 | 用途 |
|---------|-------------|------|
| 线条 | `lucide:minus` | 绘制分隔线 |

### 13-15. 标注工具
| 图标名称 | Iconify 标识 | 用途 | 说明 |
|---------|-------------|------|------|
| 文字标注 | `lucide:type` | 文字标注 | T字母 |
| 图片 | `lucide:image` | 插入图片 | 图片图标 |
| 洗手间 | `mdi:gender-male-female` | 洗手间标识 | 男女符号 |

### 编辑操作
| 图标名称 | Iconify 标识 | 用途 |
|---------|-------------|------|
| 撤销 | `lucide:undo-2` | 撤销操作 |
| 重做 | `lucide:redo-2` | 重做操作 |
| 复制 | `lucide:copy` | 复制选中项 |
| 粘贴 | `lucide:clipboard-paste` | 粘贴 |
| 删除 | `lucide:trash-2` | 删除选中项 |

## 状态栏图标
| 图标名称 | Iconify 标识 | 用途 |
|---------|-------------|------|
| 座位 | `lucide:chair` | 座位总数 |
| 眼睛 | `lucide:eye` | 预览模式 |
| 保存 | `lucide:check` | 保存 |

## 图标使用示例

```vue
<template>
  <!-- 选择工具 -->
  <Icon icon="lucide:mouse-pointer-2" />
  
  <!-- 绘制工具 -->
  <Icon icon="lucide:circle-dot" />        <!-- 单个座位 -->
  <Icon icon="lucide:paintbrush" />        <!-- 手绘 -->
  <Icon icon="mdi:seat-outline" />         <!-- 座位排 -->
  <Icon icon="lucide:triangle" />          <!-- 多边形 -->
  
  <!-- 座位区工具 -->
  <Icon icon="lucide:circle" />            <!-- 圆形区域 -->
  <Icon icon="tabler:dots" />              <!-- 单行座位 -->
  <Icon icon="tabler:chart-arcs" />        <!-- 弧形座位 -->
  <Icon icon="lucide:square" />            <!-- 方形区域 -->
  <Icon icon="lucide:letter-text" />       <!-- 文字 -->
  <Icon icon="lucide:monitor" />           <!-- 舞台 -->
  
  <!-- 标注工具 -->
  <Icon icon="lucide:minus" />             <!-- 线条 -->
  <Icon icon="lucide:type" />              <!-- 文字标注 -->
  <Icon icon="lucide:image" />             <!-- 图片 -->
  <Icon icon="mdi:gender-male-female" />   <!-- 洗手间 -->
</template>

<script setup>
import { Icon } from '@iconify/vue'
</script>
```

## 工具栏布局（按 seats.io 顺序）

```
┌──────────┐
│   选择   │  ← lucide:mouse-pointer-2
├──────────┤
│  单个座位 │  ← lucide:circle-dot
│   手绘   │  ← lucide:paintbrush
│  座位排  │  ← mdi:seat-outline
│  多边形  │  ← lucide:triangle
├──────────┤
│  圆形区域 │  ← lucide:circle
│  单行座位 │  ← tabler:dots
│  弧形座位 │  ← tabler:chart-arcs
│  方形区域 │  ← lucide:square
│   文字   │  ← lucide:letter-text
│   舞台   │  ← lucide:monitor
├──────────┤
│   线条   │  ← lucide:minus
├──────────┤
│  文字标注 │  ← lucide:type
│   图片   │  ← lucide:image
│  洗手间  │  ← mdi:gender-male-female
├──────────┤
│ 撤销│重做 │
├──────────┤
│ 复制│粘贴 │
│   删除   │
└──────────┘
```

## 图标来源

- **Lucide**: https://lucide.dev/icons/ (ISC License)
- **Tabler**: https://tabler-icons.io/ (MIT License)
- **Material Design Icons**: https://pictogrammers.com/library/mdi/ (Apache 2.0 License)

---

## 核心交互架构（Konva 实现规范）

### 节点层级
```
staticLayer
  └── sectionGroup (id: section-xxx)                        ← 纯容器，不参与选中
        └── rowGroup (id: row-group-xxx, name: row-group)   ← 基础选中单位 ★
              ├── Circle × N  (listening: false)            ← 每座一个 Circle
              └── Rect (row-click-area, listening: true)    ← 透明点击区域
```

### ID 命名规范
| 节点 | ID 格式 | Name |
|------|---------|------|
| sectionGroup | `section-${section.id}` | 无 |
| rowGroup | `row-group-${rowId}` | `row-group` |
| Circle | `${seat.id}` | 无 |

### 选中规范
- **基础选中单位**：rowGroup（一整排）
- `findSelectableParent`：向上遍历，匹配 `id.startsWith('row-group-') && name === 'row-group'`
- `getAllSelectableNodes`：`staticLayer.find('Group')` 过滤同样条件，供框选使用
- 高亮：选中时所有 Circle `stroke('#3b82f6')`，取消时恢复 `stroke('#ef4444')`

### 拖拽规范
- 统一由 `stage.mousedown/mousemove/mouseup` 驱动（unifiedDragState）
- Transformer 框内点击 → `startDragAll` → `updateDragAll` 批量 `setAttrs({x,y})`
- 渲染：直接 `staticLayer.batchDraw()`，不使用 RAF 节流

### 性能规范
- Circle 禁止调用 `cache()`
- Circle 设置 `listening: false`，`perfectDrawEnabled: false`
- 事件由父 rowGroup 统一处理

### ⚠️ 关键性能优化（mousemove 节流）
**问题**：`stage.on('mousemove')` 每帧触发，即使不拖拽也会执行坐标转换、Transformer 边界计算等，导致 30ms+ 帧时。

**解决**：`mousemove` 节流到 30fps（33ms 间隔），大幅减少 CPU 占用。

```typescript
// mousemove 节流：最多 30fps
let lastMouseMoveTime = 0
stage.on('mousemove', (e) => {
  const now = performance.now()
  if (now - lastMouseMoveTime < 33) return // 30fps 节流
  lastMouseMoveTime = now
  // ... 后续处理
})
```

**效果**：`mousemove` 耗时从 30ms+ 降到 < 10ms，拖拽 100 个座位流畅。

### 创建统一
- 手动绘制 和 按钮生成 均调用同一个 `createRowGroup(seats, x, y, rotation, rowId)`
- `createSection` 内部遍历 rows，每排调用一次 `createRowGroup`

## 工具类型定义

```typescript
export type ToolMode = 
  // 基础工具
  | 'select' | 'pan'
  // 绘制工具
  | 'drawSeat' | 'drawFreehand' | 'drawRow' | 'drawPolygon'
  // 座位区工具
  | 'drawCircle' | 'drawLineRow' | 'drawArcRow' | 'drawRect' | 'drawText' | 'drawStage'
  // 线条
  | 'drawLine'
  // 标注工具
  | 'text' | 'image' | 'restroom'
```
