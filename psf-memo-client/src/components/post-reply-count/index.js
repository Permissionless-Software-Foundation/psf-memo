/*
  Reply count indicator for a post (icon + number).

  The indicator is always clickable when an onClick handler is provided, even
  if the count is zero, so that the comment icon can open a thread with zero
  replies. When onClick is absent, the indicator is rendered as non-interactive.
*/

import React from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faComment } from '@fortawesome/free-solid-svg-icons'

import './post-reply-count.css'

function PostReplyCount ({ count = 0, onClick }) {
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

  return (
    <div
      className={className}
      title={title}
      aria-label={ariaLabel}
      role={clickable ? 'button' : undefined}
      tabIndex={clickable ? 0 : undefined}
      onClick={clickable ? onClick : undefined}
      onKeyDown={clickable ? handleKeyDown : undefined}
    >
      <FontAwesomeIcon icon={faComment} className='post-reply-count-icon' />
      <span className='post-reply-count-number'>{count}</span>
    </div>
  )
}

export default PostReplyCount
