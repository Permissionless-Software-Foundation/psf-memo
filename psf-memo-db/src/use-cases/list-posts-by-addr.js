/*
  Use case: list posts for an address ordered by block height (most recent first), paginated.
  Uses the postHeights secondary index for efficient sorting and pagination.
*/

import { parseLimit, parseOffset, attachReplyCounts } from './lib/pagination.js'

class ListPostsByAddr {
  constructor (localConfig = {}) {
    this.adapters = localConfig.adapters
    if (!this.adapters) {
      throw new Error('Adapters required when instantiating ListPostsByAddr use case.')
    }
    if (!this.adapters.postQuery) {
      throw new Error('postQuery adapter required for ListPostsByAddr use case.')
    }
    this.execute = this.execute.bind(this)
  }

  parseAddr (addr) {
    if (!addr || typeof addr !== 'string') {
      const err = new Error('addr is required')
      err.status = 400
      throw err
    }
    return addr
  }

  async execute (inObj = {}) {
    const addr = this.parseAddr(inObj.addr)
    const limit = parseLimit(inObj.limit)
    const offset = parseOffset(inObj.offset)

    const txids = await this.adapters.postQuery.scanPostsByAddrTxids(addr, { limit, offset })
    const [posts, replyCounts, total] = await Promise.all([
      this.adapters.postQuery.loadPostsByTxids(txids),
      this.adapters.postQuery.buildReplyCountMap(),
      this.adapters.postQuery.countTopLevelPostsByAddr(addr)
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

export default ListPostsByAddr
