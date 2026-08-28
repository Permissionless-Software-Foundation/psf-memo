/*
  Use case: list the posts for a single Memo topic, ordered by block height
  (newest first), paginated.
*/

import { parseLimit, parseOffset, attachReplyCounts, attachLikeCounts } from './lib/pagination.js'

class ListTopicPosts {
  constructor (localConfig = {}) {
    this.adapters = localConfig.adapters
    if (!this.adapters) {
      throw new Error('Adapters required when instantiating ListTopicPosts use case.')
    }
    if (!this.adapters.topicQuery) {
      throw new Error('topicQuery adapter required for ListTopicPosts use case.')
    }
    if (!this.adapters.postQuery) {
      throw new Error('postQuery adapter required for ListTopicPosts use case.')
    }

    this.execute = this.execute.bind(this)
  }

  parseRoom (room) {
    if (!room || typeof room !== 'string') {
      const err = new Error('room is required')
      err.status = 400
      throw err
    }
    return room
  }

  async execute (inObj = {}) {
    const room = this.parseRoom(inObj.room)
    const limit = parseLimit(inObj.limit)
    const offset = parseOffset(inObj.offset)

    const { txids, total } = await this.adapters.topicQuery.getTopicPostTxids(room, { limit, offset })
    const [posts, replyCounts, likeCounts] = await Promise.all([
      this.adapters.postQuery.loadPostsByTxids(txids),
      this.adapters.postQuery.countRepliesForTxids(txids),
      this.adapters.postQuery.countLikesForTxids(txids)
    ])

    const enriched = attachLikeCounts(attachReplyCounts(posts, replyCounts), likeCounts)
    return {
      posts: enriched,
      pagination: {
        limit,
        offset,
        total,
        hasMore: total > enriched.length
      }
    }
  }
}

export default ListTopicPosts
