/*
  Use case: the newest confirmed qualifying post for one profile address.

  Returns `{ addr, blockHeight, seen }`, or an empty object when the address
  has no confirmed qualifying post. The indexer calls this read API to
  establish a profile's recency when a set-profile transaction arrives after
  the address has already posted.
*/

class GetNewestQualifyingPost {
  constructor (localConfig = {}) {
    this.adapters = localConfig.adapters

    if (!this.adapters) {
      throw new Error(
        'Adapters required when instantiating GetNewestQualifyingPost.'
      )
    }
    if (!this.adapters.profileQuery) {
      throw new Error(
        'profileQuery adapter required for GetNewestQualifyingPost use case.'
      )
    }

    this.execute = this.execute.bind(this)
  }

  async execute ({ addr } = {}) {
    if (!addr || typeof addr !== 'string') {
      const err = new Error('A profile address is required.')
      err.status = 400
      throw err
    }

    return this.adapters.profileQuery.getNewestQualifyingPost(addr)
  }
}

export default GetNewestQualifyingPost
