/*
  Unit tests for the account avatar image component.

  The component renders an avatar image when a URL is provided and renders
  nothing when the URL is missing, so the account page can display the
  authenticated user's profile picture.
*/

'use strict'

const test = require('node:test')
const assert = require('node:assert/strict')
const React = require('react')
const ReactDOMServer = require('react-dom/server')
const AvatarImage = require('../../src/components/account/avatar-image')

function renderAvatarImage (url) {
  const element = React.createElement(AvatarImage, { url })
  return ReactDOMServer.renderToStaticMarkup(element)
}

test('renders null when the URL is undefined', () => {
  const html = renderAvatarImage(undefined)
  assert.equal(html, '')
})

test('renders null when the URL is null', () => {
  const html = renderAvatarImage(null)
  assert.equal(html, '')
})

test('renders null when the URL is an empty string', () => {
  const html = renderAvatarImage('')
  assert.equal(html, '')
})

test('renders an img element with the provided URL', () => {
  const url = 'https://example.com/avatar.png'
  const html = renderAvatarImage(url)

  assert.match(html, /<img[^>]+src="https:\/\/example\.com\/avatar\.png"/)
})

test('renders an img element with an accessible alt text', () => {
  const html = renderAvatarImage('https://example.com/avatar.png')

  assert.match(html, /<img[^>]+alt="Account avatar"/)
})

test('renders an img element with the account avatar class', () => {
  const html = renderAvatarImage('https://example.com/avatar.png')

  assert.match(html, /<img[^>]+class="account-avatar-image"/)
})
