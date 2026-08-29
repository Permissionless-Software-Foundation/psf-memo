/*
  Use case: read the options for a single Memo poll.
*/

import { PollReadUseCase } from './lib/poll-read-use-case.js'

class GetPollOptions extends PollReadUseCase {
  constructor (localConfig = {}) {
    super(localConfig, {
      useCaseName: 'GetPollOptions',
      adapterMethod: 'getPollOptions',
      resultKey: 'options'
    })
  }
}

export default GetPollOptions

// mutate4javascript-manifest-begin
// {"version":1,"tested_at":"2026-08-28T23:40:35.787Z","module_hash":"b71c980598c4c1cc3e4dca02639ab4c3fe2442f26f4671b8b40e2c43de3af969","functions":[{"id":"func/GetPollOptions.constructor","name":"GetPollOptions.constructor","line":8,"end_line":14,"hash":"d70fd8e4fec8049576a4b42bc64c25ff04a4d6fe8b2d60f712fdb552c4767284"}]}
// mutate4javascript-manifest-end
