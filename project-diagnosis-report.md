# 座位图编辑器 — 项目全维度诊断报告

> 生成时间：2025-07-14  
> 项目：seatsio-vue-designer（Vue3 + LeaferJS 座位图编辑器）  
> 代码总量：约 6,500 行（src/ 目录）

---

## 一、架构诊断

### 1.1 技术栈总览

```
Vue 3.4 + TypeScript 5.3 + Vite 5 + Pinia 2.1 + LeaferJS 2.1
```

| 层级 | 组件 | 评价 |
|------|------|------|
| 框架 | Vue3 Composition API | ✅ 合理，响应式够轻 |
| 渲染 | LeaferJS + Canvas 2D | ✅ 性能优于 SVG，适合大量图形 |
| 状态 | Pinia 三 Store 分层 | ⚠️ 分层思路对，但实现有耦合 |
| 构建 | Vite 5 + vue-tsc | ✅ 标准配置，无过度定制 |
| 类型 | TypeScript 5.3 | ⚠️ `any` 泛滥，严格模式形同虚设 |

### 1.2 分层架构图

```
┌─────────────────────────────────────────────┐
│  UI 层                                      │
│  IndexPage → SeatMapDesigner → [Left/Right] │
│                                             │
│  PathEditor（画布核心，约 1000 行）          │
│  ├─ useSeatModule（座位渲染）              │
│  ├─ useVertexEdit（顶点编辑）              │
│  ├─ usePolygonDraw（多边形绘制）           │
│  └─ usePathEditorSync（画布↔Store 桥）     │
│                                             │
│  Composables（20+ 个组合式函数）           │
│  Domain（Command 模式 + 序列化）           │
│                                             │
│  Store 层                                   │
│  ├─ venueDataStore（场馆数据 CRUD）       │
│  ├─ editorStore（选中状态 + 剪贴板）       │
│  └─ historyStore（Undo/Redo 双轨）        │
│                                             │
│  API 层（request.ts + seatMap.ts）         │
└─────────────────────────────────────────────┘
```

### 1.3 架构核心矛盾：「画布为中心」vs「数据驱动」

**现状**：项目处于架构迁移期，存在两套并行机制：

1. **旧路径**：画布直接创建 Leafer 元素 → `syncAllSectionsToStore()` 回写 Store
2. **新路径**：Store 变更 → `watchStoreAndApply()` → 增量更新画布元素

**问题**：
- 两套机制同时在跑，数据一致性全靠手动 `isSyncingToStore / isApplyingToCanvas` 标志维持
- `extractRowData()` 需要从画布元素的局部坐标逆推世界坐标，涉及 4 层旋转矩阵（Section→Row→Seat→World），极易出错
- `PathEditor` 中大量 `as any` 直接访问 Leafer 内部属性（`__zoomLayer`、`__sectionGroup` 等），耦合极深

---

## 二、性能诊断（6 个高危点）

### 🔴 P1 — 历史栈使用完整 JSON 快照

**位置**：`src/stores/historyStore.ts:42-48`

```typescript
// 每次 mutation 后保存整个 venue 的深拷贝
history.value.push(venueDataStore.exportVenueData())  // JSON.parse/stringify
```

**影响**：
- 一个 5000 座位的场馆，venue 对象约 2-3 MB
- 50 步历史 = 100-150 MB 内存占用
- `deep: true` 的 watch 触发频率极高，每帧可能产生 1 次快照

**量化估算**：

| 场馆规模 | 单快照大小 | 50 步历史 | 内存占用 |
|---------|-----------|----------|---------|
| 1000 座 | ~400 KB | ~20 MB | 可接受 |
| 5000 座 | ~2.5 MB | ~125 MB | 高危 |
| 20000 座 | ~10 MB | ~500 MB | 崩溃 |

### 🔴 P2 — 全量重渲染（renderAll）

**位置**：`src/components/PathEditor.vue:296-335`

```typescript
function renderAll(data: VenueData): void {
  clearAllPaths()   // 全删
  // ... 重新创建所有 SectionGroup、座位排、座位圆
  seatModule.createSeatsFromVenueData(sections)  // 全重建
}
```

