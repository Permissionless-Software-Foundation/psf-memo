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
