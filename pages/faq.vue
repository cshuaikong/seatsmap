<script setup>
useHead({
  title: '常见问题 - SeatsMap',
  meta: [{ name: 'description', content: 'SeatsMap 常见问题解答：产品功能、接入方式、定价、技术支持等。' }],
})

const faqs = [
  { q: 'SeatsMap 支持哪些平台？', a: 'SeatsMap 支持 Web（PC 和移动端 H5）、微信小程序。设计器在所有现代浏览器中运行，选座组件支持 H5 和小程序双端。' },
  { q: '如何接入 SeatsMap？', a: '我们提供 JS SDK、Vue 组件和 NPM 包三种接入方式。详见接入方式页面，几行代码即可完成集成。' },
  { q: '支持多大的场馆？', a: 'SeatsMap 采用 Canvas 虚拟化渲染引擎，已验证支持 68,000+ 座位的超大型场馆（如北京工人体育场），首屏渲染时间 < 500ms。' },
  { q: '是否免费？', a: '我们提供免费试用。正式定价根据使用场景和规模定制，请联系我们的商务团队获取报价。' },
  { q: '数据安全如何保障？', a: '所有数据传输使用 HTTPS 加密，场馆数据存储在云端并定期备份。我们不会将您的场馆数据用于任何第三方用途。' },
  { q: '是否支持自定义样式？', a: '选座组件支持完整的主题定制，包括座位颜色、形状、选中状态等。设计器也支持自定义底图和分区颜色。' },
]
</script>

<template>
  <div>
    <section class="page-hero">
      <div class="container">
        <h1>常见问题</h1>
        <p>关于 SeatsMap 产品、接入和技术的常见问题解答。</p>
      </div>
    </section>

    <section class="section">
      <div class="container">
        <div class="faq-list">
          <details v-for="(faq, i) in faqs" :key="i" class="faq-item">
            <summary class="faq-q">{{ faq.q }}</summary>
            <div class="faq-a">{{ faq.a }}</div>
          </details>
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

.faq-list { max-width: 720px; margin: 0 auto; display: flex; flex-direction: column; gap: 12px; }
.faq-item {
  border: 1px solid #eee; border-radius: 10px; overflow: hidden;
  transition: border-color 0.2s;
}
.faq-item[open] { border-color: #d0dfff; }
.faq-q {
  padding: 16px 20px; font-size: 15px; font-weight: 600; color: #111;
  cursor: pointer; list-style: none; display: flex; justify-content: space-between; align-items: center;
}
.faq-q::-webkit-details-marker { display: none; }
.faq-q::after { content: '+'; font-size: 18px; color: #aaa; transition: transform 0.2s; }
.faq-item[open] .faq-q::after { content: '−'; }
.faq-a { padding: 0 20px 16px; font-size: 14px; color: #666; line-height: 1.7; }
</style>
