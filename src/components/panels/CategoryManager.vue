<template>
  <Teleport to="body">
    <Transition name="modal">
      <div v-if="visible" class="modal-overlay" @click="onOverlayClick">
        <div class="modal-container" @click.stop>
          <!-- Header -->
          <div class="modal-header">
            <h3 class="modal-title">分类管理</h3>
            <button class="close-btn" @click="emit('close')">
              <Icon icon="lucide:x" class="close-icon" />
            </button>
          </div>

          <!-- Tabs -->
          <div class="modal-tabs">
            <button
              class="tab-btn"
              :class="{ active: activeTab === 'categories' }"
              @click="activeTab = 'categories'"
            >
              <!-- EN: Categories -->
              分类
            </button>
            <button
              class="tab-btn"
              :class="{ active: activeTab === 'keys' }"
              @click="activeTab = 'keys'"
            >
              <!-- EN: Keys -->
              键值
            </button>
          </div>

          <!-- Content -->
          <div class="modal-content">
            <!-- Categories Tab -->
            <div v-if="activeTab === 'categories'" class="tab-panel">
              <p class="tab-description">
                分类用于给对象分配定价，不同分类用不同颜色区分
              </p>

              <button class="add-category-btn" @click="onAddCategory">
                <Icon icon="lucide:plus" class="add-icon" />
                <!-- EN: Create new category -->
                创建新分类
              </button>

              <div class="category-list" ref="listRef">
                <div
                  v-for="(category, index) in localCategories"
                  :key="category.id"
                  class="category-item"
                  :class="{ dragging: draggedIndex === index }"
                  draggable="true"
                  @dragstart="onDragStart($event, index)"
                  @dragover="onDragOver($event, index)"
                  @drop="onDrop($event, index)"
                  @dragend="onDragEnd"
                >
                  <!-- Drag Handle -->
                  <div class="drag-handle">
                    <Icon icon="lucide:grip-vertical" class="drag-icon" />
                  </div>

                  <!-- Color Picker -->
                  <div class="color-picker-trigger" @click="openColorPicker(category.id)">
                    <div
                      class="color-block"
                      :style="{ backgroundColor: category.color }"
                    ></div>
                    <input
                      :ref="el => setColorInputRef(el, category.id)"
                      type="color"
                      :value="category.color"
                      @input="onColorChange(category.id, $event)"
                      class="hidden-color-input"
                    />
                  </div>

                  <!-- Name Input -->
                  <input
                    type="text"
                    v-model="category.name"
                    class="category-name-input"
                    @blur="onNameBlur(category.id, category.name)"
                    @keydown.enter="onNameBlur(category.id, category.name)"
                  />

                  <!-- Delete Button -->
                  <button
                    class="delete-btn"
                    @click="emit('delete', category.id)"
                    title="删除分类"
                  >
                    <Icon icon="lucide:trash-2" class="delete-icon" />
                  </button>
                </div>
              </div>
            </div>

            <!-- Keys Tab -->
            <div v-else class="tab-panel">
              <div class="coming-soon">
                <Icon icon="lucide:clock" class="coming-soon-icon" />
                <!-- EN: Coming soon -->
                <p>即将推出</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, watch, nextTick } from 'vue'
import { Icon } from '@iconify/vue'

interface Category {
  id: string
  name: string
  color: string
  accessible?: boolean
}

const props = defineProps<{
  visible: boolean
  categories: Category[]
}>()

const emit = defineEmits<{
  'close': []
  'add': [category: { name: string; color: string }]
  'update': [categoryId: string, updates: { name?: string; color?: string }]
  'delete': [categoryId: string]
  'reorder': [orderedIds: string[]]
}>()

// 预设颜色列表
const PRESET_COLORS = [
  '#4285F4', '#34A853', '#FBBC05', '#EA4335',
  '#FF6D01', '#46BDC6', '#7B61FF', '#F538A0'
]

// 本地状态
const activeTab = ref<'categories' | 'keys'>('categories')
const localCategories = ref<Category[]>([])
const draggedIndex = ref<number | null>(null)
const colorInputRefs = ref<Map<string, HTMLInputElement>>(new Map())
const listRef = ref<HTMLElement | null>(null)

// 同步外部数据到本地
watch(() => props.categories, (newCategories) => {
  localCategories.value = [...newCategories]
}, { immediate: true, deep: true })

// 同步 visible 变化，重置 tab
watch(() => props.visible, (visible) => {
  if (visible) {
    activeTab.value = 'categories'
  }
})

// 设置颜色输入框引用
function setColorInputRef(el: Element | null, id: string) {
  if (el) {
    colorInputRefs.value.set(id, el as HTMLInputElement)
  }
}

// 打开颜色选择器
function openColorPicker(categoryId: string) {
  const input = colorInputRefs.value.get(categoryId)
  if (input) {
    input.click()
  }
}

// 颜色变化
function onColorChange(categoryId: string, event: Event) {
  const target = event.target as HTMLInputElement
  emit('update', categoryId, { color: target.value })
}

// 名称失焦/回车
function onNameBlur(categoryId: string, name: string) {
  emit('update', categoryId, { name: name.trim() || '未命名' })
}

// 添加新分类
function onAddCategory() {
  const randomColor = PRESET_COLORS[Math.floor(Math.random() * PRESET_COLORS.length)]
  emit('add', { name: '新分类', color: randomColor })
}

