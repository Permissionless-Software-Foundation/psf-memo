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
// {"version":1,"tested_at":"2026-09-04T20:26:06.562Z","module_hash":"1e97ba4ccda25785ad914736a0cf89f95508f119816d3617ee04c719575484be","functions":[{"id":"func/ListTopicPosts.constructor","name":"ListTopicPosts.constructor","line":9,"end_line":22,"hash":"cdc313ae9059c07ce5cd2440e49fc958b9d273ed5ab43b0a6b81fd4949ad9272"},{"id":"func/ListTopicPosts.execute","name":"ListTopicPosts.execute","line":24,"end_line":47,"hash":"ce1f62ccfadcca0a00355997da767073633278e0a232fd644cde70e0969ce238"}]}
// mutate4javascript-manifest-end
