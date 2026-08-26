/*
  Use case: list profiles ordered by block height (most recent first), paginated.
*/

const DEFAULT_LIMIT = 100
const MAX_LIMIT = 100

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

  parseLimit (limit) {
    if (limit === undefined || limit === null || limit === '') {
      return DEFAULT_LIMIT
    }
    const parsed = parseInt(limit, 10)
    if (Number.isNaN(parsed) || parsed < 1) {
      const err = new Error('limit must be a positive integer')
      err.status = 400
      throw err
    }
    if (parsed > MAX_LIMIT) {
      const err = new Error(`limit cannot exceed ${MAX_LIMIT}`)
      err.status = 400
      throw err
    }
    return parsed
  }

  parseOffset (offset) {
    if (offset === undefined || offset === null || offset === '') {
      return 0
    }
    const parsed = parseInt(offset, 10)
    if (Number.isNaN(parsed) || parsed < 0) {
      const err = new Error('offset must be a non-negative integer')
      err.status = 400
      throw err
    }
    return parsed
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
    const limit = this.parseLimit(inObj.limit)
    const offset = this.parseOffset(inObj.offset)

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
