<template>
  <div class="container mx-auto px-4 py-8">
    <h1 class="text-3xl font-bold mb-8">博客</h1>
    
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <NuxtLink 
        v-for="article in articles" 
        :key="article._path"
        :to="article._path"
        class="block bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow duration-300"
      >
        <div class="p-6">
          <h2 class="text-xl font-semibold text-gray-900 mb-2">{{ article.title }}</h2>
          <p class="text-gray-600 text-sm mb-3">{{ article.description }}</p>
          <div class="flex items-center justify-between text-xs text-gray-500">
            <span>{{ article.date }}</span>
            <span>{{ article.author }}</span>
          </div>
          <div class="mt-3 flex flex-wrap gap-1">
            <span 
              v-for="tag in article.tags" 
              :key="tag" 
              class="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs"
            >
              {{ tag }}
            </span>
          </div>
        </div>
      </NuxtLink>
    </div>
  </div>
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