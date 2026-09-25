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

// mutate4javascript-manifest-begin
// {"version":1,"tested_at":"2026-09-25T17:18:30.807Z","module_hash":"2d88049d1563a52e436bac82ab2493a8f35accadd7795efd5bcf7db18be84e86","functions":[{"id":"func/GetNewestQualifyingPost.constructor","name":"GetNewestQualifyingPost.constructor","line":11,"end_line":26,"hash":"6ea3da7336d96446cb47d12d08b436324cac0782baf108f4acf47c8364d751a3"},{"id":"func/GetNewestQualifyingPost.execute","name":"GetNewestQualifyingPost.execute","line":28,"end_line":36,"hash":"5344d5d69eb3b56eab46b63cb866bf008542b2f7b87858608430793d10d404f8"}]}
// mutate4javascript-manifest-end
