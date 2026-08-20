/**
 * API 层 —— 使用 Nuxt 内置 $fetch 替代 axios
 * 所有方法自动拼接 runtimeConfig.public.apiBase 前缀
 */
export function useApi() {
  const config = useRuntimeConfig()
  const base = config.public.apiBase

  // ==================== 场馆 ====================

  /** 场馆列表 */
  function fetchVenueList() {
    return $fetch(`${base}/venue/list`)
  }

  /** 场馆详情（含分区 sections + 排 rows） */
  function fetchVenueDetail(venueId) {
    return $fetch(`${base}/venue`, {
      query: { venue_id: venueId },
    })
  }

  /** 座位列表（按 row_id 关联到排） */
  function fetchVenueSeats(venueId) {
    return $fetch(`${base}/venue/seats`, {
      query: { venue_id: venueId },
    })
  }

  /**
   * 保存（新增+保存一体）
   * saveHandler 契约：必须显式 return true 才算成功
   */
  async function saveVenue(data) {
    const res = await $fetch(`${base}/venue/save`, {
      method: 'POST',
      body: data,
    })
    if (res?.code !== undefined && res.code !== 0) {
      throw new Error(res.msg || '保存失败')
    }
    return true
  }

  /**
   * 图片上传（底图/水印共用）
   * uploadHandler 契约：入参 File（PNG），返回图片 URL 字符串
   */
  async function uploadImage(file) {
    const form = new FormData()
    form.append('file', file)
    const res = await $fetch(`${base}/upload`, {
      method: 'POST',
      body: form,
    })
    if (res?.code !== undefined && res.code !== 0) {
      throw new Error(res.msg || '图片上传失败')
    }
    const url = res?.data?.url
    if (!url) throw new Error('图片上传失败：接口未返回图片地址')
    return url
  }

  /** 删除场馆 */
  function deleteVenue(venueId) {
    return $fetch(`${base}/venue/delete`, {
      method: 'POST',
      query: { venue_id: venueId },
    })
  }

  return {
    fetchVenueList,
    fetchVenueDetail,
    fetchVenueSeats,
    saveVenue,
    uploadImage,
    deleteVenue,
  }
}
