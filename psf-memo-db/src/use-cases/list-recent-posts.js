/*
  Use case: list posts ordered by block height (most recent first), paginated.
  Uses the postHeights secondary index for efficient sorting and pagination.
*/

import { parseLimit, parseOffset, attachReplyCounts } from './lib/pagination.js'

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
  }

  async execute (inObj = {}) {
    const limit = parseLimit(inObj.limit)
    const offset = parseOffset(inObj.offset)

    const txids = await this.adapters.postQuery.scanRecentPostTxids({ limit, offset })
    const [posts, replyCounts, total] = await Promise.all([
      this.adapters.postQuery.loadPostsByTxids(txids),
      this.adapters.postQuery.buildReplyCountMap(),
      this.adapters.postQuery.countTopLevelPosts()
    ])

    return {
      posts: attachReplyCounts(posts, replyCounts),
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
