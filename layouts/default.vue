<!-- 官网默认 Layout：Header + 内容区 + Footer，可滚动 -->
<template>
  <div class="site-layout">
    <LayoutSiteHeader />
    <main class="site-main">
      <slot />
    </main>
    <LayoutSiteFooter />
  </div>
</template>

<style scoped>
.site-layout {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
}

.site-main {
  flex: 1;
}
</style>
