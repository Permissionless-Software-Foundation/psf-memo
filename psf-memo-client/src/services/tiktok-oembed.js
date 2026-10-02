/*
  Effectful adapter that resolves TikTok short links to video ids through
  TikTok's CORS-enabled oEmbed endpoint.

  The network call is injected so this module stays unit testable and so the
  browser and acceptance paths can supply their own fetch.  Short links are the
  only inputs that need resolution: they carry an opaque code rather than the
  numeric video id, and the player frame cannot be built without one.
*/

const TIKTOK_OEMBED_ENDPOINT = 'https://www.tiktok.com/oembed'

// The oEmbed URL that returns embed metadata for `videoUrl`.
function tiktokOEmbedUrl (videoUrl) {
  return `${TIKTOK_OEMBED_ENDPOINT}?url=${encodeURIComponent(videoUrl)}`
}

/**
 * Resolve a TikTok video URL to its numeric video id via the oEmbed endpoint.
 * Returns null for a non-ok response, missing metadata, or any network or
 * parsing failure, so callers can fall back to a plain link.
 */
async function resolveTikTokVideoId (videoUrl, options = {}) {
  const fetchImpl = options.fetchImpl === undefined
    ? (typeof fetch === 'function' ? fetch : null)
    : options.fetchImpl
  if (typeof fetchImpl !== 'function') return null

  try {
    const response = await fetchImpl(tiktokOEmbedUrl(videoUrl))
    if (!response || response.ok === false) return null
    const data = await response.json()
    const id = data && data.embed_product_id
    return id ? String(id) : null
  } catch (err) {
    return null
  }
}

module.exports = {
  TIKTOK_OEMBED_ENDPOINT,
  tiktokOEmbedUrl,
  resolveTikTokVideoId
}
