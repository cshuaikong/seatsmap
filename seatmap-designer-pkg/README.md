# SeatMapDesigner 座位图设计器

Vue3 座位图设计器组件。**leafer 渲染引擎已内置**，宿主项目只需有 Vue3（^3.5），无需安装任何其他依赖。

## 包内容

| 文件 | 说明 |
|---|---|
| `seatmap-designer.es.js` | ES 模块版（推荐；Vue 走 peerDependencies，宿主自备） |
| `seatmap-designer.umd.js` | UMD 版（Vue 也内置，非构建环境 `<script>` 直引） |
| `seatmap-designer.css` | 组件样式（ES 版需手动引入；UMD 版已内联） |
| `api-contract.md` | 后端接口契约：4 个端点 + venue/seatlist 数据格式 + 保存 payload 结构 |
| `README.md` | 本文件 |

## 安装

把本包拷入项目后直接相对路径引入，或 `npm install ./seatmap-designer-pkg`（本地包）。

## 集成步骤

### 第 1 步：后端提供 4 个端点（契约见 api-contract.md）

```
GET  /venue/list           -> { code, msg, data: [{id, name, ...}] }        场馆列表
GET  /venue?venue_id=      -> { code, msg, data: { venue } }                场馆主体（分区+排轮廓）
GET  /venue/seats?venue_id=-> { code, msg, data: { seatlist } }             座位列表
POST /venue/save           <- { save_type, venue, seatlist | seat_upsert+seat_delete }
                              save_type="full" 全量（首次/无快照）；save_type="delta" 增量
                              请求体默认 gzip 压缩（Content-Encoding: gzip），不支持时自动回退普通 JSON
POST /upload               <- multipart 图片上传（可选；不配则底图存 dataURL）
```

`code === 0` 为成功。保存接口是**新增+保存一体**：本地新建场馆首次保存时由组件分配 id（`save_type:"full"`）直接建档。

### 第 2 步：封装一个 API 客户端（你的 api 层）

```js
// api/seatmap.js（示例）：组件本身不携带任何请求代码，数据进出全经宿主
export async function loadVenueDetail(id) { /* GET /venue?venue_id= → return data.venue */ }
export async function loadSeats(id)       { /* GET /venue/seats?venue_id= → return data.seatlist */ }
export async function saveVenue(payload)  { /* POST /venue/save；code!==0 抛错，成功 return true */ }
export async function uploadImage(file)   { /* POST /upload → return 图片 URL */ }
```

**saveHandler 契约：必须显式 `return true` 才算保存成功**（返回其他真值/undefined 一律判失败）：

```js
export async function saveVenue(payload) {
  const res = await http.post('/venue/save', payload)
  if (res.data?.code !== 0) throw new Error(res.data?.msg || '保存失败')
  return true // ← 关键
}
```

### 第 3 步：封装编辑器区域组件（只对接组件：构造 + 事件/命令转发）

```vue
<!-- components/EditorArea.vue -->
<script setup>
// 只负责对接设计器组件：构造、事件转发、命令转发。不取数、不感知 URL。
// 唯一命令 initVenue(venue, seatlist?)：
//   venue 带 sections              → 载入已有场馆（组件全量复位：撤销/选中/视图/dirty 都清）
//   venue 为 null/省略             → 空白新建
//   venue 为 { id, name, ... }（无 sections）→ 带参新建（预建档/预分配属性，随保存透传）
import { ref, onMounted, onBeforeUnmount } from 'vue'
import SeatMapDesigner from 'seatmap-designer'
import 'seatmap-designer/style.css'
import { saveVenue, uploadImage } from '../api/seatmap.js'

const emit = defineEmits(['dirty', 'save', 'error'])

const editorRef = ref(null)
let designer = null

function initVenue(venue, seatlist) {
  if (!designer) return
  if (venue?.sections) designer.setData(venue, seatlist)
  else designer.newVenue(venue || undefined)
}

onMounted(() => {
  designer = new SeatMapDesigner(editorRef.value, {
    saveHandler: saveVenue,       // 保存唯一通道
    uploadHandler: uploadImage,   // 可选：底图/水印上传；不配则存 dataURL
  })
  designer.on('dirty', (v) => emit('dirty', v)) // 脏状态直报转发给页面
  designer.on('save', (p) => emit('save', p))
  designer.on('error', (e) => emit('error', e))
})

onBeforeUnmount(() => {
  designer?.destroy()
  designer = null
})

defineExpose({ initVenue })
</script>

<template>
  <main class="editor">
    <div ref="editorRef" class="designer-container" />
  </main>
</template>

<style scoped>
.editor { flex: 1; display: flex; overflow: hidden; min-width: 0; }
.designer-container { width: 100%; height: 100%; }
</style>
```

