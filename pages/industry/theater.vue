<script setup>
useHead({
  title: '剧院座位图方案 - SeatsMap',
  meta: [{ name: 'description', content: '为剧院、音乐厅、演出场馆提供座位图设计与在线选座方案，支持多层楼座和异形布局。' }],
})
</script>

<template>
  <div>
    <section class="page-hero">
      <div class="container">
        <h1>剧院方案</h1>
        <p>为剧院、音乐厅、演出场馆提供座位图设计与在线选座解决方案。</p>
      </div>
    </section>
    <section class="section">
      <div class="container">
        <div class="points">
          <div class="point"><h3>多层楼座支持</h3><p>完美呈现池座、楼座、包厢等多层结构，支持异形座位排列和弧形排列。</p></div>
          <div class="point"><h3>演出场次管理</h3><p>同一场馆不同演出场次可独立配置座位状态和票价，灵活应对演出季安排。</p></div>
          <div class="point"><h3>视野预览</h3><p>支持从每个座位视角预览舞台效果，帮助观众选择最佳位置。</p></div>
          <div class="point"><h3>无障碍座位</h3><p>标注无障碍座位和陪同座位，符合场馆无障碍设施规范。</p></div>
        </div>
      </div>
    </section>
    <section class="section" style="background: #f8faff; text-align: center;">
      <div class="container">
        <h2 class="section-title">为您的剧院定制方案</h2>
        <NuxtLink to="/contact" class="btn btn-primary">联系咨询</NuxtLink>
      </div>
    </section>
  </div>
</template>

<style scoped>
.container { max-width: 1200px; margin: 0 auto; padding: 0 24px; }
.section { padding: 80px 0; }
.section-title { font-size: 28px; font-weight: 700; color: #111; margin: 0 0 12px; }
.page-hero { padding: 80px 0 48px; background: linear-gradient(180deg, #f8faff 0%, #fff 100%); text-align: center; }
.page-hero h1 { font-size: 36px; font-weight: 800; color: #111; margin: 0 0 12px; }
.page-hero p { font-size: 16px; color: #555; margin: 0; }
.points { display: grid; grid-template-columns: repeat(2, 1fr); gap: 24px; }
.point { padding: 28px; border: 1px solid #eee; border-radius: 12px; }
.point h3 { font-size: 17px; font-weight: 600; color: #111; margin: 0 0 8px; }
.point p { font-size: 14px; color: #666; line-height: 1.7; margin: 0; }
.btn { display: inline-flex; padding: 10px 24px; font-size: 14px; font-weight: 500; border-radius: 8px; text-decoration: none; }
.btn-primary { background: #4a7cff; color: #fff; }
.btn-primary:hover { background: #3a6ae8; text-decoration: none; }
@media (max-width: 768px) { .points { grid-template-columns: 1fr; } }
</style>