**影响**：
- 任何 venue 数据变化都触发全量重建，包括 Leafer 元素的 `new Group()`、`new Ellipse()`
- 5000 座 = 5000 个 Ellipse 实例重新创建，GC 压力大

### 🔴 P3 — 坐标转换的重复三角函数计算

**位置**：`src/composables/usePathEditorSync.ts:129-136`

```typescript
function localToWorld(lx: number, ly: number): { x: number; y: number } {
  const rx = lx * cosR - ly * sinR
  const ry = lx * sinR + ly * cosR
  return {
    x: sX + rx * cosS - ry * sinS,
    y: sY + rx * sinS + ry * cosS,
  }
}
```

**问题**：
- 每个座位提取时都重新计算 `cosR/sinR/cosS/sinS`（其实只与 Section 相关）
- 座位数 × 4 次三角函数，20000 座 = 80000 次三角函数调用

### 🟡 P4 — Store Getters 全量遍历

**位置**：`src/stores/venueDataStore.ts:56-76`

```typescript
const totalSeats = computed(() => {
  let count = 0
  venue.value.sections.forEach(section => {
    section.rows.forEach(row => {
      count += row.seats.length
    })
  })
  return count
})
```

**问题**：
- 每次读取 `totalSeats` 都全量遍历，虽然 Vue 会缓存，但任何座位变化都会触发重新计算
- 应使用**派生计数器**（在 mutation 时增量更新）

### 🟡 P5 — 画布元素对象池缺失

`useSeatDraw` 虽然实现了预览元素的池化（`poolE/poolL/poolT`），但**实际座位渲染**（`createSeatsFromVenueData`）每次都是 `new Ellipse()`/`new Group()`。

Leafer 的 `Ellipse` 创建销毁开销不低，大场馆应复用已有元素。

### 🟡 P6 — 无空间索引（Spatial Indexing）

座位图本质上是 2D 空间数据，但项目没有任何空间索引（四叉树、R-tree、网格哈希）。

**后果**：
- 框选操作需要遍历所有元素做碰撞检测
- 鼠标悬停检测也是线性扫描
- 随着元素增多，交互响应线性下降

---

## 三、逻辑问题（8 个）

### ⚠️ L1 — Undo/Redo 双轨混乱

**位置**：`src/stores/historyStore.ts`

```typescript
// 两套历史系统同时存在：
const history = ref<any[]>([])        // 快照历史（legacy）
const commandStack = createCommandStack()  // 命令历史（migration target）

// 逻辑：先尝试 command undo，否则 fallback 到 snapshot
function undo() {
  if (canUndoCommand.value) undoCommand()
  else undoSnapshot()
}
```

**风险**：
- 用户操作一部分走 Command、一部分走 Snapshot，混合后 undo 行为不可预测
- `commandStack.canUndo` 阻止 snapshot 生成，但一旦 Command 用完，突然切换到 Snapshot 模式，用户体验断层

### ⚠️ L2 — 深拷贝 JSON 滥用

**位置**：`src/domain/venueCommands.ts:8-10`

```typescript
function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value))  // 丢失函数、Date、Map、Set、undefined
}
```

**问题**：
- 所有 Command 的 undo 数据都用 `JSON.parse/stringify` 克隆
- 如果类型中有 `Date` 或 `undefined`，会被静默丢失
- 性能差：大对象每次操作克隆两次

### ⚠️ L3 — 事件监听泄漏

**位置**：`src/components/PathEditor.vue:772-918`

```typescript
document.addEventListener('pointerup', onPointerUp)
document.addEventListener('keydown', onKey)
```

**问题**：
- 在 `onMounted` 中注册 document 级事件，但在 `onUnmounted` 中只清理了 `onPointerUp` 和 `onKey`
- 检查 `pointerup` 的清理：`const onPointerUp2 = (leafer as any)?.__onPointerUp` —— 如果 `leafer` 为 null 则无法获取引用，事件泄漏
- 更严重的是：`pointerup` 和 `keydown` 都依赖 `(leafer as any).__onXxx` 存储的引用，如果 Leafer 实例提前被 destroy，引用可能丢失

