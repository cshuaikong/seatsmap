<template>
  <div class="image-panel">
    <!-- 图片列表 -->
    <PanelSection title="图片资源">
      <!-- 上传区域 -->
      <div
        class="upload-area"
        :class="{ 'drag-over': isDragOver }"
        @click="triggerUpload"
        @dragenter.prevent="isDragOver = true"
        @dragover.prevent
        @dragleave.prevent="isDragOver = false"
        @drop.prevent="handleDrop"
      >
        <input
          ref="fileInput"
          type="file"
          accept="image/*"
          multiple
          style="display: none"
          @change="handleFileChange"
        />
        <div class="upload-placeholder">
          <Icon icon="lucide:image-plus" class="upload-icon" />
          <span class="upload-text">点击或拖拽上传图片</span>
          <span class="upload-hint">支持 JPG、PNG、GIF，可多张</span>
        </div>
      </div>

      <!-- 图片列表 -->
      <div v-if="canvasImages.length > 0" class="image-list">
        <div
          v-for="image in canvasImages"
          :key="image.id"
          class="image-item"
          :class="{ active: selectedImageId === image.id }"
          @click="selectImage(image.id)"
        >
          <div class="image-thumb">
            <img :src="image.src" :alt="image.fileName || '图片'" />
          </div>
          <div class="image-info">
            <span class="file-name">{{ image.fileName || '未命名' }}</span>
            <span class="image-size">{{ Math.round(image.width) }}×{{ Math.round(image.height) }}</span>
          </div>
          <button class="delete-btn" @click.stop="removeImage(image.id)">
            <Icon icon="lucide:x" class="btn-icon" />
          </button>
        </div>
      </div>

      <!-- 空状态 -->
      <div v-else class="empty-state">
        <span>暂无图片，请上传</span>
      </div>
    </PanelSection>

    <!-- 选中图片的配置 -->
    <template v-if="selectedImage">
      <PanelSection title="位置">
        <div class="property-row">
          <label class="property-label">X</label>
          <NumberInput
            :model-value="selectedImage.x"
            :step="1"
            @update:model-value="updateImage('x', $event)"
          />
        </div>
        <div class="property-row">
          <label class="property-label">Y</label>
          <NumberInput
            :model-value="selectedImage.y"
            :step="1"
            @update:model-value="updateImage('y', $event)"
          />
        </div>
      </PanelSection>

      <PanelSection title="尺寸">
        <div class="property-row">
          <label class="property-label">宽度</label>
          <NumberInput
            :model-value="selectedImage.width"
            :step="10"
            :min="10"
            @update:model-value="updateImage('width', $event)"
          />
        </div>
        <div class="property-row">
          <label class="property-label">高度</label>
          <NumberInput
            :model-value="selectedImage.height"
            :step="10"
            :min="10"
            @update:model-value="updateImage('height', $event)"
          />
        </div>
      </PanelSection>

      <PanelSection title="旋转">
        <div class="property-row">
          <label class="property-label">角度</label>
          <NumberInput
            :model-value="selectedImage.rotation || 0"
            :step="5"
            @update:model-value="updateImage('rotation', $event)"
          />
        </div>
      </PanelSection>

      <PanelSection title="透明度">
        <SliderInput
          :model-value="(selectedImage.opacity ?? 1) * 100"
          :min="0"
          :max="100"
          :step="5"
          unit="%"
          @update:model-value="updateImage('opacity', $event / 100)"
        />
      </PanelSection>

      <PanelSection title="锁定">
        <label class="checkbox-row">
          <input
            type="checkbox"
            :checked="selectedImage.locked"
            @change="updateImage('locked', ($event.target as HTMLInputElement).checked)"
          />
          <span>锁定位置（禁止拖拽）</span>
        </label>
      </PanelSection>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { Icon } from '@iconify/vue'
import { useVenueStore } from '../../stores/venueStore'
import { generateId } from '../../utils/id'
import type { CanvasImage } from '../../types'
import PanelSection from './controls/PanelSection.vue'
import NumberInput from './controls/NumberInput.vue'
import SliderInput from './controls/SliderInput.vue'

const venueStore = useVenueStore()
const fileInput = ref<HTMLInputElement | null>(null)
const isDragOver = ref(false)

const canvasImages = computed(() => venueStore.canvasImages)
const selectedImageId = computed(() => venueStore.selectedImageId)
const selectedImage = computed(() =>
  canvasImages.value.find(img => img.id === selectedImageId.value)
)

