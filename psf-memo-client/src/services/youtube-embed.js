/*
  Pure helpers for turning YouTube URLs in Memo post text into embed segments.

  These functions have no React or network dependencies, so they can be unit
  tested directly and reused by the UI and acceptance adapters.
*/

const YOUTUBE_EMBED_BASE_URL = 'https://www.youtube.com/embed'

// Strip trailing punctuation that is never part of a YouTube video id.
const TRAILING_PUNCTUATION_RE = /[.,;:!?)\]]+$/

// A YouTube video id is a non-empty run of URL-safe characters.
function validVideoId (id) {
  return Boolean(id) && /^[A-Za-z0-9_-]+$/.test(id)
}

// Parse and normalize a candidate URL, returning null for non-strings and
// unparseable input.
function parseCandidate (url) {
  if (typeof url !== 'string') return null
  const candidate = url.trim().replace(TRAILING_PUNCTUATION_RE, '')
  try {
    return new URL(candidate)
  } catch {
    return null
  }
}

// Extract a video id from a parsed youtube.com/watch URL, or null.
function videoIdFromWatchUrl (parsed) {
  const id = parsed.searchParams.get('v')
  return validVideoId(id) ? id : null
}

// Extract a video id from a parsed youtu.be short URL, or null.
function videoIdFromShortUrl (parsed) {
  const id = parsed.pathname.slice(1)
  return validVideoId(id) ? id : null
}

/**
 * Extract a YouTube video id from a URL string, or return null if the URL is
 * not a recognisable, complete YouTube watch or short link.
 */
function extractYouTubeVideoId (url) {
  const parsed = parseCandidate(url)
  if (!parsed) return null

  const host = parsed.hostname.replace(/^www\./, '')

  if (host === 'youtube.com' && parsed.pathname === '/watch') {
    return videoIdFromWatchUrl(parsed)
  }

  if (host === 'youtu.be') {
    return videoIdFromShortUrl(parsed)
  }

  return null
}

const URL_RE = /(https?:\/\/[^\s]+)/g

// Push a non-empty text segment onto the segment list.
function pushText (segments, text) {
  if (text) segments.push({ type: 'text', text })
}

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

    pushText(segments, input.slice(lastIndex, match.index))

    const videoId = extractYouTubeVideoId(url)
    if (videoId) {
      segments.push({ type: 'youtube', videoId, url })
    } else {
      segments.push({ type: 'text', text: url })
    }

    pushText(segments, trailing)

    lastIndex = match.index + matchedUrl.length
  }

  pushText(segments, input.slice(lastIndex))

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
