# seatmap-designer — 座位图编辑器组件

> 座位图整体解决方案的「设计端」组件：画场馆 / 分区 / 排 / 座位，产出数据交给后端存取、选座端消费。以**打包好的组件**交付（不含源码）。

## 本目录内容

| 文件 | 作用 |
|---|---|
| `seatmap-designer.umd.js` | UMD 单文件（vue / leafer / css 全内置 + CSS 注入）—— 静态页 / jQuery / Vue2 |
| `seatmap-designer.es.js` + `seatmap-designer.css` | ES 组件（leafer 内置，仅 vue 走外部依赖）—— Vue3 / Vite / webpack |
| `package.json` | npm 包元信息（安装 / 引用入口） |
| `*.js` chunk 文件 | ES 入口的运行时依赖，随入口懒加载；**保留整个目录，勿删、勿单独引用** |

## 快速开始

**UMD（无框架 / jQuery / Vue2）**

```html
<div id="map" style="height:100vh"></div>
<script src="/libs/seatmap-designer.umd.js"></script>
<script>
  const designer = new SeatMapDesigner(document.getElementById('map'), {
    saveHandler:   async (p) => { /* POST 保存 */ return ok },
    uploadHandler: async (f) => { /* POST 上传 */ return url },
    debug: true, // 开发排查时开启；生产删除或设为 false
  })
  designer.setData(venue, seatlist)   // 后端原始格式
</script>
```

**ES（Vue3 / Vite / webpack）**

```bash
npm install ./seatmap-designer-pkg
```

```vue
<script setup>
import SeatMapDesigner from 'seatmap-designer'
import 'seatmap-designer/style.css'
</script>
<template><SeatMapDesigner :save-handler="onSave" /></template>
```

## 关键约定

- 组件**不发网络请求**：宿主用 `setData` 喂数据、`saveHandler` 回收保存、`uploadHandler` 上传图片。
- `saveHandler` 只有 `return true` 才算保存成功，否则保留脏标记下次重发。
- 同一页面只挂**一个**实例；样式已加 `.seatmap-designer` 前缀隔离。
- 性能排查：构造参数加 `debug: true`，即可在控制台查看归一化、首屏、进分区等指标；默认关闭。

## 完整文档

完整 API（构造参数 / 实例方法 / 事件 / 保存协议）、后端数据格式与对接示例，见**在线文档中心**：

- 文档中心：<https://seatsmap.pages.dev/doc/>
- JS 对接（UMD）：<https://seatsmap.pages.dev/doc/designer/integration-js>
- Vue 对接（ES）：<https://seatsmap.pages.dev/doc/designer/integration-vue>
- 后端接口：<https://seatsmap.pages.dev/doc/backend-api>
