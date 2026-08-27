/*
  Use case: list posts ordered by block height (most recent first), paginated.
  Uses the postHeights secondary index for efficient sorting and pagination.
*/

import { parseLimit, parseOffset, assemblePostPage } from './lib/pagination.js'
import { ListUseCase } from './lib/use-case.js'

class ListRecentPosts extends ListUseCase {
  constructor (localConfig = {}) {
    super(localConfig, { useCaseName: 'ListRecentPosts', adapterName: 'postQuery' })
  }

  async execute (inObj = {}) {
    const limit = parseLimit(inObj.limit)
    const offset = parseOffset(inObj.offset)

    const txids = await this.adapters.postQuery.scanRecentPostTxids({ limit, offset })
    const [posts, replyCounts, likeCounts, total] = await Promise.all([
      this.adapters.postQuery.loadPostsByTxids(txids),
      this.adapters.postQuery.buildReplyCountMap(),
      this.adapters.postQuery.countLikesForTxids(txids),
      this.adapters.postQuery.countTopLevelPosts()
    ])

    return assemblePostPage({ posts, replyCounts, likeCounts, total, limit, offset })
  }
}

export default ListRecentPosts

// mutate4javascript-manifest-begin
// {"version":1,"tested_at":"2026-08-27T03:37:04.275Z","module_hash":"32bded9680fed44f6f0f8ecd55ff1533ed80ef30a72001a26c562d31fa39dbc2","functions":[{"id":"func/ListRecentPosts.constructor","name":"ListRecentPosts.constructor","line":10,"end_line":12,"hash":"0abcf69664af3b707dfe95a9db5caa65e3bbec6dfb740393cafb923e81aad9ae"},{"id":"func/ListRecentPosts.execute","name":"ListRecentPosts.execute","line":14,"end_line":27,"hash":"ea22fb6f9232a570503419bff406f4d87b8a3f9debe1d4020c0c600a13dfd29d"}]}
// mutate4javascript-manifest-end
