/*
  Use case: read the votes for a single Memo poll.
*/

class GetPollVotes {
  constructor (localConfig = {}) {
    this.adapters = localConfig.adapters
    if (!this.adapters) {
      throw new Error('Adapters required when instantiating GetPollVotes use case.')
    }
    if (!this.adapters.pollQuery) {
      throw new Error('pollQuery adapter required for GetPollVotes use case.')
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
    const votes = await this.adapters.pollQuery.getPollVotes(txid)
    return { votes }
  }
}

export default GetPollVotes
