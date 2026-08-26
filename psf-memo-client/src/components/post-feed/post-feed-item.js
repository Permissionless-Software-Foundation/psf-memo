/*
  Instagram-style post card for feed and thread views.
*/

import React, { useState } from 'react'
import { Link } from 'react-router-dom'

import AppUtil from '../../util'
import PostReplyCount from '../post-reply-count'
import PostThreadAvatar from '../post-thread-modal/post-thread-avatar'
import LikeButton from './like-button'
import LikeTipModal from './like-tip-modal'
import {
  formatRelativeSeen,
  getDisplayName,
  truncateTxid
} from './post-display'
import './post-feed.css'

const appUtil = new AppUtil()

function PostFeedItem ({
  post,
  profile = {},
  profiles = {},
  wallet,
  onReplyClick,
  showRepliedLabel = false,
  showFooterMeta = false,
  showReplyCount = true,
  showLikeButton = true,
  embedded = false
}) {
  // React hooks must be called unconditionally before any early return, so
  // declare the like state first and guard the post access after.
  const [liked, setLiked] = useState(false)
  const [likeCount, setLikeCount] = useState(post?.likeCount || 0)
  const [showLikeModal, setShowLikeModal] = useState(false)

  if (!post) return null

  const displayName = getDisplayName(post.addr, profiles)

  const hasCustomName = Boolean(
    profile.name ?? profiles?.[post.addr]?.name
  )

  const profilePicUrl =
    profile.profilePicUrl ??
    profiles?.[post.addr]?.profilePicUrl

  const Wrapper = embedded ? 'div' : 'article'

  const copyTxid = () => {
    if (!post.txid) return
    appUtil.copyToClipboard(post.txid)
  }

  const handleLikeClick = () => {
    setShowLikeModal(true)
  }

  const handleLikeSuccess = () => {
    setLiked(true)
    setLikeCount((count) => count + 1)
    setShowLikeModal(false)
  }

  const handleLikeModalHide = () => {
    setShowLikeModal(false)
  }

  return (
    <Wrapper
      className={[
        'posts-feed-item',
        embedded ? 'posts-feed-item-embedded' : ''
      ].filter(Boolean).join(' ')}
    >
      <header className='posts-feed-item-header'>
        <Link
          to={`/profile/${encodeURIComponent(post.addr)}`}
          className='posts-feed-item-avatar-link'
          aria-label={`View ${displayName}'s profile`}
        >
          <PostThreadAvatar
            addr={post.addr}
            profilePicUrl={profilePicUrl}
          />
        </Link>

        <div className='posts-feed-item-meta'>
          <div className='posts-feed-item-author-row'>
            <Link
              to={`/profile/${encodeURIComponent(post.addr)}`}
              className={[
                'posts-feed-item-author',
                hasCustomName
                  ? ''
                  : 'posts-feed-item-author-address'
              ].filter(Boolean).join(' ')}
              title={post.addr}
            >
              {displayName}
            </Link>

            {showRepliedLabel && (
              <span className='posts-feed-item-replied'>
                replied
              </span>
            )}
          </div>

          <span className='posts-feed-item-seen'>
            {formatRelativeSeen(post.seen)}
          </span>
        </div>

        <button
          type='button'
          className='posts-feed-item-menu'
          aria-label='Post options'
          title='Post options'
        >
          <span aria-hidden='true'>•••</span>
        </button>
      </header>

      <div className='posts-feed-item-content'>
        <p className='posts-feed-item-text'>
          <Link
            to={`/profile/${encodeURIComponent(post.addr)}`}
            className='posts-feed-item-inline-author'
          >
            {displayName}
          </Link>

          {' '}

          {post.text}
        </p>
      </div>

      {(showReplyCount || showLikeButton) && (
        <div className='posts-feed-item-actions'>
          {showLikeButton && (
            <LikeButton
              count={likeCount}
              liked={liked}
              onClick={handleLikeClick}
            />
          )}
          {showReplyCount && (
            <PostReplyCount
              count={post.replyCount ?? 0}
              onClick={onReplyClick}
            />
          )}
        </div>
      )}

      {showFooterMeta && (
        <footer className='posts-feed-item-footer'>
          <span>Block {post.blockHeight}</span>

          <span
            className='posts-feed-item-footer-separator'
            aria-hidden='true'
          >
            ·
          </span>

          <button
            type='button'
            className='posts-feed-item-txid'
            title={post.txid}
            onClick={copyTxid}
          >
            {truncateTxid(post.txid, 20)}
          </button>
        </footer>
      )}

      <LikeTipModal
        show={showLikeModal}
        post={post}
        wallet={wallet}
        profiles={profiles}
        onHide={handleLikeModalHide}
        onSuccess={handleLikeSuccess}
      />
    </Wrapper>
  )
}

export default PostFeedItem
