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
const { seededRandom, forAll, intGen, randomFrom, randomNumericId } = require('./harness')
const PostContent = require('../../src/components/post-feed/post-content')

const rng = seededRandom(20260916)

const IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp']

function render (text, props = {}) {
  return ReactDOMServer.renderToStaticMarkup(
    React.createElement(PostContent, { text, ...props })
  )
}

function randomName () {
  return randomFrom(rng, 'abcdefghijklmnopqrstuvwxyz0123456789', 1, 8)
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

function randomXStatusUrl () {
  return `https://${X_HOSTS[Math.floor(rng() * X_HOSTS.length)]}/user/status/${randomNumericId(rng)}`
}

function randomNonStatusXUrl () {
  return `https://${X_HOSTS[Math.floor(rng() * X_HOSTS.length)]}/user${randomTail()}`
}

const TIKTOK_HOSTS = ['tiktok.com', 'www.tiktok.com', 'm.tiktok.com']
const TIKTOK_SHORT_HOSTS = ['vt.tiktok.com', 'vm.tiktok.com']

function randomTikTokCanonicalUrl () {
  return `https://${TIKTOK_HOSTS[Math.floor(rng() * TIKTOK_HOSTS.length)]}/@${randomName()}/video/${randomNumericId(rng)}`
}

function randomTikTokShortUrl () {
  return `https://${TIKTOK_SHORT_HOSTS[Math.floor(rng() * TIKTOK_SHORT_HOSTS.length)]}/${randomName()}`
}

function visibleText (html) {
  return html.replace(/<[^>]+>/g, '')
}

// Render text around a URL and assert the URL stayed a plain new-tab anchor
// with no embedded frame of the given type and no visible raw URL.
function plainAnchorProperty (url, forbiddenTag) {
  const html = render(`before ${url} after`)
  if (html.includes(forbiddenTag)) return false
  if (!html.includes(`href="${url}"`)) return false
  if (!/<a[^>]+target="_blank"/.test(html)) return false
  return visibleText(html).includes('before') && visibleText(html).includes('after')
}

// Render text around a URL and assert it became an embedded frame whose iframe
// src matches `iframeSrcRe` and contains `srcNeedle`, with no raw anchor and no
// visible raw URL.
function frameEmbedProperty (url, iframeSrcRe, srcNeedle) {
  const html = render(`before ${url} after`)
  if (!iframeSrcRe.test(html)) return false
  if (!html.includes(srcNeedle)) return false
  if (html.includes(`href="${url}"`)) return false
  const text = visibleText(html)
  return text.includes('before') && text.includes('after') && !text.includes(url)
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
    async (url) => plainAnchorProperty(url, '<img'),
    { label: 'post-content non-image rendering', samples: 300 }
  )
})

const FRAME_EMBEDS = [
  {
    name: 'an X status URL renders as an embedded tweet frame, not a raw anchor',
    generate: randomXStatusUrl,
    idPattern: /\/status\/(\d+)/,
    iframeSrcRe: /<iframe[^>]+src="https:\/\/platform\.twitter\.com\/embed\/Tweet\.html\?id=/,
    needle: (id) => `Tweet.html?id=${id}`,
    label: 'post-content X embed'
  },
  {
    name: 'a canonical TikTok URL renders as an embedded player, not a raw anchor',
    generate: randomTikTokCanonicalUrl,
    idPattern: /\/video\/(\d+)/,
    iframeSrcRe: /<iframe[^>]+src="https:\/\/www\.tiktok\.com\/player\/v1\//,
    needle: (id) => `tiktok.com/player/v1/${id}`,
    label: 'post-content TikTok canonical embed'
  }
]

for (const embed of FRAME_EMBEDS) {
  test(embed.name, async () => {
    await forAll(
      embed.generate,
      async (url) => {
        const id = url.match(embed.idPattern)[1]
        return frameEmbedProperty(url, embed.iframeSrcRe, embed.needle(id))
      },
      { label: embed.label, samples: 300 }
    )
  })
}

test('a non-status x.com link renders as a plain new-tab anchor with no frame', async () => {
  await forAll(
    () => randomNonStatusXUrl(),
    async (url) => plainAnchorProperty(url, '<iframe'),
    { label: 'post-content non-status X link', samples: 300 }
  )
})

test('a TikTok short link renders as a player when resolved and an anchor otherwise', async () => {
  await forAll(
    () => randomTikTokShortUrl(),
    async (url) => {
      const id = randomNumericId(rng)

      const unresolved = render(`before ${url} after`)
      if (unresolved.includes('<iframe')) return false
      if (!unresolved.includes(`href="${url}"`)) return false

      const resolved = render(`before ${url} after`, { tiktokVideoIds: { [url]: id } })
      if (!resolved.includes(`tiktok.com/player/v1/${id}`)) return false
      if (resolved.includes(`href="${url}"`)) return false

      return visibleText(resolved).includes('before') && visibleText(resolved).includes('after')
    },
    { label: 'post-content TikTok short-link resolution', samples: 200 }
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
