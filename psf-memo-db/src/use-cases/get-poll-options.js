/*
  Use case: read the options for a single Memo poll.
*/

import { PollReadUseCase } from './lib/poll-read-use-case.js'

class GetPollOptions extends PollReadUseCase {
  constructor (localConfig = {}) {
    super(localConfig, { useCaseName: 'GetPollOptions' })
  }

  async execute (inObj = {}) {
    const txid = this.parseTxid(inObj.txid)
    const options = await this.adapters.pollQuery.getPollOptions(txid)
    return { options }
  }
}

export default GetPollOptions
