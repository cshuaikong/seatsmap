<script setup>
useHead({
  title: '场馆设计器 - SeatsMap',
  meta: [
    { name: 'description', content: '在线可视化座位图设计器。拖拽式操作，支持底图导入、分区管理、批量排座，所见即所得的 Canvas 编辑体验。' },
    { property: 'og:title', content: '场馆设计器 - SeatsMap' },
    { property: 'og:description', content: '拖拽式场馆设计，底图导入、分区管理、批量排座，所见即所得。' },
  ],
})
</script>

<template>
  <div>
    <section class="page-hero">
      <div class="container">
        <h1>场馆设计器</h1>
        <p>所见即所得的 Canvas 座位图编辑体验，从零构建专业场馆座位图。</p>
      </div>
    </section>

    <section class="section">
      <div class="container">
        <div class="feature-list">
          <div class="feature-item">
            <div class="feature-content">
              <h2>底图导入与描边</h2>
              <p>上传场馆平面图作为底图，沿边缘描边快速创建分区轮廓。支持 PNG、JPG 格式，自动缩放适配画布。</p>
            </div>
          </div>
          <div class="feature-item reverse">
            <div class="feature-content">
              <h2>分区管理</h2>
              <p>可视化创建多个区域分区，设置分区名称、颜色标识和票价等级。支持分区拖拽调整、合并与拆分。</p>
            </div>
          </div>
          <div class="feature-item">
            <div class="feature-content">
              <h2>批量排座</h2>
              <p>框选区域批量生成座位排，支持设置排数、每排座数、曲线排列。一键操作替代逐个拖拽。</p>
            </div>
          </div>
          <div class="feature-item reverse">
            <div class="feature-content">
              <h2>标签与分类</h2>
              <p>为座位添加分类标签（VIP、普通、无障碍等），支持按类别批量修改属性，与票务系统无缝对接。</p>
            </div>
          </div>
        </div>
      </div>
    </section>

    <section class="section cta-section">
      <div class="container" style="text-align: center;">
        <h2>开始设计您的场馆</h2>
        <p>免费注册即可使用完整设计器功能</p>
        <NuxtLink to="/console/venues/new" class="btn btn-primary btn-lg">创建设计</NuxtLink>
      </div>
    </section>
  </div>
</template>

<style scoped>
.container { max-width: 1200px; margin: 0 auto; padding: 0 24px; }
.section { padding: 80px 0; }

.page-hero {
  padding: 80px 0 48px;
  background: linear-gradient(180deg, #f8faff 0%, #fff 100%);
  text-align: center;
}
.page-hero h1 { font-size: 36px; font-weight: 800; color: #111; margin: 0 0 12px; }
.page-hero p { font-size: 16px; color: #555; margin: 0; }

.feature-list { display: flex; flex-direction: column; gap: 48px; }
.feature-item {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 48px;
  align-items: center;
}
.feature-item.reverse { direction: rtl; }
.feature-item.reverse > * { direction: ltr; }
.feature-content h2 { font-size: 22px; font-weight: 700; color: #111; margin: 0 0 12px; }
.feature-content p { font-size: 15px; color: #555; line-height: 1.7; margin: 0; }

.cta-section { background: #f8faff; }
.cta-section h2 { font-size: 28px; font-weight: 700; color: #111; margin: 0 0 8px; }
.cta-section p { font-size: 15px; color: #666; margin: 0 0 24px; }

.btn { display: inline-flex; align-items: center; padding: 10px 24px; font-size: 14px; font-weight: 500; border-radius: 8px; text-decoration: none; transition: all 0.15s; }
.btn-primary { background: #4a7cff; color: #fff; }
.btn-primary:hover { background: #3a6ae8; text-decoration: none; }
.btn-lg { padding: 14px 32px; font-size: 15px; }

@media (max-width: 768px) {
  .feature-item, .feature-item.reverse { grid-template-columns: 1fr; direction: ltr; }
}
</style>
