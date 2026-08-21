<!-- Nuxt 根组件 -->
<template>
  <div id="app">
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
  </div>
</template>

<script setup>
const runtimeConfig = useRuntimeConfig()
const route = useRoute()
const googleAnalyticsId = runtimeConfig.public.googleAnalyticsId?.trim() || ''
const hasGoogleAnalytics = /^G-[A-Z0-9]+$/i.test(googleAnalyticsId)

if (hasGoogleAnalytics) {
  useHead({
    script: [
      { key: 'google-analytics', async: true, src: `https://www.googletagmanager.com/gtag/js?id=${googleAnalyticsId}` },
      {
        key: 'google-analytics-config',
        innerHTML: `window.dataLayer = window.dataLayer || []; function gtag(){dataLayer.push(arguments);} gtag('js', new Date()); gtag('config', '${googleAnalyticsId}');`,
      },
    ],
  })

  watch(() => route.fullPath, (path) => {
    if (import.meta.client && window.gtag) {
      window.gtag('config', googleAnalyticsId, { page_path: path })
    }
  })
}
</script>
