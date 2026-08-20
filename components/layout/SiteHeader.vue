<script setup>
const navLinks = [
  { label: '设计器', to: '/designer' },
  { label: '选座组件', to: '/picker' },
  { label: '接入方式', to: '/integration' },
  { label: '行业方案', to: '/industry/stadium' },
  { label: '案例', to: '/cases' },
  { label: '博客', to: '/blog' },
]
</script>

<template>
  <header class="site-header">
    <div class="header-inner">
      <NuxtLink to="/welcome" class="logo">
        <span class="logo-icon">◧</span>
        <span class="logo-text">SeatsMap</span>
      </NuxtLink>

      <nav class="main-nav">
        <NuxtLink
          v-for="link in navLinks"
          :key="link.to"
          :to="link.to"
          class="nav-link"
        >
          {{ link.label }}
        </NuxtLink>
      </nav>

      <div class="header-actions">
        <NuxtLink to="/login" class="btn-ghost">登录</NuxtLink>
        <NuxtLink to="/contact" class="btn-primary">免费试用</NuxtLink>
      </div>
    </div>
  </header>
</template>

<style scoped>
.site-header {
  position: sticky;
  top: 0;
  z-index: 50;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(8px);
  border-bottom: 1px solid #eee;
}

.header-inner {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 24px;
  height: 60px;
  display: flex;
  align-items: center;
  gap: 32px;
}

.logo {
  display: flex;
  align-items: center;
  gap: 8px;
  text-decoration: none;
  color: #111;
  font-weight: 700;
  font-size: 18px;
  flex-shrink: 0;
}

.logo-icon {
  font-size: 22px;
  color: #4a7cff;
}

.main-nav {
  display: flex;
  align-items: center;
  gap: 4px;
  flex: 1;
}

.nav-link {
  padding: 6px 14px;
  font-size: 14px;
  color: #555;
  text-decoration: none;
  border-radius: 6px;
  transition: all 0.15s;
}

.nav-link:hover {
  color: #111;
  background: #f5f5f5;
  text-decoration: none;
}

.nav-link.router-link-active {
  color: #4a7cff;
  font-weight: 500;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-shrink: 0;
}

.btn-ghost {
  padding: 6px 16px;
  font-size: 14px;
  color: #555;
  text-decoration: none;
  border-radius: 6px;
  transition: all 0.15s;
}

.btn-ghost:hover {
  color: #111;
  text-decoration: none;
}

.btn-primary {
  padding: 6px 18px;
  font-size: 14px;
  color: #fff;
  background: #4a7cff;
  border-radius: 6px;
  text-decoration: none;
  transition: all 0.15s;
}

.btn-primary:hover {
  background: #3a6ae8;
  text-decoration: none;
}
</style>