> 为什么切换场馆不销毁重建画布？组件 store 是模块级单例，重建实例并不等于状态清零，
> 还是要靠 `setData/newVenue` 复位——而它们本来就做全量复位；重建只会多花画布销毁/初始化的
> 几百毫秒。原地复位 = 同样的干净效果，零重建成本。

### 第 4 步：页面接入（URL 驱动 + 取数 + 切换拦截 + 失败兜底）

```vue
<script setup>
// 页面拥有全部状态（URL query 的 venue_id 是唯一状态源）、时机与取数；
// EditorArea 只对接组件，每个动作「先改地址栏、再取数喂组件」。
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import EditorArea from './components/EditorArea.vue'
import { loadVenueDetail, loadSeats } from './api/seatmap.js'

const route = useRoute()
const router = useRouter()
const activeVenueId = computed(() => route.query.venue_id || null)
const areaRef = ref(null)
const hasDirty = ref(false)

/** 加载已有场馆：两请求并行到齐后一次喂入；失败主动清场 + 清地址栏参数。
 *  注：加载中的 UI 遮罩、快速连点的竞态控制由使用方按需自实现，本示例不代管 */
async function openVenue(id) {
  try {
    const [venue, seatlist] = await Promise.all([loadVenueDetail(id), loadSeats(id)])
    areaRef.value?.initVenue(venue, seatlist)
  } catch (e) {
    alert(`场馆加载失败：${id}`)
    areaRef.value?.initVenue(null) // 主动清场，不残留旧场馆
    router.push({ query: {} })
  }
}

function confirmDiscard() {
  return !hasDirty.value || confirm('当前场馆有未保存的改动，切换后将丢失。确定继续吗？')
}

function handleSelectVenue(id) {
  if (!confirmDiscard() || id === activeVenueId.value) return
  router.push({ query: { venue_id: id } })
  openVenue(id)
}

/** 新增：init 可带 { id, name, ...extra }（预建档场景）；不带参就是空白场馆 */
function handleAddVenue(init) {
  if (!confirmDiscard()) return
  router.push({ query: {} })
  areaRef.value?.initVenue(init)
}

/** 保存成功：新建首存建档后把 id 写回地址栏（刷新可继续编辑），并刷新场馆列表 */
function onSave(p) {
  const id = p?.venue?.id
  if (id && id !== activeVenueId.value) router.push({ query: { venue_id: id } })
}

// 带参启动/刷新还原（子组件先挂载，designer 已就绪）
onMounted(() => {
  const id = activeVenueId.value
  if (id) openVenue(id)
  else areaRef.value?.initVenue()
})
</script>

<template>
  <EditorArea
    ref="areaRef"
    @dirty="(v) => (hasDirty = v)"
    @save="onSave"
    @error="(e) => console.error(e)"
  />
</template>
```

要点：

- **URL query（venue_id）是唯一状态源**：点选=改 query + 取数喂 `initVenue`；新增=清 query + `initVenue()`——组件不感知 URL，时机全在页面
- **取数在页面层**：组件不携带任何请求代码，你的 API 层（鉴权/网关/错误处理）就在调用点旁边
- **加载失败有兜底**：主动清场（不残留旧场馆）+ 提示 + 清参；加载中遮罩、快速连点竞态按需自实现，示例不代管
- **切换拦截**只需订 `dirty` 事件存个布尔值，不用调 `getState()`
- **新建首存自动建档**（组件分配 id）：`save` 事件把 id 写回地址栏，刷新可继续编辑；同时建议刷新场馆列表
- 需支持浏览器前进后退时，在 `watch(() => route.query.venue_id)` 里调同样的 `openVenue`/`createBlank` 即可（本示例的 pushState 场景下 popstate 不触发程序化导航，不会重复加载）

## API

**构造**：`new SeatMapDesigner(el, options)`

- `el` 挂载容器（需有宽高，设计器充满容器）
- `options.saveHandler` — 宿主导函数 `fn(payload) => Promise<true>`（保存唯一通道，与 `setSaveHandler` 方法等价，推荐构造时一次配齐）
- `options.uploadHandler` — 图片上传器 `fn(File) => Promise<URL>`（不配则底图/水印存 dataURL）

实例化自定义参数（都可省略，缺省行为与历史版本一致；运行时可经 `setOptions(partial)` 深合并修改，`ui`/`zoom` 等立即生效，`defaultCategories` 只影响之后的 `newVenue`）：

