<script setup>
useHead({
  title: '体育场馆座位图方案 - SeatsMap',
  meta: [{ name: 'description', content: '为体育场馆提供专业座位图设计与选座方案，支持万座以上大型场馆，Canvas高性能渲染。' }],
})
</script>

<template>
  <div>
    <section class="page-hero">
      <div class="container">
        <h1>体育场馆方案</h1>
        <p>为大型体育场馆提供专业座位图设计与在线选座解决方案。</p>
      </div>
    </section>

    <section class="section">
      <div class="container">
        <div class="points">
          <div class="point"><h3>大型场馆支持</h3><p>支持数万座位的超大型场馆，Canvas 虚拟化渲染确保流畅体验。工人体育场、鸟巢级别场馆轻松应对。</p></div>
          <div class="point"><h3>多赛事场景</h3><p>同一场馆可配置多种座位布局，适配足球、篮球、演唱会等不同赛事类型。</p></div>
          <div class="point"><h3>实时座位状态</h3><p>与票务系统实时同步座位状态，已售、锁定、可用一目了然，避免超售。</p></div>
          <div class="point"><h3>移动端购票</h3><p>H5 和小程序选座组件完美适配移动端，球迷可随时随地在手机上线上选座购票。</p></div>
        </div>
      </div>
    </section>

    <section class="section" style="background: #f8faff; text-align: center;">
      <div class="container">
        <h2 class="section-title">为您的场馆定制方案</h2>
        <p style="color: #666; margin-bottom: 24px;">联系我们获取专属方案演示</p>
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
