# 座位图编辑器架构文档

## 项目概述

**项目名称**: seatsio-vue-designer  
**项目类型**: Vue3 + TypeScript + LeaferJS 座位图编辑器  
**参考实现**: Seats.io Designer  
**开发环境**: Windows (win32)

### 核心功能
- 可视化编辑座位、排、区域
- LeaferJS Canvas 高性能渲染
- 类别管理与自定义颜色
- 多选操作（Shift/Ctrl 多选、框选）
- 网格对齐与自动吸附
- 实时属性编辑面板
- 分区编辑与路径顶点编辑

---

## 技术栈

### 前端框架
- **Vue 3.4.0** - 使用 Composition API
- **TypeScript 5.3.0** - 严格类型检查
- **Vite 5.0.0** - 构建工具与开发服务器

### 状态管理
- **Pinia 2.1.0** - 全局状态管理

### 图形渲染
- **LeaferJS 2.1.0** - Canvas 2D 图形库与编辑器插件
  - `leafer-ui` 核心渲染
  - `@leafer-in/editor` 选择与变换
  - `@leafer-in/viewport` / `@leafer-in/view` 视口控制

### UI 组件
- **@iconify/vue 5.0.0** - 图标库

### 开发工具
- **@vitejs/plugin-vue 5.0.0** - Vue 单文件组件支持
- **vue-tsc 2.0.0** - TypeScript 类型检查

---

## 项目结构

```
seatsmap/
├── src/
│   ├── components/              # Vue 组件
│   │   ├── IndexPage.vue       # 场馆列表 + 设计器主入口
│   │   ├── SeatMapDesigner.vue # 主设计器布局
│   │   ├── PathEditor.vue      # LeaferJS 画布编辑器
│   │   ├── LeftToolbar.vue     # 左侧工具栏
│   │   ├── RightPanel.vue      # 右侧属性面板
│   │   └── panels/             # 右侧面板集合
│   ├── stores/                  # Pinia 状态管理
│   │   └── venueStore.ts       # 场馆数据与编辑状态
│   ├── types/                   # TypeScript 类型定义
│   │   └── index.ts            # 核心数据类型
│   ├── utils/                   # 工具函数
│   │   ├── geometry.ts         # 几何计算工具
│   │   ├── pathUtils.ts        # 路径工具
│   │   ├── color.ts            # 颜色工具
│   │   ├── id.ts               # ID 生成工具
│   │   └── zoomCompensation.ts # 缩放补偿
│   ├── composables/             # Vue 组合式函数
│   │   ├── usePathEditorSync.ts# 画布与 Store 双向同步
│   │   ├── usePolygonDraw.ts   # 多边形绘制
│   │   ├── useSeatModule.ts    # 座位绘制模块
│   │   ├── useVertexEdit.ts    # 顶点编辑
│   │   └── ...                 # 其他编辑器能力
│   ├── viewer/                  # 渲染辅助
│   │   └── geometry.ts         # 几何计算（PathEditor 复用）
│   ├── api/                     # 后端接口
│   │   ├── request.ts
│   │   └── seatMap.ts
│   ├── App.vue                  # 根组件
│   ├── main.ts                  # 应用入口
│   └── index.ts                 # 库导出
├── index.html                   # HTML 入口
├── package.json                 # 项目配置
├── tsconfig.json                # TypeScript 配置
├── tsconfig.node.json           # Node TypeScript 配置
├── vite.config.ts               # Vite 配置
└── wrangler.toml                # Cloudflare Wrangler 配置
```

---

## 核心数据模型

详见 `src/types/index.ts`。主要类型：

- `VenueData` - 场馆根数据
- `Section` - 分区（含路径、矩形、椭圆等形状）
- `SeatRow` - 座位排
- `Seat` - 单个座位
- `ShapeObject` / `TextObject` / `AreaObject` / `CanvasImage` - 画布元素

---

## 路由

当前只保留主入口：

| 路径 | 组件 | 说明 |
|------|------|------|
| `/` | `IndexPage.vue` | 场馆列表 + SeatMapDesigner |

---

## 构建

```bash
npm install
npm run dev          # 开发服务器
npm run build        # 生产构建
npm run build:check  # 类型检查 + 构建
```

> 注意：Vite 5 需要 Node.js 18+。
