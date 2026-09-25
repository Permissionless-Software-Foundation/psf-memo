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

// mutate4javascript-manifest-begin
// {"version":1,"tested_at":"2026-09-25T21:09:58.761Z","module_hash":"82f58305640f92a81a8ec065aa6af383d24ecd0515a8a7790f89f55e10a4cdd8","functions":[{"id":"func/ProfilePostContent","name":"ProfilePostContent","line":14,"end_line":20,"hash":"94b6a9cad1228c782c1b5cc8cccd305bb4a593c6a74bdd7cb218612008e9b90b"}]}
// mutate4javascript-manifest-end
