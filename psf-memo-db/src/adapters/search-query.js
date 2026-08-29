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
