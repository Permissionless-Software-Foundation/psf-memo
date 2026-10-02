/*
  Pure helpers for recognizing TikTok video links in Memo post text.

  Canonical TikTok links carry the numeric video id directly:
    tiktok.com/@user/video/<id>, m.tiktok.com/v/<id>.html,
    /player/v1/<id>, and /embed/v2/<id>.
  Short links carry only an opaque code and must be resolved through TikTok's
  oEmbed endpoint before a player can be shown:
    vt.tiktok.com/<code>, vm.tiktok.com/<code>, tiktok.com/t/<code>.

  These functions have no React or network dependencies, so they can be unit
  tested directly and reused by the UI and acceptance adapters.
*/

const TIKTOK_EMBED_BASE_URL = 'https://www.tiktok.com/player/v1'

// The canonical host and its common subdomains.
const TIKTOK_HOSTS = new Set(['tiktok.com', 'www.tiktok.com', 'm.tiktok.com'])

// Hosts that only ever serve opaque short-link codes.
const TIKTOK_SHORT_HOSTS = new Set(['vt.tiktok.com', 'vm.tiktok.com'])

// Canonical video paths.  Only the numeric id is captured; a trailing slash
// or path suffix is allowed so /video/<id>/ is accepted.
const VIDEO_PATH_RES = [
  /^\/@[^/]+\/video\/(\d+)(?:\/|$)/,
  /^\/v\/(\d+)\.html$/,
  /^\/player\/v1\/(\d+)(?:\/|$)/,
  /^\/embed\/v2\/(\d+)(?:\/|$)/
]

// An opaque short-link code: a non-empty run of URL-safe characters.
const SHORT_CODE_RE = /^[A-Za-z0-9_-]+$/

// Parse and normalize a candidate URL, returning null for non-strings,
// non-http(s) schemes, and unparseable input.
function parseCandidate (url) {
  if (typeof url !== 'string') return null
  let parsed
  try {
    parsed = new URL(url.trim())
  } catch {
    return null
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null
  return parsed
}

function isTikTokHost (hostname) {
  return TIKTOK_HOSTS.has(String(hostname || '').toLowerCase())
}

function isTikTokShortHost (hostname) {
  return TIKTOK_SHORT_HOSTS.has(String(hostname || '').toLowerCase())
}

/**
 * Extract the numeric video id from a canonical TikTok video URL, or return
 * null when the URL is not a recognizable canonical video link.
 */
function extractTikTokVideoId (url) {
  const parsed = parseCandidate(url)
  if (!parsed || !isTikTokHost(parsed.hostname)) return null

  for (const pattern of VIDEO_PATH_RES) {
    const match = parsed.pathname.match(pattern)
    if (match) return match[1]
  }
  return null
}

// The first path segment of a URL, without leading or trailing slashes.
function firstPathSegment (pathname) {
  return String(pathname || '').replace(/^\/+/, '').replace(/\/+$/, '').split('/')[0]
}

/**
 * Extract the opaque code from a TikTok short link, or return null when the
 * URL is not a recognizable short link.
 */
function extractTikTokShortCode (url) {
  const parsed = parseCandidate(url)
  if (!parsed) return null

  if (isTikTokShortHost(parsed.hostname)) {
    const code = firstPathSegment(parsed.pathname)
    return SHORT_CODE_RE.test(code) ? code : null
  }

  if (isTikTokHost(parsed.hostname)) {
    const match = parsed.pathname.match(/^\/t\/([A-Za-z0-9_-]+)\/?$/)
    return match ? match[1] : null
  }

  return null
}

module.exports = {
  TIKTOK_EMBED_BASE_URL,
  extractTikTokVideoId,
  extractTikTokShortCode
}
