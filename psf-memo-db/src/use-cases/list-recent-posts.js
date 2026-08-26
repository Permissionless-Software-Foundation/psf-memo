/*
  Use case: list posts ordered by block height (most recent first), paginated.
  Uses the postHeights secondary index for efficient sorting and pagination.
*/

const DEFAULT_LIMIT = 100
const MAX_LIMIT = 100

class ListRecentPosts {
  constructor (localConfig = {}) {
    this.adapters = localConfig.adapters
    if (!this.adapters) {
      throw new Error('Adapters required when instantiating ListRecentPosts use case.')
    }
    if (!this.adapters.postQuery) {
      throw new Error('postQuery adapter required for ListRecentPosts use case.')
    }
    this.execute = this.execute.bind(this)
    this.attachReplyCounts = this.attachReplyCounts.bind(this)
  }

  parseLimit (limit) {
    if (limit === undefined || limit === null || limit === '') {
      return DEFAULT_LIMIT
    }
    const parsed = parseInt(limit, 10)
    if (Number.isNaN(parsed) || parsed < 1) {
      const err = new Error('limit must be a positive integer')
      err.status = 400
      throw err
    }
    if (parsed > MAX_LIMIT) {
      const err = new Error(`limit cannot exceed ${MAX_LIMIT}`)
      err.status = 400
      throw err
    }
    return parsed
  }

  parseOffset (offset) {
    if (offset === undefined || offset === null || offset === '') {
      return 0
    }
    const parsed = parseInt(offset, 10)
    if (Number.isNaN(parsed) || parsed < 0) {
      const err = new Error('offset must be a non-negative integer')
      err.status = 400
      throw err
    }
    return parsed
  }

  attachReplyCounts (posts, replyCounts) {
    return posts.map((post) => ({
      ...post,
      replyCount: replyCounts.get(post.txid) ?? 0
    }))
  }

  async execute (inObj = {}) {
    const limit = this.parseLimit(inObj.limit)
    const offset = this.parseOffset(inObj.offset)

    const txids = await this.adapters.postQuery.scanRecentPostTxids({ limit, offset })
    const [posts, replyCounts, total] = await Promise.all([
      this.adapters.postQuery.loadPostsByTxids(txids),
      this.adapters.postQuery.buildReplyCountMap(),
      this.adapters.postQuery.countTopLevelPosts()
    ])

    return {
      posts: this.attachReplyCounts(posts, replyCounts),
      pagination: {
        limit,
        offset,
        total,
        hasMore: offset + posts.length < total
      }
    }
  }
}

export default ListRecentPosts
