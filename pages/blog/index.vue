<template>
  <div class="content-page">
    <div class="content-container">
    <p class="content-eyebrow">INSIGHTS</p>
    <h1>博客</h1>
    <p class="content-intro">围绕座位图设计、选座体验、票务集成与产品本地化，分享可直接用于项目的实践思路。</p>
    
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <NuxtLink 
        v-for="article in articles" 
        :key="article._path"
        :to="article._path"
        class="content-card"
      >
        <div>
          <h2>{{ article.title }}</h2>
          <p>{{ article.description }}</p>
          <div class="content-meta">
            <span>{{ article.date }}</span>
            <span>{{ article.author }}</span>
          </div>
          <div class="content-tags">
            <span 
              v-for="tag in article.tags" 
              :key="tag" 
              class="content-tag"
            >
              {{ tag }}
            </span>
          </div>
        </div>
      </NuxtLink>
    </div>
    </div></div>
</template>

<script setup>
// 设置页面标题
useHead({
  title: '博客 - SeatsMap',
  meta: [
    { name: 'description', content: 'SeatsMap 博客 - 为您提供最新的产品更新、技术分享和行业洞察' }
  ]
})

const { data: articles } = await useAsyncData('blog-articles', () =>
  queryContent('/blog')
    .sort({ date: -1 })
    .without(['body']) // 不加载完整内容，只获取元数据
    .find()
)
</script>
