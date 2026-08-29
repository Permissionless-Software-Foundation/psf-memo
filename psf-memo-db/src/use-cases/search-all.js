/*
  Use case: search across posts and profiles by case-insensitive substring.

  Returns a page of matching top-level posts and profiles sharing the same
  pagination parameters. Empty or whitespace-only queries produce an empty
  result set without error.
*/

import { parseLimit, parseOffset } from './lib/pagination.js'
import { ListUseCase } from './lib/use-case.js'

function normalizeQuery (query) {
  return String(query ?? '').trim().toLowerCase()
}

function sortByHeightDesc (a, b) {
  if (b.blockHeight !== a.blockHeight) {
    return b.blockHeight - a.blockHeight
  }
  return (b.seen || 0) - (a.seen || 0)
}

class SearchAll extends ListUseCase {
  constructor (localConfig = {}) {
    super(localConfig, { useCaseName: 'SearchAll', adapterName: 'searchQuery' })
  }

  async execute (inObj = {}) {
    const q = normalizeQuery(inObj.q)
    const limit = parseLimit(inObj.limit)
    const offset = parseOffset(inObj.offset)

    if (q.length === 0) {
      return this.emptyResult(limit, offset)
    }

    const [allPosts, allProfiles] = await Promise.all([
      this.adapters.searchQuery.searchPosts(q),
      this.adapters.searchQuery.searchProfiles(q)
    ])

    allPosts.sort(sortByHeightDesc)
    allProfiles.sort(sortByHeightDesc)

    const totalPosts = allPosts.length
    const totalProfiles = allProfiles.length
    const total = totalPosts + totalProfiles

    const posts = allPosts.slice(offset, offset + limit)
    const profiles = allProfiles.slice(offset, offset + limit)
    const returnedCount = posts.length + profiles.length

    return {
      posts,
      profiles,
      pagination: {
        limit,
        offset,
        total,
        hasMore: offset + returnedCount < total
      }
    }
  }

  emptyResult (limit, offset) {
    return {
      posts: [],
      profiles: [],
      pagination: {
        limit,
        offset,
        total: 0,
        hasMore: false
      }
    }
  }
}

export default SearchAll
