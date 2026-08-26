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
    const [posts, replyCounts, total] = await Promise.all([
      this.adapters.postQuery.loadPostsByTxids(txids),
      this.adapters.postQuery.buildReplyCountMap(),
      this.adapters.postQuery.countTopLevelPosts()
    ])

    return assemblePostPage({ posts, replyCounts, total, limit, offset })
  }
}

export default ListRecentPosts

// mutate4javascript-manifest-begin
// {"version":1,"tested_at":"2026-08-26T18:15:24.894Z","module_hash":"35af93129e7bf3eddc46fa5909fdf71538afc29182af5a1a2ec06e25193fa7d3","functions":[{"id":"func/ListRecentPosts.constructor","name":"ListRecentPosts.constructor","line":10,"end_line":12,"hash":"0abcf69664af3b707dfe95a9db5caa65e3bbec6dfb740393cafb923e81aad9ae"},{"id":"func/ListRecentPosts.execute","name":"ListRecentPosts.execute","line":14,"end_line":26,"hash":"ff4bd895e3dad7ec3ed58832588e53f049de4f210a19f81ef3e074abf694dd33"}]}
// mutate4javascript-manifest-end
