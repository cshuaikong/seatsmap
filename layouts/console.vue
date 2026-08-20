<!-- 控制台 Layout：全屏、不可滚动、无 Header/Footer -->
<template>
  <div class="console-layout">
    <slot />
  </div>
</template>

<style>
/* 控制台全局样式：禁止页面滚动 */
body.console-page {
  margin: 0;
  padding: 0;
  overflow: hidden;
  height: 100vh;
}
</style>

<style scoped>
.console-layout {
  display: flex;
  flex-direction: column;
  height: 100vh;
  overflow: hidden;
  background: #f5f5f5;
}
</style>
