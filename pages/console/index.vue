<script setup>
/**
 * 控制台入口：重定向到场馆列表
 */
definePageMeta({
  ssr: false,
})

navigateTo('/console/venues', { replace: true })
</script>

<template>
  <div class="redirecting">
    <p>正在跳转…</p>
  </div>
</template>

<style scoped>
.redirecting {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100vh;
  color: #999;
}
</style>
