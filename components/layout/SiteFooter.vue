<template>
  <footer class="site-footer">
    <div class="footer-inner">
      <div class="footer-grid">
        <div class="footer-brand">
          <div class="footer-logo">◧ SeatsMap</div>
          <p class="footer-desc">专业在线座位图设计器与选座组件，适用于体育场馆、剧院、票务平台。</p>
        </div>

        <div class="footer-col">
          <h4>产品</h4>
          <NuxtLink to="/designer">场馆设计器</NuxtLink>
          <NuxtLink to="/picker">在线选座组件</NuxtLink>
          <NuxtLink to="/integration">接入方式</NuxtLink>
        </div>

        <div class="footer-col">
          <h4>行业方案</h4>
          <NuxtLink to="/industry/stadium">体育场馆</NuxtLink>
          <NuxtLink to="/industry/theater">剧院</NuxtLink>
          <NuxtLink to="/industry/ticketing">票务平台</NuxtLink>
        </div>

        <div class="footer-col">
          <h4>资源</h4>
          <NuxtLink to="/cases">案例</NuxtLink>
          <NuxtLink to="/blog">博客</NuxtLink>
          <NuxtLink to="/faq">常见问题</NuxtLink>
        </div>

        <div class="footer-col">
          <h4>关于</h4>
          <NuxtLink to="/contact">联系我们</NuxtLink>
          <NuxtLink to="/login">登录</NuxtLink>
          <NuxtLink to="/console">控制台</NuxtLink>
        </div>
      </div>

      <div class="footer-bottom">
        <span>© {{ new Date().getFullYear() }} SeatsMap. All rights reserved.</span>
      </div>
    </div>
  </footer>
</template>

<style scoped>
.site-footer {
  background: #fafafa;
  border-top: 1px solid #eee;
  margin-top: auto;
}

.footer-inner {
  max-width: 1200px;
  margin: 0 auto;
  padding: 48px 24px 24px;
}

.footer-grid {
  display: grid;
  grid-template-columns: 1.5fr repeat(4, 1fr);
  gap: 32px;
}

.footer-brand {
  padding-right: 24px;
}

.footer-logo {
  font-size: 18px;
  font-weight: 700;
  color: #111;
  margin-bottom: 12px;
}

.footer-desc {
  font-size: 13px;
  color: #888;
  line-height: 1.6;
  margin: 0;
}

.footer-col {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.footer-col h4 {
  font-size: 13px;
  font-weight: 600;
  color: #333;
  margin: 0 0 4px;
}

.footer-col a {
  font-size: 13px;
  color: #666;
  text-decoration: none;
  transition: color 0.15s;
}

.footer-col a:hover {
  color: #4a7cff;
  text-decoration: none;
}

.footer-bottom {
  margin-top: 40px;
  padding-top: 20px;
  border-top: 1px solid #eee;
  font-size: 12px;
  color: #aaa;
}

@media (max-width: 768px) {
  .footer-grid {
    grid-template-columns: 1fr 1fr;
  }
  .footer-brand {
    grid-column: 1 / -1;
  }
}
</style>
