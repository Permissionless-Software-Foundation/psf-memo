/*
  Pure helpers for turning URLs and bare domains in Memo post text into link
  segments.

  These functions have no React or network dependencies, so they can be unit
  tested directly and reused by the UI and acceptance adapters.
*/

'use strict'

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
  if (end < input.length && input[end] === '@') return false
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

module.exports = { parsePostLinks }
