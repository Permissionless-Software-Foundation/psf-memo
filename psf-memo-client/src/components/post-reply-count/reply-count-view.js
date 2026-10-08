/*
  Reply count indicator for a post (icon + number).

  The indicator is clickable when an onClick handler is provided, even when the
  count is zero, so the comment icon can open a thread with no replies. Without
  a handler it renders as non-interactive. Written in plain
  React.createElement style so the same view can be used by the JSX post cards
  and by Node acceptance rendering.
*/

const React = require('react')
const { FontAwesomeIcon } = require('@fortawesome/react-fontawesome')
const { faComment } = require('@fortawesome/free-solid-svg-icons/faComment')

function ReplyCountView ({ count = 0, onClick }) {
  const label = count === 1 ? '1 reply' : `${count} replies`
  const clickable = typeof onClick === 'function'
  const title = clickable ? `${label} — click to view` : label
  const ariaLabel = clickable ? `${label} — click to view thread` : label

  const handleKeyDown = (event) => {
    if (clickable && (event.key === 'Enter' || event.key === ' ')) {
      event.preventDefault()
      onClick()
    }
  }

  const className = [
    'post-reply-count',
    clickable ? 'post-reply-count-always-clickable' : 'post-reply-count-disabled'
  ].join(' ')

  return React.createElement(
    'div',
    {
      className,
      title,
      'aria-label': ariaLabel,
      role: clickable ? 'button' : undefined,
      tabIndex: clickable ? 0 : undefined,
      onClick: clickable ? onClick : undefined,
      onKeyDown: clickable ? handleKeyDown : undefined
    },
    React.createElement(FontAwesomeIcon, {
      icon: faComment,
      className: 'post-reply-count-icon'
    }),
    React.createElement('span', { className: 'post-reply-count-number' }, count)
  )
}

module.exports = ReplyCountView
