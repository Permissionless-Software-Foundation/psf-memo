/*
  Use case: read a single Memo poll, including its options and votes.
*/

class GetPoll {
  constructor (localConfig = {}) {
    this.adapters = localConfig.adapters
    if (!this.adapters) {
      throw new Error('Adapters required when instantiating GetPoll use case.')
    }
    if (!this.adapters.pollQuery) {
      throw new Error('pollQuery adapter required for GetPoll use case.')
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
    const poll = await this.adapters.pollQuery.getPoll(txid)
    if (!poll) {
      const err = new Error('poll not found')
      err.status = 404
      throw err
    }
    return poll
  }
}

export default GetPoll
