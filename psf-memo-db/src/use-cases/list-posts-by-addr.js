/*
  Use case: list posts for an address ordered by block height (most recent first), paginated.
  Uses the postHeights secondary index for efficient sorting and pagination.
*/

import { parseLimit, parseOffset, assemblePostPage } from './lib/pagination.js'
import { ListUseCase } from './lib/use-case.js'

class ListPostsByAddr extends ListUseCase {
  constructor (localConfig = {}) {
    super(localConfig, { useCaseName: 'ListPostsByAddr', adapterName: 'postQuery' })
  }

  parseAddr (addr) {
    if (!addr || typeof addr !== 'string') {
      const err = new Error('addr is required')
      err.status = 400
      throw err
    }
    return addr
  }

  async execute (inObj = {}) {
    const addr = this.parseAddr(inObj.addr)
    const limit = parseLimit(inObj.limit)
    const offset = parseOffset(inObj.offset)

    const txids = await this.adapters.postQuery.scanPostsByAddrTxids(addr, { limit, offset })
    const [posts, replyCounts, likeCounts, total] = await Promise.all([
      this.adapters.postQuery.loadPostsByTxids(txids),
      this.adapters.postQuery.buildReplyCountMap(),
      this.adapters.postQuery.buildLikeCountMap(),
      this.adapters.postQuery.countTopLevelPostsByAddr(addr)
    ])

    return assemblePostPage({ posts, replyCounts, likeCounts, total, limit, offset })
  }
}

export default ListPostsByAddr

// mutate4javascript-manifest-begin
// {"version":1,"tested_at":"2026-08-26T18:15:16.107Z","module_hash":"b925b4bf1307be2f9d7b4e5d9590f6d189c5ec7632102bb65cdb525ffe19f7b3","functions":[{"id":"func/ListPostsByAddr.constructor","name":"ListPostsByAddr.constructor","line":10,"end_line":12,"hash":"f777f3685c5b2199ec3c3a7043b3cf288a9bbf583232bd1fc58cc346373f03d6"},{"id":"func/ListPostsByAddr.parseAddr","name":"ListPostsByAddr.parseAddr","line":14,"end_line":21,"hash":"0f02fc6ebf05826429d57bf2fd64bf66dfde96ee159f6c1d4814f41cc7a25aca"},{"id":"func/ListPostsByAddr.execute","name":"ListPostsByAddr.execute","line":23,"end_line":36,"hash":"899d7d2e5c9c31a05c34f00c063ffd4f88a6d0a779f6d47000f2fb770029dc86"}]}
// mutate4javascript-manifest-end