// 点击遮罩关闭
function onOverlayClick() {
  emit('close')
}

// 拖拽排序
function onDragStart(event: DragEvent, index: number) {
  draggedIndex.value = index
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = 'move'
    event.dataTransfer.setData('text/plain', String(index))
  }
}

function onDragOver(event: DragEvent, index: number) {
  event.preventDefault()
  if (event.dataTransfer) {
    event.dataTransfer.dropEffect = 'move'
  }
}

function onDrop(event: DragEvent, dropIndex: number) {
  event.preventDefault()
  const dragIndex = Number(event.dataTransfer?.getData('text/plain'))

  if (dragIndex === dropIndex || isNaN(dragIndex)) {
    return
  }

  // 重新排序本地数组
  const item = localCategories.value[dragIndex]
  localCategories.value.splice(dragIndex, 1)
  localCategories.value.splice(dropIndex, 0, item)

  // 发送排序事件
  const orderedIds = localCategories.value.map(c => c.id)
  emit('reorder', orderedIds)
}

function onDragEnd() {
  draggedIndex.value = null
}
</script>

<style scoped>
/* Modal Overlay */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.3);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 20px;
}

/* Modal Container */
.modal-container {
  background: #fff;
  border-radius: 8px;
  width: 400px;
  max-height: 500px;
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.15);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

/* Header */
.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid #e0e0e0;
}

.modal-title {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: #333;
}

.close-btn {
  width: 28px;
  height: 28px;
  border: none;
  background: transparent;
  border-radius: 4px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #666;
  transition: all 0.15s ease;
}

.close-btn:hover {
  background: #f0f0f0;
  color: #333;
}

.close-icon {
  width: 18px;
  height: 18px;
}

/* Tabs */
.modal-tabs {
  display: flex;
  border-bottom: 1px solid #e0e0e0;
  padding: 0 20px;
}

.tab-btn {
  padding: 12px 16px;
  border: none;
  background: transparent;
  font-size: 13px;
  font-weight: 500;
  color: #666;
  cursor: pointer;
  position: relative;
  transition: color 0.15s ease;
}

.tab-btn:hover {
  color: #333;
}

.tab-btn.active {
  color: #333;
}

.tab-btn.active::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 2px;
  background: #333;
}

/* Content */
.modal-content {
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.tab-panel {
  flex: 1;
  overflow-y: auto;
  padding: 16px 20px;
}

.tab-description {
  margin: 0 0 16px;
  font-size: 12px;
  color: #666;
  line-height: 1.5;
}

/* Add Category Button */
.add-category-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 0;
  border: none;
  background: transparent;
  color: #22a559;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  margin-bottom: 16px;
  transition: opacity 0.15s ease;
}

.add-category-btn:hover {
  opacity: 0.8;
}

.add-icon {
  width: 14px;
  height: 14px;
}

/* Category List */
.category-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.category-item {
  display: flex;
  align-items: center;
  gap: 8px;
  height: 40px;
  padding: 0 8px;
  border-radius: 4px;
  background: #fafafa;
  transition: background 0.15s ease;
}

.category-item:hover {
  background: #f0f0f0;
}

.category-item.dragging {
  opacity: 0.5;
}

/* Drag Handle */
.drag-handle {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  cursor: grab;
  color: #999;
}

.drag-handle:active {
  cursor: grabbing;
}

.drag-icon {
  width: 14px;
  height: 14px;
}

/* Color Picker */
.color-picker-trigger {
  position: relative;
  cursor: pointer;
}

.color-block {
  width: 20px;
  height: 20px;
  border-radius: 4px;
  border: 1px solid rgba(0, 0, 0, 0.1);
}

.hidden-color-input {
  position: absolute;
  opacity: 0;
  pointer-events: none;
  width: 0;
  height: 0;
}

/* Name Input */
.category-name-input {
  flex: 1;
  height: 28px;
  padding: 0 8px;
  border: 1px solid transparent;
  border-radius: 4px;
  font-size: 13px;
  color: #333;
  background: transparent;
  outline: none;
  transition: all 0.15s ease;
}

.category-name-input:hover {
  border-color: #d0d0d0;
  background: #fff;
}

.category-name-input:focus {
  border-color: #4285F4;
  background: #fff;
}

/* Delete Button */
.delete-btn {
  width: 28px;
  height: 28px;
  border: none;
  background: transparent;
  border-radius: 4px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #999;
  transition: all 0.15s ease;
  opacity: 0;
}

.category-item:hover .delete-btn {
  opacity: 1;
}

.delete-btn:hover {
  color: #ea4335;
  background: rgba(234, 67, 53, 0.1);
}

.delete-icon {
  width: 16px;
  height: 16px;
}

/* Coming Soon */
.coming-soon {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  color: #999;
}

.coming-soon-icon {
  width: 40px;
  height: 40px;
  margin-bottom: 12px;
}

.coming-soon p {
  margin: 0;
  font-size: 14px;
}

/* Modal Transition */
.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.2s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-active .modal-container,
.modal-leave-active .modal-container {
  transition: transform 0.2s ease, opacity 0.2s ease;
}

.modal-enter-from .modal-container,
.modal-leave-to .modal-container {
  transform: scale(0.95);
  opacity: 0;
}
</style>
