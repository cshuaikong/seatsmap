<script setup>
/**
 * 官网首页（临时放在 /welcome，正式上线后切换到 /）
 */
definePageMeta({
  layout: 'default',
})

useHead({
  title: 'SeatsMap - 专业在线座位图设计器与选座组件',
  meta: [
    { name: 'description', content: '在线座位图设计器与H5/微信小程序选座组件，适用于体育场馆、剧院、票务平台。Canvas驱动，万座场馆毫秒级渲染，快速接入。' },
    { property: 'og:title', content: 'SeatsMap - 专业在线座位图设计器与选座组件' },
    { property: 'og:description', content: 'Canvas驱动，万座场馆毫秒级渲染。支持H5、微信小程序，提供JS SDK与Vue组件快速接入。' },
    { property: 'og:type', content: 'website' },
  ],
  script: [
    {
      type: 'application/ld+json',
      innerHTML: JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'SoftwareApplication',
        name: 'SeatsMap',
        applicationCategory: 'DesignApplication',
        operatingSystem: 'Web',
        description: '在线座位图设计器与H5/微信小程序选座组件',
        url: 'https://seatmap.web.jinsc.cn',
      }),
    },
  ],
})
</script>

<template>
  <div>
    <!-- ==================== Hero ==================== -->
    <section class="hero">
      <div class="container hero-inner">
        <div class="hero-text">
          <h1>专业在线座位图设计器<br/><span class="text-accent">与选座组件</span></h1>
          <p class="hero-sub">适用于体育场馆、剧院、票务平台。Canvas 驱动，万座场馆毫秒级渲染，H5 / 微信小程序双端支持。</p>
          <div class="hero-actions">
            <NuxtLink to="/contact" class="btn btn-primary">免费试用</NuxtLink>
            <NuxtLink to="/designer" class="btn btn-outline">了解更多</NuxtLink>
          </div>
        </div>
        <div class="hero-visual">
          <div class="hero-mockup">
            <div class="mockup-bar"><span class="dot"></span><span class="dot"></span><span class="dot"></span></div>
            <div class="mockup-body">
              <div class="mockup-grid">
                <span v-for="i in 48" :key="i" class="seat-dot" :class="{ taken: i % 7 === 0 }"></span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- ==================== 核心特性 ==================== -->
    <section class="section features">
      <div class="container">
        <h2 class="section-title">核心能力</h2>
        <p class="section-desc">从场馆设计到用户选座，一站式解决方案</p>
        <div class="feature-grid">
          <div class="feature-card">
            <div class="feature-icon">🎨</div>
            <h3>可视化场馆设计器</h3>
            <p>拖拽式操作，支持底图导入、分区管理、批量排座。所见即所得的 Canvas 编辑体验。</p>
          </div>
          <div class="feature-card">
            <div class="feature-icon">📱</div>
            <h3>H5 / 小程序选座</h3>
            <p>同一套数据，多端一致体验。支持微信 H5、小程序原生渲染，流畅交互。</p>
          </div>
          <div class="feature-card">
            <div class="feature-icon">⚡</div>
            <h3>大场馆高性能</h3>
            <p>Canvas 虚拟化渲染，万座场馆毫秒级首屏。缩放、平移无卡顿，流畅浏览超大场馆。</p>
          </div>
          <div class="feature-card">
            <div class="feature-icon">🔌</div>
            <h3>快速接入</h3>
            <p>提供 JS SDK、Vue 组件、NPM 包。几行代码即可嵌入您的应用，API 灵活可扩展。</p>
          </div>
        </div>
      </div>
    </section>

    <!-- ==================== 性能展示 ==================== -->
    <section class="section perf-section">
      <div class="container perf-inner">
        <div class="perf-text">
          <h2 class="section-title">为大型场馆而生</h2>
          <p>基于 Canvas 虚拟化渲染引擎，只绘制可见区域的座位。即使数万座位的场馆，也能保持 60fps 流畅交互。</p>
          <ul class="perf-stats">
            <li><strong>10,000+</strong><span>座位毫秒级渲染</span></li>
            <li><strong>60fps</strong><span>缩放平移流畅</span></li>
            <li><strong>&lt;200KB</strong><span>组件 gzip 体积</span></li>
          </ul>
        </div>
        <div class="perf-visual">
          <div class="perf-bars">
            <div class="perf-bar" style="--w: 95%; --c: #4a7cff;"><span>首屏渲染</span></div>
            <div class="perf-bar" style="--w: 88%; --c: #5b9aff;"><span>缩放流畅度</span></div>
            <div class="perf-bar" style="--w: 92%; --c: #7bb4ff;"><span>内存占用</span></div>
          </div>
        </div>
      </div>
    </section>

    <!-- ==================== 接入方式 ==================== -->
    <section class="section integration">
      <div class="container">
        <h2 class="section-title">多种接入方式</h2>
        <p class="section-desc">选择最适合你技术栈的方式，几行代码即可运行</p>
        <div class="int-grid">
          <div class="int-card">
            <h3>JS SDK</h3>
            <div class="code-block">
              <code>&lt;script src="seatsmap.js"&gt;&lt;/script&gt;
