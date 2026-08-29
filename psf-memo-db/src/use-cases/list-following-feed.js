/*
  Use case: list top-level posts from profiles the viewer follows, newest first.

  Joins the follows index with the global postHeights index. Replies and the
  viewer's own posts are excluded. Results are paginated with limit/offset.
*/

import { parseLimit, parseOffset, assemblePostPage } from './lib/pagination.js'

class ListFollowingFeed {
  constructor (localConfig = {}) {
    this.adapters = localConfig.adapters
    if (!this.adapters) {
      throw new Error('Adapters required when instantiating ListFollowingFeed use case.')
    }
    if (!this.adapters.postQuery) {
      throw new Error('postQuery adapter required for ListFollowingFeed use case.')
    }
    if (!this.adapters.followQuery) {
      throw new Error('followQuery adapter required for ListFollowingFeed use case.')
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

    const followingAddrs = await this.adapters.followQuery.listFollowing(addr)
    const { txids, total } = await this.adapters.postQuery.scanFollowingFeedTxidsAndCount(
      addr,
      followingAddrs,
      { limit, offset }
    )
    const [posts, replyCounts, likeCounts] = await Promise.all([
      this.adapters.postQuery.loadPostsByTxids(txids),
      this.adapters.postQuery.countRepliesForTxids(txids),
      this.adapters.postQuery.countLikesForTxids(txids)
    ])

    return assemblePostPage({ posts, replyCounts, likeCounts, total, limit, offset })
  }
}

export default ListFollowingFeed
