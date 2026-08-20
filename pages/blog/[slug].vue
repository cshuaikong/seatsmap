<script setup>
const route = useRoute()
const slug = route.params.slug

const posts = {
  'getting-started': {
    title: '快速入门：5 分钟创建你的第一个座位图',
    date: '2025-08-15',
    content: '本文将带你从零开始，使用 SeatsMap 设计器快速创建一个小型场馆的座位图。首先注册账号并进入控制台，点击"新建场馆"开始设计。你可以导入底图、创建分区、批量排座，最终保存完整的场馆数据。',
  },
  'venue-design-tips': {
    title: '场馆座位设计最佳实践',
    date: '2025-08-10',
    content: '在设计大型场馆座位图时，合理的分区策略和排座优化至关重要。本文分享了我们在服务多个大型场馆项目中积累的经验，包括如何划分区域、优化通道宽度、处理异形座位排列等实用技巧。',
  },
  'canvas-performance': {
    title: 'Canvas 渲染性能优化：万座场馆的流畅之道',
    date: '2025-08-05',
    content: '当场馆座位数达到数万时，渲染性能成为关键挑战。SeatsMap 采用虚拟化渲染技术，仅绘制可见区域的座位，配合空间索引和请求动画帧调度，在万座场景下依然保持 60fps 的流畅交互体验。',
  },
}

const post = posts[slug] || { title: '文章未找到', date: '', content: '抱歉，该文章不存在或已被移除。' }

useHead({
  title: computed(() => `${post.title} - SeatsMap 博客`),
  meta: [
    { name: 'description', content: post.content.slice(0, 120) },
    { property: 'og:title', content: post.title },
    { property: 'og:description', content: post.content.slice(0, 120) },
    { property: 'og:type', content: 'article' },
  ],
})
</script>

<template>
  <div>
    <article class="article-page">
      <div class="container">
        <NuxtLink to="/blog" class="back-link">← 返回博客</NuxtLink>
        <h1>{{ post.title }}</h1>
        <div v-if="post.date" class="article-meta">{{ post.date }}</div>
        <div class="article-body">
          <p>{{ post.content }}</p>
        </div>
      </div>
    </article>
  </div>
</template>

<style scoped>
.container { max-width: 720px; margin: 0 auto; padding: 0 24px; }
.article-page { padding: 60px 0 80px; }
.back-link { font-size: 14px; color: #4a7cff; text-decoration: none; display: inline-block; margin-bottom: 24px; }
.back-link:hover { text-decoration: underline; }
h1 { font-size: 32px; font-weight: 800; color: #111; margin: 0 0 12px; line-height: 1.3; }
.article-meta { font-size: 13px; color: #aaa; margin-bottom: 32px; }
.article-body { font-size: 16px; color: #333; line-height: 1.8; }
.article-body p { margin: 0 0 16px; }
</style>
