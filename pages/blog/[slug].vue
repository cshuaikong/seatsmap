<template>
  <div class="container mx-auto px-4 py-8">
    <ContentDoc :path="`/blog/${route.params.slug}`" v-slot="{ doc }">
      <article v-if="doc">
        <header class="mb-8 border-b pb-6">
          <h1 class="text-4xl font-bold text-gray-900 mb-2">{{ doc.title }}</h1>
          <div class="flex items-center text-gray-600 text-sm">
            <span>{{ doc.date }}</span>
            <span class="mx-2">•</span>
            <span>{{ doc.author }}</span>
          </div>
          <div class="mt-2 flex flex-wrap gap-2">
            <span v-for="tag in doc.tags" :key="tag" class="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-xs">
              {{ tag }}
            </span>
          </div>
        </header>
        
        <div class="prose max-w-none">
          <ContentRenderer :value="doc" />
        </div>
      </article>
      
      <div v-else>
        <h2 class="text-2xl font-bold">文章未找到</h2>
        <p>抱歉，找不到您请求的文章。</p>
      </div>
    </ContentDoc>
  </div>
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