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

// mutate4javascript-manifest-begin
// {"version":1,"tested_at":"2026-09-04T16:24:43.962Z","module_hash":"102305b0a6a2998c7271bbfdecc272fbe426ecc2dac61f89f74cde410372c52f","functions":[{"id":"func/validVideoId","name":"validVideoId","line":14,"end_line":16,"hash":"cf16fbd8a480a0cffa21699ddb96d1c7ecf746ad06503b97022f7e4a7376ddff"},{"id":"func/parseCandidate","name":"parseCandidate","line":20,"end_line":28,"hash":"7b2588b1e113b390c14d08a99befb0a2bd844ed4b0057a577d6dc97c8f3c4d20"},{"id":"func/videoIdFromWatchUrl","name":"videoIdFromWatchUrl","line":31,"end_line":34,"hash":"dde2829ca98d70aae061202de77df0adb7fb774a5aca1ba080e062b157391672"},{"id":"func/videoIdFromShortUrl","name":"videoIdFromShortUrl","line":37,"end_line":40,"hash":"a0a6934232c55cfd7d80c825fd65f337c9fd35a5cbb09ab12b834c34b520624e"},{"id":"func/extractYouTubeVideoId","name":"extractYouTubeVideoId","line":46,"end_line":61,"hash":"9559c0264f22c094687249f330bb514a7514955c115384e292ddb9e16df8afe7"},{"id":"func/pushText","name":"pushText","line":66,"end_line":68,"hash":"abda2060349c814451b88fe350ca235069afdc769eaa3ffa90e9d214673c71b9"},{"id":"func/parsePostText","name":"parsePostText","line":75,"end_line":107,"hash":"ab68477ea4145245c47def1a3ac2a0cfd4ed62725000bd1d669b7bde160435c5"}]}
// mutate4javascript-manifest-end
