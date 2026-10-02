/*
  Like control for a profile page post card.

  Shows the same interactive heart button as the recent feed post card: the
  icon is filled when the post has been liked in the current session and
  outlined otherwise, and clicking delegates to the parent page (which opens
  the like/tip modal). Presentational only: the profile page owns the per-post
  liked/count state and the like/tip modal.

  Written in plain React.createElement style (via LikeButton) so the same
  module can be used by the JSX profile page and by the acceptance adapter
  that renders HTML under Node.
*/

const React = require('react')
const LikeButton = require('../../post-feed/like-button')

function ProfilePostLike ({ post, liked = false, count, onClick }) {
  if (!post) return null

  return React.createElement(LikeButton, {
    count: count ?? post.likeCount ?? 0,
    liked,
    onClick
  })
}

module.exports = ProfilePostLike
