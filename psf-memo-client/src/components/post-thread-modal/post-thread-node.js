/*
  Single post node in a reply thread (recursive).
*/

import React from 'react'

import PostFeedItem from '../post-feed/post-feed-item'

function PostThreadNode ({ post, profiles = {}, wallet, depth = 0, isRoot = false }) {
  if (!post) return null

  const profile = profiles[post.addr] || {}

  return (
    <div
      className={`post-thread-node${isRoot ? ' post-thread-node-root' : ''}`}
      style={{ marginLeft: depth > 0 ? `${Math.min(depth, 8) * 1.25}rem` : undefined }}
    >
      <div className='post-thread-node-inner'>
        <PostFeedItem
          post={post}
          profile={profile}
          profiles={profiles}
          wallet={wallet}
          showRepliedLabel={!isRoot}
          showReplyCount={false}
          embedded
        />
        {(post.replies || []).map((reply) => (
          <PostThreadNode
            key={reply.txid}
            post={reply}
            profiles={profiles}
            wallet={wallet}
            depth={depth + 1}
          />
        ))}
      </div>
    </div>
  )
}

export default PostThreadNode
