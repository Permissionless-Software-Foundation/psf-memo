/*
  Acceptance rendering adapter for a profile page post's like control.

  Renders the same ProfilePostLike control the browser profile page uses to a
  static HTML string, so acceptance assertions can confirm the heart is an
  interactive button rather than the read-only span.
*/

'use strict'

const React = require('react')
const ReactDOMServer = require('react-dom/server')
const ProfilePostLike = require('../../src/components/app-body/profile/profile-post-like')

function renderProfilePostLike ({ post, liked = false, count, onClick } = {}) {
  const element = React.createElement(ProfilePostLike, { post, liked, count, onClick })
  return ReactDOMServer.renderToStaticMarkup(element)
}

module.exports = { renderProfilePostLike }
