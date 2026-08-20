<script setup>
useHead({
  title: '案例 - SeatsMap',
  meta: [{ name: 'description', content: 'SeatsMap 客户案例：体育场馆、剧院、票务平台的座位图设计与选座方案实践。' }],
})

const cases = [
  { slug: 'gongti-center', title: '北京工人体育场', desc: '68,000 座超大型场馆的座位图数字化管理与在线选座方案。', tag: '体育场馆' },
  { slug: 'national-theater', title: '国家大剧院', desc: '多厅堂、多层楼座的复杂场馆座位图设计与演出选座系统。', tag: '剧院' },
]
</script>

<template>
  <div>
    <section class="page-hero">
      <div class="container">
        <h1>客户案例</h1>
        <p>SeatsMap 在体育场馆、剧院、票务平台的实际应用场景。</p>
      </div>
    </section>
    <section class="section">
      <div class="container">
        <div class="case-list">
          <NuxtLink v-for="c in cases" :key="c.slug" :to="`/cases/${c.slug}`" class="case-card">
            <span class="case-tag">{{ c.tag }}</span>
            <h2>{{ c.title }}</h2>
            <p>{{ c.desc }}</p>
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
.case-list { display: grid; grid-template-columns: repeat(2, 1fr); gap: 24px; max-width: 800px; margin: 0 auto; }
.case-card { padding: 28px; border: 1px solid #eee; border-radius: 12px; text-decoration: none; transition: all 0.2s; display: block; }
.case-card:hover { border-color: #d0dfff; box-shadow: 0 2px 12px rgba(74,124,255,0.06); text-decoration: none; }
.case-tag { display: inline-block; padding: 2px 10px; font-size: 12px; color: #4a7cff; background: #e8f0ff; border-radius: 4px; margin-bottom: 10px; }
.case-card h2 { font-size: 18px; font-weight: 600; color: #111; margin: 0 0 8px; }
.case-card p { font-size: 14px; color: #666; line-height: 1.6; margin: 0; }
@media (max-width: 768px) { .case-list { grid-template-columns: 1fr; } }
</style>
