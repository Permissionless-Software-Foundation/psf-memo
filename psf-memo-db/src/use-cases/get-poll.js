/*
  Use case: read a single Memo poll, including its options and votes.
*/

import { PollReadUseCase } from './lib/poll-read-use-case.js'

class GetPoll extends PollReadUseCase {
  constructor (localConfig = {}) {
    super(localConfig, { useCaseName: 'GetPoll' })
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
