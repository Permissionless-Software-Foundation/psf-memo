/*
  Adapter for case-insensitive substring search across posts and profiles.

  - postsDb:        raw post documents keyed by txid
  - postParentsDb:  child-txid -> parent mapping used to exclude replies
  - namesDb:        address -> { name, ... } used for profile-name search
  - profilesDb:     address -> { text, ... } used for profile-bio search
*/

import { normalizeQuery } from '../lib/search.js'
import { loadReplyTxids } from './lib/load-reply-txids.js'
import { loadMutedAddrs } from './lib/muted-posts.js'

class SearchQuery {
  constructor (localConfig = {}) {
    const { postsDb, postParentsDb, namesDb, profilesDb, muteQuery } = localConfig
    if (!postsDb) {
      throw new Error('postsDb required when instantiating SearchQuery adapter.')
    }
    if (!postParentsDb) {
      throw new Error('postParentsDb required when instantiating SearchQuery adapter.')
    }
    if (!namesDb) {
      throw new Error('namesDb required when instantiating SearchQuery adapter.')
    }
    if (!profilesDb) {
      throw new Error('profilesDb required when instantiating SearchQuery adapter.')
    }
    this.postsDb = postsDb
    this.postParentsDb = postParentsDb
    this.namesDb = namesDb
    this.profilesDb = profilesDb
    this.muteQuery = muteQuery || null

    this.searchPosts = this.searchPosts.bind(this)
    this.searchProfiles = this.searchProfiles.bind(this)
    this.profileMatches = this.profileMatches.bind(this)
  }

  async searchPosts (query, { viewerAddr = null } = {}) {
    const normalized = normalizeQuery(query)
    if (normalized.length === 0) return []

    const replyTxids = await loadReplyTxids(this.postParentsDb)
    const mutedAddrs = await loadMutedAddrs(this.muteQuery, viewerAddr)
    const matches = []

    for await (const [txid, post] of this.postsDb.iterator()) {
      if (this.isMatchingPost(txid, post, replyTxids, normalized)) {
        if (mutedAddrs.has(post.addr)) continue
        matches.push({
          txid,
          addr: post.addr,
          text: post.text,
          seen: post.seen,
          blockHeight: post.blockHeight ?? 0
        })
      }
    }

    return matches
  }

  isMatchingPost (txid, post, replyTxids, normalized) {
    if (replyTxids.has(txid)) return false
    if (!post || typeof post.text !== 'string') return false
    return post.text.toLowerCase().includes(normalized)
  }

  async searchProfiles (query) {
    const normalized = normalizeQuery(query)
    if (normalized.length === 0) return []

    const names = await this.loadProfileRecords(this.namesDb, 'name')
    const profiles = await this.loadProfileRecords(this.profilesDb, 'text')
    const matches = this.matchByName(names, profiles, normalized)
    this.matchByText(names, profiles, normalized, matches)
    return Array.from(matches.values())
  }

  async loadProfileRecords (db, field) {
    return this.loadRecords(db, (record) => ({
      [field]: record[field],
      txid: record.txid,
      seen: record.seen,
      blockHeight: record.blockHeight ?? 0
    }))
  }

  async loadRecords (db, mapper) {
    const records = new Map()
    for await (const [addr, record] of db.iterator()) {
      if (!record) continue
      records.set(addr, mapper(record))
    }
    return records
  }

  matchByName (names, profiles, normalized) {
    const matches = new Map()
    for (const [addr, nameRecord] of names.entries()) {
      if (typeof nameRecord.name === 'string' && nameRecord.name.toLowerCase().includes(normalized)) {
        const profileRecord = profiles.get(addr) || {}
        matches.set(addr, this.profileMatches(addr, nameRecord, profileRecord))
      }
    }
    return matches
  }

  matchByText (names, profiles, normalized, matches) {
    for (const [addr, profileRecord] of profiles.entries()) {
      if (this.textMatches(profileRecord, normalized) && !matches.has(addr)) {
        matches.set(addr, this.profileMatches(addr, names.get(addr) || {}, profileRecord))
      }
    }
  }

  textMatches (profileRecord, normalized) {
    return typeof profileRecord.text === 'string' && profileRecord.text.toLowerCase().includes(normalized)
  }

  profileMatches (addr, nameRecord, profileRecord) {
    const blockHeight = Math.max(
      nameRecord.blockHeight ?? 0,
      profileRecord.blockHeight ?? 0
    )
    const seen = Math.max(
      nameRecord.seen ?? 0,
      profileRecord.seen ?? 0
    )
    return {
      addr,
      name: nameRecord.name || null,
      text: profileRecord.text || null,
      txid: nameRecord.txid || profileRecord.txid || null,
      seen,
      blockHeight
    }
  }
}

export default SearchQuery

// mutate4javascript-manifest-begin
// {"version":1,"tested_at":"2026-09-04T20:19:47.980Z","module_hash":"da45c2029853d780a4a05de1d04856b61a46179afdebfeb349ff3b23ba9c70cb","functions":[{"id":"func/SearchQuery.constructor","name":"SearchQuery.constructor","line":15,"end_line":38,"hash":"0cb413c891c677b2d7d3691f4a10e65a0a05f4cd26dfdd823eb156945239f540"},{"id":"func/SearchQuery.searchPosts","name":"SearchQuery.searchPosts","line":40,"end_line":62,"hash":"f98cdd95c6a68d98acd8a9144e082598b6614905a2720db1353bef645fb25b30"},{"id":"func/SearchQuery.isMatchingPost","name":"SearchQuery.isMatchingPost","line":64,"end_line":68,"hash":"1148a189ef5574cb4789a4b12889269212c4bbf97202bccd2fd817d9d40b51a0"},{"id":"func/SearchQuery.searchProfiles","name":"SearchQuery.searchProfiles","line":70,"end_line":79,"hash":"0570020fc12640e30918accca2ea28157fb9a686183f1e3855d209e840fce82a"},{"id":"func/SearchQuery.loadProfileRecords","name":"SearchQuery.loadProfileRecords","line":81,"end_line":88,"hash":"fb67ceac97d5f08e47eca5c136f0b4afe099c4f3425fd83c72e521f9b1871a27"},{"id":"func/SearchQuery.loadRecords","name":"SearchQuery.loadRecords","line":90,"end_line":97,"hash":"2382749d3be862a2b7713550e680f61d7ef64355632f9f3f0fbeeccbf947e13c"},{"id":"func/SearchQuery.matchByName","name":"SearchQuery.matchByName","line":99,"end_line":108,"hash":"5e6e821883e767ec1b3a2ff03d6e19b032d0e4b3d491b59ffe9ab7924abd8edf"},{"id":"func/SearchQuery.matchByText","name":"SearchQuery.matchByText","line":110,"end_line":116,"hash":"4889f4aba2e7c8951b6899a93b2ebefdea6a8b9ee74f4ef2c112c08e3458459c"},{"id":"func/SearchQuery.textMatches","name":"SearchQuery.textMatches","line":118,"end_line":120,"hash":"3db2504b793c5f6648537f1d63969cbe496b9f42c31d4d0060dd527417561129"},{"id":"func/SearchQuery.profileMatches","name":"SearchQuery.profileMatches","line":122,"end_line":139,"hash":"03af6e62f654560d8361ea0e3f508c53e8e7024e65132974c7202b69461441c6"}]}
// mutate4javascript-manifest-end
