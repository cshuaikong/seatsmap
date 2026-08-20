<script setup>
useHead({
  title: '接入方式 - SeatsMap',
  meta: [{ name: 'description', content: 'SeatsMap 提供 JS SDK、Vue 组件、NPM 包三种接入方式，附带完整 API 文档和示例代码。' }],
})
</script>

<template>
  <div>
    <section class="page-hero">
      <div class="container">
        <h1>接入方式</h1>
        <p>选择最适合您技术栈的方式，几行代码即可运行。</p>
      </div>
    </section>

    <section class="section">
      <div class="container">
        <div class="method-grid">
          <div class="method-card">
            <h3>方式一：JS SDK</h3>
            <p>通过 <code>&lt;script&gt;</code> 标签引入，适用于任何 Web 项目。</p>
            <div class="code-block"><code>&lt;script src="https://cdn.seatsmap.com/sdk.js"&gt;&lt;/script&gt;
&lt;script&gt;
  const picker = new SeatsMap.Picker(document.getElementById('app'), {
    venueId: 'venue_xxx',
    onSelect: (seats) => console.log(seats)
  })
&lt;/script&gt;</code></div>
          </div>

          <div class="method-card">
            <h3>方式二：Vue 组件</h3>
            <p>为 Vue 3 项目提供开箱即用的组件封装。</p>
            <div class="code-block"><code>npm install seatsmap-vue

// main.js
import SeatsMap from 'seatsmap-vue'
app.use(SeatsMap)

// 页面中使用
&lt;SeatsPicker venue-id="venue_xxx" @select="onSelect" /&gt;</code></div>
          </div>

          <div class="method-card">
            <h3>方式三：NPM 包</h3>
            <p>按需引入设计器或选座组件，支持 Tree Shaking。</p>
            <div class="code-block"><code>npm install seatsmap

import { Designer, Picker } from 'seatsmap'
import 'seatsmap/style.css'

const picker = new Picker(el, { venueId: 'xxx' })</code></div>
          </div>
        </div>
      </div>
    </section>

    <section class="section" style="background: #f8faff;">
      <div class="container" style="text-align: center;">
        <h2 class="section-title">API 参考</h2>
        <p style="color: #666; margin-bottom: 24px;">完整 API 文档将在正式上线后提供。如需提前获取，请联系我们。</p>
        <NuxtLink to="/contact" class="btn btn-primary">联系我们获取文档</NuxtLink>
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

.method-grid { display: flex; flex-direction: column; gap: 32px; }
.method-card { padding: 32px; border: 1px solid #eee; border-radius: 12px; }
.method-card h3 { font-size: 18px; font-weight: 600; color: #111; margin: 0 0 8px; }
.method-card p { font-size: 14px; color: #666; line-height: 1.6; margin: 0 0 16px; }
.method-card code { font-size: 12px; }

.code-block { background: #1e1e2e; border-radius: 8px; padding: 20px; overflow-x: auto; }
.code-block code { font-family: monospace; color: #cdd6f4; line-height: 1.7; white-space: pre; }

.btn { display: inline-flex; padding: 10px 24px; font-size: 14px; font-weight: 500; border-radius: 8px; text-decoration: none; }
.btn-primary { background: #4a7cff; color: #fff; }
.btn-primary:hover { background: #3a6ae8; text-decoration: none; }
</style>
