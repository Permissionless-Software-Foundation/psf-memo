/*
  Use case: list the addresses that currently follow a followee.

  Returns { followeeAddr, followers: string[] }.
*/

import { FollowListUseCase } from './lib/follow-list-use-case.js'

class ListFollowers extends FollowListUseCase {
  constructor (localConfig = {}) {
    super(localConfig, {
      useCaseName: 'ListFollowers',
      adapterMethod: 'listFollowers',
      addrField: 'followeeAddr',
      resultField: 'followers'
    })
  }
}

export default ListFollowers
