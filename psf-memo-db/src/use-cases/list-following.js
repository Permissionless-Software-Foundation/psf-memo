/*
  Use case: list the addresses a follower currently follows.

  Returns { followerAddr, following: string[] }.
*/

import { FollowListUseCase } from './lib/follow-list-use-case.js'

class ListFollowing extends FollowListUseCase {
  constructor (localConfig = {}) {
    super(localConfig, {
      useCaseName: 'ListFollowing',
      adapterMethod: 'listFollowing',
      addrField: 'followerAddr',
      resultField: 'following'
    })
  }
}

export default ListFollowing
