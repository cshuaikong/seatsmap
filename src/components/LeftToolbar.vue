<template>
  <div class="left-toolbar">
    <template v-for="(group, index) in groupedTools" :key="group.category">
      <div v-if="index > 0" class="toolbar-divider"></div>
      <div class="toolbar-section">
        <button
          v-for="tool in group.tools"
          :key="tool.id"
          class="tool-item"
          :class="{ active: modelValue === tool.id }"
          :title="tool.title"
          @click="onToolChange(tool.id)"
        >
          <i v-if="tool.iconSet === 'iconfont'" :class="['iconfont', tool.iconValue, 'tool-iconfont']"></i>
          <Icon v-else :icon="tool.iconValue" class="tool-icon" />
        </button>
      </div>
    </template>

    <div class="toolbar-divider"></div>

    <!-- 编辑操作 -->
    <div class="toolbar-section">
      <button class="tool-item" title="撤销 (Ctrl+Z)" @click="$emit('undo')">
        <Icon icon="lucide:undo-2" class="tool-icon" />
      </button>
      <button class="tool-item" title="重做 (Ctrl+Y)" @click="$emit('redo')">
        <Icon icon="lucide:redo-2" class="tool-icon" />
      </button>
    </div>

    <div class="toolbar-divider"></div>

    <div class="toolbar-section">
      <button class="tool-item" title="复制 (Ctrl+C)" @click="$emit('copy')">
        <Icon icon="lucide:copy" class="tool-icon" />
      </button>
      <button class="tool-item" title="粘贴 (Ctrl+V)" @click="$emit('paste')">
        <Icon icon="lucide:clipboard-paste" class="tool-icon" />
      </button>
      <button class="tool-item danger" title="删除 (Delete)" @click="$emit('delete')">
        <Icon icon="lucide:trash-2" class="tool-icon" />
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Icon } from '@iconify/vue'
import { getVisibleTools, groupToolsByCategory, type ToolId, type ToolCategory } from '../domain/toolRegistry'

const props = defineProps<{
  modelValue: ToolId
  venueType?: string
  sectionFocused?: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [tool: ToolId]
  'undo': []
  'redo': []
  'copy': []
  'paste': []
  'delete': []
}>()

const visibleTools = computed(() =>
  getVisibleTools({
    venueType: props.venueType || 'SIMPLE',
    sectionFocused: !!props.sectionFocused,
  })
)

const groupedTools = computed(() => {
  const groups = groupToolsByCategory(visibleTools.value)
  const result: { category: ToolCategory; tools: typeof visibleTools.value }[] = []
  groups.forEach((tools, category) => {
    result.push({ category, tools })
  })
  return result
})

const onToolChange = (tool: ToolId) => {
  emit('update:modelValue', tool)
}
</script>

<style scoped>
.left-toolbar {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 8px 6px;
  background: var(--color-bg-secondary);
  border: 1px solid var(--color-border);
  border-radius: 12px;
  overflow-y: auto;
  width: 56px;
  flex-shrink: 0;
  max-height: 100%;
}

.toolbar-section {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.toolbar-divider {
  width: 100%;
  height: 1px;
  background: var(--color-border);
  margin: 2px 0;
}

.tool-item {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  background: transparent;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease;
  color: var(--color-text-secondary);
  flex-shrink: 0;
}

.tool-item:hover {
  background: var(--color-bg-tertiary);
  color: var(--color-text);
}

.tool-item.active {
  background: var(--color-accent-soft);
  color: var(--color-accent);
}

.tool-item.danger:hover {
  background: rgba(239, 68, 68, 0.1);
  color: #dc2626;
}

.tool-icon {
  width: 18px;
  height: 18px;
}

.tool-iconfont {
  font-size: 18px;
}
</style>
