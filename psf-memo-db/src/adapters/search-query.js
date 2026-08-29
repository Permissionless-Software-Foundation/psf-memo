/*
  Adapter for case-insensitive substring search across posts and profiles.

  - postsDb:        raw post documents keyed by txid
  - postParentsDb:  child-txid -> parent mapping used to exclude replies
  - namesDb:        address -> { name, ... } used for profile-name search
  - profilesDb:     address -> { text, ... } used for profile-bio search
*/

function normalizeQuery (query) {
  return String(query ?? '').trim().toLowerCase()
}

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

  async loadReplyTxids () {
    const replyTxids = new Set()

    for await (const [childTxid] of this.postParentsDb.iterator()) {
      replyTxids.add(childTxid)
    }

    return replyTxids
  }

  async searchPosts (query) {
    const normalized = normalizeQuery(query)
    if (normalized.length === 0) return []

    const replyTxids = await this.loadReplyTxids()
    const matches = []

    for await (const [txid, post] of this.postsDb.iterator()) {
      if (replyTxids.has(txid)) continue
      if (!post || typeof post.text !== 'string') continue
      if (post.text.toLowerCase().includes(normalized)) {
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

  async searchProfiles (query) {
    const normalized = normalizeQuery(query)
    if (normalized.length === 0) return []

    const names = new Map()
    for await (const [addr, nameData] of this.namesDb.iterator()) {
      if (!nameData) continue
      names.set(addr, {
        name: nameData.name,
        txid: nameData.txid,
        seen: nameData.seen,
        blockHeight: nameData.blockHeight ?? 0
      })
    }

    const profiles = new Map()
    for await (const [addr, profile] of this.profilesDb.iterator()) {
      if (!profile) continue
      profiles.set(addr, {
        text: profile.text,
        txid: profile.txid,
        seen: profile.seen,
        blockHeight: profile.blockHeight ?? 0
      })
    }

    const matches = new Map()
    for (const [addr, nameRecord] of names.entries()) {
      if (typeof nameRecord.name === 'string' && nameRecord.name.toLowerCase().includes(normalized)) {
        const profileRecord = profiles.get(addr) || {}
        matches.set(addr, this.profileMatches(addr, nameRecord, profileRecord))
      }
    }

    for (const [addr, profileRecord] of profiles.entries()) {
      if (typeof profileRecord.text === 'string' && profileRecord.text.toLowerCase().includes(normalized)) {
        if (!matches.has(addr)) {
          const nameRecord = names.get(addr) || {}
          matches.set(addr, this.profileMatches(addr, nameRecord, profileRecord))
        }
      }
    }

    return Array.from(matches.values())
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
