/*
  Use case: list posts for an address ordered by block height (most recent first), paginated.
*/

const DEFAULT_LIMIT = 100
const MAX_LIMIT = 100

class ListPostsByAddr {
  constructor (localConfig = {}) {
    this.adapters = localConfig.adapters
    if (!this.adapters) {
      throw new Error('Adapters required when instantiating ListPostsByAddr use case.')
    }
    if (!this.adapters.postQuery) {
      throw new Error('postQuery adapter required for ListPostsByAddr use case.')
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

  parseAddr (addr) {
    if (!addr || typeof addr !== 'string') {
      const err = new Error('addr is required')
      err.status = 400
      throw err
    }
    return addr
  }

  sortPosts (posts) {
    return posts.sort((a, b) => {
      if (b.blockHeight !== a.blockHeight) {
        return b.blockHeight - a.blockHeight
      }
      return (b.seen || 0) - (a.seen || 0)
    })
  }

  async execute (inObj = {}) {
    const addr = this.parseAddr(inObj.addr)
    const limit = this.parseLimit(inObj.limit)
    const offset = this.parseOffset(inObj.offset)

    const allPosts = await this.adapters.postQuery.scanPostsByAddr(addr)
    const sorted = this.sortPosts(allPosts)
    const total = sorted.length
    const posts = sorted.slice(offset, offset + limit)

    return {
      posts,
      pagination: {
        limit,
        offset,
        total,
        hasMore: offset + posts.length < total
      }
    }
  }
}

export default ListPostsByAddr
