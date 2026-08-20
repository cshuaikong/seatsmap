<script setup>
useHead({
  title: '票务平台座位图方案 - SeatsMap',
  meta: [{ name: 'description', content: '为票务平台提供座位图嵌入方案，JS SDK/Vue组件/NPM包多种接入方式，快速集成选座能力。' }],
})
</script>

<template>
  <div>
    <section class="page-hero">
      <div class="container">
        <h1>票务平台方案</h1>
        <p>为票务平台提供即插即用的座位图选座组件，快速集成到您的票务系统。</p>
      </div>
    </section>
    <section class="section">
      <div class="container">
        <div class="points">
          <div class="point"><h3>快速集成</h3><p>提供 JS SDK、Vue 组件、NPM 包三种接入方式，几行代码即可嵌入您的票务页面。</p></div>
          <div class="point"><h3>数据对接</h3><p>标准 RESTful API 对接，支持实时座位状态同步、订单锁定、并发控制。</p></div>
          <div class="point"><h3>白标定制</h3><p>完全自定义座位图视觉风格，匹配您的品牌设计语言，用户无感知嵌入。</p></div>
          <div class="point"><h3>高并发支持</h3><p>热门演出抢票场景下，座位锁定与释放机制确保数据一致性，防止超售。</p></div>
        </div>
      </div>
    </section>
    <section class="section" style="background: #f8faff; text-align: center;">
      <div class="container">
        <h2 class="section-title">为您的平台集成选座能力</h2>
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
