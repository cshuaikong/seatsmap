<template>
  <ChartDesigner />
</template>

<script setup lang="ts">
import ChartDesigner from './components/ChartDesigner.vue'
</script>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

:root {
  /* 主色调 - 温暖的浅色主题 */
  --color-bg: #faf9f7;
  --color-bg-secondary: #ffffff;
  --color-bg-tertiary: #f5f3f0;
  
  /* 强调色 - 温暖的橙红 */
  --color-accent: #e85d4c;
  --color-accent-hover: #f06b5a;
  --color-accent-soft: rgba(232, 93, 76, 0.12);
  
  /* 文字颜色 */
  --color-text: #2d2a26;
  --color-text-secondary: #5c5854;
  --color-text-muted: #8a8580;
  
  /* 边框 */
  --color-border: rgba(45, 42, 38, 0.08);
  --color-border-hover: rgba(45, 42, 38, 0.15);
  
  /* 功能色 */
  --color-success: #22a559;
  --color-warning: #f59e0b;
  --color-error: #ef4444;
  
  /* 画布 */
  --canvas-bg: #ffffff;
  --canvas-dot: #d4d0c8;
  
  /* 字体 */
  --font-sans: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  --font-mono: 'JetBrains Mono', 'Fira Code', monospace;
}

body {
  font-family: var(--font-sans);
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  overflow: hidden;
  background: var(--color-bg);
  color: var(--color-text);
}

/* 滚动条样式 */
::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}

::-webkit-scrollbar-track {
  background: transparent;
}

::-webkit-scrollbar-thumb {
  background: var(--color-border-hover);
  border-radius: 3px;
}

::-webkit-scrollbar-thumb:hover {
  background: var(--color-text-muted);
}

/* 选中文字样式 */
::selection {
  background: var(--color-accent-soft);
  color: var(--color-accent);
}
</style>
