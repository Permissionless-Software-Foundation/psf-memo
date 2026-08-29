/*
  Use case: list profiles ordered by block height (most recent first), paginated.
*/

import { parseLimit, parseOffset } from './lib/pagination.js'
import { ListUseCase } from './lib/use-case.js'
import { sortByHeightDesc } from '../lib/search.js'

class ListRecentProfiles extends ListUseCase {
  constructor (localConfig = {}) {
    super(localConfig, { useCaseName: 'ListRecentProfiles', adapterName: 'profileQuery' })
  }

  async execute (inObj = {}) {
    const limit = parseLimit(inObj.limit)
    const offset = parseOffset(inObj.offset)

    const allProfiles = await this.adapters.profileQuery.scanProfilesWithBlockHeight()
    const sorted = allProfiles.sort(sortByHeightDesc)
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
// {"version":1,"tested_at":"2026-08-29T14:25:23.929Z","module_hash":"4eee5bdcc428b107755e33bd6b2b6dd6477a01aa9feece327ba144ec4825442f","functions":[{"id":"func/ListRecentProfiles.constructor","name":"ListRecentProfiles.constructor","line":10,"end_line":12,"hash":"a2c7dd0696ac463cbc142fa7ccce4a3cadf8e246a872261733d199dbd4c153d1"},{"id":"func/ListRecentProfiles.execute","name":"ListRecentProfiles.execute","line":14,"end_line":32,"hash":"f9fc78d274ac88aad570a32a45d20364974dde79538b414823241610cf2339dc"}]}
// mutate4javascript-manifest-end