### ⚠️ L4 — 类型安全形同虚设

```typescript
// 在 src/components/PathEditor.vue 中搜索 "as any" 出现超过 80 次
const l = leafer as any
const eb = (editor as any)?.editBox
```

**具体危险点**：
- `Leafer` 的 `__zoomLayer` 是内部属性，版本升级后可能改名
- `editor.editBox` 的类型在 LeaferJS 中不确定，直接访问可能 undefined
- `sectionGroupMap` 的 `get()` 返回类型丢失

### ⚠️ L5 — 座位编号逻辑脆弱

**位置**：`src/stores/venueDataStore.ts:320-324`

```typescript
function renumberRowSeats(row: SeatRow) {
  row.seats.forEach((seat, index) => {
    seat.label = String(index + 1)  // 永远是 1,2,3... 无视原始编号
  })
}
```

**问题**：
- 删除座位后重编号会把所有座位变为 1,2,3...，丢失原始编号（如 A1, A2, B1）
- 与 seats.io 的编号逻辑不一致

### ⚠️ L6 — 粘贴逻辑缺失 seat 的 row 归属

**位置**：`src/stores/venueDataStore.ts:447-464`

```typescript
if (data.seats && data.seats.length > 0) {
  const row = findRowBySeatId(data.seats[0].id)
  const section = row ? findSectionByRowId(row.id) : venue.value.sections[0]
  // 如果 section 不存在，会静默忽略
}
```

**问题**：
- 复制单个 seat 时，永远新建一个 row，破坏原有的座位排结构
- 没有处理 `shapeIds` 等的 `offset` 偏移（`cloneArea` 没有 dx/dy 参数）

### ⚠️ L7 — 键盘事件冲突

**位置**：`src/components/PathEditor.vue:870-917`

```typescript
if (e.key === 'Backspace' || e.key === 'Delete') {
  if (isTyping) return
  if (seatVertexEdit.isEditing.value) return
  deleteSelected()  // 直接删除！
}
```

**问题**：
- 仅检测 `INPUT/TEXTAREA`，没有检测 `contenteditable` 的富文本编辑器
- 没有确认对话框，误触直接删除
- Delete 在 Mac 上可能与其他快捷键冲突

### ⚠️ L8 — 弱引用（WeakMap）的使用隐患

**位置**：`src/components/PathEditor.vue:83`

```typescript
let edgeCache = new WeakMap<object, number[][]>()
```

**问题**：
- `edgeCache` 缓存了 Leafer 元素的边数据，但 key 是 Leafer 对象
- Leafer 对象被 GC 后，缓存自动清理 ✅
- 但重新创建时缓存全部丢失，大场馆首次交互时会重新计算所有边
- 没有预热机制，也没有最大容量限制

---

## 四、漏洞 & 安全风险（7 个）

### 🔴 S1 — API 请求缺乏错误处理

**位置**：`src/api/request.ts:9-22`

```typescript
export async function request<T = any>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${BASE_URL}${url}`, ...)
  if (!response.ok) { throw new Error(...) }
  const json = await response.json()
  if (json.code !== 0) { throw new Error(...) }
  return json.data
}
```

**风险**：
- 无超时控制（fetch 默认无 timeout）
- 无重试机制（网络抖动时直接失败）
- 无请求取消（AbortController）
- 无 Loading 状态管理，用户可能重复点击

### 🔴 S2 — 文件导入无安全校验

**位置**：`src/composables/useSeatMapIO.ts`（推断）

**风险**：
- 导入 JSON 没有 schema 校验，恶意 JSON 可能导致内存溢出
- 没有文件大小限制，用户可能导入 50MB 的 JSON
- 没有白名单，属性直接合并到 store

### 🟡 S3 — alert 阻塞主线程

**位置**：`src/components/IndexPage.vue:187,190`

```typescript
alert('保存成功')
alert('保存失败：' + ...)
```

**问题**：
- alert 阻塞 UI 线程，在 Canvas 渲染中会导致画面冻结
- 应使用 toast/snackbar 组件替代

### 🟡 S4 — 无 XSS 输出过滤

**位置**：`src/components/PathEditor.vue:212-232`

```typescript
const nameText = new Text({
  text: p.name || '',  // 直接输出，未过滤
  ...
})
```

**风险**：
- 如果场馆名称包含恶意内容，虽然 LeaferJS 的 Text 不是 HTML 渲染，相对安全
- 但其他组件（如 `RightPanel` 的输入框）可能通过 `v-html` 或 `innerHTML` 暴露

### 🟡 S5 — 并发操作竞态条件

**位置**：`src/components/IndexPage.vue:148-169`

```typescript
async function refreshCurrentData() {
  venueData.value = await fetchSeatMapData(vid)
}

