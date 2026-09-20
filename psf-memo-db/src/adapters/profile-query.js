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

class ProfileQuery {
  constructor (localConfig = {}) {
    const { profilesDb, namesDb, profilePicsDb, profileRecencyDb } = localConfig
    if (!profilesDb) {
      throw new Error('profilesDb required when instantiating ProfileQuery adapter.')
    }
    this.profilesDb = profilesDb
    this.namesDb = namesDb || null
    this.profilePicsDb = profilePicsDb || null
    this.profileRecencyDb = profileRecencyDb || null
    this.listRecentProfiles = this.listRecentProfiles.bind(this)
    this.listRecencyEntries = this.listRecencyEntries.bind(this)
    this.getProfileIdentity = this.getProfileIdentity.bind(this)
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
