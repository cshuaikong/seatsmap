
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

---

## Konva Shape 旋转与包围盒规范

### 问题背景
使用 Konva.Shape 实现排组旋转时，经常出现以下问题：
1. **Shape 能旋转但座位不转动** - 原因是未设置 `transformsEnabled: 'all'`
2. **Transformer 边框与 Shape 内容不重合** - 原因是 `width/height` 计算不正确
3. **座位超出边框或边框过大** - 原因是坐标原点未对齐

### 正确实现方案

```typescript
// 1. 座位数据（圆心坐标）
const seats = []
for (let i = 0; i < 10; i++) {
  seats.push({
    x: i * 15 + 6,  // +6 让座位不超出左边框
    y: 6,           // +6 让座位垂直居中
    status: 'available',
  })
}

// 2. 计算包围盒（包含半径）
const SEAT_RADIUS = 6
const width = 9 * 15 + SEAT_RADIUS * 2   // 147 = 135 + 12
const height = SEAT_RADIUS * 2            // 12

// 3. 创建 Shape
const shape = new Konva.Shape({
  x: startX,
  y: startY,
  width: width,           // 必须设置！
  height: height,         // 必须设置！
  transformsEnabled: 'all', // 必须设置！
  draggable: true,
  seatsData: seats,
})

// 4. sceneFunc - 从 (0,0) 开始绘制
shape.sceneFunc((context, shape) => {
  const seatsData = shape.getAttr('seatsData') as Seat[]
  
  // 绘制边框（调试用，可选）
  context.beginPath()
  context.strokeStyle = '#ef4444'
  context.setLineDash([3, 3])
  context.rect(0, 0, width, height)
  context.stroke()
  
  // 绘制座位
  context.beginPath()
  context.fillStyle = '#22c55e'
  seatsData.forEach((seat) => {
    context.moveTo(seat.x + SEAT_RADIUS, seat.y)
    context.arc(seat.x, seat.y, SEAT_RADIUS, 0, Math.PI * 2)
  })
  context.fill()
})

// 5. hitFunc - 点击检测区域
shape.hitFunc((context, shape) => {
  context.beginPath()
  context.rect(0, 0, width, height)
  context.fillStrokeShape(shape)
})
```

### 关键要点

| 属性 | 必须 | 说明 |
|------|------|------|
| `width/height` | ✅ | 必须设置，否则 Transformer 无法计算包围盒 |
| `transformsEnabled: 'all'` | ✅ | 必须设置，否则旋转不生效 |
| 坐标原点 | (0,0) | sceneFunc 和 hitFunc 都从 (0,0) 开始绘制 |
| 座位偏移 | +radius | 座位坐标加半径，避免超出边框 |

### 调试技巧
```typescript
// 打印包围盒信息
const rect = shape.getClientRect()
console.log('Shape x/y:', shape.x(), shape.y())
console.log('getClientRect:', rect)
console.log('偏差:', rect.x - shape.x(), rect.y - shape.y())
```

### Transformer 配置
```typescript
const transformer = new Konva.Transformer({
  rotateEnabled: true,
  resizeEnabled: false,
  padding: 0,  // 移除内边距，确保边框重合
  rotationSnaps: [0, 45, 90, 135, 180, 225, 270, 315],
})
```

---

## Konva 拖拽与旋转优化规范

### 问题背景
拖拽旋转后的物体时，经常出现以下问题：
1. **拖拽时物体变平** - 角度被强制归零，变成水平
2. **松开手后跳回角度** - 拖拽结束恢复角度时产生位移偏差
3. **旋转时触发框选** - Transformer 旋转与舞台框选逻辑冲突

### 根本原因
1. **`transformsEnabled('position')` 禁用旋转** - 为性能优化而禁用旋转/缩放，导致物体变平
2. **dragLayer 切换丢失 rotation** - `moveTo(dragLayer)` 时 rotation 属性未被保留
3. **事件冒泡冲突** - mousedown 未检查 `isTransforming()`，旋转时触发框选

### 正确实现方案

#### 1. mousedown 事件处理（防止旋转时触发框选）
```typescript
stage.on('mousedown', (e) => {
  // 如果正在使用 Transformer 进行变换（旋转/缩放），不干预
  if (transformer?.isTransforming()) {
    return
  }
  // ... 其他逻辑
})
```

