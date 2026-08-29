/*
  Use case: list the addresses a muter currently mutes.

  Returns { muterAddr, muted: string[] }.
*/

import { FollowListUseCase } from './lib/follow-list-use-case.js'

class ListMuted extends FollowListUseCase {
  constructor (localConfig = {}) {
    super(localConfig, {
      useCaseName: 'ListMuted',
      adapterMethod: 'listMuted',
      addrField: 'muterAddr',
      resultField: 'muted',
      adapterName: 'muteQuery'
    })
  }
}

export default ListMuted

// mutate4javascript-manifest-begin
// {"version":1,"tested_at":"2026-08-29T03:29:41.578Z","module_hash":"3fd8a3c1a800e95a07d8fe9d992b7004da225563ab47d76308aad93b2ee77efd","functions":[{"id":"func/ListMuted.constructor","name":"ListMuted.constructor","line":10,"end_line":18,"hash":"2c77d678a9c501f0a0c33f73155415928eeb0738247da09ebd5ad5cbf8003b84"}]}
// mutate4javascript-manifest-end
