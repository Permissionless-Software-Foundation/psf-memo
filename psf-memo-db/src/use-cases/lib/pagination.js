/*
  Shared pagination parsing and post-list enrichment for post use cases.

  Both the recent-posts and posts-by-address list use cases share identical
  limit/offset validation and reply-count enrichment. Centralizing them keeps
  the validation behavior identical across all list endpoints and avoids
  duplicated error handling.
*/

const DEFAULT_LIMIT = 100
const MAX_LIMIT = 100

function isEmpty (value) {
  return value === undefined || value === null || value === ''
}

function httpError (message, status) {
  const err = new Error(message)
  err.status = status
  return err
}

export function parseLimit (limit) {
  if (isEmpty(limit)) return DEFAULT_LIMIT

  const parsed = parseInt(limit, 10)
  if (Number.isNaN(parsed) || parsed < 1) {
    throw httpError('limit must be a positive integer', 400)
  }
  if (parsed > MAX_LIMIT) {
    throw httpError(`limit cannot exceed ${MAX_LIMIT}`, 400)
  }
  return parsed
}

export function parseOffset (offset) {
  if (isEmpty(offset)) return 0

  const parsed = parseInt(offset, 10)
  if (Number.isNaN(parsed) || parsed < 0) {
    throw httpError('offset must be a non-negative integer', 400)
  }
  return parsed
}

export function attachReplyCounts (posts, replyCounts) {
  return posts.map((post) => ({
    ...post,
    replyCount: replyCounts.get(post.txid) ?? 0
  }))
}

export function attachLikeCounts (posts, likeCounts) {
  return posts.map((post) => ({
    ...post,
    likeCount: likeCounts.get(post.txid) ?? 0
  }))
}

export function assemblePostPage ({ posts, replyCounts, likeCounts, total, limit, offset }) {
  let enriched = attachReplyCounts(posts, replyCounts)
  enriched = attachLikeCounts(enriched, likeCounts)
  return {
    posts: enriched,
    pagination: {
      limit,
      offset,
      total,
      hasMore: offset + posts.length < total
    }
  }
}

// mutate4javascript-manifest-begin
// {"version":1,"tested_at":"2026-08-27T03:32:37.566Z","module_hash":"e13c6a9aac8093c65559ec81bc44239611f47270c9199a8b4dd8fc67b36a0e5f","functions":[{"id":"func/isEmpty","name":"isEmpty","line":13,"end_line":15,"hash":"209ecce14d6de3b7500065dd3091a7f2c006d1b08305078720ddd2ab250bc501"},{"id":"func/httpError","name":"httpError","line":17,"end_line":21,"hash":"270f69e0007e397fbd6beac1f2fd7d3a1156f9ba1cdf2d230e4e867c8b221aeb"},{"id":"func/parseLimit","name":"parseLimit","line":23,"end_line":34,"hash":"20c64d382dedbd2b65e68d66a35ccba8ecfc78dc32534a697e3865f05021eaf2"},{"id":"func/parseOffset","name":"parseOffset","line":36,"end_line":44,"hash":"55b13c976e2d53e6b69658555d97f4e63d425b5cb6b7b47b57081bd18ef16845"},{"id":"func/attachReplyCounts","name":"attachReplyCounts","line":46,"end_line":51,"hash":"99b9e818ac032752eb76fc9fcdcba0dcd1d94bee830921131a18fd01a4848f76"},{"id":"func/attachLikeCounts","name":"attachLikeCounts","line":53,"end_line":58,"hash":"eebdaa4235d209f5ab3cfb7c242bb76b29c0365676107eee7f681ecb1c188ea8"},{"id":"func/assemblePostPage","name":"assemblePostPage","line":60,"end_line":72,"hash":"496cbbf9f16d3b36ffbe486a62462cbb939f02b9f1610e4a577d2e5ff167c51f"}]}
// mutate4javascript-manifest-end
