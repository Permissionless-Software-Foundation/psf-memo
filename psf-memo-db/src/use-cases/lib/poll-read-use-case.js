/*
  Shared construction and txid-validation contract for poll read use cases.

  Each poll read use case validates that an adapters bundle with a pollQuery
  adapter is supplied and binds its execute method, and shares the identical
  `txid is required` input validation. Centralizing this removes per-class
  constructor and parseTxid boilerplate.
*/

export class PollReadUseCase {
  constructor (localConfig = {}, { useCaseName, adapterMethod, resultKey } = {}) {
    this.adapters = localConfig.adapters
    if (!this.adapters) {
      throw new Error(`Adapters required when instantiating ${useCaseName} use case.`)
    }
    if (!this.adapters.pollQuery) {
      throw new Error(`pollQuery adapter required for ${useCaseName} use case.`)
    }
    this.adapterMethod = adapterMethod
    this.resultKey = resultKey
    this.execute = this.execute.bind(this)
  }

  // A poll read always targets a single txid; reject empty or non-string ids
  // with a 400 status so the REST layer maps it to a client error.
  parseTxid (txid) {
    if (!txid || typeof txid !== 'string') {
      const err = new Error('txid is required')
      err.status = 400
      throw err
    }
    return txid
  }

  // Shared list-read behavior for poll children (options, votes). Subclasses
  // set `adapterMethod` (the pollQuery method to call) and `resultKey` (the
  // key under which the returned list is exposed).
  async execute (inObj = {}) {
    const txid = this.parseTxid(inObj.txid)
    const result = await this.adapters.pollQuery[this.adapterMethod](txid)
    return { [this.resultKey]: result }
  }
}

// mutate4javascript-manifest-begin
// {"version":1,"tested_at":"2026-08-28T23:39:52.390Z","module_hash":"8a17267645dc3869fcbcc44f22d6fab8fc12dacfabb85c6f333b1b852b0f0ffc","functions":[{"id":"func/PollReadUseCase.constructor","name":"PollReadUseCase.constructor","line":11,"end_line":22,"hash":"853d2c32753cbac65260835dc0a07012da87ca2bf4acfbe8c64075d7be14cbae"},{"id":"func/PollReadUseCase.parseTxid","name":"PollReadUseCase.parseTxid","line":26,"end_line":33,"hash":"a47f8a8031755be93355ffbafbce70cf857c67dfd99536221754a7049dd5be1c"},{"id":"func/PollReadUseCase.execute","name":"PollReadUseCase.execute","line":38,"end_line":42,"hash":"b67523b8241b3fc1ce0532978dbbaccc64d1bd1aa2dfc96d7f18d57b9c436c95"}]}
// mutate4javascript-manifest-end
