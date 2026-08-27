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
// {"version":1,"tested_at":"2026-08-27T03:36:35.828Z","module_hash":"fe2572105f71125c76e822f2fe6ab15b603ff571753d6e1f07870c1e7b4f4a95","functions":[{"id":"func/ListPostsByAddr.constructor","name":"ListPostsByAddr.constructor","line":10,"end_line":12,"hash":"f777f3685c5b2199ec3c3a7043b3cf288a9bbf583232bd1fc58cc346373f03d6"},{"id":"func/ListPostsByAddr.parseAddr","name":"ListPostsByAddr.parseAddr","line":14,"end_line":21,"hash":"0f02fc6ebf05826429d57bf2fd64bf66dfde96ee159f6c1d4814f41cc7a25aca"},{"id":"func/ListPostsByAddr.execute","name":"ListPostsByAddr.execute","line":23,"end_line":37,"hash":"f792df1eb2aa025d2f9ad2f88ee0034c37e0502e035afc3430d448cb6b97b5d7"}]}
// mutate4javascript-manifest-end
