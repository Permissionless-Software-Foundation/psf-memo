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
    const page = sorted.slice(offset, offset + limit)
    const profiles = await Promise.all(
      page.map(async (profile) => ({
        ...profile,
        ...(await this.adapters.profileQuery.getProfileIdentity(profile.addr))
      }))
    )

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
// {"version":1,"tested_at":"2026-09-20T20:06:31.180Z","module_hash":"5c9bf3b5be5a616a72eef340cf9f1d2c211c061d80aabc4eb2393a73ee77fbfa","functions":[{"id":"func/ListRecentProfiles.constructor","name":"ListRecentProfiles.constructor","line":10,"end_line":12,"hash":"a2c7dd0696ac463cbc142fa7ccce4a3cadf8e246a872261733d199dbd4c153d1"},{"id":"func/ListRecentProfiles.execute","name":"ListRecentProfiles.execute","line":14,"end_line":38,"hash":"4f1c2184766274d911ae3cab174ef9cc946ca9459aad1e199811732ebda99d46"}]}
// mutate4javascript-manifest-end
