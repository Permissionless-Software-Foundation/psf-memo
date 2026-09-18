/*
  Unit tests for the post content renderer.

  The renderer turns post text into static HTML: http(s) URLs and bare domains
  become anchors that open in a new tab, while embeddable YouTube links keep
  their embedded-player behavior.
*/

'use strict'

const test = require('node:test')
const assert = require('node:assert/strict')
const React = require('react')
const ReactDOMServer = require('react-dom/server')
const PostContent = require('../../src/components/post-feed/post-content')

function render (text, props = {}) {
  return ReactDOMServer.renderToStaticMarkup(React.createElement(PostContent, { text, ...props }))
}

test('renders an http URL as an anchor that opens in a new tab', () => {
  const html = render('visit https://memo.fullstackcash.net for details')
  assert.match(html, /<a[^>]+href="https:\/\/memo\.fullstackcash\.net"/)
  assert.match(html, /<a[^>]+target="_blank"/)
  assert.match(html, /<a[^>]+rel="noopener noreferrer"/)
})

test('renders an http URL with its original scheme', () => {
  const html = render('link http://example.com/path here')
  assert.match(html, /<a[^>]+href="http:\/\/example\.com\/path"/)
})

test('renders a bare domain as an https anchor with unchanged visible text', () => {
  const html = render('go to www.example.com now')
  assert.match(html, /<a[^>]+href="https:\/\/www\.example\.com"/)
  assert.match(html, />www\.example\.com<\/a>/)
})

test('renders no anchor for plain text', () => {
  const html = render('just a normal memo')
  assert.doesNotMatch(html, /<a[\s>]/)
})

test('renders an embedded YouTube player and a separate link together', () => {
  const html = render('watch https://youtu.be/dQw4w9WgXcQ then read https://memo.fullstackcash.net')
  assert.match(html, /<iframe[^>]+src="https:\/\/www\.youtube\.com\/embed\/dQw4w9WgXcQ"/)
  assert.match(html, /<iframe[^>]+allowfullscreen/i)
  assert.match(html, /<a[^>]+href="https:\/\/memo\.fullstackcash\.net"/)
  assert.doesNotMatch(html, /<a[^>]+href="https:\/\/youtu\.be\/dQw4w9WgXcQ"/)
})

test('YouTube iframe allow list omits unrecognized web-share', () => {
  const html = render('https://youtu.be/dQw4w9WgXcQ')
  assert.match(html, /<iframe[^>]+allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"/)
  assert.doesNotMatch(html, /web-share/)
})

test('renders an image URL as an inline image inside a new-tab anchor', () => {
  const html = render('https://i.imgur.com/swCI56T.jpeg Anong breed ng basil ito?')
  assert.match(html, /<a[^>]+href="https:\/\/i\.imgur\.com\/swCI56T\.jpeg"[^>]*>[\s\S]*<img/)
  assert.match(html, /<a[^>]+target="_blank"/)
  assert.match(html, /<img[^>]+src="https:\/\/i\.imgur\.com\/swCI56T\.jpeg"/)
  assert.match(html, /<img[^>]+alt="swCI56T\.jpeg"/)
})

test('renders image alt text from the filename while keeping the full src URL', () => {
  const html = render('https://example.com/img/photo.webp?w=500 a wide shot')
  assert.match(html, /<img[^>]+src="https:\/\/example\.com\/img\/photo\.webp\?w=500"/)
  assert.match(html, /<img[^>]+alt="photo\.webp"/)
})

test('does not render an image URL as visible text', () => {
  const html = render('https://i.imgur.com/swCI56T.jpeg basil leaves')
  const textOnly = html.replace(/<[^>]+>/g, '')
  assert.doesNotMatch(textOnly, /i\.imgur\.com/)
  assert.match(textOnly, /basil leaves/)
})

test('preserves surrounding text around an image', () => {
  const html = render('https://cdn.example.com/pics/Sunset.PNG over the bay')
  assert.match(html, /over the bay/)
})

test('renders a non-image URL as a plain link with no image element', () => {
  const html = render('view https://example.com/photo?format=jpg here')
  assert.match(html, /<a[^>]+href="https:\/\/example\.com\/photo\?format=jpg"/)
  assert.doesNotMatch(html, /<img/)
})

test('falls back to a plain link when the image fails to load', () => {
  const url = 'https://i.imgur.com/swCI56T.jpeg'
  const html = render(`${url} basil leaves`, { initialFailedImages: [url] })
  assert.doesNotMatch(html, /<img/)
  assert.match(html, /<a[^>]+href="https:\/\/i\.imgur\.com\/swCI56T\.jpeg"/)
  assert.match(html, />https:\/\/i\.imgur\.com\/swCI56T\.jpeg<\/a>/)
  assert.match(html, /basil leaves/)
})
