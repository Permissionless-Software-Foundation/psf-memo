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
// {"version":1,"tested_at":"2026-08-28T04:27:33.351Z","module_hash":"2f04780eac838833916328a63883e4e2e0cadbe37edf27d0ec46b189e6e25c50","functions":[{"id":"func/ListRecentPosts.constructor","name":"ListRecentPosts.constructor","line":10,"end_line":12,"hash":"0abcf69664af3b707dfe95a9db5caa65e3bbec6dfb740393cafb923e81aad9ae"},{"id":"func/ListRecentPosts.execute","name":"ListRecentPosts.execute","line":14,"end_line":27,"hash":"a30e9d5225071cea6bc92052ddfe29d83e91698afd0d53c00f37f22f08d51afc"}]}
// mutate4javascript-manifest-end
