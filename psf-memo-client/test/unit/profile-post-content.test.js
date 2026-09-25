/*
  Unit tests for the profile page post text renderer.

  The renderer must give profile posts the same behavior as the recent feed:
  http(s) URLs and bare domains become new-tab anchors, image URLs render an
  inline image inside a new-tab anchor (and their URL is not shown as text),
  embeddable YouTube links render an embedded player instead of the raw URL,
  surrounding text is preserved, and a failed image falls back to a plain link.
*/

'use strict'

const test = require('node:test')
const assert = require('node:assert/strict')
const React = require('react')
const ReactDOMServer = require('react-dom/server')
const ProfilePostContent = require('../../src/components/app-body/profile/profile-post-content')

function render (text, props = {}) {
  return ReactDOMServer.renderToStaticMarkup(
    React.createElement(ProfilePostContent, { text, ...props })
  )
}

test('renders post text inside the profile post text element', () => {
  const html = render('just a normal memo')

  assert.match(html, /<p[^>]+class="profile-post-text card-text"/)
  assert.match(html, /just a normal memo/)
})

test('embeds a YouTube link instead of showing the raw URL', () => {
  const url = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'
  const html = render(url)

  assert.match(html, /<iframe[^>]+src="https:\/\/www\.youtube\.com\/embed\/dQw4w9WgXcQ"/)
  assert.doesNotMatch(html, /www\.youtube\.com\/watch/)
})

test('preserves surrounding text around a YouTube embed', () => {
  const html = render('check this out https://youtu.be/dQw4w9WgXcQ')

  assert.match(html, /check this out/)
  assert.match(html, /<iframe[^>]+src="https:\/\/www\.youtube\.com\/embed\/dQw4w9WgXcQ"/)
})

test('renders an image URL as an inline image inside a new-tab anchor', () => {
  const html = render('https://i.imgur.com/swCI56T.jpeg Anong breed ng basil ito?')

  assert.match(html, /<a[^>]+href="https:\/\/i\.imgur\.com\/swCI56T\.jpeg"[^>]*>[\s\S]*<img/)
  assert.match(html, /<a[^>]+target="_blank"/)
  assert.match(html, /<img[^>]+src="https:\/\/i\.imgur\.com\/swCI56T\.jpeg"/)
  assert.match(html, /<img[^>]+alt="swCI56T\.jpeg"/)
})

test('does not render an image URL as visible text', () => {
  const html = render('https://cdn.example.com/pics/Sunset.PNG over the bay')
  const textOnly = html.replace(/<[^>]+>/g, '')

  assert.doesNotMatch(textOnly, /cdn\.example\.com/)
  assert.match(textOnly, /over the bay/)
})

test('renders a non-image URL as a plain link with no image', () => {
  const html = render('read https://example.com/page now')

  assert.match(html, /<a[^>]+href="https:\/\/example\.com\/page"/)
  assert.match(html, /<a[^>]+target="_blank"/)
  assert.doesNotMatch(html, /<img/)
})

test('falls back to a plain link when the image fails to load', () => {
  const url = 'https://example.com/img/photo.png'
  const html = render(`${url} the view`, { initialFailedImages: [url] })

  assert.doesNotMatch(html, /<img/)
  assert.match(html, /<a[^>]+href="https:\/\/example\.com\/img\/photo\.png"[^>]*>https:\/\/example\.com\/img\/photo\.png<\/a>/)
})
