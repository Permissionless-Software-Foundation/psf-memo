/*
  Use case: list the posts for a single Memo topic, ordered by block height
  (newest first), paginated.
*/

import { parseLimit, parseOffset, parseRequiredString, attachReplyCounts, attachLikeCounts } from './lib/pagination.js'

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

  async execute (inObj = {}) {
    const room = parseRequiredString(inObj.room, 'room')
    const limit = parseLimit(inObj.limit)
    const offset = parseOffset(inObj.offset)
    const viewerAddr = inObj.viewerAddr || inObj.viewer || null

    const { txids, total } = await this.adapters.topicQuery.getTopicPostTxids(room, { limit, offset, viewerAddr })
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
// {"version":1,"tested_at":"2026-09-02T19:02:55.018Z","module_hash":"fc9d576550fdf3097c37feae14a9c1d7a8d15e44fa7c705140d5c869bc2a4f02","functions":[{"id":"func/ListTopicPosts.constructor","name":"ListTopicPosts.constructor","line":9,"end_line":22,"hash":"cdc313ae9059c07ce5cd2440e49fc958b9d273ed5ab43b0a6b81fd4949ad9272"},{"id":"func/ListTopicPosts.execute","name":"ListTopicPosts.execute","line":24,"end_line":46,"hash":"61f3386dac6823688ea4d0a6dbf3edebc77b36d3171e8a2661274d8871dcc39a"}]}
// mutate4javascript-manifest-end
