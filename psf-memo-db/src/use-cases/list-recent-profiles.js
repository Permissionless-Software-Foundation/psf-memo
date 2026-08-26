/*
  Use case: list profiles ordered by block height (most recent first), paginated.
*/

import { parseLimit, parseOffset } from './lib/pagination.js'

class ListRecentProfiles {
  constructor (localConfig = {}) {
    this.adapters = localConfig.adapters
    if (!this.adapters) {
      throw new Error('Adapters required when instantiating ListRecentProfiles use case.')
    }
    if (!this.adapters.profileQuery) {
      throw new Error('profileQuery adapter required for ListRecentProfiles use case.')
    }
    this.execute = this.execute.bind(this)
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
