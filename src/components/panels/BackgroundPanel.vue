<template>
  <div class="background-panel">
    <PanelSection title="底图设置">
      <!-- 上传区域 -->
      <div v-if="!backgroundImage" class="upload-area" @click="triggerUpload">
        <input
          ref="fileInput"
          type="file"
          accept="image/*"
          style="display: none"
          @change="handleFileChange"
        />
        <div class="upload-placeholder">
          <Icon icon="lucide:image-plus" class="upload-icon" />
          <span class="upload-text">点击上传底图</span>
          <span class="upload-hint">支持 JPG、PNG、GIF 格式</span>
        </div>
      </div>

      <!-- 已上传图片信息 -->
      <div v-else class="image-info">
        <div class="image-preview">
          <img :src="backgroundImage.src" :alt="backgroundImage.fileName || '底图'" />
        </div>
        <div class="image-meta">
          <span class="file-name">{{ backgroundImage.fileName || '未命名图片' }}</span>
          <span class="image-size">{{ imageSizeText }}</span>
        </div>
        <button class="remove-btn" @click="removeImage">
          <Icon icon="lucide:trash-2" class="btn-icon" />
          删除底图
        </button>
      </div>
    </PanelSection>

    <!-- 位置调整 -->
    <PanelSection v-if="backgroundImage" title="位置">
      <div class="property-row">
        <label class="property-label">X</label>
        <NumberInput
          :model-value="backgroundImage.x"
          :step="1"
          @update:model-value="updatePosition('x', $event)"
        />
      </div>
      <div class="property-row">
        <label class="property-label">Y</label>
        <NumberInput
          :model-value="backgroundImage.y"
          :step="1"
          @update:model-value="updatePosition('y', $event)"
        />
      </div>
    </PanelSection>

    <!-- 尺寸调整 -->
    <PanelSection v-if="backgroundImage" title="尺寸">
      <div class="property-row">
        <label class="property-label">宽度</label>
        <NumberInput
          :model-value="backgroundImage.width"
          :step="10"
          :min="10"
          @update:model-value="updateSize('width', $event)"
        />
      </div>
      <div class="property-row">
        <label class="property-label">高度</label>
        <NumberInput
          :model-value="backgroundImage.height"
          :step="10"
          :min="10"
          @update:model-value="updateSize('height', $event)"
        />
      </div>
      <button class="reset-size-btn" @click="resetToOriginalSize">
        <Icon icon="lucide:rotate-ccw" class="btn-icon" />
        恢复原始尺寸
      </button>
    </PanelSection>

    <!-- 透明度 -->
    <PanelSection v-if="backgroundImage" title="透明度">
      <SliderInput
        :model-value="(backgroundImage.opacity ?? 1) * 100"
        :min="0"
        :max="100"
        :step="5"
        unit="%"
        @update:model-value="updateOpacity($event / 100)"
      />
    </PanelSection>

    <!-- 锁定 -->
    <PanelSection v-if="backgroundImage" title="锁定">
      <label class="checkbox-row">
        <input
          type="checkbox"
          :checked="backgroundImage.locked"
          @change="updateLocked(($event.target as HTMLInputElement).checked)"
        />
        <span>锁定位置（禁止拖拽）</span>
      </label>
    </PanelSection>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { Icon } from '@iconify/vue'
import { useVenueStore } from '../../stores/venueStore'
import { generateId } from '../../utils/id'
import type { BackgroundImage } from '../../types'
import PanelSection from './controls/PanelSection.vue'
import NumberInput from './controls/NumberInput.vue'
import SliderInput from './controls/SliderInput.vue'

const venueStore = useVenueStore()
const fileInput = ref<HTMLInputElement | null>(null)

// 原始图片尺寸（用于恢复）
const originalSize = ref<{ width: number; height: number } | null>(null)

const backgroundImage = computed(() => venueStore.backgroundImage)

