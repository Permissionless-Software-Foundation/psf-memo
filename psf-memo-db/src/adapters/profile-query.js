/*
  Adapter for scanning profiles with stored block height.
*/

class ProfileQuery {
  constructor (localConfig = {}) {
    const { profilesDb } = localConfig
    if (!profilesDb) {
      throw new Error('profilesDb required when instantiating ProfileQuery adapter.')
    }
    this.profilesDb = profilesDb
    this.scanProfilesWithBlockHeight = this.scanProfilesWithBlockHeight.bind(this)
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
}

export default ProfileQuery