| 参数 | 类型 | 默认值 | 说明 |
|---|---|---|---|
| `options.defaultCategories` | `[{ name, color }]` / null | null | `newVenue` 默认类别；null = 内置 普通区/VIP区 两类 |
| `options.seatDefaults` | `{ size, seatPitch, rowPitch }` | `{ size: 12, seatPitch: 16, rowPitch: 24 }` | 座位尺寸/座距/排距默认值（新建座位/分区的烘焙基准） |
| `options.limits` | `{ rowSeats, dropTotal, sectionSeats, venueSeats }` | `{ rowSeats: 500, dropTotal: 5000, sectionSeats: 5000, venueSeats: 80000 }` | 数量上限：单排 / 单次绘制 / 单分区 / 全场馆 |
| `options.zoom` | `{ step, min, max, wheelZoom, stickSpeed }` | `{ step: 0.1, min: 0.02, max: 16, wheelZoom: true, stickSpeed: 1 }` | 缩放步长/范围；`wheelZoom: false` 时滚轮不缩放（只平移）；`stickSpeed` 为 ZoomPad 摇杆速率倍率（1 = 默认手感） |
| `options.ui` | `{ topBar, toolBar, sidePanel, statusBar, zoomPad }` | 全 `true` | 顶栏/工具栏/侧栏/状态栏/ZoomPad（左下角缩放控制盘）五区显隐 |
| `options.tools` | `string[]` / null | null | 工具白名单（工具 key 数组）；null = 全部（仍受内置 `hidden` 标记过滤） |

**事件**（`designer.on(evt, fn)` 订阅，返回退订函数）：

| 事件 | 参数 | 说明 |
|---|---|---|
| `ready` | — | 组件挂载完成（画布已初始化） |
| `change` | — | 数据变更（载入时也会触发，**判脏请用 dirty 事件**） |
| `save` | payload | 保存成功通知（仅通知，上传在 saveHandler 里做） |
| `error` | err | 画布初始化失败等致命错误（组件同时会显示错误提示，防白屏） |
| `venue` | id / null | 场馆身份确定或变化——载入/新建/导入/首次保存建档；宿主路由同步只需订这一个事件 |
| `dirty` | boolean | 脏状态直报：编辑 `true`、保存或载入 `false`——切换前拦截存个布尔值即可 |

**方法**：

| 方法 | 说明 |
|---|---|
| `setData(venue, seatlist?)` | 喂入场馆数据（后端原始格式；seatlist 可省略，只上轮廓） |
| `mergeSeats(seatlist)` | 分段喂座位：`setData(venue)` 轮廓先上屏后，座位到达再并入（不动视图） |
| `newVenue(init?)` | 新建空白场馆（带默认类别），宿主「新增场馆」入口。`init`：字符串=名字；或对象 `{ id, name, ...extra }`——`id` 宿主预分配（保存按此 id 建档，不自动生成）、`extra` 业务属性随保存透传回写 |
| `save()` | 触发保存流程（走 saveHandler） |
| `setSaveHandler(fn)` | 注入宿主导函数（与构造 option 等价） |
| `setOptions(partial)` | 运行时深合并自定义参数（5 组见上表）：`ui`/`zoom` 等立即生效；`defaultCategories` 只影响之后的 `newVenue` |
| `setImageUploader(fn)` | 注入图片上传器（与构造 option 等价） |
| `setLoadPhase(p)` | 驱动内置加载 UI：`'venue'` 全画布遮罩 / `'seats'` 轻提示 / `''` 结束 |
| `getSavePayload()` | 取当前保存 payload |
| `exportJSON()` / `importJSON(json)` | 导出 / 导入设计器内部 JSON（文件级迁移备份） |
| `fit()` | 画布适配视野 |
| `getState()` | 当前状态快照 `{ venueId, name, sections, seats, saving, dirty }` |
| `destroy()` | 卸载（页面离开 / 弹窗关闭时必调，防内存泄漏） |

数据格式与保存 payload 结构详见 `api-contract.md`。

## UMD 用法（非构建环境）

```html
<div id="map" style="width:100%;height:600px"></div>
<script src="seatmap-designer.umd.js"></script>
<script>
  const designer = new SeatMapDesigner(document.getElementById('map'), {
    saveHandler: async (payload) => { /* ... */ return true },
  })
</script>
```

## 注意事项

1. **单实例**：同一页面只创建一个实例（内部 store 为单例）；弹窗场景关闭时调 `destroy()`。
2. **样式已隔离**：组件 CSS 全部带 `.seatmap-designer` 前缀，不污染宿主页面。
3. **组件不携带任何请求代码**：数据经 `setData`/`mergeSeats` 喂入、保存经 `saveHandler` 回收——鉴权、网关、错误处理都在宿主 API 层自闭环。
4. **缩放交互**：画布内 `Ctrl + 滚轮` 缩放（10% 步进），普通滚轮为上下滚动，避免误触。