const imageSizeText = computed(() => {
  const img = backgroundImage.value
  if (!img) return ''
  return `${Math.round(img.width)} × ${Math.round(img.height)}`
})

const triggerUpload = () => {
  fileInput.value?.click()
}

const handleFileChange = (event: Event) => {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  if (!file) return

  // 检查文件类型
  if (!file.type.startsWith('image/')) {
    alert('请选择图片文件')
    return
  }

  // 检查文件大小（限制 10MB）
  if (file.size > 10 * 1024 * 1024) {
    alert('图片大小不能超过 10MB')
    return
  }

  const reader = new FileReader()
  reader.onload = (e) => {
    const src = e.target?.result as string
    if (!src) return

    // 创建图片获取原始尺寸
    const img = new Image()
    img.onload = () => {
      originalSize.value = { width: img.width, height: img.height }

      const backgroundImage: BackgroundImage = {
        id: generateId(),
        type: 'background',
        src,
        x: 0,
        y: 0,
        width: img.width,
        height: img.height,
        rotation: 0,
        opacity: 1,
        locked: false,
        fileName: file.name
      }

      venueStore.setBackgroundImage(backgroundImage)
    }
    img.src = src
  }
  reader.readAsDataURL(file)

  // 清空 input，允许重复选择同一文件
  target.value = ''
}

const removeImage = () => {
  if (confirm('确定要删除底图吗？')) {
    venueStore.removeBackgroundImage()
    originalSize.value = null
  }
}

const updatePosition = (key: 'x' | 'y', value: number) => {
  venueStore.updateBackgroundImage({ [key]: value })
}

const updateSize = (key: 'width' | 'height', value: number) => {
  venueStore.updateBackgroundImage({ [key]: value })
}

const updateOpacity = (value: number) => {
  venueStore.updateBackgroundImage({ opacity: value })
}

const updateLocked = (value: boolean) => {
  venueStore.updateBackgroundImage({ locked: value })
}

const resetToOriginalSize = () => {
  if (!originalSize.value || !backgroundImage.value) return
  venueStore.updateBackgroundImage({
    width: originalSize.value.width,
    height: originalSize.value.height
  })
}
</script>

<style scoped>
.background-panel {
  background: var(--color-bg-secondary);
}

/* 上传区域 */
.upload-area {
  padding: 24px;
  border: 2px dashed var(--color-border);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.upload-area:hover {
  border-color: var(--color-accent);
  background: var(--color-bg-tertiary);
}

.upload-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.upload-icon {
  width: 32px;
  height: 32px;
  color: var(--color-text-secondary);
}

.upload-text {
  font-size: 14px;
  color: var(--color-text);
}

.upload-hint {
  font-size: 12px;
  color: var(--color-text-secondary);
}

/* 图片信息 */
.image-info {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.image-preview {
  width: 100%;
  height: 120px;
  border-radius: 8px;
  overflow: hidden;
  background: var(--color-bg-tertiary);
  display: flex;
  align-items: center;
  justify-content: center;
}

.image-preview img {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
}

.image-meta {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.file-name {
  font-size: 13px;
  color: var(--color-text);
  word-break: break-all;
}

.image-size {
  font-size: 12px;
  color: var(--color-text-secondary);
}

.remove-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 8px 12px;
  border: 1px solid #dc2626;
  border-radius: 6px;
  background: transparent;
  color: #dc2626;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.remove-btn:hover {
  background: rgba(220, 38, 38, 0.1);
}

.btn-icon {
  width: 14px;
  height: 14px;
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

/* 重置尺寸按钮 */
.reset-size-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 8px 12px;
  margin-top: 8px;
  border: 1px solid var(--color-border);
  border-radius: 6px;
  background: var(--color-bg-tertiary);
  color: var(--color-text);
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.reset-size-btn:hover {
  border-color: var(--color-accent);
  color: var(--color-accent);
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
