<script setup>
useHead({
  title: '在线选座组件 - SeatsMap',
  meta: [
    { name: 'description', content: 'H5/微信小程序在线选座组件，Canvas驱动万座场馆毫秒级渲染，提供JS SDK与Vue组件两种接入方式。' },
    { property: 'og:title', content: '在线选座组件 - SeatsMap' },
    { property: 'og:description', content: 'H5/小程序选座组件，Canvas驱动，万座场馆毫秒级渲染。' },
  ],
})
</script>

<template>
  <div>
    <section class="page-hero">
      <div class="container">
        <h1>在线选座组件</h1>
        <p>H5 / 微信小程序双端支持，Canvas 驱动万座场馆毫秒级渲染。</p>
      </div>
    </section>

    <section class="section">
      <div class="container">
        <div class="feature-grid">
          <div class="feature-card">
            <h3>多端一致体验</h3>
            <p>同一套数据和渲染引擎，在微信 H5、小程序原生环境、移动端浏览器中保持一致的选座体验。</p>
          </div>
          <div class="feature-card">
            <h3>高性能渲染</h3>
            <p>Canvas 虚拟化渲染，仅绘制可见区域座位。万座场馆首屏 &lt;500ms，缩放平移保持 60fps。</p>
          </div>
          <div class="feature-card">
            <h3>灵活交互</h3>
            <p>支持单选、多选、连座选择、区域缩放、座位提示等丰富交互。可自定义选中样式和交互规则。</p>
          </div>
          <div class="feature-card">
            <h3>主题定制</h3>
            <p>座位颜色、形状、状态样式均可通过配置项自定义。轻松匹配您的品牌视觉风格。</p>
          </div>
        </div>
      </div>
    </section>

    <section class="section" style="background: #f8faff;">
      <div class="container">
        <h2 class="section-title">接入示例</h2>
        <div class="code-block">
          <code>&lt;template&gt;
  &lt;SeatsPicker
    :venue-id="venueId"
    :max-select="4"
    @select="handleSelect"
  /&gt;
&lt;/template&gt;

&lt;script setup&gt;
import { SeatsPicker } from 'seatsmap'

const venueId = 'venue_xxx'
function handleSelect(seats) {
  console.log('已选座位:', seats)
}
&lt;/script&gt;</code>
        </div>
        <div style="text-align: center; margin-top: 32px;">
          <NuxtLink to="/integration" class="btn btn-outline">查看完整文档</NuxtLink>
        </div>
      </div>
    </section>

    <section class="section cta-section">
      <div class="container" style="text-align: center;">
        <h2>立即体验选座组件</h2>
        <NuxtLink to="/contact" class="btn btn-primary btn-lg">申请试用</NuxtLink>
      </div>
    </section>
  </div>
</template>

<style scoped>
.container { max-width: 1200px; margin: 0 auto; padding: 0 24px; }
.section { padding: 80px 0; }
.section-title { font-size: 28px; font-weight: 700; color: #111; text-align: center; margin: 0 0 32px; }

.page-hero { padding: 80px 0 48px; background: linear-gradient(180deg, #f8faff 0%, #fff 100%); text-align: center; }
.page-hero h1 { font-size: 36px; font-weight: 800; color: #111; margin: 0 0 12px; }
.page-hero p { font-size: 16px; color: #555; margin: 0; }

.feature-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 24px; }
.feature-card { padding: 28px; border: 1px solid #eee; border-radius: 12px; }
.feature-card h3 { font-size: 17px; font-weight: 600; color: #111; margin: 0 0 8px; }
.feature-card p { font-size: 14px; color: #666; line-height: 1.7; margin: 0; }

.code-block { background: #1e1e2e; border-radius: 10px; padding: 24px; overflow-x: auto; max-width: 600px; margin: 0 auto; }
.code-block code { font-family: monospace; font-size: 13px; color: #cdd6f4; line-height: 1.7; white-space: pre; }

.cta-section { background: #f8faff; }
.cta-section h2 { font-size: 28px; font-weight: 700; color: #111; margin: 0 0 20px; }

.btn { display: inline-flex; align-items: center; padding: 10px 24px; font-size: 14px; font-weight: 500; border-radius: 8px; text-decoration: none; transition: all 0.15s; }
.btn-primary { background: #4a7cff; color: #fff; }
.btn-primary:hover { background: #3a6ae8; text-decoration: none; }
.btn-outline { border: 1px solid #ddd; color: #333; background: #fff; }
.btn-outline:hover { border-color: #4a7cff; color: #4a7cff; text-decoration: none; }
.btn-lg { padding: 14px 32px; font-size: 15px; }

@media (max-width: 768px) { .feature-grid { grid-template-columns: 1fr; } }
</style>