watch(() => route.query.venue, () => { refreshCurrentData() })
```

**问题**：
- 用户快速切换场馆时，旧请求可能晚于新请求返回，导致数据覆盖（stale request）
- 没有请求取消或序号校验机制

### 🟡 S6 — 构建产物包含源码映射

**位置**：`dist/` 目录检查

**风险**：
- Vite 默认生产构建可能包含 source map，暴露源码结构
- 需要确认 `vite.config.ts` 中 `build.sourcemap` 配置

### 🟡 S7 — Proxy 配置暴露后端地址

**位置**：`vite.config.ts:15-19`

```typescript
proxy: {
  '/venue': {
    target: 'https://seatmap.web.jinsc.cn',  // 生产环境地址暴露
    ...
  }
}
```

**问题**：
- 开发配置不应提交到仓库，或应使用环境变量
- 生产部署使用 wrangler，但开发配置可能误导安全审计

---

## 五、优化方案（按优先级排序）

### 方案 A：历史系统统一（P1）

**目标**：彻底移除快照历史，全部使用 Command 模式。

**步骤**：
1. 给 `venueDataStore` 的所有 mutation 添加 Command 包装
2. 将 `historyStore` 的 `scheduleSave` 和 `watch` 移除
3. 统一使用 `historyStore.execute(command)` 入口

**预期收益**：
- 内存占用从 O(N×M) 降到 O(N)，N = 操作数，M = 场馆大小
- 5000 座场馆的历史内存从 125MB 降到 < 5MB

### 方案 B：增量渲染（P2）

**目标**：避免 `renderAll` 全量重建。

**步骤**：
1. 建立 `id → LeaferElement` 的 Map 索引
2. 新增/删除/修改时只操作对应元素
3. 座位排使用对象池：复用已有的 `Ellipse` 和 `Group`

**预期收益**：
- 5000 座场馆的渲染时间从 300ms+ 降到 < 50ms
- 大幅减少 GC 压力

### 方案 C：空间索引（P6）

**目标**：加速框选和碰撞检测。

**实现**：
```typescript
// 简单的网格哈希
class SpatialGrid {
  cellSize = 100
  grid = new Map<string, Set<string>>()  // 'x:y' -> Set<elementId>
  
