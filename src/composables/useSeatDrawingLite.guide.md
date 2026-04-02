# useSeatDrawingLite 使用指南

## 📦 核心功能抽象

### **SeatsIO 交互模式**

```
┌──────────────────────────────────────────────┐
│ 分段点击绘制 (Click-by-Click)                │
├──────────────────────────────────────────────┤
│ ① 点击起点 → 显示第一个座位（白色预览圆）    │
│ ② 移动鼠标 → 实时预览整排座位（虚线 + 座位） │
│ ③ 再次点击 → 生成实际座位排                  │
│ ESC    → 取消当前绘制                        │
└──────────────────────────────────────────────┘
```

---

## 🎯 核心 API

### **1. 状态机**

```typescript
type DrawStep = 'idle' | 'first'

interface SeatDrawingState {
  step: DrawStep        // 当前步骤
  startPoint: Position  // 起点坐标
}
```

**状态流转：**
```
IDLE ──click──> FIRST ──click──> IDLE
 │                │
 │                └──mousemove──> 实时预览
 │
 └──ESC──────────> 取消
```

---

### **2. 使用示例（KonvaRenderer）**

```typescript
// KonvaRenderer.vue 中
import { useSeatDrawingLite } from '@/composables/useSeatDrawingLite'

const SEAT_RADIUS = defaultSeatMapConfig.defaultSeatRadius
const SEAT_SPACING = defaultSeatMapConfig.defaultSeatSpacing

// 初始化 Hook
const seatDrawing = useSeatDrawingLite({
  SEAT_RADIUS,
  SEAT_SPACING,
  
  addPreviewElement: (el) => {
    overlayLayer?.add(el)
    previewElements.push(el)
  },
  
  clearDrawingPreview: () => {
    previewElements.forEach(el => el.destroy())
    previewElements = []
    overlayLayer?.batchDraw()
  },
  
  batchDrawOverlay: () => {
    overlayLayer?.batchDraw()
  },
  
  getOrCreateDefaultSection: () => {
    if (venueStore.venue.sections.length === 0) {
      const sectionId = venueStore.addSection({
        name: '默认区域',
        rows: [],
        x: 0,
        y: 0
      })
      return sectionId || 'default'
    }
    return venueStore.venue.sections[0].id
  },
  
  addRowToStore: (sectionId, row) => {
    venueStore.addRow(sectionId, row)
  },
  
  generateId: () => generateId()
})

// 设置绘制工具
const setDrawingTool = (tool: DrawingToolMode) => {
  if (currentDrawingTool.value !== tool) {
    seatDrawing.cancel()  // 切换工具时取消当前绘制
  }
  currentDrawingTool.value = tool
}

// 处理画布点击
stage.on('click', (e) => {
  if (currentDrawingTool.value === 'draw_seat') {
    const pos = getStagePosition()
    seatDrawing.handleClick(pos)
  }
})

// 处理鼠标移动
stage.on('mousemove', (e) => {
  if (currentDrawingTool.value === 'draw_seat') {
    const pos = getStagePosition()
    seatDrawing.handleMouseMove(pos)
  }
})

// 处理 ESC 取消
window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && currentDrawingTool.value === 'draw_seat') {
    seatDrawing.cancel()
  }
})
```

---

## 📊 对比现有代码

| 模块 | 旧代码 (分散在组件中) | 新代码 (useSeatDrawingLite) | 改进 |
|------|---------------------|----------------------------|------|
| **代码行数** | ~150 行（分散） | ~100 行（集中） | ⬇️ 33% |
| **状态管理** | `seatDrawStep` + `seatDrawPoints` | 统一 `drawState` | ✅ 简化 |
| **预览函数** | `createSeatCursorPreview` + `createSeatRowPreview` | 保持不变 | ✅ 复用 |
| **提交函数** | `submitSeatRow` | 保持不变 | ✅ 复用 |
| **事件处理** | 分散在 setupStageEvents | 统一 `handleClick`/`handleMouseMove` | ✅ 解耦 |
| **可测试性** | 低（依赖 Konva） | 高（纯逻辑） | ✅ 提升 |

---

## 🔧 重构建议

### **阶段 1：并行运行（推荐）**

保留现有的 `createSeatCursorPreview`、`createSeatRowPreview`、`submitSeatRow`，但将事件处理委托给新 Hook：

```typescript
// 现有代码保持不变
const createSeatCursorPreview = (pos: Position) => { /* ... */ }
const createSeatRowPreview = (startPos, endPos) => { /* ... */ }
const submitSeatRow = (startPos, endPos) => { /* ... */ }

// 新增 Hook，使用现有的函数
const seatDrawing = useSeatDrawingLite({
  // ... 配置项
  addPreviewElement,
  clearDrawingPreview,
  batchDrawOverlay,
  getOrCreateDefaultSection,
  addRowToStore,
  generateId
})

// 事件处理委托给 Hook
stage.on('click', (e) => {
  if (currentDrawingTool.value === 'draw_seat') {
    seatDrawing.handleClick(getStagePosition())
  }
})

stage.on('mousemove', (e) => {
  if (currentDrawingTool.value === 'draw_seat') {
    seatDrawing.handleMouseMove(getStagePosition())
  }
})
```

### **阶段 2：完全迁移（可选）**

如果 Hook 运行稳定，可以移除组件中的重复状态和事件处理逻辑：

```typescript
// 删除这些变量
// const seatDrawStep = ref<SeatDrawStep>('idle')
// const seatDrawPoints = ref<{ first: Position | null; second: Position | null }>({ ... })

// 删除这些函数（已包含在 Hook 中）
// const handleClick = ...
// const handleMouseMove = ...

// 直接使用 Hook
const { drawState, handleClick, handleMouseMove, cancel } = seatDrawing
```

---

## 💡 核心优势

✅ **精简**：从 150 行减少到 100 行核心逻辑  
✅ **解耦**：绘制逻辑与 Konva 实例分离  
✅ **复用**：状态管理和事件处理统一  
✅ **易测试**：纯逻辑部分可以独立单元测试  
✅ **可扩展**：新增绘制模式只需扩展 Hook  

---

## 🚀 未来扩展

### **支持 section（三点式折线）**

```typescript
export type DrawStep = 'idle' | 'first' | 'second'

export interface SeatDrawingState {
  step: DrawStep
  startPoint: Position | null
  turnPoint: Position | null  // 转折点
}

// 在 Hook 中添加第二段处理逻辑
const handleSecondSegment = (pos: Position) => {
  // 计算第二段方向和长度
  const { ux, uy, dist } = getUnitVector(turnPoint!, pos)
  // 生成第二段座位...
}
```

### **支持 section-diagonal（对角区块）**

```typescript
// 添加第三点处理
const handleThirdPoint = (pos: Position) => {
  // 计算行排列方向和行数
  const rowCount = Math.floor(colDist / ROW_SPACING) + 1
  // 生成多排座位...
}
```

---

## 📝 总结

`useSeatDrawingLite` 提取了 SeatsIO 风格座位绘制的**三个核心函数**：

1. `createSeatCursorPreview` - 鼠标跟随预览圆
2. `createSeatRowPreview` - 座位排实时预览
3. `submitSeatRow` - 提交座位排到 store

通过统一的**状态机**（idle → first → idle）和**事件处理器**（handleClick + handleMouseMove），实现了精简、可复用、易维护的座位绘制逻辑。
