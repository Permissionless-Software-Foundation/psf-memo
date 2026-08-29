/*
  Adapter for case-insensitive substring search across posts and profiles.

  - postsDb:        raw post documents keyed by txid
  - postParentsDb:  child-txid -> parent mapping used to exclude replies
  - namesDb:        address -> { name, ... } used for profile-name search
  - profilesDb:     address -> { text, ... } used for profile-bio search
*/

import { normalizeQuery } from '../lib/search.js'
import { loadReplyTxids } from './lib/load-reply-txids.js'

class SearchQuery {
  constructor (localConfig = {}) {
    const { postsDb, postParentsDb, namesDb, profilesDb } = localConfig
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

    this.searchPosts = this.searchPosts.bind(this)
    this.searchProfiles = this.searchProfiles.bind(this)
    this.profileMatches = this.profileMatches.bind(this)
  }

  async searchPosts (query) {
    const normalized = normalizeQuery(query)
    if (normalized.length === 0) return []

    const replyTxids = await loadReplyTxids(this.postParentsDb)
    const matches = []

    for await (const [txid, post] of this.postsDb.iterator()) {
      if (this.isMatchingPost(txid, post, replyTxids, normalized)) {
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
// {"version":1,"tested_at":"2026-08-29T15:24:14.179Z","module_hash":"0c6f365ce684e05ae34df5de2fcacaad023d8578a9e228c91a6d3b799f84c3c8","functions":[{"id":"func/SearchQuery.constructor","name":"SearchQuery.constructor","line":14,"end_line":36,"hash":"dc2625c23df7e50c35810379846377d4af23ea56470d7c9308631a74c415cb51"},{"id":"func/SearchQuery.searchPosts","name":"SearchQuery.searchPosts","line":38,"end_line":58,"hash":"d49a70791e72e76f82842226b1a314e803ca5fce772d78beeb73a99069a537ae"},{"id":"func/SearchQuery.isMatchingPost","name":"SearchQuery.isMatchingPost","line":60,"end_line":64,"hash":"1148a189ef5574cb4789a4b12889269212c4bbf97202bccd2fd817d9d40b51a0"},{"id":"func/SearchQuery.searchProfiles","name":"SearchQuery.searchProfiles","line":66,"end_line":75,"hash":"0570020fc12640e30918accca2ea28157fb9a686183f1e3855d209e840fce82a"},{"id":"func/SearchQuery.loadProfileRecords","name":"SearchQuery.loadProfileRecords","line":77,"end_line":84,"hash":"fb67ceac97d5f08e47eca5c136f0b4afe099c4f3425fd83c72e521f9b1871a27"},{"id":"func/SearchQuery.loadRecords","name":"SearchQuery.loadRecords","line":86,"end_line":93,"hash":"2382749d3be862a2b7713550e680f61d7ef64355632f9f3f0fbeeccbf947e13c"},{"id":"func/SearchQuery.matchByName","name":"SearchQuery.matchByName","line":95,"end_line":104,"hash":"5e6e821883e767ec1b3a2ff03d6e19b032d0e4b3d491b59ffe9ab7924abd8edf"},{"id":"func/SearchQuery.matchByText","name":"SearchQuery.matchByText","line":106,"end_line":112,"hash":"4889f4aba2e7c8951b6899a93b2ebefdea6a8b9ee74f4ef2c112c08e3458459c"},{"id":"func/SearchQuery.textMatches","name":"SearchQuery.textMatches","line":114,"end_line":116,"hash":"3db2504b793c5f6648537f1d63969cbe496b9f42c31d4d0060dd527417561129"},{"id":"func/SearchQuery.profileMatches","name":"SearchQuery.profileMatches","line":118,"end_line":135,"hash":"03af6e62f654560d8361ea0e3f508c53e8e7024e65132974c7202b69461441c6"}]}
// mutate4javascript-manifest-end
