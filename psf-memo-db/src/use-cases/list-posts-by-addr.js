/*
  Use case: list posts for an address ordered by block height (most recent first), paginated.
  Uses the postHeights secondary index for efficient sorting and pagination.
*/

import { parseLimit, parseOffset, parseRequiredString, assemblePostPage } from './lib/pagination.js'
import { ListUseCase } from './lib/use-case.js'

class ListPostsByAddr extends ListUseCase {
  constructor (localConfig = {}) {
    super(localConfig, { useCaseName: 'ListPostsByAddr', adapterName: 'postQuery' })
  }

  async execute (inObj = {}) {
    const addr = parseRequiredString(inObj.addr, 'addr')
    const limit = parseLimit(inObj.limit)
    const offset = parseOffset(inObj.offset)

    const { txids, total } = await this.adapters.postQuery.scanPostsByAddrTxidsAndCount(addr, { limit, offset })
    const [posts, replyCounts, likeCounts] = await Promise.all([
      this.adapters.postQuery.loadPostsByTxids(txids),
      this.adapters.postQuery.countRepliesForTxids(txids),
      this.adapters.postQuery.countLikesForTxids(txids)
    ])

    return assemblePostPage({ posts, replyCounts, likeCounts, total, limit, offset })
  }
}

export default ListPostsByAddr

// mutate4javascript-manifest-begin
// {"version":1,"tested_at":"2026-09-02T19:02:37.206Z","module_hash":"ca00e44ac02115d358d25a2932fe1084f39070c5754a9e96c27a37e215a5998e","functions":[{"id":"func/ListPostsByAddr.constructor","name":"ListPostsByAddr.constructor","line":10,"end_line":12,"hash":"f777f3685c5b2199ec3c3a7043b3cf288a9bbf583232bd1fc58cc346373f03d6"},{"id":"func/ListPostsByAddr.execute","name":"ListPostsByAddr.execute","line":14,"end_line":27,"hash":"c21b84d10ac7308f026f5967c6b1f2113357f8f3c96f600c38e2fc08e64f7caf"}]}
// mutate4javascript-manifest-end
