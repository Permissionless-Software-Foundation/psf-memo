/*
  Like button for a post (heart icon + count).

  The icon is filled when the post has been liked in the current session and
  outlined otherwise. The count is displayed next to the icon.

  Written in plain React.createElement style so the same module can be used by
  the JSX components in the browser build and by the acceptance adapter that
  renders HTML under Node.
*/

const React = require('react')
const { FontAwesomeIcon } = require('@fortawesome/react-fontawesome')
// Require the individual icon modules (not the barrel index) so a CommonJS
// consumer does not pull in every icon and defeat tree-shaking.
const { faHeart: faHeartSolid } = require('@fortawesome/free-solid-svg-icons/faHeart')
const { faHeart: faHeartRegular } = require('@fortawesome/free-regular-svg-icons/faHeart')

function LikeButton ({ count = 0, liked = false, onClick }) {
  const label = count === 1 ? '1 like' : `${count} likes`
  const icon = liked ? faHeartSolid : faHeartRegular
  const className = [
    'post-like-button',
    liked ? 'post-like-button-liked' : ''
  ].filter(Boolean).join(' ')

  const children = [
    React.createElement(FontAwesomeIcon, {
      key: 'icon',
      icon,
      className: 'post-like-button-icon'
    }),
    React.createElement(
      'span',
      { key: 'count', className: 'post-like-button-count' },
      count
    )
  ]

  return React.createElement(
    'button',
    { type: 'button', className, 'aria-label': label, title: label, onClick },
    children
  )
}

module.exports = LikeButton

// mutate4javascript-manifest-begin
// {"version":1,"tested_at":"2026-10-02T15:20:51.946Z","module_hash":"7cb1bc47232f031966001b97ca55589ac58185a84cf12fe53443d303736e1757","functions":[{"id":"func/LikeButton","name":"LikeButton","line":19,"end_line":45,"hash":"8920cbe6d047238c7892c47b18c364552359ba5a01698edb3df36299b251480c"}]}
// mutate4javascript-manifest-end
