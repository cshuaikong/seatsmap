<template>
  <div class="left-toolbar">
    <!-- 1. 选择工具 -->
    <div class="toolbar-section">
      <button
        class="tool-item"
        :class="{ active: modelValue === 'select' }"
        title="选择工具 (V)"
        @click="onToolChange('select')"
      >
        <i class="iconfont icon-shubiaojiantoumoshi tool-iconfont"></i>
      </button>

      <button
        class="tool-item"
        :class="{ active: modelValue === 'node' }"
        title="节点编辑 (E)"
        @click="onToolChange('node')"
      >
        <i class="iconfont icon-a-4404035571 tool-iconfont"></i>
      </button>
      <button
        class="tool-item"
        :class="{ active: modelValue === 'selectseat' }"
        title="选择座位"
        @click="onToolChange('selectseat')"
      >
        <i class="iconfont icon-selectseat tool-iconfont"></i>
      </button>
    </div>

    <div class="toolbar-divider"></div>

    <!-- 2. 座位绘制工具区 -->
    <!-- SIMPLE: 始终显示 | WITH_SECTIONS: 仅分区聚焦后显示 -->
    <template v-if="showSeatTools">
      <div class="toolbar-section">
        <button
          class="tool-item"
          :class="{ active: modelValue === 'seat-row' }"
          title="单行座位"
          @click="onToolChange('seat-row')"
        >
          <i class="iconfont icon-dorwrow tool-iconfont"></i>
        </button>
        <button
          class="tool-item"
          :class="{ active: modelValue === 'seat-diagonal' }"
          title="多行座位"
          @click="onToolChange('seat-diagonal')"
        >
          <i class="iconfont icon-drowmultrows tool-iconfont"></i>
        </button>
      </div>
      <div class="toolbar-divider"></div>
    </template>

    <!-- 3. 分区绘制工具区 -->
    <!-- SIMPLE: 隐藏 | WITH_SECTIONS: 始终显示 -->
    <template v-if="showSectionTools">
      <div class="toolbar-section">
          <button
          class="tool-item"
          :class="{ active: modelValue === 'drawPolygon' }"
          title="绘制分区"
          @click="onToolChange('drawPolygon')"
        >
          <i class="iconfont icon-duobianxing tool-iconfont"></i>
        </button>
      </div>
      <div class="toolbar-divider"></div>
    </template>

    <!-- 4. 标注工具（text / image 暂未实现，先隐藏） -->
    <div v-if="false" class="toolbar-section">
      <button
        class="tool-item"
        :class="{ active: modelValue === 'text' }"
        title="文字"
        @click="onToolChange('text')"
      >
        <i class="iconfont icon-wenzi tool-iconfont"></i>
      </button>
      <button
        class="tool-item"
        :class="{ active: modelValue === 'image' }"
        title="图片"
        @click="onImageClick"
      >
        <i class="iconfont icon-tupian tool-iconfont"></i>
      </button>
    </div>

    <div v-if="false" class="toolbar-divider"></div>

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

type ToolMode = 'select' | 'node' | 'selectseat'
  | 'seat-row' | 'seat-section' | 'seat-diagonal'
  | 'drawline' | 'drawRect' | 'drawPolygon'
  | 'text' | 'image'

const props = defineProps<{
  modelValue: ToolMode
  venueType?: string
  sectionFocused?: boolean
}>()

// Emits
const emit = defineEmits<{
  'update:modelValue': [tool: ToolMode]
  'undo': []
  'redo': []
  'copy': []
  'paste': []
  'delete': []
}>()

const isSimple = computed(() => props.venueType === 'SIMPLE')

/** 座位绘制工具：SIMPLE 始终显示，WITH_SECTIONS 仅分区聚焦后显示 */
const showSeatTools = computed(() => isSimple.value || !!props.sectionFocused)

/** 分区绘制工具：仅 WITH_SECTIONS 显示 */
const showSectionTools = computed(() => !isSimple.value)

// 工具切换
const onToolChange = (tool: ToolMode) => {
  emit('update:modelValue', tool)
}

// 图片按钮点击
const onImageClick = () => {
  emit('update:modelValue', 'image')
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
