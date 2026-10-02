/*
  Pure state for a profile post's interactive like control.

  The profile post card shows a heart that reflects whether the post has been
  liked in the current session and the post's like count. The transitions are
  pure so they can be verified without a browser; the React profile page owns
  the per-post state map and the like/tip modal.
*/

// The initial liked/count state for a post.
function initialLikeState (post) {
  return { liked: false, count: Number(post?.likeCount) || 0 }
}

// The state after a successful like broadcast: liked, with the count raised.
function reflectLike (state) {
  return { liked: true, count: state.count + 1 }
}

module.exports = { initialLikeState, reflectLike }
