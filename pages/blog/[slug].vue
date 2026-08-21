<template>
  <div class="article-page"><div class="article-container">
    <ContentDoc :path="`/blog/${route.params.slug}`" v-slot="{ doc }">
      <article v-if="doc">
        <header class="article-header">
          <h1>{{ doc.title }}</h1>
          <div class="article-meta">
            <span>{{ doc.date }}</span>
            <span class="mx-2">•</span>
            <span>{{ doc.author }}</span>
          </div>
          <div class="article-tags">
            <span v-for="tag in doc.tags" :key="tag" class="article-tag">
              {{ tag }}
            </span>
          </div>
        </header>
        
        <div class="article-body">
          <ContentRenderer :value="doc" />
        </div>
      </article>
      
      <div v-else>
        <h2 class="text-2xl font-bold">文章未找到</h2>
        <p>抱歉，找不到您请求的文章。</p>
      </div>
    </ContentDoc>
  </div></div>
</template>

<script setup>
const route = useRoute()

// 设置页面标题
const { data: page } = await useAsyncData(`blog-${route.params.slug}`, () =>
  queryContent('/blog').where({ _path: `/blog/${route.params.slug}` }).findOne()
)

useHead({
  title: page.value?.title || '博客文章',
  meta: [
    { name: 'description', content: page.value?.description || '' },
  ]
})
</script>
