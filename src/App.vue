<template>
  <div class="app">
    <nav class="nav">
      <button @click="currentView = 'designer'">主应用</button>
      <button @click="currentView = 'test'">旋转测试</button>
      <button @click="currentView = 'transformer-test'">Transformer测试</button>
    </nav>
    <KonvaDesigner v-if="currentView === 'designer'" />
    <RotationTest v-else-if="currentView === 'test'" />
    <TransformerTest v-else-if="currentView === 'transformer-test'" />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import KonvaDesigner from './components/KonvaDesigner.vue'
import RotationTest from './components/RotationTest.vue'
import TransformerTest from './components/TransformerTest.vue'

const currentView = ref('designer')
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

/* 导航 */
.nav {
  padding: 10px 20px;
  background: var(--color-bg-secondary);
  border-bottom: 1px solid var(--color-border);
}

.nav button {
  margin-right: 10px;
  padding: 8px 16px;
  border: 1px solid var(--color-border);
  background: var(--color-bg);
  cursor: pointer;
  border-radius: 4px;
}

.nav button:hover {
  background: var(--color-bg-tertiary);
}
</style>
