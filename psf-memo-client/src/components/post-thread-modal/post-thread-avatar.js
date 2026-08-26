/*
  Small avatar for post thread nodes (profile pic or jdenticon fallback).
*/

import React, { useState, useEffect } from 'react'
import Jdenticon from '@chris.troutner/react-jdenticon'

function PostThreadAvatar ({ addr, profilePicUrl, size = 36 }) {
  const [picError, setPicError] = useState(false)

  useEffect(() => {
    setPicError(false)
  }, [profilePicUrl, addr])

  if (profilePicUrl && !picError) {
    return (
      <img
        src={profilePicUrl}
        alt=''
        className='post-thread-avatar'
        width={size}
        height={size}
        onError={() => setPicError(true)}
      />
    )
  }

  return (
    <div className='post-thread-avatar post-thread-avatar-jdenticon' style={{ width: size, height: size }}>
      <Jdenticon size={String(size)} value={addr} />
    </div>
  )
}

export default PostThreadAvatar
