/**
 * 通用 SEO meta 设置 composable
 * 为每个页面提供 title / description / canonical / OG 的统一设置
 */

export function useSeo(meta) {
  const {
    title,
    description,
    image = '/og-images/default.png',
    type = 'website',
    noindex = false,
  } = meta

  useHead({
    title,
    meta: [
      { name: 'description', content: description },
      { property: 'og:title', content: title },
      { property: 'og:description', content: description },
      { property: 'og:type', content: type },
      { property: 'og:image', content: image },
      { name: 'twitter:card', content: 'summary_large_image' },
      { name: 'twitter:title', content: title },
      { name: 'twitter:description', content: description },
      { name: 'twitter:image', content: image },
      ...(noindex
        ? [
            { name: 'robots', content: 'noindex, nofollow' },
          ]
        : []),
    ],
  })
}

/**
 * 生成 canonical URL
 */
export function useCanonical(path) {
  const siteUrl = 'https://seatmap.web.jinsc.cn'
  const canonical = `${siteUrl}${path}`

  useHead({
    link: [
      { rel: 'canonical', href: canonical },
    ],
  })

  return canonical
}
