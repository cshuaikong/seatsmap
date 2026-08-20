<script setup>
/**
 * JSON-LD 结构化数据输出组件
 * 支持传入任意 JSON-LD 对象
 */
const props = defineProps({
  data: { type: Object, required: true },
})

const jsonLd = computed(() => JSON.stringify(props.data))
</script>

<template>
  <script type="application/ld+json" v-html="jsonLd" />
</template>
