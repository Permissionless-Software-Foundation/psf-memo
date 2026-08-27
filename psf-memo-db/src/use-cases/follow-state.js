/*
  Use case: report whether one address follows another.

  Returns { followerAddr, followeeAddr, following: boolean }.
*/

import { ListUseCase } from './lib/use-case.js'

class FollowState extends ListUseCase {
  constructor (localConfig = {}) {
    super(localConfig, { useCaseName: 'FollowState', adapterName: 'followQuery' })
  }

  async execute (inObj = {}) {
    const { followerAddr, followeeAddr } = inObj
    if (!followerAddr || typeof followerAddr !== 'string') {
      throw new Error('followerAddr is required')
    }
    if (!followeeAddr || typeof followeeAddr !== 'string') {
      throw new Error('followeeAddr is required')
    }

    const following = await this.adapters.followQuery.isFollowing(followerAddr, followeeAddr)

    return { followerAddr, followeeAddr, following }
  }
}

export default FollowState
