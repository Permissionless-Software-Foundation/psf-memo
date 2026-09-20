/*
  Adapter for scanning profiles with stored block height and joining the
  address-keyed display name and avatar URL.
*/

class ProfileQuery {
  constructor (localConfig = {}) {
    const { profilesDb, namesDb, profilePicsDb } = localConfig
    if (!profilesDb) {
      throw new Error('profilesDb required when instantiating ProfileQuery adapter.')
    }
    this.profilesDb = profilesDb
    this.namesDb = namesDb || null
    this.profilePicsDb = profilePicsDb || null
    this.scanProfilesWithBlockHeight = this.scanProfilesWithBlockHeight.bind(this)
    this.getProfileIdentity = this.getProfileIdentity.bind(this)
  }

  async scanProfilesWithBlockHeight () {
    const profiles = []

    for await (const [addr, profile] of this.profilesDb.iterator()) {
      profiles.push({
        addr,
        text: profile.text,
        txid: profile.txid,
        seen: profile.seen,
        blockHeight: profile.blockHeight ?? 0
      })
    }

    return profiles
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
