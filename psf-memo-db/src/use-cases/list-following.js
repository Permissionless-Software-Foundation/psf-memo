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

// mutate4javascript-manifest-begin
// {"version":1,"tested_at":"2026-08-27T18:12:16.594Z","module_hash":"a99d64bc3dd1ae97bdb2e9b39185b696f5af42ee48630df8c8330c82a6ac208d","functions":[{"id":"func/ListFollowing.constructor","name":"ListFollowing.constructor","line":10,"end_line":17,"hash":"86dd5244ce7fc655582e51b865f172ee95448838f419b797d69ca442786f71fc"}]}
// mutate4javascript-manifest-end
