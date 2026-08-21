<template>
  <div class="article-page"><div class="article-container">
    <ContentDoc :path="`/cases/${route.params.slug}`" v-slot="{ doc }">
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
        <h2 class="text-2xl font-bold">案例未找到</h2>
        <p>抱歉，找不到您请求的案例。</p>
      </div>
    </ContentDoc>
  </div></div>
</template>

<script setup>
const route = useRoute()

// 设置页面标题
const { data: page } = await useAsyncData(`case-${route.params.slug}`, () =>
  queryContent('/cases').where({ _path: `/cases/${route.params.slug}` }).findOne()
)

useHead({
  title: page.value?.title || '案例研究',
  meta: [
    { name: 'description', content: page.value?.description || '' },
  ]
})
</script>
