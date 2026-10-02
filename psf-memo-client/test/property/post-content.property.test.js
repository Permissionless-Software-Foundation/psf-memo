/*
  Property tests for the post content renderer.

  The unit tests probe PostContent at a few fixed fixtures. These properties
  pin down the rendering invariants for URL-like tokens over broad random
  inputs:

    - An image URL renders as an <img> inside a new-tab anchor, keeps its full
      URL as the src (query string included), and is never repeated as visible
      text.
    - A non-image URL renders as a plain new-tab anchor with no <img>.
    - Surrounding text is preserved and rendering is deterministic.
*/

'use strict'

const test = require('node:test')
const React = require('react')
const ReactDOMServer = require('react-dom/server')
const { seededRandom, forAll, intGen } = require('./harness')
const PostContent = require('../../src/components/post-feed/post-content')

const rng = seededRandom(20260916)

const IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp']

function render (text) {
  return ReactDOMServer.renderToStaticMarkup(
    React.createElement(PostContent, { text })
  )
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

const X_HOSTS = ['x.com', 'twitter.com', 'www.x.com', 'mobile.twitter.com']

function randomNumericId () {
  const length = intGen(rng, 1, 19)()
  let id = String(intGen(rng, 1, 9)())
  for (let i = 1; i < length; i++) id += String(intGen(rng, 0, 9)())
  return id
}

function randomXStatusUrl () {
  return `https://${X_HOSTS[Math.floor(rng() * X_HOSTS.length)]}/user/status/${randomNumericId()}`
}

function randomNonStatusXUrl () {
  return `https://${X_HOSTS[Math.floor(rng() * X_HOSTS.length)]}/user${randomTail()}`
}

function visibleText (html) {
  return html.replace(/<[^>]+>/g, '')
}

test('an image URL renders as an <img> in a new-tab anchor and never as visible text', async () => {
  await forAll(
    () => randomImageUrl(),
    async (url) => {
      const html = render(`before ${url} after`)
      if (!/<img[^>]+src="/.test(html)) return false
      if (!html.includes(`src="${url}"`)) return false
      if (!/<a[^>]+target="_blank"/.test(html)) return false
      const text = visibleText(html)
      if (text.includes(url)) return false
      return text.includes('before') && text.includes('after')
    },
    { label: 'post-content image rendering', samples: 300 }
  )
})

test('a non-image URL renders as a plain new-tab anchor with no image', async () => {
  await forAll(
    () => randomNonImageUrl(),
    async (url) => {
      const html = render(`before ${url} after`)
      if (html.includes('<img')) return false
      if (!html.includes(`href="${url}"`)) return false
      if (!/<a[^>]+target="_blank"/.test(html)) return false
      return visibleText(html).includes('before') && visibleText(html).includes('after')
    },
    { label: 'post-content non-image rendering', samples: 300 }
  )
})

test('an X status URL renders as an embedded tweet frame, not a raw anchor', async () => {
  await forAll(
    () => randomXStatusUrl(),
    async (url) => {
      const id = url.match(/\/status\/(\d+)/)[1]
      const html = render(`before ${url} after`)
      if (!html.includes(`Tweet.html?id=${id}`)) return false
      if (!/<iframe[^>]+src="https:\/\/platform\.twitter\.com\/embed\/Tweet\.html\?id=/.test(html)) return false
      if (html.includes(`href="${url}"`)) return false
      const text = visibleText(html)
      return text.includes('before') && text.includes('after') && !text.includes(url)
    },
    { label: 'post-content X embed', samples: 300 }
  )
})

test('a non-status x.com link renders as a plain new-tab anchor with no frame', async () => {
  await forAll(
    () => randomNonStatusXUrl(),
    async (url) => {
      const html = render(`before ${url} after`)
      if (html.includes('<iframe')) return false
      if (!html.includes(`href="${url}"`)) return false
      if (!/<a[^>]+target="_blank"/.test(html)) return false
      return visibleText(html).includes('before') && visibleText(html).includes('after')
    },
    { label: 'post-content non-status X link', samples: 300 }
  )
})

test('rendering the same text is deterministic', async () => {
  await forAll(
    () => randomImageUrl(),
    async (url) => {
      const text = `x ${url} y`
      const first = render(text)
      const second = render(text)
      return first === second
    },
    { label: 'post-content determinism', samples: 200 }
  )
})