#### 2. 拖拽开始时保留旋转角度
```typescript
const startDragAll = (screenPos: { x: number; y: number }, isRotation = false) => {
  // ... 初始化拖拽状态
  
  // 官方优化方案：拖拽时将 Group 移到 dragLayer
  // 注意：旋转操作时不切换 Layer，避免变换中心偏移导致的抖动
  if (dragLayer && staticLayer && !isRotation) {
    unifiedDragState.items.forEach(item => {
      const group = item.node as Konva.Group
      // 移入 dragLayer 前记录当前旋转角度
      const currentRotation = group.rotation()
      group.moveTo(dragLayer)
      // 关键：确保角度被重新应用，防止被默认值覆盖
      group.rotation(currentRotation)
    })
    dragLayer.visible(true)
    dragLayer.listening(false)
    dragLayer.batchDraw()
  }
}
```

#### 3. 拖拽结束时恢复旋转角度
```typescript
const endDragAll = () => {
  // ... 其他逻辑
  
  // 拖拽结束：将 Group 移回 staticLayer
  if (dragLayer && staticLayer && unifiedDragState.useDragLayer) {
    unifiedDragState.items.forEach(item => {
      const group = item.node as Konva.Group
      // 移回前记录当前旋转角度
      const currentRotation = group.rotation()
      group.moveTo(staticLayer)
      // 关键：确保角度被重新应用，防止被默认值覆盖
      group.rotation(currentRotation)
    })
    dragLayer.visible(false)
  }
}
```

#### 4. 检测旋转锚点点击
```typescript
// 检查是否在 Transformer 框内 → 进入统一拖拽模式
if (transformer && transformer.visible() && selectedItems.value.length > 0) {
  const trRect = transformer.getClientRect()
  const insideTr = (
    pos.x >= trRect.x &&
    pos.x <= trRect.x + trRect.width &&
    pos.y >= trRect.y &&
    pos.y <= trRect.y + trRect.height
  )
  if (insideTr) {
    // 检测是否点击了旋转锚点（旋转时不切换 Layer）
    const targetName = (e.target as any)?.name?.() || ''
    const isRotater = targetName.includes('rotater')
    startDragAll(pos, isRotater)
    return
  }
}
```

### 关键要点

| 要点 | 说明 |
|------|------|
| **禁用 `transformsEnabled('position')`** | 这会导致旋转丢失，不要用于需要保持旋转的节点 |
| **moveTo 前后记录 rotation** | 切换 Layer 前后都要记录并重新应用 rotation |
| **旋转时不切换 Layer** | 点击 rotater 锚点时，保持在 staticLayer 操作 |
| **检查 `isTransforming()`** | mousedown 中检查，防止旋转时触发框选 |
| **使用 `useDragLayer` 标记** | 记录是否使用了 dragLayer，以便正确恢复 |

### 调试技巧
```typescript
// 打印旋转角度变化
console.log('Before moveTo:', group.rotation())
group.moveTo(dragLayer)
console.log('After moveTo:', group.rotation())

// 确保角度一致
if (group.rotation() !== currentRotation) {
  console.warn('Rotation lost!', currentRotation, '->', group.rotation())
}
```

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

---

## 座位绘制与旋转统一规范（Konva.Shape 实现）

### 核心设计原则

**必须同时满足三个需求：**
1. **预览准确** - 鼠标移动时预览座位位置与实际绘制一致
2. **绘制准确** - 第一个座位中心在鼠标点击位置
3. **旋转/移动正常** - Transformer 拖拽、旋转功能正常工作

### 实现方案

#### 1. 预览逻辑（calculatePreviewSeatPositions）

```typescript
const calculatePreviewSeatPositions = (
  startX: number,    // 鼠标起点 X
  startY: number,    // 鼠标起点 Y
  seatCount: number, // 座位数量
  ux: number,        // 方向向量 X (cos θ)
  uy: number         // 方向向量 Y (sin θ)
): { x: number; y: number }[] => {
  return Array.from({ length: seatCount }, (_, i) => ({
    // 第 i 个座位中心 = 起点 + i * 间距 * 方向向量
    x: startX + ux * i * SEAT_SPACING,
    y: startY + uy * i * SEAT_SPACING
  }))
}
```

**关键：** 预览直接使用全局坐标，第一个座位中心就在鼠标起点。

#### 2. 实际绘制逻辑（createRowShape）

使用 **逆向计算法** 让 Shape 的第一个座位中心对齐鼠标位置：

