<template>
  <div class="top-toolbar">
    <!-- 左侧：图表名称和模式 -->
    <div class="toolbar-left">
      <div class="logo">
        <Icon icon="lucide:armchair" class="logo-icon" />
      </div>
      <span class="chart-name">{{ chartName }}</span>
      <button class="mode-badge readonly">
        <span class="status-dot"></span>
        只读模式
      </button>
    </div>

    <!-- 中间：主要工具 -->
    <div class="toolbar-center">
      <div class="tool-group">
        <button class="tool-btn" title="撤销 (Ctrl+Z)">
          <Icon icon="lucide:undo-2" class="tool-icon" />
        </button>
        <button class="tool-btn" title="重做 (Ctrl+Y)">
          <Icon icon="lucide:redo-2" class="tool-icon" />
        </button>
      </div>

      <div class="tool-divider"></div>

      <div class="tool-group">
        <button class="tool-btn active" title="选择工具 (V)">
          <Icon icon="lucide:mouse-pointer-2" class="tool-icon" />
        </button>
        <button class="tool-btn" title="平移画布 (H)">
          <Icon icon="lucide:hand" class="tool-icon" />
        </button>
      </div>

      <div class="tool-divider"></div>

      <div class="tool-group">
        <button class="tool-btn" title="添加舞台">
          <Icon icon="lucide:theater" class="tool-icon" />
        </button>
        <button class="tool-btn" title="设置焦点">
          <Icon icon="lucide:target" class="tool-icon" />
        </button>
      </div>

      <div class="tool-divider"></div>

      <div class="tool-group">
        <button class="tool-btn" title="复制 (Ctrl+C)">
          <Icon icon="lucide:copy" class="tool-icon" />
        </button>
        <button class="tool-btn" title="粘贴 (Ctrl+V)">
          <Icon icon="lucide:clipboard-paste" class="tool-icon" />
        </button>
        <button class="tool-btn danger" title="删除 (Delete)">
          <Icon icon="lucide:trash-2" class="tool-icon" />
        </button>
      </div>
    </div>

    <!-- 右侧：操作 -->
    <div class="toolbar-right">
      <button class="action-btn secondary">
        <Icon icon="lucide:eye" class="btn-icon" />
        预览
      </button>
      <button class="action-btn primary">
        <Icon icon="lucide:check" class="btn-icon" />
        保存
      </button>
      <button class="help-btn" title="帮助">
        <Icon icon="lucide:circle-help" class="help-icon" />
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Icon } from '@iconify/vue'

defineProps<{
  chartName: string
}>()
</script>

<style scoped>
.top-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 52px;
  background: var(--color-bg-secondary);
  border-bottom: 1px solid var(--color-border);
  padding: 0 16px;
  flex-shrink: 0;
}

/* 左侧 */
.toolbar-left {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 200px;
}

.logo {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  background: var(--color-accent);
  border-radius: 8px;
}

.logo-icon {
  width: 20px;
  height: 20px;
  color: white;
}

.chart-name {
  font-size: 14px;
  font-weight: 500;
  color: var(--color-text);
}

.mode-badge {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  border: none;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

.mode-badge.readonly {
  background: rgba(239, 68, 68, 0.1);
  color: #dc2626;
}

.mode-badge:hover {
  background: rgba(239, 68, 68, 0.18);
}

.status-dot {
  width: 6px;
  height: 6px;
  background: #dc2626;
  border-radius: 50%;
  animation: pulse 2s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

/* 中间 */
.toolbar-center {
  display: flex;
  align-items: center;
  gap: 8px;
}

.tool-group {
  display: flex;
  align-items: center;
  gap: 2px;
}

.tool-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border: none;
  background: transparent;
  border-radius: 6px;
  cursor: pointer;
  color: var(--color-text-secondary);
  transition: all 0.15s cubic-bezier(0.4, 0, 0.2, 1);
}

.tool-btn:hover {
  background: var(--color-bg-tertiary);
  color: var(--color-text);
}

.tool-btn.active {
  background: var(--color-accent-soft);
  color: var(--color-accent);
}

.tool-btn.danger:hover {
  background: rgba(239, 68, 68, 0.1);
  color: #dc2626;
}

.tool-icon {
  width: 18px;
  height: 18px;
}

.tool-divider {
  width: 1px;
  height: 24px;
  background: var(--color-border);
  margin: 0 4px;
}

/* 右侧 */
.toolbar-right {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 200px;
  justify-content: flex-end;
}

.action-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  border: none;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s cubic-bezier(0.4, 0, 0.2, 1);
}

.action-btn.primary {
  background: var(--color-accent);
  color: white;
}

.action-btn.primary:hover {
  background: var(--color-accent-hover);
  transform: translateY(-1px);
}

.action-btn.secondary {
  background: var(--color-bg-tertiary);
  color: var(--color-text);
  border: 1px solid var(--color-border);
}

.action-btn.secondary:hover {
  background: var(--color-bg);
  border-color: var(--color-border-hover);
}

.btn-icon {
  width: 16px;
  height: 16px;
}

.help-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: none;
  background: transparent;
  border-radius: 6px;
  cursor: pointer;
  color: var(--color-text-secondary);
  margin-left: 4px;
  transition: all 0.15s;
}

.help-btn:hover {
  background: var(--color-bg-tertiary);
  color: var(--color-text);
}

.help-icon {
  width: 20px;
  height: 20px;
}
</style>
