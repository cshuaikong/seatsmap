<script setup>
useHead({
  title: '博客 - SeatsMap',
  meta: [{ name: 'description', content: 'SeatsMap 博客：座位图设计、场馆运营、选座技术等相关文章。' }],
})

const posts = [
  { slug: 'getting-started', title: '快速入门：5 分钟创建你的第一个座位图', date: '2025-08-15', desc: '从零开始使用 SeatsMap 设计器，完成一个小型场馆的座位图创建。' },
  { slug: 'venue-design-tips', title: '场馆座位设计最佳实践', date: '2025-08-10', desc: '分享大型场馆座位图设计的经验与技巧，包括分区策略和排座优化。' },
  { slug: 'canvas-performance', title: 'Canvas 渲染性能优化：万座场馆的流畅之道', date: '2025-08-05', desc: '深入解析 SeatsMap 的虚拟化渲染引擎，如何在万座场景下保持 60fps。' },
]
</script>

<template>
  <div>
    <section class="page-hero">
      <div class="container">
        <h1>博客</h1>
        <p>座位图设计、场馆运营、选座技术相关文章与教程。</p>
      </div>
    </section>

    <section class="section">
      <div class="container">
        <div class="post-list">
          <NuxtLink
            v-for="post in posts"
            :key="post.slug"
            :to="`/blog/${post.slug}`"
            class="post-card"
          >
            <div class="post-date">{{ post.date }}</div>
            <h2 class="post-title">{{ post.title }}</h2>
            <p class="post-desc">{{ post.desc }}</p>
          </NuxtLink>
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped>
.container { max-width: 1200px; margin: 0 auto; padding: 0 24px; }
.section { padding: 80px 0; }
.page-hero { padding: 80px 0 48px; background: linear-gradient(180deg, #f8faff 0%, #fff 100%); text-align: center; }
.page-hero h1 { font-size: 36px; font-weight: 800; color: #111; margin: 0 0 12px; }
.page-hero p { font-size: 16px; color: #555; margin: 0; }
.post-list { display: flex; flex-direction: column; gap: 20px; max-width: 720px; margin: 0 auto; }
.post-card {
  padding: 24px; border: 1px solid #eee; border-radius: 12px;
  text-decoration: none; transition: all 0.2s; display: block;
}
.post-card:hover { border-color: #d0dfff; box-shadow: 0 2px 12px rgba(74,124,255,0.06); text-decoration: none; }
.post-date { font-size: 12px; color: #aaa; margin-bottom: 6px; }
.post-title { font-size: 18px; font-weight: 600; color: #111; margin: 0 0 8px; }
.post-desc { font-size: 14px; color: #666; line-height: 1.6; margin: 0; }
</style>
