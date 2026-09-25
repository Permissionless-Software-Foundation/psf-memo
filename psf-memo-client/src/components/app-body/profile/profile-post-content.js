/*
  Profile page post text renderer.

  Wraps the shared PostContent renderer with the profile page's post-text
  element, so every post on /profile/:addr gets the same link, image, and
  YouTube-embed behavior as the recent posts feed. Written in plain
  React.createElement style so the same module is used by the browser JSX build
  and by the Node acceptance adapter (acceptance/lib/render-profile-post.js).
*/

const React = require('react')
const PostContent = require('../../post-feed/post-content')

function ProfilePostContent ({ text = '', initialFailedImages }) {
  return React.createElement(
    'p',
    { className: 'profile-post-text card-text' },
    React.createElement(PostContent, { text, initialFailedImages })
  )
}

module.exports = ProfilePostContent
