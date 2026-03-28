<template>
  <div class="shape-panel">
    <!-- Shape 分组 -->
    <!-- EN: Shape -->
    <PanelSection title="形状">
      <!-- Width（仅 rect/ellipse） -->
      <div v-if="showSize" class="property-row">
        <!-- EN: Width -->
        <label class="property-label">宽度</label>
        <NumberInput
          :model-value="localWidth"
          unit="pt"
          :step="1"
          @update:model-value="updateProperty('width', $event)"
        />
      </div>

      <!-- Height（仅 rect/ellipse） -->
      <div v-if="showSize" class="property-row">
        <!-- EN: Height -->
        <label class="property-label">高度</label>
        <NumberInput
          :model-value="localHeight"
          unit="pt"
          :step="1"
          @update:model-value="updateProperty('height', $event)"
        />
      </div>

      <!-- Rotation -->
      <div class="property-row">
        <!-- EN: Rotation -->
        <label class="property-label">旋转</label>
        <NumberInput
          :model-value="localRotation"
          unit="°"
          :step="1"
          @update:model-value="updateProperty('rotation', $event)"
        />
      </div>

      <!-- Corner radius（仅 rect） -->
      <div v-if="type === 'rect'" class="property-row">
        <!-- EN: Corner radius -->
        <label class="property-label">圆角半径</label>
        <NumberInput
          :model-value="localCornerRadius"
          unit="pt"
          :step="1"
          :min="0"
          @update:model-value="updateProperty('cornerRadius', $event)"
        />
      </div>

      <!-- Fill color -->
      <div class="property-row">
        <!-- EN: Fill color -->
        <label class="property-label">填充颜色</label>
        <ColorPicker
          :model-value="localFillColor"
          @update:model-value="updateProperty('fillColor', $event)"
        />
      </div>

      <!-- Automatic stroke -->
      <div class="property-row checkbox-row">
        <!-- EN: Automatic stroke -->
        <label class="property-label">自动描边</label>
        <input
          type="checkbox"
          :checked="localAutoStroke"
          @change="updateProperty('autoStroke', ($event.target as HTMLInputElement).checked)"
          class="checkbox-input"
        />
      </div>

      <!-- Stroke width -->
      <div class="property-row">
        <!-- EN: Stroke width -->
        <label class="property-label">描边宽度</label>
        <NumberInput
          :model-value="localStrokeWidth"
          unit="pt"
          :step="0.5"
          :min="0"
          @update:model-value="updateProperty('strokeWidth', $event)"
        />
      </div>

      <!-- Stroke color（仅 autoStroke 未勾选时显示） -->
      <div v-if="!localAutoStroke" class="property-row">
        <!-- EN: Stroke color -->
        <label class="property-label">描边颜色</label>
        <ColorPicker
          :model-value="localStrokeColor"
          @update:model-value="updateProperty('strokeColor', $event)"
        />
      </div>

      <!-- Order -->
      <div class="property-row">
        <!-- EN: Order -->
        <label class="property-label">层级</label>
        <OrderControl
          @bring-front="updateProperty('order', 'front')"
          @send-back="updateProperty('order', 'back')"
        />
      </div>
    </PanelSection>

    <!-- Transform 分组 -->
    <!-- EN: Transform -->
    <PanelSection title="变换">
      <!-- Scale -->
      <div class="property-row">
        <!-- EN: Scale -->
        <label class="property-label">缩放</label>
        <SliderInput
          :model-value="localScale"
          :min="10"
          :max="200"
          :step="1"
          @update:model-value="updateProperty('scale', $event)"
        />
      </div>

      <!-- Smoothing（仅 polygon/polyline） -->
      <div v-if="showSmoothing" class="property-row">
        <!-- EN: Smoothing -->
        <label class="property-label">平滑度</label>
        <SliderInput
          :model-value="localSmoothing"
          :min="0"
          :max="100"
          :step="1"
          @update:model-value="updateProperty('smoothing', $event)"
        />
      </div>
    </PanelSection>

    <!-- Label 分组 -->
    <!-- EN: Label -->
    <PanelSection title="标签">
      <!-- Type -->
      <div class="property-row">
        <!-- EN: Type -->
        <label class="property-label">类型</label>
        <select
          :value="localLabelType"
          @change="updateProperty('label.type', ($event.target as HTMLSelectElement).value)"
          class="select-input"
        >
          <option value="">空</option>
          <option value="Stage">舞台</option>
          <option value="其他">其他</option>
        </select>
      </div>

      <!-- Caption -->
      <div class="property-row">
        <!-- EN: Caption -->
        <label class="property-label">标题</label>
        <input
          type="text"
          :value="localCaption"
          @input="updateProperty('label.caption', ($event.target as HTMLInputElement).value)"
          class="text-input"
          placeholder="输入标题"
        />
      </div>

      <!-- Font size -->
      <div class="property-row">
        <!-- EN: Font size -->
        <label class="property-label">字号</label>
        <NumberInput
          :model-value="localFontSize"
          unit="pt"
          :step="1"
          :min="8"
          :max="72"
          @update:model-value="updateProperty('label.fontSize', $event)"
        />
      </div>

      <!-- Position X -->
      <div class="property-row">
        <!-- EN: Position X -->
        <label class="property-label">位置 X</label>
        <NumberInput
          :model-value="localPositionX"
          unit="%"
          :step="1"
          :min="0"
          :max="100"
          @update:model-value="updateProperty('label.positionX', $event)"
        />
      </div>

      <!-- Position Y -->
      <div class="property-row">
        <!-- EN: Position Y -->
        <label class="property-label">位置 Y</label>
        <NumberInput
          :model-value="localPositionY"
          unit="%"
          :step="1"
          :min="0"
          :max="100"
          @update:model-value="updateProperty('label.positionY', $event)"
        />
      </div>
    </PanelSection>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import PanelSection from './controls/PanelSection.vue'
