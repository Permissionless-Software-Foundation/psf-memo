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

// mutate4javascript-manifest-begin
// {"version":1,"tested_at":"2026-09-20T20:05:24.208Z","module_hash":"dab2b10155f8ffc0c8b8005a77af81daaf6682dac4eeb1c56ad061d9961d0040","functions":[{"id":"func/ProfileQuery.constructor","name":"ProfileQuery.constructor","line":7,"end_line":17,"hash":"83ff1150629995273a68f8f985067724a6f5c839f2642ee67855d26be61d5f03"},{"id":"func/ProfileQuery.scanProfilesWithBlockHeight","name":"ProfileQuery.scanProfilesWithBlockHeight","line":19,"end_line":33,"hash":"1fa61f0f49063b13c3eb67725c74614e0b798b0ffcd0248385f838317cabfd0c"},{"id":"func/ProfileQuery.getProfileIdentity","name":"ProfileQuery.getProfileIdentity","line":39,"end_line":49,"hash":"66105f1c77dadc97f32beec8c952184617e07a0401eae1af1128de70f47df070"},{"id":"func/ProfileQuery.getRecordOrNull","name":"ProfileQuery.getRecordOrNull","line":51,"end_line":59,"hash":"5604da1e9adc18abda5e58e4f366aa0bcc8e0dd417e2f6882c27289df7fb7a14"}]}
// mutate4javascript-manifest-end
