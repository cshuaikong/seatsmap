<script setup>
/**
 * Open Graph + Twitter Card meta 组件
 */
const props = defineProps({
  title: { type: String, required: true },
  description: { type: String, required: true },
  image: { type: String, default: '/og-images/default.png' },
  type: { type: String, default: 'website' },
  url: { type: String, default: '' },
})

const siteUrl = 'https://seatmap.page'
const fullUrl = props.url ? `${siteUrl}${props.url}` : siteUrl

useHead({
  meta: [
    { property: 'og:title', content: props.title },
    { property: 'og:description', content: props.description },
    { property: 'og:image', content: props.image.startsWith('http') ? props.image : `${siteUrl}${props.image}` },
    { property: 'og:type', content: props.type },
    { property: 'og:url', content: fullUrl },
    { name: 'twitter:card', content: 'summary_large_image' },
    { name: 'twitter:title', content: props.title },
    { name: 'twitter:description', content: props.description },
    { name: 'twitter:image', content: props.image.startsWith('http') ? props.image : `${siteUrl}${props.image}` },
  ],
  link: [
    { rel: 'canonical', href: fullUrl },
  ],
})
</script>

<template>
  <!-- SEO meta 通过 useHead 注入，无可见 DOM -->
</template>
