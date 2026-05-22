---
name: PolygonTest architecture
description: 独立多边形测试组件实现方案 — LeaferJS + Editor 插件 + 自定义顶点/弧度编辑
type: reference
---

## 架构

PolygonTest.vue 是一个独立测试组件，不依赖 LeaferEditor、EditorEngine 或 venueStore。

```
Leafer 实例
  ├── Editor (插件，选择/移动/旋转)
  ├── polygonGroup (可选，当前直接用 Path 元素)
  │     └── Path (pathPointsToSvgPath 渲染)
  ├── vertexGroup (顶点方块 Rect handles)
  ├── edgeGroup (弧度圆点 Ellipse handles)
  └── previewGroup (绘制预览线)
```

## 关键决策

### 1. 点击检测：用 Leafer TAP 事件，不用 DOM pointerup

之前用 DOM `pointerup` + `leafer.interaction?.getLocal()` 手动转坐标，在 viewport 平移后坐标偏移。
改用 `leafer.on_(LeaferPointer.TAP, handler)`，`e.x`/`e.y` 由引擎保证为正确 world 坐标。

### 2. viewport 平移与 Editor/顶点拖拽冲突

Viewport 平移用的是 DOM pointer 事件 (`boundPointerDown`/`boundPointerMove`) 手动设置 `leafer.x`/`leafer.y`。
Editor 拖拽和顶点拖拽也走同一组 pointer 事件，导致两个位移叠加（元素被 Editor 移动 + viewport 同时平移）。

**修复**：
- `boundPointerMove` 里加 `editor?.dragging` 守卫（Editor 拖拽时跳过平移）
- 顶点/边手柄加 `DragEvent.START`/`DragEvent.END` 设置 `vertexDragging` 标志位，`boundPointerMove` 同步守卫

### 3. 平移时不要调 __updateViewPort()

对比 LeaferEngine.ts（正常工作），它的 `boundPointerMove` 只设置 `leafer.x`/`leafer.y`，**不调** `__updateViewPort()`。
PolygonTest 之前每帧都调，会干扰 Leafer 内部坐标系统，导致后续 TAP/getLocal 坐标出错。
仅在 `resetView()` 重置到原点后调用一次。

### 4. 弧度法线方向

用**右法线** `(nx = dy/len, ny = -dx/len)`，与 SVG `sweepFlag=1` 的弧线弯曲方向一致。
之前用的左法线 `(nx = -dy/len, ny = dx/len)` 导致手柄方向和弧线方向相反。

### 5. buildEdgeHandles 必须加弧深偏移

创建边手柄时不能只放中点 `(mx, my)`，要用法线×弧深×半弦长：
```
hx = mx + nx * arcDepth * halfLen
hy = my + ny * arcDepth * halfLen
```
否则重新进入顶点编辑模式时所有手柄都在弦上而非弧线上。

### 6. Ellipse 需要 around: 'center'

LeaferJS 的 Ellipse 默认 `x, y` 是左上角，不加 `around: 'center'` 会导致圆心偏了 `(r, r)`。
顶点手柄用的是 Rect，已经手动减了 `size/2` 居中。

## 交互模式

| 模式 | subMode | 点击内部 | 点击边框 | 拖拽手柄 | 点击空白 |
|------|---------|----------|----------|----------|----------|
| 绘制 | - | 加点(靠近起点→闭合) | - | - | - |
| 完成 | select | Editor 选中/移动/旋转 | 进入vertex | - | Editor 取消选中 |
| 完成 | vertex | - | - | 移动顶点/调弧度 | 退出→select |
