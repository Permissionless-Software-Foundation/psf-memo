/*
  Like button for a post (heart icon + count).

  The icon is filled when the post has been liked in the current session and
  outlined otherwise. The count is displayed next to the icon.
*/

import React from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faHeart as faHeartSolid } from '@fortawesome/free-solid-svg-icons'
import { faHeart as faHeartRegular } from '@fortawesome/free-regular-svg-icons'

import './post-feed.css'

function LikeButton ({ count = 0, liked = false, onClick }) {
  const label = count === 1 ? '1 like' : `${count} likes`
  const icon = liked ? faHeartSolid : faHeartRegular
  const className = [
    'post-like-button',
    liked ? 'post-like-button-liked' : ''
  ].filter(Boolean).join(' ')

  return (
    <button
      type='button'
      className={className}
      aria-label={label}
      title={label}
      onClick={onClick}
    >
      <FontAwesomeIcon icon={icon} className='post-like-button-icon' />
      <span className='post-like-button-count'>{count}</span>
    </button>
  )
}

export default LikeButton