&lt;script&gt;
  const picker = new SeatsMap.Picker(el, {
    venueId: 'venue_xxx'
  })
&lt;/script&gt;</code>
            </div>
          </div>
          <div class="int-card">
            <h3>Vue 组件</h3>
            <div class="code-block">
              <code>&lt;template&gt;
  &lt;SeatsPicker :venue-id="id"
    @select="onSelect" /&gt;
&lt;/template&gt;
&lt;script setup&gt;
import { SeatsPicker } from 'seatsmap'
&lt;/script&gt;</code>
            </div>
          </div>
          <div class="int-card">
            <h3>NPM 包</h3>
            <div class="code-block">
              <code>npm install seatsmap

// 按需引入设计器或选座
import { Designer, Picker } from 'seatsmap'
import 'seatsmap/style.css'</code>
            </div>
          </div>
        </div>
        <div class="int-cta">
          <NuxtLink to="/integration" class="btn btn-outline">查看完整接入文档</NuxtLink>
        </div>
      </div>
    </section>

    <!-- ==================== CTA ==================== -->
    <section class="section cta-section">
      <div class="container cta-inner">
        <h2>开始构建您的座位图体验</h2>
        <p>免费试用，无需信用卡。几分钟内完成场馆设计和选座组件接入。</p>
        <div class="cta-actions">
          <NuxtLink to="/contact" class="btn btn-primary btn-lg">免费试用</NuxtLink>
          <NuxtLink to="/console" class="btn btn-outline btn-lg">进入控制台</NuxtLink>
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped>
.container { max-width: 1200px; margin: 0 auto; padding: 0 24px; }
.section { padding: 80px 0; }
.section-title { font-size: 28px; font-weight: 700; color: #111; text-align: center; margin: 0 0 8px; }
.section-desc { text-align: center; color: #666; font-size: 15px; margin: 0 0 48px; }

/* Hero */
.hero { padding: 80px 0 60px; background: linear-gradient(180deg, #f8faff 0%, #fff 100%); }
.hero-inner { display: grid; grid-template-columns: 1fr 1fr; gap: 48px; align-items: center; }
.hero-text h1 { font-size: 40px; font-weight: 800; line-height: 1.25; color: #111; margin: 0 0 16px; }
.text-accent { color: #4a7cff; }
.hero-sub { font-size: 16px; color: #555; line-height: 1.7; margin: 0 0 28px; }
.hero-actions { display: flex; gap: 12px; }

.btn { display: inline-flex; align-items: center; justify-content: center; padding: 10px 24px; font-size: 14px; font-weight: 500; border-radius: 8px; text-decoration: none; transition: all 0.15s; cursor: pointer; border: none; }
.btn-primary { background: #4a7cff; color: #fff; }
.btn-primary:hover { background: #3a6ae8; text-decoration: none; }
.btn-outline { border: 1px solid #ddd; color: #333; background: #fff; }
.btn-outline:hover { border-color: #4a7cff; color: #4a7cff; text-decoration: none; }
.btn-lg { padding: 14px 32px; font-size: 15px; }

.hero-visual { display: flex; justify-content: center; }
.hero-mockup { width: 100%; max-width: 480px; border-radius: 12px; overflow: hidden; box-shadow: 0 8px 32px rgba(0,0,0,0.08); border: 1px solid #e8e8e8; }
.mockup-bar { background: #f5f5f5; padding: 10px 14px; display: flex; gap: 6px; }
.dot { width: 10px; height: 10px; border-radius: 50%; background: #ddd; }
.mockup-body { padding: 24px; background: #fff; min-height: 260px; display: flex; align-items: center; justify-content: center; }
.mockup-grid { display: grid; grid-template-columns: repeat(8, 1fr); gap: 6px; width: 100%; }
.seat-dot { width: 100%; aspect-ratio: 1; border-radius: 3px; background: #e0eaff; transition: background 0.15s; }
.seat-dot.taken { background: #ccc; }
.seat-dot:hover { background: #4a7cff; }

/* Features */
.feature-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 24px; }
.feature-card { padding: 32px; border: 1px solid #eee; border-radius: 12px; transition: all 0.2s; }
.feature-card:hover { border-color: #d0dfff; box-shadow: 0 4px 16px rgba(74, 124, 255, 0.06); }
.feature-icon { font-size: 28px; margin-bottom: 16px; }
.feature-card h3 { font-size: 17px; font-weight: 600; color: #111; margin: 0 0 8px; }
.feature-card p { font-size: 14px; color: #666; line-height: 1.7; margin: 0; }

/* Performance */
.perf-section { background: #f8faff; }
.perf-inner { display: grid; grid-template-columns: 1fr 1fr; gap: 48px; align-items: center; }
.perf-text .section-title { text-align: left; }
.perf-text p { font-size: 15px; color: #555; line-height: 1.7; margin: 12px 0 24px; }
.perf-stats { display: flex; gap: 32px; list-style: none; padding: 0; margin: 0; }
.perf-stats li { display: flex; flex-direction: column; }
.perf-stats strong { font-size: 24px; color: #4a7cff; font-weight: 700; }
.perf-stats span { font-size: 13px; color: #888; margin-top: 4px; }
.perf-bars { display: flex; flex-direction: column; gap: 16px; }
.perf-bar { height: 36px; border-radius: 8px; background: var(--c); width: var(--w); display: flex; align-items: center; padding: 0 14px; transition: width 0.8s ease; }
.perf-bar span { font-size: 13px; color: #fff; font-weight: 500; }

/* Integration */
.int-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 24px; }
.int-card { border: 1px solid #eee; border-radius: 12px; padding: 24px; }
.int-card h3 { font-size: 16px; font-weight: 600; color: #111; margin: 0 0 16px; }
.code-block { background: #1e1e2e; border-radius: 8px; padding: 16px; overflow-x: auto; }
.code-block code { font-family: 'Fira Code', 'Cascadia Code', monospace; font-size: 12px; color: #cdd6f4; line-height: 1.7; white-space: pre; }
.int-cta { text-align: center; margin-top: 32px; }

/* CTA */
.cta-section { background: linear-gradient(135deg, #4a7cff 0%, #6b5ce7 100%); text-align: center; }
.cta-inner h2 { font-size: 28px; font-weight: 700; color: #fff; margin: 0 0 12px; }
.cta-inner p { font-size: 15px; color: rgba(255,255,255,0.85); margin: 0 0 28px; }
.cta-actions { display: flex; gap: 12px; justify-content: center; }
.cta-actions .btn-primary { background: #fff; color: #4a7cff; }
.cta-actions .btn-primary:hover { background: #f0f0f0; }
.cta-actions .btn-outline { border-color: rgba(255,255,255,0.5); color: #fff; background: transparent; }
.cta-actions .btn-outline:hover { border-color: #fff; }

/* Responsive */
@media (max-width: 768px) {
  .hero-inner { grid-template-columns: 1fr; }
  .hero-text h1 { font-size: 28px; }
  .hero-visual { display: none; }
  .feature-grid { grid-template-columns: 1fr; }
  .perf-inner { grid-template-columns: 1fr; }
  .int-grid { grid-template-columns: 1fr; }
}
</style>
