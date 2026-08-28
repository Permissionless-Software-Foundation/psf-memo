/*
  Use case: read the options for a single Memo poll.
*/

class GetPollOptions {
  constructor (localConfig = {}) {
    this.adapters = localConfig.adapters
    if (!this.adapters) {
      throw new Error('Adapters required when instantiating GetPollOptions use case.')
    }
    if (!this.adapters.pollQuery) {
      throw new Error('pollQuery adapter required for GetPollOptions use case.')
    }

    this.execute = this.execute.bind(this)
  }

  parseTxid (txid) {
    if (!txid || typeof txid !== 'string') {
      const err = new Error('txid is required')
      err.status = 400
      throw err
    }
    return txid
  }

  async execute (inObj = {}) {
    const txid = this.parseTxid(inObj.txid)
    const options = await this.adapters.pollQuery.getPollOptions(txid)
    return { options }
  }
}

export default GetPollOptions
