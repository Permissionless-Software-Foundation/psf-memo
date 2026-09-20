/*
  Use case: list profiles ordered by their most recent qualifying post,
  paginated.
*/

import { parseLimit, parseOffset } from './lib/pagination.js'
import { ListUseCase } from './lib/use-case.js'

class ListRecentProfiles extends ListUseCase {
  constructor (localConfig = {}) {
    super(localConfig, { useCaseName: 'ListRecentProfiles', adapterName: 'profileQuery' })
  }

  async execute (inObj = {}) {
    const limit = parseLimit(inObj.limit)
    const offset = parseOffset(inObj.offset)

    const { profiles, total } = await this.adapters.profileQuery.listRecentProfiles({ limit, offset })
    const enriched = await Promise.all(
      profiles.map(async (profile) => ({
        ...profile,
        ...(await this.adapters.profileQuery.getProfileIdentity(profile.addr))
      }))
    )

    return {
      profiles: enriched,
      pagination: {
        limit,
        offset,
        total,
        hasMore: offset + enriched.length < total
      }
    }
  }
}

export default ListRecentProfiles

// mutate4javascript-manifest-begin
// {"version":1,"tested_at":"2026-09-20T21:53:30.844Z","module_hash":"ee68d093a6a1377f027641c165bf55ca0b8ca019a0f5449eb39c666b91b80bae","functions":[{"id":"func/ListRecentProfiles.constructor","name":"ListRecentProfiles.constructor","line":10,"end_line":12,"hash":"a2c7dd0696ac463cbc142fa7ccce4a3cadf8e246a872261733d199dbd4c153d1"},{"id":"func/ListRecentProfiles.execute","name":"ListRecentProfiles.execute","line":14,"end_line":35,"hash":"a629483fb61bd14c2a27880b667290c1dfbf2fb4e55faf14fe1010b2532b93bb"}]}
// mutate4javascript-manifest-end
