<script setup>
/**
 * Breadcrumb 结构化数据 + 面包屑导航 UI
 */
const props = defineProps({
  items: {
    type: Array,
    required: true,
    // [{ label: '首页', to: '/' }, { label: '博客', to: '/blog' }]
  },
})

const siteUrl = 'https://seatmap.web.jinsc.cn'

const jsonLdData = computed(() => ({
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: props.items.map((item, i) => ({
    '@type': 'ListItem',
    position: i + 1,
    name: item.label,
    item: `${siteUrl}${item.to}`,
  })),
}))
</script>

<template>
  <nav class="breadcrumb-nav" aria-label="面包屑">
    <template v-for="(item, i) in items" :key="item.to">
      <NuxtLink v-if="item.to" :to="item.to" class="breadcrumb-link">
        {{ item.label }}
      </NuxtLink>
      <span v-else class="breadcrumb-current">{{ item.label }}</span>
      <span v-if="i < items.length - 1" class="breadcrumb-sep">/</span>
    </template>
    <SeoJsonLd :data="jsonLdData" />
  </nav>
</template>

<style scoped>
.breadcrumb-nav {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: #888;
  padding: 12px 0;
}

.breadcrumb-link {
  color: #888;
  text-decoration: none;
  transition: color 0.15s;
}

.breadcrumb-link:hover {
  color: #4a7cff;
  text-decoration: none;
}

.breadcrumb-current {
  color: #333;
}

.breadcrumb-sep {
  color: #ccc;
}
</style>
