/*
  Acceptance rendering adapter for a profile page post's text.

  Renders the same ProfilePostContent component the browser uses to a static
  HTML string, so acceptance assertions can inspect the resulting link, image,
  and YouTube-embed markup without running a browser.
*/

'use strict'

const React = require('react')
const ReactDOMServer = require('react-dom/server')
const ProfilePostContent = require('../../src/components/app-body/profile/profile-post-content')

function renderProfilePost (text, options = {}) {
  const element = React.createElement(ProfilePostContent, {
    text,
    initialFailedImages: options.initialFailedImages
  })
  return ReactDOMServer.renderToStaticMarkup(element)
}

module.exports = { renderProfilePost }
