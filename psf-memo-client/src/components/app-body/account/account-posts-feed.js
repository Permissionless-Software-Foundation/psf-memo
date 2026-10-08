/*
  Account posts feed.

  The authenticated account's own top-level Memo posts, shown below the Set
  Name / Set Bio / Set Avatar URL controls on the account page. Uses the same
  post card pieces as the /profile/:addr feed: the post options menu, the
  rendered post text (links, images, YouTube embeds), the interactive like/tip
  button, and the reply count that opens the thread modal. Shows a no-posts
  message when the account has none.

  Written in plain React.createElement style so the same component can be used
  by the JSX account page and by the Node acceptance renderer.
*/

const React = require('react')
const AccountPage = require('../../../services/account-page')
const { selectLikeState } = require('../../../services/profile-post-like')
const { formatSeen } = require('../../../services/post-timestamp')
const PostOptionsMenu = require('../../post-feed/post-options-menu')
const ProfilePostContent = require('../profile/profile-post-content')
const ProfilePostLike = require('../profile/profile-post-like')
const ReplyCountView = require('../../post-reply-count/reply-count-view')

function AccountPostCard ({ post, wallet, profiles, likes, onLike, onReply }) {
  const likeState = selectLikeState(likes, post)

  return React.createElement(
    'div',
    { className: 'account-post-card card mb-3', 'data-post-txid': post.txid },
    React.createElement(
      'div',
      { className: 'account-post-body card-body' },
      React.createElement(
        'div',
        { className: 'account-post-meta d-flex justify-content-between align-items-start text-muted mb-2' },
        React.createElement(
          'div',
          null,
          React.createElement('span', { className: 'account-post-seen' }, formatSeen(post.seen)),
          React.createElement('span', { className: 'account-post-block ms-2' }, `Block ${post.blockHeight}`)
        ),
        React.createElement(PostOptionsMenu, { txid: post.txid })
      ),
      React.createElement(ProfilePostContent, { text: post.text }),
      React.createElement(
        'div',
        { className: 'account-post-actions d-flex gap-3 align-items-center' },
        React.createElement(ProfilePostLike, {
          post,
          wallet,
          profiles,
          liked: likeState.liked,
          count: likeState.count,
          onClick: () => { if (onLike) onLike(post) }
        }),
        React.createElement(ReplyCountView, {
          count: post.replyCount ?? 0,
          onClick: onReply ? () => onReply(post) : undefined
        })
      )
    )
  )
}

function AccountPostsFeed ({
  posts = [],
  wallet,
  profiles,
  likes = {},
  onLike,
  onReply
}) {
  const body = posts.length === 0
    ? React.createElement(
      'p',
      { className: 'account-posts-empty text-muted' },
      AccountPage.NO_POSTS_MESSAGE
    )
    : posts.map((post) => React.createElement(AccountPostCard, {
      key: post.txid,
      post,
      wallet,
      profiles,
      likes,
      onLike,
      onReply
    }))

  return React.createElement(
    'div',
    { className: 'account-posts-feed', 'data-section': 'posts' },
    body
  )
}

module.exports = { AccountPostsFeed, NO_POSTS_MESSAGE: AccountPage.NO_POSTS_MESSAGE }

// mutate4javascript-manifest-begin
// {"version":1,"tested_at":"2026-10-08T19:56:43.362Z","module_hash":"1c3bf7844445307a47c0aa25e9df6050b0424c400d6b8930d76fa7477945aa87","functions":[{"id":"func/AccountPostCard","name":"AccountPostCard","line":23,"end_line":56,"hash":"999a580c79631346836672337ecb3c50145979f67d0ec22aee1425f32a8b19df"},{"id":"func/AccountPostsFeed","name":"AccountPostsFeed","line":58,"end_line":87,"hash":"48315a16655e40c7545f8cacb1a1e408aafcc329e6deeaa14c029757efe52ed6"}]}
// mutate4javascript-manifest-end
