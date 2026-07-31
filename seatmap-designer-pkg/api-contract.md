# 座位图设计器 · 后端对接文档

> 对接方式只有一条主线：**`setData` 喂数据 + `setSaveHandler` 收保存**。
> 数据进出全显式，网络、鉴权、接口形态完全由你们掌控；设计器不直接发任何请求。

---

## 一、集成主线（推荐，唯一需要实现的）

```js
import SeatMapDesigner from 'seatmap-designer'
import 'seatmap-designer/style.css'

const designer = new SeatMapDesigner(el, {
  // ② 保存：宿主导函数，设计器保存时回调（必须显式 return true 才算成功）
  saveHandler: async (payload) => {
    const res = await myApi.saveVenue(payload)   // payload 结构见下文「保存 payload」
    return res.code === 0                         // true=成功；返回非 true 或抛异常=失败
  },
})

// ① 加载：从你们后端取数，喂给设计器（原始格式见下文「数据格式」）
const { venue, seatlist } = await myApi.loadVenue(venueId)
designer.setData(venue, seatlist)

// 大场馆可选分段喂：轮廓先上屏，座位随后并入（两请求无依赖，也可并行发出后一次 setData）
// designer.setData(venue)              // 先喂场馆主体（分区轮廓立即渲染）
// designer.mergeSeats(seatlist)        // 座位到了再并入（不动视图）
```

**成功/失败判定**：只有 `return true` 算成功。其他一切（`undefined` / `false` / HTTP 500 但没抛错）都按失败处理。

- 成功 → 脏标记清除、座位 diff 快照重建（下次保存只带增量）、抛 `save` 事件
- 失败 → 脏标记与快照保留（下次保存自动累计重发）、失败原因弹提示

> `designer.on('save', fn)` 只是保存成功后的**通知**（可用于刷新列表、提示用户），**不要在回调里上传**——它不再承担保存通道职责（旧契约已移除）。

---

## 二、数据格式（setData 喂入 / loadVenue 返回）

### venue 对象

| 字段 | 类型 | 说明 |
|---|---|---|
| `id` | string | 场馆 id（保存回写时对应） |
| `name` | string | 场馆名 |
| `type` | string | 如 `WITH_SECTION`，原样透传 |
| `baseScale` | string/number | **纯坐标换算率**：后端单位 ↔ 设计器单位的唯一作用——导入时所有坐标 × baseScale 归一到设计器单位，保存时 ÷ baseScale 回写；无则按 1。与画布缩放、座位绘制尺寸无关（座位渲染尺寸由分区自身间距推导） |
| `categories` | array | 座位类别 `[{ key, color, label, accessible }]` |
| `image` | object/null | 底图 `{ src, x, y, w, h, baseW, baseH }`（src 为完整 URL 或 dataURL）；也容忍 JSON 字符串形式 |
| `sections` | array | 分区列表，见下 |
| 其余任意字段 | — | 原样透传，保存时回写 |

### sections[] 分区

| 字段 | 类型 | 说明 |
|---|---|---|
| `id` | string/number | 分区 id |
| `name` | string | 分区名 |
| `fill` | string | 填充色，如 `#4CAF50` |
| `path` | string | SVG path 轮廓，**分区内容坐标**；世界坐标 = path + (x, y)，再 × baseScale |
| `x` / `y` | number | 分区偏移 |
| `loose` | bool | 可选，`true` = 散座分区（无名称无轮廓的座位容器） |
| `watermark` | any | 可选，赞助商水印，原样存取 |
| `rows` | array | 排列表，见下 |
| 其余任意字段 | — | 原样透传（`pathPoints` 除外，会被丢弃） |

### rows[] 排

| 字段 | 类型 | 说明 |
|---|---|---|
| `id` | string/number | 排 id（座位通过 `row_id` 关联） |
| `label` | string | 排号 |
| `x` / `y` | number | 排原点，**世界坐标**（不加分区偏移），× baseScale |
| `rotation` | number | 排方向，**角度**（-180~180） |
| `curve` | number | 排弧度（总圆心角，度），无则 0 |
| `seatSpacing` / `rowSpacing` | number | 可选，座位间距 / 排间距 |

