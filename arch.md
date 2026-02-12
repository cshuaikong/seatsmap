# 座位图编辑器架构文档

## 项目概述

**项目名称**: seatsio-vue-designer  
**项目类型**: Vue3 + TypeScript + Konva.js 座位图编辑器  
**参考实现**: Seats.io Designer  
**开发环境**: Windows (win32)

### 核心功能
- 可视化编辑座位、排、区域
- Konva.js Canvas 高性能渲染
- 类别管理与自定义颜色
- 多选操作（Shift/Ctrl 多选、框选）
- 网格对齐与自动吸附
- 实时属性编辑面板
- 图层管理

---

## 技术栈

### 前端框架
- **Vue 3.4.0** - 使用 Composition API
- **TypeScript 5.3.0** - 严格类型检查
- **Vite 5.0.0** - 构建工具与开发服务器

### 状态管理
- **Pinia 2.1.0** - 全局状态管理

### 图形渲染
- **Konva.js 10.2.0** - Canvas 2D 图形库（主渲染引擎）

### UI 组件
- **@iconify/vue 5.0.0** - 图标库

### 开发工具
- **@vitejs/plugin-vue 5.0.0** - Vue 单文件组件支持
- **vue-tsc 1.8.0** - TypeScript 类型检查

---

## 项目结构

```
seatsmap/
├── src/
│   ├── components/              # Vue 组件
│   │   ├── KonvaDesigner.vue   # 主设计器
│   │   ├── KonvaCanvas.vue     # Konva 画布组件
│   │   ├── TopToolbar.vue      # 顶部工具栏
│   │   ├── LeftToolbar.vue     # 左侧工具栏
│   │   └── RightPanel.vue      # 右侧属性面板
│   ├── stores/                  # Pinia 状态管理
│   │   └── chartStore.ts       # 图表数据与编辑状态
│   ├── types/                   # TypeScript 类型定义
│   │   └── index.ts            # 核心数据类型
│   ├── utils/                   # 工具函数
│   │   ├── geometry.ts         # 几何计算工具
│   │   └── id.ts               # ID 生成工具
│   ├── composables/             # Vue 组合式函数
│   │   └── useDrawing.ts       # 绘图逻辑
│   ├── App.vue                  # 根组件
│   ├── main.ts                  # 应用入口
│   └── index.ts                 # 库导出
├── index.html                   # HTML 入口
├── package.json                 # 项目配置
├── tsconfig.json                # TypeScript 配置
├── tsconfig.node.json           # Node TypeScript 配置
├── vite.config.ts               # Vite 配置
└── chart.js                     # 图表库（外部依赖）
```

---

## 核心数据模型

### 类型定义（types/index.ts）

```typescript
// 基础类型
interface Position {
  x: number
  y: number
}

// 座位
interface Seat {
  id: string
  label: string           // 座位标签
  x: number               // X 坐标
  y: number               // Y 坐标
  width: number           // 宽度
  height: number          // 高度
  rotation: number        // 旋转角度
  categoryId: string      // 类别 ID
  status: 'available' | 'booked' | 'blocked'
  properties: Record<string, any>
}

// 排
interface Row {
  id: string
  label: string           // 排标签
  seats: Seat[]           // 座位数组
  x: number
  y: number
  rotation: number
}

// 区域
interface Section {
  id: string
  label: string           // 区域标签
  x: number
  y: number
  width: number
  height: number
  rotation: number
  rows: Row[]             // 排数组
}

// 类别
interface Category {
  id: string
  label: string           // 类别名称
  color: string           // 显示颜色
  price: number           // 价格
  position: number        // 排序位置
}

// 图表
interface Chart {
  id: string
  name: string
  width: number
  height: number
  categories: Category[]
  sections: Section[]
  objects: any[]          // 其他对象（文本、形状等）
}

// 选择状态
interface Selection {
  type: 'seat' | 'row' | 'section' | 'object'
  ids: string[]
  objects: any[]
}
```

---

## 状态管理（Pinia Store）

### chartStore.ts

