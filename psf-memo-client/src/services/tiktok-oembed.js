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

// Prefer an injected fetch, then the global fetch, then nothing.
function pickFetch (options) {
  if (options.fetchImpl !== undefined) return options.fetchImpl
  return typeof fetch === 'function' ? fetch : null
}

// A response is usable unless it is missing or explicitly not ok.
function isOkResponse (response) {
  return Boolean(response) && response.ok !== false
}

// Pull the video id out of oEmbed metadata, or null when it is absent.
function videoIdFromMetadata (data) {
  const id = data && data.embed_product_id
  return id ? String(id) : null
}

/**
 * Resolve a TikTok video URL to its numeric video id via the oEmbed endpoint.
 * Returns null for a non-ok response, missing metadata, or any network or
 * parsing failure, so callers can fall back to a plain link.
 */
async function resolveTikTokVideoId (videoUrl, options = {}) {
  const fetchImpl = pickFetch(options)
  if (typeof fetchImpl !== 'function') return null

  try {
    const response = await fetchImpl(tiktokOEmbedUrl(videoUrl))
    if (!isOkResponse(response)) return null
    return videoIdFromMetadata(await response.json())
  } catch (err) {
    return null
  }
}

module.exports = {
  TIKTOK_OEMBED_ENDPOINT,
  tiktokOEmbedUrl,
  resolveTikTokVideoId
}

// mutate4javascript-manifest-begin
// {"version":1,"tested_at":"2026-10-02T14:10:42.736Z","module_hash":"db2ebb36d170b0c2d795a095c11ff4e4591baaf5d435395f27277b6ab443be3e","functions":[{"id":"func/tiktokOEmbedUrl","name":"tiktokOEmbedUrl","line":14,"end_line":16,"hash":"5b48d6d20edeab27c3ef0ab1c61ccc1535ff3c7d894709c72ffdabeac5180574"},{"id":"func/pickFetch","name":"pickFetch","line":19,"end_line":22,"hash":"f134a5f089dad9aeab085e2d3065041274a974c486d379d625e72e9caa1ba8c1"},{"id":"func/isOkResponse","name":"isOkResponse","line":25,"end_line":27,"hash":"e6c663732a01808fe747170fc53544dcf915cf9320abc13f8df5790cb834c5d4"},{"id":"func/videoIdFromMetadata","name":"videoIdFromMetadata","line":30,"end_line":33,"hash":"9f9c229a8478a26e4d4aefee7453ebaa86b6e9c47af5fd93c98f3fd0425c6bdb"},{"id":"func/resolveTikTokVideoId","name":"resolveTikTokVideoId","line":40,"end_line":51,"hash":"c36a8316d3ddaf86e74a404dcff57d9bcf3e0e2fb6c1060ccb0938745f515ef6"}]}
// mutate4javascript-manifest-end
