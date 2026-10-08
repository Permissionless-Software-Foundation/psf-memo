/*
  Reply count indicator for a post (icon + number).

  The indicator is clickable when an onClick handler is provided, even when the
  count is zero, so the comment icon can open a thread with no replies. Without
  a handler it renders as non-interactive. Written in plain
  React.createElement style so the same view can be used by the JSX post cards
  and by Node acceptance rendering.

  The label, tooltip, accessible name, and interactive attributes come from the
  unit-tested reply-count service; this module is only the DOM wrapper.
*/

const React = require('react')
const { FontAwesomeIcon } = require('@fortawesome/react-fontawesome')
const { faComment } = require('@fortawesome/free-solid-svg-icons/faComment')
const { buildReplyCountViewModel } = require('../../services/reply-count')

function ReplyCountView ({ count = 0, onClick }) {
  const view = buildReplyCountViewModel({ count, onClick })

  return React.createElement(
    'div',
    {
      className: view.className,
      title: view.title,
      'aria-label': view.ariaLabel,
      role: view.role,
      tabIndex: view.tabIndex,
      onClick: view.onClick,
      onKeyDown: view.onKeyDown
    },
    React.createElement(FontAwesomeIcon, {
      icon: faComment,
      className: 'post-reply-count-icon'
    }),
    React.createElement('span', { className: 'post-reply-count-number' }, count)
  )
}

module.exports = ReplyCountView

// mutate4javascript-manifest-begin
// {"version":1,"tested_at":"2026-10-08T19:56:59.023Z","module_hash":"f0a0168435a6aca55991f26908b3e9298d1471ae3adf31afa055e2b8db8392a0","functions":[{"id":"func/ReplyCountView","name":"ReplyCountView","line":19,"end_line":39,"hash":"7c0dc9bbfb1f9ef3b7a7b5235483157b3ff25d9fa855f09878fb0e00aa7ea024"}]}
// mutate4javascript-manifest-end
