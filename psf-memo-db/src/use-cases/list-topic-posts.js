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

// mutate4javascript-manifest-begin
// {"version":1,"tested_at":"2026-08-28T15:16:11.032Z","module_hash":"42a65ea5f1a4dea88cd1c99bcf8ba8b476dc24a073459ffa26d21151179db078","functions":[{"id":"func/ListTopicPosts.constructor","name":"ListTopicPosts.constructor","line":9,"end_line":22,"hash":"cdc313ae9059c07ce5cd2440e49fc958b9d273ed5ab43b0a6b81fd4949ad9272"},{"id":"func/ListTopicPosts.parseRoom","name":"ListTopicPosts.parseRoom","line":24,"end_line":31,"hash":"6508b101a3e1c0a32fed8f54f5b0383f2a891e5aa5c59a6fe0d1af6c9ffb9f37"},{"id":"func/ListTopicPosts.execute","name":"ListTopicPosts.execute","line":33,"end_line":55,"hash":"3ed269937f0d908694ba94f2faef658b92d7160be1262abffcd268fe022c352c"}]}
// mutate4javascript-manifest-end
