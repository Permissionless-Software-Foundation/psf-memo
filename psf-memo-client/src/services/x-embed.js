/*
  Pure helpers for recognizing X (Twitter) status links in Memo post text.

  An X status link is an x.com or twitter.com URL whose path contains
  /status/<numeric id>. The post renderer shows these as the self-contained X
  tweet frame instead of a raw URL. Non-status links, malformed status links,
  and status links on other hosts stay ordinary links.

  These functions have no React or network dependencies, so they can be unit
  tested directly and reused by the UI and acceptance adapters.
*/

const X_EMBED_BASE_URL = 'https://platform.twitter.com/embed/Tweet.html'

// A status path segment followed by a numeric id, as in /<user>/status/<id>,
// /i/web/status/<id>, or /status/<id>.  Only the id is captured.
const STATUS_PATH_RE = /\/status\/(\d+)(?:\/|$)/

// Hosts that serve X/Twitter status posts.  App and mobile subdomains are
// recognized by stripping a leading www. or mobile. label.
const X_HOSTS = new Set(['x.com', 'twitter.com'])

function isXHost (hostname) {
  const host = String(hostname || '').toLowerCase().replace(/^(?:www\.|mobile\.)/, '')
  return X_HOSTS.has(host)
}

// Parse and normalize a candidate URL, returning null for non-strings and
// unparseable input.
function parseCandidate (url) {
  if (typeof url !== 'string') return null
  try {
    return new URL(url.trim())
  } catch {
    return null
  }
}

/**
 * Extract the numeric status id from an x.com or twitter.com status URL, or
 * return null when the URL is not a recognizable status link.
 */
function extractXStatusId (url) {
  const parsed = parseCandidate(url)
  if (!parsed) return null

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null
  if (!isXHost(parsed.hostname)) return null

  const match = parsed.pathname.match(STATUS_PATH_RE)
  return match ? match[1] : null
}

module.exports = { X_EMBED_BASE_URL, extractXStatusId }

// mutate4javascript-manifest-begin
// {"version":1,"tested_at":"2026-10-02T13:30:16.832Z","module_hash":"235076a6052904de68d4cf9db93ae009420f76b7d1171487ce75f83b975179e2","functions":[{"id":"func/isXHost","name":"isXHost","line":23,"end_line":26,"hash":"3dd15b684e698cb893604c9dbd664b018f4f215cca4938e1931eccc1c8c80817"},{"id":"func/parseCandidate","name":"parseCandidate","line":30,"end_line":37,"hash":"ac2f2793cae164b80d1e0460c1ab712d87a88889c4adbf71bd8a4d6fd5e9aafc"},{"id":"func/extractXStatusId","name":"extractXStatusId","line":43,"end_line":52,"hash":"d09967fdb9bf992f35d2c90983e95c6862252abc9d3f6914e2f76a2acc24c533"}]}
// mutate4javascript-manifest-end
