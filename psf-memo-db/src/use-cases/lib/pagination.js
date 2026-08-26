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
