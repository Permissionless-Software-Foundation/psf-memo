/*
  Unit tests for the single-post permalink entry points.

  A post's timestamp links to its permalink page, and the shared post options
  menu copies that page's absolute URL. Both entry points share the pure
  permalink module and are rendered by the same components used in the browser.
*/

'use strict'

const test = require('node:test')
const assert = require('node:assert/strict')
const React = require('react')
const ReactDOMServer = require('react-dom/server')
const PostOptions = require('../../src/services/post-options')
const { threadPath, postPageUrl } = require('../../src/services/post-permalink')
const { PostTimeLink } = require('../../src/components/post-feed/post-time-link')
const PostOptionsMenu = require('../../src/components/post-feed/post-options-menu')

const TXID = 'c96a46c8b55657fe125115e3ddf5ad30ad587bb41baa952cb8d9be9334161875'
const EXPLORER_URL = `https://bch.loping.net/tx/${TXID}`

function renderTimeLink (props = {}) {
  return ReactDOMServer.renderToStaticMarkup(
    React.createElement(PostTimeLink, { txid: TXID, label: '2h', ...props })
  )
}

function renderMenu (props = {}) {
  return ReactDOMServer.renderToStaticMarkup(
    React.createElement(PostOptionsMenu, { txid: TXID, ...props })
  )
}

test('threadPath builds the /posts/thread path', () => {
  assert.equal(threadPath(TXID), `/posts/thread/${TXID}`)
})

test('postPageUrl prepends the page origin', () => {
  assert.equal(postPageUrl(TXID, ''), `/posts/thread/${TXID}`)
  assert.equal(postPageUrl(TXID, 'https://psf.example'), `https://psf.example/posts/thread/${TXID}`)
})

test('the timestamp renders as a link to the post permalink', () => {
  const html = renderTimeLink()

  assert.match(html, new RegExp(`href="/posts/thread/${TXID}"`))
  assert.match(html, /class="post-time-link"/)
  assert.match(html, />2h</)
})

test('the post options menu still puts the block explorer link first', () => {
  const items = PostOptions.postOptionsItems(TXID)

  assert.equal(items[0].label, 'See on block explorer')
  assert.equal(items[0].href, EXPLORER_URL)
})

test('the post options menu offers a Copy post link item', () => {
  const items = PostOptions.postOptionsItems(TXID, { origin: 'https://psf.example' })
  const copy = items.find((item) => item.label === 'Copy post link')

  assert.ok(copy, 'expected a "Copy post link" item')
  assert.equal(copy.action, 'copy-post-link')
  assert.equal(copy.url, `https://psf.example/posts/thread/${TXID}`)

  const html = renderMenu({ initialOpen: true })
  assert.match(html, /Copy post link/)
})

test('copyPostLink copies the absolute permalink URL', async () => {
  const copied = []
  const url = await PostOptions.copyPostLink(TXID, {
    origin: 'https://psf.example',
    copyToClipboard: async (text) => { copied.push(text) }
  })

  assert.equal(url, `https://psf.example/posts/thread/${TXID}`)
  assert.deepEqual(copied, [`https://psf.example/posts/thread/${TXID}`])
})