```typescript
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Chart, Seat, Row, Section, Category, Selection } from '../types'

export const useChartStore = defineStore('chart', () => {
  // 状态
  const chart = ref<Chart>({
    id: '',
    name: '未命名图表',
    width: 800,
    height: 600,
    categories: [],
    sections: [],
    objects: []
  })

  const selection = ref<Selection>({
    type: 'seat',
    ids: [],
    objects: []
  })

  const selectedObjects = computed(() => selection.value.objects)
  const hasSelection = computed(() => selection.value.ids.length > 0)

  // 操作方法
  function addSeat(seat: Seat) {
    // 添加座位逻辑
  }

  function updateSeat(id: string, updates: Partial<Seat>) {
    // 更新座位逻辑
  }

  function deleteSeats(ids: string[]) {
    // 删除座位逻辑
  }

  function addRow(row: Row) {
    // 添加排逻辑
  }

  function addSection(section: Section) {
    // 添加区域逻辑
  }

  function selectObjects(type: Selection['type'], ids: string[]) {
    selection.value = { type, ids, objects: [] }
  }

  function clearSelection() {
    selection.value = { type: 'seat', ids: [], objects: [] }
  }

  return {
    chart,
    selection,
    selectedObjects,
    hasSelection,
    addSeat,
    updateSeat,
    deleteSeats,
    addRow,
    addSection,
    selectObjects,
    clearSelection
  }
})
```

---

## 组件架构

### 1. KonvaDesigner.vue（主设计器）

**职责**：
- 整体布局管理
- 工具栏与画布的协调
- 全局事件处理（键盘快捷键、拖拽等）

**核心功能**：
```vue
<template>
  <div class="designer">
    <TopToolbar />
    <div class="main-content">
      <LeftToolbar />
      <KonvaCanvas />
      <RightPanel />
    </div>
  </div>
</template>
```

### 2. KonvaCanvas.vue（画布组件）

**职责**：
- Konva Stage 和 Layer 管理
- 座位、排、区域的渲染
- 鼠标事件处理（点击、拖拽、框选）
- 网格对齐与吸附

**核心逻辑**：
```typescript
// Konva 舞台初始化
const stage = ref<Konva.Stage>()
const layer = ref<Konva.Layer>()

// 渲染座位
function renderSeats(seats: Seat[]) {
  seats.forEach(seat => {
    const rect = new Konva.Rect({
      x: seat.x,
      y: seat.y,
      width: seat.width,
      height: seat.height,
      fill: getCategoryColor(seat.categoryId),
      stroke: '#333',
      strokeWidth: 1
    })
    layer.value?.add(rect)
  })
}

// 框选功能
function handleBoxSelect(start: Position, end: Position) {
  const selected = seats.filter(seat => {
    return seat.x >= start.x && seat.x <= end.x &&
           seat.y >= start.y && seat.y <= end.y
  })
  selectObjects('seat', selected.map(s => s.id))
}
```

### 3. TopToolbar.vue（顶部工具栏）

**功能**：
- 文件操作（新建、打开、保存、导出）
- 撤销/重做
- 缩放控制
- 预览模式切换

### 4. LeftToolbar.vue（左侧工具栏）

**功能**：
- 绘图工具选择（座位、排、区域、文本、形状）
- 类别选择器
- 对齐工具

### 5. RightPanel.vue（右侧属性面板）

**功能**：
- 选中对象的属性编辑
- 类别管理
- 图层管理

---

## 核心功能实现

### 1. 座位绘制

```typescript
// composables/useDrawing.ts
export function useSeatDrawing() {
  const isDrawing = ref(false)
  const startPos = ref<Position>({ x: 0, y: 0 })

  function startDrawing(x: number, y: number) {
    isDrawing.value = true
    startPos.value = { x, y }
  }

  function drawSeat(x: number, y: number) {
    if (!isDrawing.value) return
    
    const seat: Seat = {
      id: generateId(),
      label: '',
      x: snapToGrid(x),
      y: snapToGrid(y),
      width: 30,
      height: 30,
      rotation: 0,
      categoryId: 'default',
      status: 'available',
      properties: {}
    }
    
    addSeat(seat)
  }

  function stopDrawing() {
    isDrawing.value = false
  }

  return { startDrawing, drawSeat, stopDrawing }
}
```

### 2. 网格对齐

```typescript
// utils/geometry.ts
export const GRID_SIZE = 10

export function snapToGrid(value: number): number {
  return Math.round(value / GRID_SIZE) * GRID_SIZE
}

export function snapPosition(pos: Position): Position {
  return {
    x: snapToGrid(pos.x),
    y: snapToGrid(pos.y)
  }
}
```

