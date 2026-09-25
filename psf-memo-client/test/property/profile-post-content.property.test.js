/*
  Property tests for the profile page post content renderer.

  The unit tests probe ProfilePostContent at a few fixed fixtures. These
  properties pin the wrapper's rendering contract over broad random post
  texts:

    - the profile post-text element (`p.profile-post-text.card-text`) wraps
      the shared PostContent markup exactly, so the profile page and the
      recent feed cannot drift apart;
    - an image URL renders as an <img> inside a new-tab anchor, keeps its full
      URL as the src (query string included), and is never shown as text;
    - a non-image URL renders as a plain new-tab anchor with no <img>;
    - an embeddable YouTube URL renders an <iframe> and never the raw URL;
    - a failed image falls back to a plain new-tab link whose text is the URL;
    - rendering is deterministic.

  All generation is seeded, so runs are reproducible.
*/

'use strict'

const test = require('node:test')
const React = require('react')
const ReactDOMServer = require('react-dom/server')
const { seededRandom, forAll, intGen } = require('./harness')
const ProfilePostContent = require('../../src/components/app-body/profile/profile-post-content')
const PostContent = require('../../src/components/post-feed/post-content')

const rng = seededRandom(20260925)

const IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp']
const YOUTUBE_SHORT = 'https://youtu.be/dQw4w9WgXcQ'

function renderProfile (text, props = {}) {
  return ReactDOMServer.renderToStaticMarkup(
    React.createElement(ProfilePostContent, { text, ...props })
  )
}

function renderShared (text, props = {}) {
  return ReactDOMServer.renderToStaticMarkup(
    React.createElement(PostContent, { text, ...props })
  )
}

function visibleText (html) {
  return html.replace(/<[^>]+>/g, '')
}

// React 19 hoists image preload <link> tags out of a rendered tree, so the
// profile renderer (rooted at the <p>) emits them before the wrapper while the
// shared renderer (rooted at the fragment) emits them inside. Removing those
// resource hints leaves the markup each seam is responsible for.
function withoutPreloads (html) {
  return html.replace(/<link\b[^>]*\/?>/g, '')
}

function randomName () {
  const alphabet = 'abcdefghijklmnopqrstuvwxyz0123456789'
  const n = intGen(rng, 1, 8)()
  let out = ''
  for (let i = 0; i < n; i++) out += alphabet[Math.floor(rng() * alphabet.length)]
  return out
}

function randomHost () {
  return ['example.com', 'cdn.example.org', 'i.imgur.com'][Math.floor(rng() * 3)]
}

// Tail values that are safe in HTML attributes (no &, ", <, >, or ').
function randomTail () {
  const kind = Math.floor(rng() * 3)
  if (kind === 0) return ''
  if (kind === 1) return `?w=${intGen(rng, 1, 2000)()}`
  return '#section'
}

function randomImageUrl () {
  const ext = IMAGE_EXTENSIONS[Math.floor(rng() * IMAGE_EXTENSIONS.length)]
  const dir = ['', 'pics/', 'a/b/'][Math.floor(rng() * 3)]
  return `https://${randomHost()}/${dir}${randomName()}.${ext}${randomTail()}`
}

function randomNonImageUrl () {
  if (Math.floor(rng() * 3) === 0) {
    return `https://${randomHost()}/page${randomTail()}`
  }
  return `https://${randomHost()}/${randomName()}.svg${randomTail()}`
}

// A broad mix of plain words, image URLs, non-image URLs, and an embeddable
// YouTube URL so the wrapper's behavior is exercised across input shapes.
function randomPostText () {
  const tokens = [
    'plain', 'words', 'over', 'here',
    randomImageUrl(),
    randomNonImageUrl(),
    YOUTUBE_SHORT
  ]
  const n = intGen(rng, 0, tokens.length)()
  let text = ''
  for (let i = 0; i < n; i++) {
    text += tokens[Math.floor(rng() * tokens.length)] + ' '
  }
  return text.trim()
}

test('wraps the shared PostContent markup in the profile post-text element', async () => {
  await forAll(
    () => randomPostText(),
    async (text) => {
      const html = renderProfile(text)
      const expected = `<p class="profile-post-text card-text">${renderShared(text)}</p>`
      return withoutPreloads(html) === withoutPreloads(expected)
    },
    { label: 'profile-post-content wrapper delegation', samples: 400 }
  )
})

test('an image URL renders as an <img> in a new-tab anchor and never as visible text', async () => {
  await forAll(
    () => randomImageUrl(),
    async (url) => {
      const html = renderProfile(`before ${url} after`)
      if (!/<img[^>]+src="/.test(html)) return false
      if (!html.includes(`src="${url}"`)) return false
      if (!/<a[^>]+target="_blank"/.test(html)) return false
      const text = visibleText(html)
      if (text.includes(url)) return false
      return text.includes('before') && text.includes('after')
    },
    { label: 'profile-post-content image rendering', samples: 300 }
  )
})

test('a non-image URL renders as a plain new-tab anchor with no image', async () => {
  await forAll(
    () => randomNonImageUrl(),
    async (url) => {
      const html = renderProfile(`before ${url} after`)
      if (html.includes('<img')) return false
      if (!html.includes(`href="${url}"`)) return false
      if (!/<a[^>]+target="_blank"/.test(html)) return false
      return visibleText(html).includes('before') && visibleText(html).includes('after')
    },
    { label: 'profile-post-content non-image rendering', samples: 300 }
  )
})

test('an embeddable YouTube URL renders an <iframe> instead of the raw URL', async () => {
  await forAll(
    () => randomPostText(),
    async (text) => {
      if (!text.includes(YOUTUBE_SHORT)) return true
      const html = renderProfile(text)
      if (!/<iframe[^>]+src="https:\/\/www\.youtube\.com\/embed\/dQw4w9WgXcQ"/.test(html)) return false
      return !html.includes(YOUTUBE_SHORT)
    },
    { label: 'profile-post-content youtube rendering', samples: 300 }
  )
})

test('a failed image falls back to a plain new-tab link showing the URL', async () => {
  await forAll(
    () => randomImageUrl(),
    async (url) => {
      const html = renderProfile(`${url} the view`, { initialFailedImages: [url] })
      if (html.includes('<img')) return false
      if (!html.includes(`href="${url}"`)) return false
      if (!/<a[^>]+target="_blank"/.test(html)) return false
      return visibleText(html).includes(url)
    },
    { label: 'profile-post-content failed-image fallback', samples: 300 }
  )
})

test('rendering the same text is deterministic', async () => {
  await forAll(
    () => randomPostText(),
    async (text) => {
      const first = renderProfile(text)
      const second = renderProfile(text)
      return first === second
    },
    { label: 'profile-post-content determinism', samples: 200 }
  )
})
