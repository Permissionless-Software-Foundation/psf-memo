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
