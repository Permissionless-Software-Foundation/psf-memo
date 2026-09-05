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
    const viewerAddr = inObj.viewerAddr || inObj.viewer || null

    const scanArgs = { limit, offset }
    if (viewerAddr) scanArgs.viewerAddr = viewerAddr
    const { txids, total } = await this.adapters.postQuery.scanRecentPostTxidsAndCount(scanArgs)
    const [posts, replyCounts, likeCounts] = await Promise.all([
      this.adapters.postQuery.loadPostsByTxids(txids),
      this.adapters.postQuery.countRepliesForTxids(txids),
      this.adapters.postQuery.countLikesForTxids(txids)
    ])

    return assemblePostPage({ posts, replyCounts, likeCounts, total, limit, offset })
  }
}

export default ListRecentPosts

// mutate4javascript-manifest-begin
// {"version":1,"tested_at":"2026-09-05T01:53:48.116Z","module_hash":"d5e28c97faab892eeb7098689aa4e6458eef289db1a589c20b0fb0888ebb8bc0","functions":[{"id":"func/ListRecentPosts.constructor","name":"ListRecentPosts.constructor","line":10,"end_line":12,"hash":"0abcf69664af3b707dfe95a9db5caa65e3bbec6dfb740393cafb923e81aad9ae"},{"id":"func/ListRecentPosts.execute","name":"ListRecentPosts.execute","line":14,"end_line":29,"hash":"74fc76ccd23b442e804c012ad904d032da5078b5e4f12b226a1d0c21377e31fc"}]}
// mutate4javascript-manifest-end
