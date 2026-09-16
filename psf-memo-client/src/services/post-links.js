/*
  Pure helpers for turning URLs and bare domains in Memo post text into link
  segments.

  These functions have no React or network dependencies, so they can be unit
  tested directly and reused by the UI and acceptance adapters.
*/

// Strip trailing punctuation that is never part of a link.
const TRAILING_PUNCTUATION_RE = /[.,;:!?)\]]+$/

// An explicit URL with a scheme, or a bare domain with at least one dot and a
// two-or-more-letter TLD, optionally followed by a path. The scheme form is
// listed first so an http(s) URL is never re-matched as a bare domain.
const LINK_RE = /(https?:\/\/[^\s]+)|((?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,}(?:\/[^\s]*)?)/gi

// A bare-domain match is only a link when it is not part of a larger token
// such as an email address.
function isBareDomainBoundary (input, start, end) {
  if (start > 0 && /[A-Za-z0-9_.@-]/.test(input[start - 1])) return false
  // input[end] is undefined when end === input.length, so no range guard is needed.
  if (input[end] === '@') return false
  return true
}

// Push a non-empty text segment onto the segment list.
function pushText (segments, text) {
  if (text) segments.push({ type: 'text', text })
}

/**
 * Split a post's text into segments.  Each segment is either a plain text
 * fragment ({ type: 'text', text }) or a link
 * ({ type: 'link', href, text }).  Explicit http(s) URLs keep their scheme;
 * bare domains are linked with an https scheme while their visible text is
 * left as written.
 */
function parsePostLinks (text) {
  const input = String(text ?? '')
  const segments = []
  let lastIndex = 0
  let match

  while ((match = LINK_RE.exec(input)) !== null) {
    const raw = match[0]
    const isHttp = Boolean(match[1])
    const start = match.index
    const end = start + raw.length

    if (!isHttp && !isBareDomainBoundary(input, start, end)) continue

    const url = raw.replace(TRAILING_PUNCTUATION_RE, '')

    pushText(segments, input.slice(lastIndex, start))

    if (isHttp) {
      segments.push({ type: 'link', href: url, text: url })
    } else {
      segments.push({ type: 'link', href: `https://${url}`, text: url })
    }

    // Leave any trailing punctuation behind so it joins the following text.
    lastIndex = start + url.length
  }

  pushText(segments, input.slice(lastIndex))

  if (segments.length === 0) {
    segments.push({ type: 'text', text: input })
  }

  return segments
}

// Common image file extensions recognized in a URL path.
const IMAGE_EXTENSION_RE = /\.(?:jpg|jpeg|png|gif|webp|bmp)$/i

/**
 * True when a URL's path ends in a recognized image file extension. Only the
 * parsed pathname is examined, so query strings and fragments are ignored.
 */
function isImageUrl (url) {
  if (typeof url !== 'string') return false
  try {
    return IMAGE_EXTENSION_RE.test(new URL(url).pathname)
  } catch {
    return false
  }
}

/**
 * Derive accessible alt text for an image URL: its filename, or "post image"
 * when the URL carries no filename.
 */
function imageAltText (url) {
  try {
    const segments = new URL(url).pathname.split('/')
    const filename = segments[segments.length - 1]
    return filename || 'post image'
  } catch {
    return 'post image'
  }
}

module.exports = { parsePostLinks, isImageUrl, imageAltText }

// mutate4javascript-manifest-begin
// {"version":1,"tested_at":"2026-09-16T14:28:22.610Z","module_hash":"2909c5416f838cb7977227928ddc30b9b2055af4c047f21fe9dadfdec2ca8fb6","functions":[{"id":"func/isBareDomainBoundary","name":"isBareDomainBoundary","line":19,"end_line":24,"hash":"6cbcecc22428ecc54a2598d4401a350b3d07a849b651e5c76198b9defb927aef"},{"id":"func/pushText","name":"pushText","line":27,"end_line":29,"hash":"abda2060349c814451b88fe350ca235069afdc769eaa3ffa90e9d214673c71b9"},{"id":"func/parsePostLinks","name":"parsePostLinks","line":38,"end_line":73,"hash":"7a51da000274bf77614f288f9db2ba8490069202919a00cda9c3c474d7bf48d8"},{"id":"func/isImageUrl","name":"isImageUrl","line":82,"end_line":89,"hash":"60c63ca1cc2dd0d69ff2900b168205abaea460671b9f2a9290e991f9e0dacd22"},{"id":"func/imageAltText","name":"imageAltText","line":95,"end_line":103,"hash":"99868cbf14ff8508e9f9fbdfbd2f7583809e50da0561fdd48757a4e748c81bf3"}]}
// mutate4javascript-manifest-end
