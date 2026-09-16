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

function render (text) {
  return ReactDOMServer.renderToStaticMarkup(React.createElement(PostContent, { text }))
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