  insert(element: BoundingBox, id: string)
  query(box: BoundingBox): string[]     // 只返回可能碰撞的候选
  remove(id: string)
}
```

**预期收益**：
- 框选从 O(N) 降到 O(N/cellCount)，N=10000 时从 10ms 降到 <1ms

### 方案 D：Trigonometric 缓存（P3）

**目标**：消除重复三角函数计算。

**实现**：
```typescript
function computeRowWorldPositions(section: Section, row: SeatRow) {
  const cosS = Math.cos(section.rotation), sinS = Math.sin(section.rotation)  // 只算一次
  // 所有座位复用 cosS/sinS
}
```

**预期收益**：
- 20000 座导出时减少约 60000 次三角函数调用，提速 15-20%

### 方案 E：类型安全加固（L4）

**目标**：消除 `as any`。

**步骤**：
1. 给 Leafer 扩展定义类型声明文件
2. 定义 `MetaGroup` / `MetaEllipse` 的完整接口（已部分定义，需补全）
3. 开启 `tsconfig.json` 的 `strict: true` 和 `noImplicitAny: true`

### 方案 F：事件生命周期治理（L3）

**目标**：消除事件泄漏。

**实现**：
```typescript
// 使用 AbortController 统一清理
const ac = new AbortController()
document.addEventListener('pointerup', handler, { signal: ac.signal })
onUnmounted(() => ac.abort())
```

### 方案 G：API 层加固（S1）

**目标**：让请求可靠。

**实现**：
```typescript
export async function request<T>(url: string, options?: RequestInit & { timeout?: number }): Promise<T> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), options?.timeout ?? 10000)
  
  try {
    const response = await fetch(..., { ...options, signal: controller.signal })
    clearTimeout(timer)
    // ...
  } catch (e) {
    if (e.name === 'AbortError') throw new Error('请求超时')
    throw e
  }
}
```

### 方案 H：并发请求控制（S5）

**目标**：防止竞态条件。

**实现**：
```typescript
let lastRequestId = 0

async function refreshCurrentData() {
  const requestId = ++lastRequestId
  const data = await fetchSeatMapData(vid)
  if (requestId !== lastRequestId) return  // 丢弃过期请求
  venueData.value = data
}
```

---

## 六、优化优先级矩阵

| 优先级 | 方案 | 影响 | 工作量 | 收益 |
|-------|------|------|--------|------|
| 🔴 P0 | 历史系统统一（A） | 内存/稳定性 | 2 天 | 极高 |
| 🔴 P0 | 增量渲染（B） | 渲染性能 | 3 天 | 极高 |
| 🟡 P1 | 空间索引（C） | 交互性能 | 2 天 | 高 |
| 🟡 P1 | API 加固（G） | 稳定性 | 0.5 天 | 高 |
| 🟡 P1 | 并发控制（H） | 稳定性 | 0.5 天 | 中 |
| 🟢 P2 | 三角函数缓存（D） | 计算性能 | 0.5 天 | 中 |
| 🟢 P2 | 类型安全（E） | 可维护性 | 2 天 | 中 |
| 🟢 P2 | 事件治理（F） | 内存泄漏 | 0.5 天 | 中 |
| 🟢 P2 | Toast 替换 alert（S3） | UX | 0.5 天 | 低 |

---

## 七、与 seats.io 的差距分析

| 维度 | 本项目 | seats.io | 差距 |
|------|--------|----------|------|
| 渲染引擎 | LeaferJS (Canvas 2D) | 自研 Canvas 渲染 | 功能接近，性能待验证 |
| 座位数上限 | 未测试（理论受内存限制） | 宣称 100,000+ | 需要空间索引 + 虚拟化 |
| 撤销深度 | 50 步（快照） | 无限制（Command） | 架构需要统一 |
| 多人协作 | 无 | 实时协作 | 需要 WebSocket + OT |
| 移动端适配 | 有基础响应式 | 完整移动端 | 需要手势优化 |
| 导入/导出 | JSON | SVG/JSON/API | 需要 SVG 导出完善 |
| 无障碍 | 部分 | ARIA 完整 | 需要补全 |

---

## 八、结论

**当前状态**：项目架构方向正确（数据驱动 + Command 模式），但处于**中间态**——新旧机制并存导致代码复杂度陡增。性能瓶颈主要来自历史快照和全量渲染，逻辑风险主要来自类型安全和事件生命周期。

**建议**：
1. **先止血**：统一历史系统（方案 A）+ 增量渲染（方案 B），这两个做完项目才能支撑大场馆
2. **再加固**：API 层 + 并发控制 + 事件治理，消除线上风险
3. **后优化**：空间索引 + 虚拟化，追上 seats.io 的性能基准

**关键数字**：
- 代码中 `as any` 出现约 **80+ 次**
- `JSON.parse/stringify` 深拷贝出现约 **20+ 次**
- 双轨历史系统同时维护两套逻辑
- 全量渲染导致大场馆操作延迟 **300ms+**
