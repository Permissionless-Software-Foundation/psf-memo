/*
  Shared construction and txid-validation contract for poll read use cases.

  Each poll read use case validates that an adapters bundle with a pollQuery
  adapter is supplied and binds its execute method, and shares the identical
  `txid is required` input validation. Centralizing this removes per-class
  constructor and parseTxid boilerplate.
*/

export class PollReadUseCase {
  constructor (localConfig = {}, { useCaseName } = {}) {
    this.adapters = localConfig.adapters
    if (!this.adapters) {
      throw new Error(`Adapters required when instantiating ${useCaseName} use case.`)
    }
    if (!this.adapters.pollQuery) {
      throw new Error(`pollQuery adapter required for ${useCaseName} use case.`)
    }
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
}
