<template>
  <div class="content-page">
    <div class="content-container">
    <p class="content-eyebrow">USE CASES</p>
    <h1>案例与设计示范</h1>
    <p class="content-intro">从体育场馆到剧院，展示座位图如何帮助用户理解空间、完成选位并支持运营规则。</p>
    
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
  title: '案例研究 - SeatsMap',
  meta: [
    { name: 'description', content: 'SeatsMap 案例研究 - 展示我们为不同行业和场景提供的解决方案' }
  ]
})

const { data: articles } = await useAsyncData('case-articles', () =>
  queryContent('/cases')
    .sort({ date: -1 })
    .without(['body']) // 不加载完整内容，只获取元数据
    .find()
)
</script>