const triggerUpload = () => {
  fileInput.value?.click()
}

const handleFileChange = (event: Event) => {
  const target = event.target as HTMLInputElement
  const files = target.files
  if (!files) return

  Array.from(files).forEach(file => processFile(file))

  // 清空 input
  target.value = ''
}

const handleDrop = (event: DragEvent) => {
  isDragOver.value = false
  const files = event.dataTransfer?.files
  if (!files) return

  Array.from(files).forEach(file => {
    if (file.type.startsWith('image/')) {
      processFile(file)
    }
  })
}

const processFile = (file: File) => {
  // 检查文件类型
  if (!file.type.startsWith('image/')) {
    alert(`${file.name} 不是图片文件`)
    return
  }

  // 检查文件大小（限制 10MB）
  if (file.size > 10 * 1024 * 1024) {
    alert(`${file.name} 超过 10MB 限制`)
    return
  }

  const reader = new FileReader()
  reader.onload = (e) => {
    const src = e.target?.result as string
    if (!src) return

    const img = new Image()
    img.onload = () => {
      const image: CanvasImage = {
        id: generateId(),
        type: 'image',
        src,
        x: 100 + Math.random() * 200, // 随机位置避免重叠
        y: 100 + Math.random() * 200,
        width: img.width,
        height: img.height,
        rotation: 0,
        opacity: 1,
        locked: false,
        visible: true,
        fileName: file.name
      }

      venueStore.addCanvasImage(image)
    }
    img.src = src
  }
  reader.readAsDataURL(file)
}

const selectImage = (id: string) => {
  venueStore.selectCanvasImage(id)
}

const removeImage = (id: string) => {
  if (confirm('确定要删除这张图片吗？')) {
    venueStore.removeCanvasImage(id)
  }
}

const updateImage = (key: keyof CanvasImage, value: any) => {
  if (!selectedImage.value) return
  venueStore.updateCanvasImage(selectedImage.value.id, { [key]: value })
  // 锁定后自动取消选中
  if (key === 'locked' && value === true) {
    venueStore.clearCanvasImageSelection()
  }
}
</script>

<style scoped>
.image-panel {
  background: var(--color-bg-secondary);
}

/* 上传区域 */
.upload-area {
  padding: 20px;
  border: 2px dashed var(--color-border);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
  margin-bottom: 12px;
}

.upload-area:hover,
.upload-area.drag-over {
  border-color: var(--color-accent);
  background: var(--color-bg-tertiary);
}

.upload-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
}

.upload-icon {
  width: 28px;
  height: 28px;
  color: var(--color-text-secondary);
}

.upload-text {
  font-size: 13px;
  color: var(--color-text);
}

.upload-hint {
  font-size: 11px;
  color: var(--color-text-muted);
}

/* 图片列表 */
.image-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 300px;
  overflow-y: auto;
}

.image-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease;
  border: 1px solid transparent;
}

.image-item:hover {
  background: var(--color-bg-tertiary);
}

.image-item.active {
  background: var(--color-accent-soft);
  border-color: var(--color-accent);
}

.image-thumb {
  width: 48px;
  height: 48px;
  border-radius: 4px;
  overflow: hidden;
  background: var(--color-bg-tertiary);
  flex-shrink: 0;
}

.image-thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.image-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.file-name {
  font-size: 12px;
  color: var(--color-text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.image-size {
  font-size: 11px;
  color: var(--color-text-muted);
}

.delete-btn {
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  background: transparent;
  color: var(--color-text-muted);
  cursor: pointer;
  border-radius: 4px;
  opacity: 0;
  transition: all 0.2s ease;
}

.image-item:hover .delete-btn {
  opacity: 1;
}

.delete-btn:hover {
  background: rgba(239, 68, 68, 0.1);
  color: #dc2626;
}

.btn-icon {
  width: 14px;
  height: 14px;
}

/* 空状态 */
.empty-state {
  padding: 20px;
  text-align: center;
  color: var(--color-text-muted);
  font-size: 13px;
}

/* 属性行 */
.property-row {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 8px;
}

.property-row:last-child {
  margin-bottom: 0;
}

.property-label {
  width: 50px;
  font-size: 13px;
  color: var(--color-text-secondary);
  flex-shrink: 0;
}

/* 复选框 */
.checkbox-row {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: var(--color-text);
  cursor: pointer;
}

.checkbox-row input[type="checkbox"] {
  width: 16px;
  height: 16px;
  cursor: pointer;
}
</style>
