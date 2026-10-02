/*
  Pure state for a post's interactive like control.

  A post card shows a heart that reflects whether the post has been liked in
  the current session and the post's like count. The transitions and the
  per-post likes map are pure so they can be verified without a browser; the
  React components own only the React state and the like/tip modal.
*/

// The initial liked/count state for a post.
function initialLikeState (post) {
  return { liked: false, count: Number(post?.likeCount) || 0 }
}

// The state after a successful like broadcast: liked, with the count raised.
function reflectLike (state) {
  return { liked: true, count: state.count + 1 }
}

// The displayed state for a post: the reflected state when the post has
// already been liked in the current session, otherwise the initial state.
function selectLikeState (likes, post) {
  return likes[post.txid] || initialLikeState(post)
}

// Fold a successful like into the per-post likes map without mutating it.
function applyLike (likes, post) {
  return { ...likes, [post.txid]: reflectLike(selectLikeState(likes, post)) }
}

module.exports = { initialLikeState, reflectLike, selectLikeState, applyLike }
