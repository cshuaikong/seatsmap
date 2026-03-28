<template>
  <div class="panel-section" :class="{ collapsed: !isExpanded }">
    <div class="section-header" @click="toggleExpand">
      <h4 class="section-title">{{ title }}</h4>
      <div class="header-actions">
        <slot name="header-extra" />
        <button v-if="collapsible" class="toggle-btn" :class="{ expanded: isExpanded }" @click.stop>
          <Icon icon="lucide:chevron-down" class="toggle-icon" />
        </button>
      </div>
    </div>
    <div v-show="isExpanded" class="section-content">
      <slot />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { Icon } from '@iconify/vue'

interface Props {
  title: string
  collapsible?: boolean
  defaultExpanded?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  collapsible: true,
  defaultExpanded: true
})

const isExpanded = ref(props.defaultExpanded)

watch(() => props.defaultExpanded, (val) => {
  isExpanded.value = val
})

function toggleExpand() {
  if (props.collapsible) {
    isExpanded.value = !isExpanded.value
  }
}
</script>

<style scoped>
.panel-section {
  border-bottom: 1px solid #e0e0e0;
  background: #fafafa;
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  cursor: v-bind('collapsible ? "pointer" : "default"');
  user-select: none;
}

.section-title {
  margin: 0;
  font-size: 11px;
  font-weight: 700;
  color: #555;
  text-transform: uppercase;
  letter-spacing: 0.8px;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.toggle-btn {
  width: 20px;
  height: 20px;
  border: none;
  background: transparent;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  color: #888;
  transition: transform 0.2s ease;
}

.toggle-btn.expanded {
  transform: rotate(180deg);
}

.toggle-icon {
  width: 14px;
  height: 14px;
}

.section-content {
  padding: 0 16px 16px;
}

.panel-section.collapsed .section-header {
  padding-bottom: 12px;
}
</style>
