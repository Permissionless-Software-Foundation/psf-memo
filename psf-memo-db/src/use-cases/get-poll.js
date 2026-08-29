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

// mutate4javascript-manifest-begin
// {"version":1,"tested_at":"2026-08-28T22:47:58.609Z","module_hash":"8feea2939b6c387aac2fc9d4bac7fb70746985efd2986d68b111f108087933b7","functions":[{"id":"func/GetPoll.constructor","name":"GetPoll.constructor","line":8,"end_line":10,"hash":"d22cd8ab0cf5d9bc3f9a83be61cee40ecaf93a05e85639b3e07c3a67463318f7"},{"id":"func/GetPoll.execute","name":"GetPoll.execute","line":12,"end_line":21,"hash":"e8c18d07e50ee2bdced28b5b9a77ba79789a21e38ed6a6d67f63e4681b078b11"}]}
// mutate4javascript-manifest-end
