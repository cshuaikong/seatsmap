<script setup>
const props = defineProps({
  error: { type: Object, required: true },
})

const statusCode = computed(() => props.error?.statusCode || 500)
const message = computed(() => props.error?.message || '服务器内部错误')

useHead({
  title: `${statusCode.value} - SeatsMap`,
})

function handleError() {
  clearError({ redirect: '/' })
}
</script>

<template>
  <div class="error-page">
    <div class="error-content">
      <h1>{{ statusCode }}</h1>
      <p>{{ message }}</p>
      <button @click="handleError">返回首页</button>
    </div>
  </div>
</template>

<style scoped>
.error-page {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  background: #f5f5f5;
}

.error-content {
  text-align: center;
}

.error-content h1 {
  font-size: 72px;
  font-weight: 700;
  color: #4a7cff;
  margin: 0;
}

.error-content p {
  font-size: 18px;
  color: #666;
  margin: 16px 0 32px;
}

.error-content button {
  padding: 10px 28px;
  border: 1px solid #4a7cff;
  background: #4a7cff;
  color: #fff;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.2s;
}

.error-content button:hover {
  background: #3a6ae8;
}
</style>
