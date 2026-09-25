/*
  Adapter for the recent-profiles read path.

  Recent profiles are ordered by the profile's most recent qualifying post, not
  by the set-profile transaction. The indexer maintains `profileRecency`, one
  record per profile address that has at least one qualifying post, keyed by
  address with `{ addr, blockHeight, seen }`. This adapter reads that index,
  orders the records by block height descending, then seen descending, then
  address ascending, and does a point lookup of each returned profile's text
  and provenance. It joins the address-keyed display name and avatar URL the
  same way.

  Reading the recency index (plus per-row profile lookups) means the query
  never scans the addrPostHeights store and never sorts the whole profiles
  store.
*/

import { findNewestQualifyingPost } from '../lib/qualifying-post.js'

class ProfileQuery {
  constructor (localConfig = {}) {
    const {
      profilesDb,
      namesDb,
      profilePicsDb,
      profileRecencyDb,
      addrPostHeightsDb,
      postsDb,
      postParentsDb,
      pollsDb,
      statusDb
    } = localConfig
    if (!profilesDb) {
      throw new Error('profilesDb required when instantiating ProfileQuery adapter.')
    }
    this.profilesDb = profilesDb
    this.namesDb = namesDb || null
    this.profilePicsDb = profilePicsDb || null
    this.profileRecencyDb = profileRecencyDb || null
    this.addrPostHeightsDb = addrPostHeightsDb || null
    this.postsDb = postsDb || null
    this.postParentsDb = postParentsDb || null
    this.pollsDb = pollsDb || null
    this.statusDb = statusDb || null
    this.listRecentProfiles = this.listRecentProfiles.bind(this)
    this.listRecencyEntries = this.listRecencyEntries.bind(this)
    this.getProfileIdentity = this.getProfileIdentity.bind(this)
    this.getNewestQualifyingPost = this.getNewestQualifyingPost.bind(this)
    this.getRecordOrNull = this.getRecordOrNull.bind(this)
  }

  // Order the recency records by most recent post. A profile that has never
  // posted has no record and is omitted. The order is total: height desc, then
  // seen desc, then address asc.
  compareRecency (a, b) {
    if (b.blockHeight !== a.blockHeight) return b.blockHeight - a.blockHeight
    if (b.seen !== a.seen) return b.seen - a.seen
    if (a.addr === b.addr) return 0
    return a.addr < b.addr ? -1 : 1
  }

  // Read every recency record. This is the index the read side orders from,
  // not the profiles store.
  async listRecencyEntries () {
    const entries = []
    if (!this.profileRecencyDb) return entries

    for await (const [key, value] of this.profileRecencyDb.iterator()) {
      entries.push({
        addr: value?.addr ?? String(key),
        blockHeight: value?.blockHeight ?? 0,
        seen: value?.seen ?? 0
      })
    }

    return entries
  }

  // Return the requested page of recent profiles plus the total number of
  // eligible profiles. Ordering and pagination come from profileRecency; the
  // profile text and provenance come from one point lookup per returned row.
  async listRecentProfiles ({ limit = 100, offset = 0 } = {}) {
    const entries = await this.listRecencyEntries()
    entries.sort(this.compareRecency)

    const total = entries.length
    const page = entries.slice(offset, offset + limit)
    const profiles = []

    for (const entry of page) {
      const profile = await this.getRecordOrNull(this.profilesDb, entry.addr)
      if (!profile) continue
      profiles.push({
        addr: entry.addr,
        text: profile.text,
        txid: profile.txid,
        blockHeight: entry.blockHeight,
        seen: entry.seen
      })
    }

    return { profiles, total }
  }

  // Join one profile's display name (names store) and avatar URL (profilePics
  // store). Both stores are keyed by address and hold the newest record, so a
  // point lookup is enough. A missing record reports null so a profile with no
  // name or picture still renders.
  async getProfileIdentity (addr) {
    const [nameRecord, picRecord] = await Promise.all([
      this.getRecordOrNull(this.namesDb, addr),
      this.getRecordOrNull(this.profilePicsDb, addr)
    ])

    return {
      name: nameRecord?.name || null,
      profilePicUrl: picRecord?.url || null
    }
  }

  // The newest confirmed qualifying post for one profile address, shaped as
  // `{ addr, blockHeight, seen }`, or an empty object when the address has no
  // qualifying post. Reads only the requested address's addrPostHeights range.
  async getNewestQualifyingPost (addr) {
    if (!this.addrPostHeightsDb) return {}

    const best = await findNewestQualifyingPost({
      addrPostHeightsDb: this.addrPostHeightsDb,
      postsDb: this.postsDb,
      postParentsDb: this.postParentsDb,
      pollsDb: this.pollsDb,
      statusDb: this.statusDb
    }, addr)

    if (!best) return {}
    return { addr: best.addr, blockHeight: best.blockHeight, seen: best.seen }
  }

  async getRecordOrNull (db, key) {
    if (!db) return null
    try {
      return await db.get(key)
    } catch (err) {
      if (err.notFound || err.code === 'LEVEL_NOT_FOUND') return null
      throw err
    }
  }
}

export default ProfileQuery

// mutate4javascript-manifest-begin
// {"version":1,"tested_at":"2026-09-20T22:17:12.092Z","module_hash":"cd4a1178c4968e0a61acab324514fb4160e41e98535acd134fab994453484fcc","functions":[{"id":"func/ProfileQuery.constructor","name":"ProfileQuery.constructor","line":19,"end_line":32,"hash":"3ac4ed8e2d002256a3fcec017bc8ae0e783f29fe1de9e8b0eac04852b37ecc42"},{"id":"func/ProfileQuery.compareRecency","name":"ProfileQuery.compareRecency","line":37,"end_line":42,"hash":"891628bf31dbb0cf5d9a8560d9243328675f1f2278077eddc7d3d44836027b70"},{"id":"func/ProfileQuery.listRecencyEntries","name":"ProfileQuery.listRecencyEntries","line":46,"end_line":59,"hash":"618f0ae6b9c14a9fadfa6ffe97e818e81d14ca9c1c22fcc98a4d1f6c62444135"},{"id":"func/ProfileQuery.listRecentProfiles","name":"ProfileQuery.listRecentProfiles","line":64,"end_line":85,"hash":"a0c84485d1149689550216c16fda0c5312f6077118d306204b3837479d2cc978"},{"id":"func/ProfileQuery.getProfileIdentity","name":"ProfileQuery.getProfileIdentity","line":91,"end_line":101,"hash":"66105f1c77dadc97f32beec8c952184617e07a0401eae1af1128de70f47df070"},{"id":"func/ProfileQuery.getRecordOrNull","name":"ProfileQuery.getRecordOrNull","line":103,"end_line":111,"hash":"5604da1e9adc18abda5e58e4f366aa0bcc8e0dd417e2f6882c27289df7fb7a14"}]}
// mutate4javascript-manifest-end
