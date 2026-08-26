/*
  Use case: list profiles ordered by block height (most recent first), paginated.
*/

import { parseLimit, parseOffset } from './lib/pagination.js'
import { ListUseCase } from './lib/use-case.js'

class ListRecentProfiles extends ListUseCase {
  constructor (localConfig = {}) {
    super(localConfig, { useCaseName: 'ListRecentProfiles', adapterName: 'profileQuery' })
  }

  sortProfiles (profiles) {
    return profiles.sort((a, b) => {
      if (b.blockHeight !== a.blockHeight) {
        return b.blockHeight - a.blockHeight
      }
      return (b.seen || 0) - (a.seen || 0)
    })
  }

  async execute (inObj = {}) {
    const limit = parseLimit(inObj.limit)
    const offset = parseOffset(inObj.offset)

    const allProfiles = await this.adapters.profileQuery.scanProfilesWithBlockHeight()
    const sorted = this.sortProfiles(allProfiles)
    const total = sorted.length
    const profiles = sorted.slice(offset, offset + limit)

    return {
      profiles,
      pagination: {
        limit,
        offset,
        total,
        hasMore: offset + profiles.length < total
      }
    }
  }
}

export default ListRecentProfiles

// mutate4javascript-manifest-begin
// {"version":1,"tested_at":"2026-08-26T18:15:31.955Z","module_hash":"0a41c7c2086270d2f29266eb20b2313d2ab8782fc8a32ad6dd0b27d737a41b13","functions":[{"id":"func/ListRecentProfiles.constructor","name":"ListRecentProfiles.constructor","line":9,"end_line":11,"hash":"a2c7dd0696ac463cbc142fa7ccce4a3cadf8e246a872261733d199dbd4c153d1"},{"id":"func/ListRecentProfiles.sortProfiles","name":"ListRecentProfiles.sortProfiles","line":13,"end_line":20,"hash":"8dbe8da4b9a5c52230b5f865a6d0b5a5817a266277a72b09b93b2b0f76414d9e"},{"id":"func/ListRecentProfiles.execute","name":"ListRecentProfiles.execute","line":22,"end_line":40,"hash":"d14afac95c39e7a311d9e3a1243b6a326de38906b5ad312f014ce6b6d5459de1"}]}
// mutate4javascript-manifest-end
