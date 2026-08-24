# seatmap-designer — 座位图编辑器组件

> 座位图整体解决方案的「设计端」组件：画场馆 / 分区 / 排 / 座位，产出数据交给后端存取、选座端消费。以**打包好的组件**交付（不含源码）。

## 本目录内容

| 文件 | 作用 |
|---|---|
| `seatmap-designer.umd.js` | UMD 单文件（Vue / Leafer / CSS 全内置，运行时注入样式）—— 静态页 / jQuery / Vue2 |
| `seatmap-designer.es.js` + `seatmap-designer.css` | ES **单文件**：默认导出为命令式类，命名导出 `SeatMapDesignerVue` 为 Vue 组件；Leafer 内置，仅 Vue 为外部依赖 |
| `package.json` | npm 包元信息（安装 / 引用入口） |
| `README.md` | 本地快速接入说明与在线文档入口 |

## 快速开始

**UMD（无框架 / jQuery / Vue2）**

```html
<div id="map" style="height:100vh"></div>
<script src="/libs/seatmap-designer.umd.js"></script>
<script>
  const designer = new SeatMapDesigner(document.getElementById('map'), {
    saveHandler: async (payload) => {
      const res = await fetch('/venue/save', { method: 'POST', body: JSON.stringify(payload) })
      if (!res.ok) throw new Error('保存失败')
      return true // 也可返回后端确认的 { version }
    },
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
import { SeatMapDesignerVue as SeatMapDesigner } from 'seatmap-designer'
import 'seatmap-designer/style.css'
</script>
<template><SeatMapDesigner :save-handler="onSave" /></template>
```

> ES 入口已扁平化为单个 `seatmap-designer.es.js`，没有额外 JS chunk；解压后按目录安装即可。

## 关键约定

- 组件**不发网络请求**：宿主用 `setData` 喂数据、`saveHandler` 回收保存、`uploadHandler` 上传图片。
- `saveHandler` 成功时返回 `true` 或 `{ version }`；失败时抛异常，组件会保留脏标记供下次重发。
- 同一页面只挂**一个**实例；样式已加 `.seatmap-designer` 前缀隔离。
- 性能排查：构造参数加 `debug: true`，即可在控制台查看归一化、首屏、进分区等指标；默认关闭。

## 完整文档

完整 API（构造参数 / 实例方法 / 事件 / 保存协议）、后端数据格式与对接示例，见**在线文档中心**：

- 文档中心：<https://seatmap.page/doc/>
- JS 对接（UMD）：<https://seatmap.page/doc/designer/integration-js>
- Vue 对接（ES）：<https://seatmap.page/doc/designer/integration-vue>
- 后端接口：<https://seatmap.page/doc/backend-api>
