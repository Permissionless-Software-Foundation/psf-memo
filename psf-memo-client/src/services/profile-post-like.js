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

// mutate4javascript-manifest-begin
// {"version":1,"tested_at":"2026-10-02T15:20:26.742Z","module_hash":"af44e40301b50d01cc2d8bab218b84e27c225ebeffa6a4255b7303fae7244d0e","functions":[{"id":"func/initialLikeState","name":"initialLikeState","line":11,"end_line":13,"hash":"4e171ac700b0313c6f9691f18190d8e65ae37fe6e6c806b21eafb416251041f6"},{"id":"func/reflectLike","name":"reflectLike","line":16,"end_line":18,"hash":"23836e83d783a271d1f8ebacdff0299952d8c98708c2e7ae94b1788e8c183167"},{"id":"func/selectLikeState","name":"selectLikeState","line":22,"end_line":24,"hash":"2916461a266604bdf3cb55ab83a794936e462b061ccbe6e84ba294c966434145"},{"id":"func/applyLike","name":"applyLike","line":27,"end_line":29,"hash":"1944fe7e79c5054e25a0e35bcdcd20f83fdce8c6d8a97f614bc3becd27a50efd"}]}
// mutate4javascript-manifest-end
