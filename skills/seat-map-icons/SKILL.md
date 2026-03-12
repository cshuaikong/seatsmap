# 座位图编辑器图标库 (Seat Map Editor Icons)

本文档记录座位图编辑器项目中使用的所有 Iconify 图标，方便统一管理和查找。

## 图标集合

### 基础工具图标

| 图标名称 | Iconify 标识 | 用途 | 预览 |
|---------|-------------|------|------|
| 选择工具 | `lucide:mouse-pointer-2` | 选择/拖拽模式 | ⌖ |
| 手型工具 | `lucide:hand` | 平移画布 | ✋ |
| 撤销 | `lucide:undo-2` | 撤销操作 | ↶ |
| 重做 | `lucide:redo-2` | 重做操作 | ↷ |
| 复制 | `lucide:copy` | 复制选中项 | 📄 |
| 粘贴 | `lucide:clipboard-paste` | 粘贴 | 📋 |
| 删除 | `lucide:trash-2` | 删除选中项 | 🗑️ |

### 座位绘制工具图标

| 图标名称 | Iconify 标识 | 用途 | 说明 |
|---------|-------------|------|------|
| 单行座位 | `tabler:dots` | 绘制直线座位排 | 三个水平圆点，表示一排座位 |
| 弧形座位 | `mdi:seat-flat-angled` | 绘制弧形/角度座位区 | 带角度的座位图标 |
| 多行座位 | `tabler:grip-vertical` | 绘制多排座位区 | 6个圆点排列，表示多行 |
| 圆形区域 | `lucide:circle` | 绘制圆形座位区 | 圆形 |
| 桌子 | `lucide:armchair` | 绘制桌子 | 椅子图标 |

### 标注工具图标

| 图标名称 | Iconify 标识 | 用途 | 预览 |
|---------|-------------|------|------|
| 文字标注 | `lucide:type` | 添加文字 | T |
| 舞台 | `lucide:monitor` | 添加舞台 | 🖥️ |
| 目标焦点 | `lucide:target` | 设置焦点 | 🎯 |

### 状态指示图标

| 图标名称 | Iconify 标识 | 用途 | 预览 |
|---------|-------------|------|------|
| 座位 | `lucide:armchair` | 座位总数 | 🪑 |
| 椅子 | `lucide:chair` | 可用座位 | 🪑 |
| 眼睛 | `lucide:eye` | 预览模式 | 👁️ |
| 保存 | `lucide:check` | 保存 | ✓ |
| 帮助 | `lucide:circle-help` | 帮助 | ? |
| 搜索 | `lucide:search` | 搜索座位 | 🔍 |
| 设置 | `lucide:settings-2` | 管理类别 | ⚙️ |

### 验证状态图标

| 图标名称 | Iconify 标识 | 用途 | 预览 |
|---------|-------------|------|------|
| 成功 | `lucide:check` | 验证通过 | ✓ |
| 警告 | `lucide:alert-triangle` | 验证警告 | ⚠️ |
| 错误 | `lucide:x` | 验证失败 | ✕ |

### 无障碍图标

| 图标名称 | Iconify 标识 | 用途 | 预览 |
|---------|-------------|------|------|
| 无障碍 | `lucide:accessibility` | 无障碍座位 | ♿ |

## 推荐的图标组合

### 工具栏布局
```
┌─────────────────────────────────────┐
│ [选择] [单行] [弧形] [多行] [圆桌] [舞台] │
└─────────────────────────────────────┘
```

### 图标使用示例

```vue
<template>
  <!-- 基础工具 -->
  <Icon icon="lucide:mouse-pointer-2" />
  
  <!-- 座位绘制工具 -->
  <Icon icon="tabler:dots" />              <!-- 单行座位 -->
  <Icon icon="mdi:seat-flat-angled" />     <!-- 弧形座位 -->
  <Icon icon="tabler:grip-vertical" />     <!-- 多行座位 -->
  <Icon icon="lucide:circle" />            <!-- 圆形区域 -->
  <Icon icon="lucide:armchair" />          <!-- 桌子 -->
  
  <!-- 标注工具 -->
  <Icon icon="lucide:type" />              <!-- 文字 -->
  <Icon icon="lucide:monitor" />           <!-- 舞台 -->
</template>

<script setup>
import { Icon } from '@iconify/vue'
</script>
```

## 图标来源

- **Lucide**: https://lucide.dev/icons/ (ISC License)
- **Tabler**: https://tabler-icons.io/ (MIT License)
- **Material Design Icons**: https://pictogrammers.com/library/mdi/ (Apache 2.0 License)

## 备用图标方案

如果某些图标不合适，可以考虑以下替代：

| 原图标 | 备选方案 |
|-------|---------|
| `tabler:dots` | `ph:dots-three` / `mdi:dots-horizontal` |
| `mdi:seat-flat-angled` | `mdi:seat-outline` / `lucide:armchair` |
| `tabler:grip-vertical` | `tabler:rows` / `mdi:seat-individual-suite` |
