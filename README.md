# 座位图编辑器 (Seat Chart Designer)

基于 Vue3 + TypeScript + SVG 的座位图编辑器，参考 Seats.io Designer 实现。

## 功能特性

- ✅ **可视化编辑** - 拖拽创建座位、排、区域
- ✅ **SVG 渲染** - 矢量图形，无限缩放不失真
- ✅ **类别管理** - 自定义座位类别和颜色
- ✅ **多选操作** - Shift/Ctrl 多选、框选
- ✅ **网格对齐** - 自动吸附到网格
- ✅ **属性面板** - 实时编辑选中项属性
- ✅ **图层管理** - 类似设计软件的图层结构

## 项目结构

```
seatsio-vue-designer/
├── src/
│   ├── components/          # 组件
│   │   ├── SeatChartEditor.vue    # 主编辑器
│   │   ├── ChartCanvas.vue        # SVG 画布
│   │   ├── SeatItem.vue           # 座位
│   │   ├── SeatRow.vue            # 排
│   │   ├── SeatSection.vue        # 区域
│   │   ├── Toolbar.vue            # 工具栏
│   │   └── PropertyPanel.vue      # 属性面板
│   ├── stores/
│   │   └── chartStore.ts    # Pinia 状态管理
│   ├── types/
│   │   └── index.ts         # TypeScript 类型定义
│   ├── utils/
│   │   ├── geometry.ts      # 几何计算工具
│   │   └── id.ts            # ID 生成工具
│   ├── App.vue              # 入口组件
│   ├── main.ts              # 入口文件
│   └── index.ts             # 库导出
├── index.html
├── package.json
├── tsconfig.json
├── tsconfig.node.json
└── vite.config.ts
```

## 快速开始

```bash
# 进入项目目录
cd seatsio-vue-designer

# 安装依赖
npm install

# 启动开发服务器
npm run dev
```

## 使用示例

```vue
<template>
  <SeatChartEditor />
</template>

<script setup lang="ts">
import { SeatChartEditor } from './components'
</script>
```

## 核心概念

### 数据结构

- **Chart** (图表) - 根容器，包含多个区域
- **Section** (区域) - 座位区域，可包含多排
- **Row** (排) - 一排座位，包含多个座位
- **Seat** (座位) - 最小单位，有位置、类别等属性
- **Category** (类别) - 座位分类，如 VIP、普通、无障碍等

### 编辑器状态

- **Tool** (工具) - 当前选中的编辑工具
- **Selection** (选区) - 当前选中的座位/排/区域
- **View** (视图) - 缩放、平移状态

## 待实现功能

- [ ] 撤销/重做
- [ ] 复制/粘贴
- [ ] 导入/导出 JSON
- [ ] 舞台编辑器
- [ ] 文字标注
- [ ] 图片背景
- [ ] 弧形排精确编辑
- [ ] 座位编号自动生成
- [ ] 快捷键支持

## 技术栈

- Vue 3 (Composition API)
- TypeScript
- Pinia (状态管理)
- SVG (图形渲染)
- Vite (构建工具)

## License

MIT
