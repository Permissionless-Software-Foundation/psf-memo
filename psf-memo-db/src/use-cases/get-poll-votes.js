/*
  Use case: read the votes for a single Memo poll.
*/

import { PollReadUseCase } from './lib/poll-read-use-case.js'

class GetPollVotes extends PollReadUseCase {
  constructor (localConfig = {}) {
    super(localConfig, { useCaseName: 'GetPollVotes' })
  }

  async execute (inObj = {}) {
    const txid = this.parseTxid(inObj.txid)
    const votes = await this.adapters.pollQuery.getPollVotes(txid)
    return { votes }
  }
}

export default GetPollVotes