```typescript
const createRowShape = (seats: Seat[], startX: number, startY: number, rotation: number, rowId: string) => {
  // 1. 座位局部坐标（第一个座位中心在 SEAT_RADIUS, SEAT_RADIUS）
  const adjustedSeats = seats.map(seat => ({
    ...seat,
    x: seat.x + SEAT_RADIUS,
    y: seat.y + SEAT_RADIUS
  }))
  
  // 2. 计算边界和几何中心
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
  adjustedSeats.forEach((seat) => {
    minX = Math.min(minX, seat.x - SEAT_RADIUS)
    minY = Math.min(minY, seat.y - SEAT_RADIUS)
    maxX = Math.max(maxX, seat.x + SEAT_RADIUS)
    maxY = Math.max(maxY, seat.y + SEAT_RADIUS)
  })
  
  const width = maxX - minX
  const height = maxY - minY
  const centerX = (minX + maxX) / 2
  const centerY = (minY + maxY) / 2

  // 3. 逆向计算 Shape 位置（关键！）
  const angleRad = (rotation * Math.PI) / 180
  const cos = Math.cos(angleRad)
  const sin = Math.sin(angleRad)
  
  // 第一个座位相对于几何中心的偏移
  const firstSeatLocalX = SEAT_RADIUS - centerX
  const firstSeatLocalY = SEAT_RADIUS - centerY
  
  // 旋转后的偏移
  const rotatedOffsetX = firstSeatLocalX * cos - firstSeatLocalY * sin
  const rotatedOffsetY = firstSeatLocalX * sin + firstSeatLocalY * cos
  
  // Shape 位置 = 第一个座位目标位置 - 旋转后的偏移
  const shapeX = startX - rotatedOffsetX
  const shapeY = startY - rotatedOffsetY

  // 4. 创建 Shape
  const shape = new Konva.Shape({
    x: shapeX,
    y: shapeY,
    rotation: rotation,
    width: width,
    height: height,
    offsetX: centerX,  // 旋转中心为几何中心
    offsetY: centerY,
    id: `row-shape-${rowId}`,
    name: 'row-shape',
    perfectDrawEnabled: false,
    transformsEnabled: 'all',
    seatsData: adjustedSeats,
    hitMinX: minX,
    hitMinY: minY,
    hitMaxX: maxX,
    hitMaxY: maxY
  })
  
  // 5. sceneFunc - 使用局部坐标绘制
  shape.sceneFunc((context, shape) => {
    const seatsData = shape.getAttr('seatsData') as Seat[]
    const isSelected = shape.getAttr('selected')
    const radius = SEAT_RADIUS
    
    // 按状态分组绘制...
    seatsData.forEach(seat => {
      context.moveTo(seat.x + radius, seat.y)
      context.arc(seat.x, seat.y, radius, 0, Math.PI * 2)
    })
  })
  
  return shape
}
```

#### 3. 关键公式推导

**为什么这样计算？**

Konva 的变换顺序是：`translate(x,y) → rotate(rotation) → translate(-offsetX, -offsetY)`

全局坐标 = Shape位置 + 旋转后的(局部坐标 - 偏移)

要让第一个座位在 (startX, startY)：
```
startX = shapeX + (SEAT_RADIUS - centerX) * cos - (SEAT_RADIUS - centerY) * sin
startY = shapeY + (SEAT_RADIUS - centerX) * sin + (SEAT_RADIUS - centerY) * cos
```

解出：
```
shapeX = startX - rotatedOffsetX
shapeY = startY - rotatedOffsetY
```

### 关键要点

| 要点 | 说明 |
|------|------|
| **预览** | 直接计算全局坐标，第一个座位在鼠标起点 |
| **绘制** | 使用逆向计算，让 Shape 旋转后第一个座位仍在鼠标起点 |
| **旋转中心** | 几何中心 (centerX, centerY)，确保旋转平衡 |
| **局部坐标** | 第一个座位在 (SEAT_RADIUS, SEAT_RADIUS) |
| **Transformer** | 正常工作，因为使用了标准的 rotation + offset 机制 |

### 调试日志

```typescript
// 预览时输出
console.log('[预览计算]', {
  鼠标起点: { x: startX, y: startY },
  方向向量: { ux, uy },
  座位数量: seatCount,
  预览起点: positions[0],
  预览终点: positions[positions.length - 1]
})

// 绘制时输出
console.log('[实际绘制]', {
  鼠标起点: from,
  鼠标终点: to,
  方向向量: { ux, uy },
  旋转角度: angle,
  座位数量: count
})
```

### 常见错误

1. **预览偏移** - 预览使用了复杂的几何中心计算，应该直接沿方向向量排列
2. **旋转后位置偏移** - Shape 位置计算错误，没有考虑旋转后的偏移
3. **Transformer 边框不对齐** - width/height 或 offsetX/Y 计算错误
