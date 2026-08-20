<script setup>
const route = useRoute()
const slug = route.params.slug

const caseData = {
  'gongti-center': {
    title: '北京工人体育场',
    tag: '体育场馆',
    content: '北京工人体育场拥有 68,000 个座位，是国内最大的专业足球场之一。SeatsMap 为其提供完整的座位图数字化管理方案，支持赛事和演唱会两种模式的座位布局切换，以及面向观众的 H5 在线选座购票功能。',
  },
  'national-theater': {
    title: '国家大剧院',
    tag: '剧院',
    content: '国家大剧院包含歌剧院、音乐厅、戏剧场等多个演出场所，座位布局复杂。SeatsMap 为其设计了多厅堂座位图管理方案，支持多层楼座、包厢和异形座位的精确呈现。',
  },
}

const item = caseData[slug] || { title: '案例未找到', tag: '', content: '抱歉，该案例不存在。' }

useHead({
  title: computed(() => `${item.title} - SeatsMap 案例`),
  meta: [
    { name: 'description', content: item.content.slice(0, 120) },
    { property: 'og:title', content: item.title },
  ],
})
</script>

<template>
  <div>
    <article class="article-page">
      <div class="container">
        <NuxtLink to="/cases" class="back-link">← 返回案例</NuxtLink>
        <span v-if="item.tag" class="case-tag">{{ item.tag }}</span>
        <h1>{{ item.title }}</h1>
        <div class="article-body"><p>{{ item.content }}</p></div>
      </div>
    </article>
  </div>
</template>

<style scoped>
.container { max-width: 720px; margin: 0 auto; padding: 0 24px; }
.article-page { padding: 60px 0 80px; }
.back-link { font-size: 14px; color: #4a7cff; text-decoration: none; display: inline-block; margin-bottom: 16px; }
.back-link:hover { text-decoration: underline; }
.case-tag { display: inline-block; padding: 2px 10px; font-size: 12px; color: #4a7cff; background: #e8f0ff; border-radius: 4px; margin-bottom: 12px; }
h1 { font-size: 32px; font-weight: 800; color: #111; margin: 0 0 24px; line-height: 1.3; }
.article-body { font-size: 16px; color: #333; line-height: 1.8; }
.article-body p { margin: 0 0 16px; }
</style>