### 3. 多选操作

```typescript
// Shift/Ctrl 多选
function handleSelection(event: MouseEvent, seatId: string) {
  if (event.shiftKey || event.ctrlKey) {
    // 追加选择
    const currentIds = selection.value.ids
    if (currentIds.includes(seatId)) {
      selection.value.ids = currentIds.filter(id => id !== seatId)
    } else {
      selection.value.ids = [...currentIds, seatId]
    }
  } else {
    // 单选
    selection.value.ids = [seatId]
  }
}
```

### 4. 框选功能

```typescript
// 框选矩形
const selectionBox = ref<Konva.Rect>()

function startBoxSelect(x: number, y: number) {
  selectionBox.value = new Konva.Rect({
    x, y,
    width: 0,
    height: 0,
    stroke: '#007bff',
    strokeWidth: 1,
    dash: [5, 5],
    fill: 'rgba(0, 123, 255, 0.1)'
  })
  layer.value?.add(selectionBox.value)
}

function updateBoxSelect(x: number, y: number, startX: number, startY: number) {
  if (!selectionBox.value) return
  
  const width = x - startX
  const height = y - startY
  
  selectionBox.value.width(Math.abs(width))
  selectionBox.value.height(Math.abs(height))
  selectionBox.value.x(width > 0 ? startX : x)
  selectionBox.value.y(height > 0 ? startY : y)
}

function endBoxSelect() {
  if (!selectionBox.value) return
  
  const box = selectionBox.value
  const selected = seats.filter(seat => {
    return seat.x >= box.x() && 
           seat.x + seat.width <= box.x() + box.width() &&
           seat.y >= box.y() && 
           seat.y + seat.height <= box.y() + box.height()
  })
  
  selectObjects('seat', selected.map(s => s.id))
  box.destroy()
}
```

---

## 性能优化

### 1. 虚拟渲染
- 只渲染可视区域内的座位
- 使用 Konva 的缓存机制

### 2. 批量更新
```typescript
// 批量更新座位位置
function batchUpdateSeats(updates: Array<{ id: string, x: number, y: number }>) {
  layer.value?.batchDraw()
  updates.forEach(update => {
    const seat = findSeat(update.id)
    if (seat) {
      seat.x = update.x
      seat.y = update.y
    }
  })
  layer.value?.batchDraw()
}
```

### 3. 事件节流
```typescript
import { throttle } from 'lodash-es'

const handleMouseMove = throttle((e: MouseEvent) => {
  // 处理鼠标移动
}, 16) // 约 60fps
```

---

## 导出功能

### 导出为 JSON
```typescript
function exportToJSON(): string {
  return JSON.stringify(chart.value, null, 2)
}
```

### 导出为图片
```typescript
function exportToImage(): Promise<Blob> {
  return new Promise((resolve) => {
    stage.value?.toDataURL({
      pixelRatio: 2,
      callback: (dataUrl) => {
        fetch(dataUrl)
          .then(res => res.blob())
          .then(blob => resolve(blob))
      }
    })
  })
}
```

---

## 开发规范

### 命名约定
- 组件：PascalCase（如 `KonvaDesigner.vue`）
- 函数/变量：camelCase（如 `addSeat`）
- 常量：UPPER_SNAKE_CASE（如 `GRID_SIZE`）
- 类型：PascalCase（如 `Seat`, `Chart`）

### 代码风格
- 使用 TypeScript 严格模式
- 组件使用 Composition API
- 状态管理使用 Pinia
- 样式使用 scoped CSS

### Git 提交规范
```
feat: 添加座位批量删除功能
fix: 修复框选时的坐标计算错误
docs: 更新架构文档
refactor: 重构座位渲染逻辑
```

---

## 后续优化方向

1. **性能优化**
   - 实现虚拟滚动
   - 优化大量座位渲染性能
   - 添加 Web Worker 支持

2. **功能增强**
   - 添加更多形状支持（圆形、多边形）
   - 实现图层锁定功能
   - 添加快捷键配置

3. **用户体验**
   - 添加拖拽引导线
   - 实现操作历史记录
   - 添加模板功能

4. **测试覆盖**
   - 单元测试
   - E2E 测试
   - 性能测试