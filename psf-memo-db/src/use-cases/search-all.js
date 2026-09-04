/*
  Use case: search across posts and profiles by case-insensitive substring.

  Returns a page of matching top-level posts and profiles sharing the same
  pagination parameters. Empty or whitespace-only queries produce an empty
  result set without error.
*/

import { parseLimit, parseOffset } from './lib/pagination.js'
import { ListUseCase } from './lib/use-case.js'
import { normalizeQuery, sortByHeightDesc } from '../lib/search.js'

class SearchAll extends ListUseCase {
  constructor (localConfig = {}) {
    super(localConfig, { useCaseName: 'SearchAll', adapterName: 'searchQuery' })
  }

  async execute (inObj = {}) {
    const q = normalizeQuery(inObj.q)
    const limit = parseLimit(inObj.limit)
    const offset = parseOffset(inObj.offset)
    const viewerAddr = inObj.viewerAddr || inObj.viewer || null

    if (q.length === 0) {
      return this.emptyResult(limit, offset)
    }

    const [allPosts, allProfiles] = await Promise.all([
      this.adapters.searchQuery.searchPosts(q, { viewerAddr }),
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

// mutate4javascript-manifest-begin
// {"version":1,"tested_at":"2026-08-29T15:24:14.116Z","module_hash":"c6145beec460f82393ed11ff0d01b72696f557e0e40c2b991ca15e45334cf150","functions":[{"id":"func/SearchAll.constructor","name":"SearchAll.constructor","line":14,"end_line":16,"hash":"adc0dcca1ed5263c0f1e13e8a19657e332982ca6e4f2093080a6a970901ed4d3"},{"id":"func/SearchAll.execute","name":"SearchAll.execute","line":18,"end_line":53,"hash":"ade6f878cca2e20b6e8500cbc6f5650de797767520b31c0d1c29c43762e4ad53"},{"id":"func/SearchAll.emptyResult","name":"SearchAll.emptyResult","line":55,"end_line":66,"hash":"518a3c1be0814ec39ef86770db6f462dfb52bbb622e72b913cb9313cf3b7cc33"}]}
// mutate4javascript-manifest-end
