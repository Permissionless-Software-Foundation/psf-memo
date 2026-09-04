/*
  Pure helpers for turning YouTube URLs in Memo post text into embed segments.

  These functions have no React or network dependencies, so they can be unit
  tested directly and reused by the UI and acceptance adapters.
*/

const YOUTUBE_EMBED_BASE_URL = 'https://www.youtube.com/embed'

// Strip trailing punctuation that is never part of a YouTube video id.
const TRAILING_PUNCTUATION_RE = /[.,;:!?)\]]+$/

/**
 * Extract a YouTube video id from a URL string, or return null if the URL is
 * not a recognisable, complete YouTube watch or short link.
 */
function extractYouTubeVideoId (url) {
  if (typeof url !== 'string') return null
  const candidate = url.trim().replace(TRAILING_PUNCTUATION_RE, '')

  let parsed
  try {
    parsed = new URL(candidate)
  } catch {
    return null
  }

  const host = parsed.hostname.replace(/^www\./, '')

  if (host === 'youtube.com' && parsed.pathname === '/watch') {
    const id = parsed.searchParams.get('v')
    if (id && /^[A-Za-z0-9_-]+$/.test(id)) return id
  }

  if (host === 'youtu.be') {
    const id = parsed.pathname.slice(1)
    if (id && /^[A-Za-z0-9_-]+$/.test(id)) return id
  }

  return null
}

const URL_RE = /(https?:\/\/[^\s]+)/g

/**
 * Split a post's text into segments.  Each segment is either a plain text
 * fragment ({ type: 'text', text }) or a YouTube embed reference
 * ({ type: 'youtube', videoId, url }).
 */
function parsePostText (text) {
  const input = String(text ?? '')
  const segments = []
  let lastIndex = 0
  let match

  while ((match = URL_RE.exec(input)) !== null) {
    const matchedUrl = match[1]
    const url = matchedUrl.replace(TRAILING_PUNCTUATION_RE, '')
    const trailing = matchedUrl.slice(url.length)

    const leading = input.slice(lastIndex, match.index)
    if (leading) segments.push({ type: 'text', text: leading })

    const videoId = extractYouTubeVideoId(url)
    if (videoId) {
      segments.push({ type: 'youtube', videoId, url })
    } else {
      segments.push({ type: 'text', text: url })
    }

    if (trailing) segments.push({ type: 'text', text: trailing })

    lastIndex = match.index + matchedUrl.length
  }

  const trailing = input.slice(lastIndex)
  if (trailing) segments.push({ type: 'text', text: trailing })

  if (segments.length === 0) {
    segments.push({ type: 'text', text: input })
  }

  return segments
}

module.exports = {
  YOUTUBE_EMBED_BASE_URL,
  extractYouTubeVideoId,
  parsePostText
}
