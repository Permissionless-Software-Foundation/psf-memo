/*
  Use case: read the votes for a single Memo poll.
*/

import { PollReadUseCase } from './lib/poll-read-use-case.js'

class GetPollVotes extends PollReadUseCase {
  constructor (localConfig = {}) {
    super(localConfig, {
      useCaseName: 'GetPollVotes',
      adapterMethod: 'getPollVotes',
      resultKey: 'votes'
    })
  }
}

export default GetPollVotes

// mutate4javascript-manifest-begin
// {"version":1,"tested_at":"2026-08-28T23:41:07.936Z","module_hash":"c1bd922f19d2b0f7c126071c7b991f31e0dea1461ab897e962a9d3b4628ca632","functions":[{"id":"func/GetPollVotes.constructor","name":"GetPollVotes.constructor","line":8,"end_line":14,"hash":"3b4ee6c985d4a52bb7690d63d876443c04c878f1a4603201cf93a16e94f65bbc"}]}
// mutate4javascript-manifest-end
