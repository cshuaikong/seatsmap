<template>
  <div class="category-selector-wrapper">
    <!-- EN: Category -->
    <label class="input-label">分类</label>
    <div class="selector-control">
      <div class="dropdown-trigger" @click="toggleDropdown">
        <div v-if="selectedCategory" class="selected-item">
          <div class="color-dot" :style="{ backgroundColor: selectedCategory.color }"></div>
          <span class="category-name">{{ selectedCategory.name }}</span>
        </div>
        <div v-else class="selected-item empty">
          <div class="color-dot empty"></div>
          <!-- EN: No category assigned -->
          <span class="category-name">未分配分类</span>
        </div>
        <Icon icon="lucide:chevron-down" class="dropdown-icon" :class="{ open: isOpen }" />
      </div>

      <div v-if="isOpen" class="dropdown-menu">
        <div
          class="dropdown-item"
          :class="{ active: !modelValue }"
          @click="selectCategory('')"
        >
          <div class="color-dot empty"></div>
          <!-- EN: No category assigned -->
          <span>未分配分类</span>
        </div>
        <div
          v-for="cat in categories"
          :key="cat.id"
          class="dropdown-item"
          :class="{ active: modelValue === cat.id }"
          @click="selectCategory(cat.id)"
        >
          <div class="color-dot" :style="{ backgroundColor: cat.color }"></div>
          <span>{{ cat.name }}</span>
        </div>
        <div class="dropdown-footer">
          <button class="manage-btn" @click="onManage">
            <Icon icon="lucide:settings" class="manage-icon" />
            <!-- EN: Manage -->
            管理
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { Icon } from '@iconify/vue'

interface Category {
  id: string
  name: string
  color: string
}

interface Props {
  modelValue: string
  categories: Category[]
}

const props = defineProps<Props>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
  'manage': []
}>()

const isOpen = ref(false)
const selectorRef = ref<HTMLElement>()

const selectedCategory = computed(() => {
  if (!props.modelValue) return null
  return props.categories.find(c => c.id === props.modelValue)
})

function toggleDropdown() {
  isOpen.value = !isOpen.value
}

function selectCategory(id: string) {
  emit('update:modelValue', id)
  isOpen.value = false
}

function onManage() {
  emit('manage')
  isOpen.value = false
}

function handleClickOutside(e: MouseEvent) {
  const target = e.target as HTMLElement
  if (!target.closest('.selector-control')) {
    isOpen.value = false
  }
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
})
</script>

<style scoped>
.category-selector-wrapper {
  display: flex;
  align-items: flex-start;
  gap: 12px;
}

.input-label {
  font-size: 12px;
  color: #666;
  min-width: 60px;
  flex-shrink: 0;
  padding-top: 7px;
}

.selector-control {
  flex: 1;
  position: relative;
}

.dropdown-trigger {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 28px;
  padding: 0 10px;
  border: 1px solid #d0d0d0;
  border-radius: 4px;
  background: #fff;
  cursor: pointer;
  transition: border-color 0.15s ease;
}

.dropdown-trigger:hover {
  border-color: #aaa;
}

.selected-item {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
}

.selected-item.empty .category-name {
  color: #888;
  font-style: italic;
}

.color-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  flex-shrink: 0;
}

.color-dot.empty {
  background: #e0e0e0;
  border: 1px dashed #bbb;
}

.category-name {
  font-size: 12px;
  color: #333;
}

.dropdown-icon {
  width: 14px;
  height: 14px;
  color: #888;
  transition: transform 0.2s ease;
}

.dropdown-icon.open {
  transform: rotate(180deg);
}

.dropdown-menu {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  margin-top: 4px;
  background: #fff;
  border: 1px solid #d0d0d0;
  border-radius: 4px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  z-index: 100;
  overflow: hidden;
}

.dropdown-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  cursor: pointer;
  transition: background 0.15s ease;
}

.dropdown-item:hover {
  background: #f5f5f5;
}

.dropdown-item.active {
  background: #e8f0fe;
}

.dropdown-item span {
  font-size: 12px;
  color: #333;
}

.dropdown-footer {
  padding: 8px 12px;
  border-top: 1px solid #e0e0e0;
  background: #fafafa;
}

.manage-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  border: 1px solid #d0d0d0;
  border-radius: 3px;
  background: #fff;
  cursor: pointer;
  font-size: 11px;
  color: #555;
  transition: all 0.15s ease;
}

.manage-btn:hover {
  background: #f0f0f0;
  border-color: #bbb;
}

.manage-icon {
  width: 12px;
  height: 12px;
}
</style>
