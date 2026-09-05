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
// {"version":1,"tested_at":"2026-09-04T20:25:12.592Z","module_hash":"ea92248aeea697e64e58cad10a149dd6c9fc03dee8b96fb7081e1c3cde1673bb","functions":[{"id":"func/ListRecentPosts.constructor","name":"ListRecentPosts.constructor","line":10,"end_line":12,"hash":"0abcf69664af3b707dfe95a9db5caa65e3bbec6dfb740393cafb923e81aad9ae"},{"id":"func/ListRecentPosts.execute","name":"ListRecentPosts.execute","line":14,"end_line":30,"hash":"5c858a32eaedd44bf5c08ff158b1598874987e46aa73e2cd4de99e876cc8f493"}]}
// mutate4javascript-manifest-end