import NumberInput from './controls/NumberInput.vue'
import ColorPicker from './controls/ColorPicker.vue'
import SliderInput from './controls/SliderInput.vue'
import OrderControl from './controls/OrderControl.vue'

const props = defineProps<{
  node: any
  type: 'rect' | 'ellipse' | 'polygon' | 'sector' | 'polyline'
}>()

const emit = defineEmits<{
  'update-property': [key: string, value: any]
}>()

// 本地 ref 管理属性值
const localWidth = ref(0)
const localHeight = ref(0)
const localRotation = ref(0)
const localCornerRadius = ref(0)
const localFillColor = ref('#000000')
const localAutoStroke = ref(true)
const localStrokeWidth = ref(1)
const localStrokeColor = ref('#000000')
const localScale = ref(100)
const localSmoothing = ref(0)

// Label 属性
const localLabelType = ref('')
const localCaption = ref('')
const localFontSize = ref(14)
const localPositionX = ref(50)
const localPositionY = ref(50)

// 从节点读取属性的函数
const readFromNode = () => {
  if (!props.node) return
  const node = props.node
  
  // 查找 group 内的实际形状节点
  let shapeNode = node
  if (node.getClassName?.() === 'Group') {
    const children = node.getChildren?.() || []
    for (const child of children) {
      const cls = child.getClassName?.()
      if (['Rect', 'Ellipse', 'Line', 'Circle'].includes(cls)) {
        shapeNode = child
        break
      }
    }
  }
  
  localWidth.value = shapeNode.width?.() ?? node.width?.() ?? 0
  localHeight.value = shapeNode.height?.() ?? node.height?.() ?? 0
  localRotation.value = node.rotation?.() ?? 0
  localCornerRadius.value = shapeNode.cornerRadius?.() ?? 0
  localFillColor.value = shapeNode.fill?.() ?? ''
  localAutoStroke.value = node.getAttr?.('autoStroke') ?? true
  localStrokeWidth.value = shapeNode.strokeWidth?.() ?? 1
  localStrokeColor.value = shapeNode.stroke?.() ?? '#000000'
  const scaleX = node.scaleX?.() || 1
  localScale.value = Math.round(scaleX * 100)
  localSmoothing.value = node.getAttr?.('smoothing') || 0
  
  // Label 属性
  localLabelType.value = node.getAttr?.('labelType') || ''
  localCaption.value = node.getAttr?.('caption') || ''
  localFontSize.value = node.getAttr?.('fontSize') || 14
  localPositionX.value = node.getAttr?.('positionX') ?? 50
  localPositionY.value = node.getAttr?.('positionY') ?? 50
}

// 挂载时和 node 变化时读取
watch(() => props.node, () => readFromNode(), { immediate: true })

// 更新属性：同时更新本地 ref 和 emit
const updateProperty = (key: string, value: any) => {
  // 更新本地 ref
  switch(key) {
    case 'width': localWidth.value = value; break
    case 'height': localHeight.value = value; break
    case 'rotation': localRotation.value = value; break
    case 'cornerRadius': localCornerRadius.value = value; break
    case 'fillColor': localFillColor.value = value; break
    case 'autoStroke': localAutoStroke.value = value; break
    case 'strokeWidth': localStrokeWidth.value = value; break
    case 'strokeColor': localStrokeColor.value = value; break
    case 'scale': localScale.value = value; break
    case 'smoothing': localSmoothing.value = value; break
    case 'label.type': localLabelType.value = value; break
    case 'label.caption': localCaption.value = value; break
    case 'label.fontSize': localFontSize.value = value; break
    case 'label.positionX': localPositionX.value = value; break
    case 'label.positionY': localPositionY.value = value; break
  }
  // emit 到父组件更新 Konva 节点
  emit('update-property', key, value)
}

// 显示条件
const showSize = computed(() => props.type === 'rect' || props.type === 'ellipse')
const showSmoothing = computed(() => props.type === 'polygon' || props.type === 'polyline')

// 暴露 refresh 方法供外部调用
const refresh = () => readFromNode()
defineExpose({ refresh })
</script>

<style scoped>
.shape-panel {
  background: var(--color-bg-secondary);
}

.property-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 32px;
  margin-bottom: 8px;
}

.property-row:last-child {
  margin-bottom: 0;
}

.property-label {
  font-size: 12px;
  color: #666;
  flex-shrink: 0;
  width: 40%;
}

.property-row > :not(.property-label) {
  width: 60%;
}

/* Checkbox 行特殊样式 */
.checkbox-row {
  justify-content: space-between;
}

.checkbox-input {
  width: 16px;
  height: 16px;
  cursor: pointer;
  accent-color: var(--color-accent);
}

/* Select 样式 */
.select-input {
  height: 28px;
  padding: 0 8px;
  border: 1px solid #d0d0d0;
  border-radius: 4px;
  background: #fff;
  font-size: 13px;
  color: #333;
  cursor: pointer;
}

.select-input:focus {
  outline: none;
  border-color: var(--color-accent);
}

/* Text input 样式 */
.text-input {
  height: 28px;
  padding: 0 8px;
  border: 1px solid #d0d0d0;
  border-radius: 4px;
  background: #fff;
  font-size: 13px;
  color: #333;
}

.text-input:focus {
  outline: none;
  border-color: var(--color-accent);
}
</style>