### seatlist[] 座位

| 字段 | 类型 | 说明 |
|---|---|---|
| `id` | string/number | 座位 id |
| `row_id` | string/number | 所属排 id（**分组唯一依据**，排必须存在于 venue.sections，否则座位被当孤儿跳过） |
| `sec_id` | string/number | 所属分区 id（可空） |
| `cat_id` | number | 类别 key |
| `label` | string | 座位号 |
| `x` / `y` | number | **相对排原点、沿排方向**的局部坐标（y 通常为 0），× baseScale |
| `status` | number | `1` 可选 / `2` 已预订 / `3` 已保留 / `0` 禁用 |
| `type` | number | `1` 普通座位 |

---

## 三、保存 payload（setSaveHandler 收到的东西）

两种模式（`save_type` 显式区分；`venue` 主体两种都全量回写，结构同上文）：

```jsonc
// 全量（首次保存 / 无快照基准）
{
  "save_type": "full",
  "venue": { "id": "venue_xxx", "name": "...", "baseScale": "5.20", "sections": [...], "image": null },
  "seatlist": [ /* 全量座位，结构同上文 */ ]
}

// 增量（后续保存，只带变化部分）
{
  "save_type": "delta",
  "venue": { ... },
  "seat_upsert": [ /* 新增 + 修改的座位记录 */ ],
  "seat_delete": [ "seat_id_1", "seat_id_2" ]   // ← 座位删除在此：id 清单，后端物理/逻辑删除
}
```

注意：

- **没有独立删除接口**：座位删除走 `seat_delete`；分区/排删除随 `venue.sections` 全量覆盖（后端连带清理其座位）；场馆删除设计器无此操作
- `venue.id` 必填：新建场馆首次保存时由设计器生成 id 建档，数据库直接存；宿主也可经 `newVenue({ id, name, ...extra })` 预分配 id 并附带业务属性（extra 随 venue 主体透传回写）
- 坐标已 ÷ baseScale 回后端单位；分区偏移归 0（path 存世界坐标，几何等价）
- 座位状态回写码：`available→1 / sold→2 / reserved→3 / disabled→0`

---

## 四、参考端点形态（演示壳对接的真实后端）

设计器不约束接口形态（数据进出全经宿主 API 层），以下是演示壳 `backendApi.js` 对接的真实后端，供你们设计接口时参考：

```
GET  /venue/list            -> { code, msg, data: [{id, name, type, baseScale, ...}] }   场馆列表
GET  /venue?venue_id=       -> { code, msg, data: { venue } }                            场馆主体（不含座位）
GET  /venue/seats?venue_id= -> { code, msg, data: { seatlist } }                         座位列表
POST /venue/save            <- 保存 payload（见上文「三」）；新增+保存一体，id 由客户端建档
                               请求体默认 gzip 压缩（Content-Encoding: gzip），
                               后端不支持时自动回退普通 JSON（会话级探测一次）
POST /upload                <- multipart 图片上传（底图/水印 logo 共用；可选）
```

统一响应包 `{ code, msg, data }`，`code === 0` 为成功。加载方建议：场馆与座位两请求**并行发出**（无依赖），到齐后一次 `setData(venue, seatlist)` 上屏。

---

## 已移除（历史契约，勿再使用）

- **内置 HTTP 数据源 / `dataSource` provider / `venueId` 参数**：组件不再携带任何请求代码，也不支持注入 provider 自拉数据——加载一律走 `setData` / `mergeSeats`（`?venue=` 直连后端的能力保留在演示壳 `src/shell/backendApi.js`，与组件无关）
- **设计器内置"场馆切换"弹窗**：换场馆是宿主的事（换 venue 对象重新 `setData`）
- **`save` 事件作为保存通道（旧契约）**：不再支持在 `on('save')` 回调里上传。未配置 `saveHandler` 时保存直接报错，避免"发出去了但不知道成没成"的歧义状态
