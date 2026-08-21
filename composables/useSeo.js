const SITE_URL = 'https://seatmap.web.jinsc.cn'

export function useSeo(meta) {
  const { title, description, image = '/seatmap-hero.png', type = 'website', noindex = false } = meta
  const imageUrl = image?.startsWith?.('http') ? image : `${SITE_URL}${image}`
  useHead({
    title,
    htmlAttrs: { lang: 'zh-CN' },
    meta: [
      { name: 'description', content: description },
      { name: 'robots', content: noindex ? 'noindex, nofollow' : 'index, follow, max-image-preview:large' },
      { property: 'og:locale', content: 'zh_CN' }, { property: 'og:site_name', content: 'SeatsMap' },
      { property: 'og:title', content: title }, { property: 'og:description', content: description },
      { property: 'og:type', content: type }, { property: 'og:image', content: imageUrl },
      { name: 'twitter:card', content: 'summary_large_image' }, { name: 'twitter:title', content: title },
      { name: 'twitter:description', content: description }, { name: 'twitter:image', content: imageUrl },
    ],
  })
}

export function useCanonical(path) {
  const canonical = `${SITE_URL}${path}`
  useHead({ link: [{ rel: 'canonical', href: canonical }] })
  return canonical
}
