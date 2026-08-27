/*
  Use case: report whether one address follows another.

  Returns { followerAddr, followeeAddr, following: boolean }.
*/

class FollowState {
  constructor (localConfig = {}) {
    this.adapters = localConfig.adapters
    if (!this.adapters) {
      throw new Error('Adapters required when instantiating FollowState use case.')
    }
    if (!this.adapters.followQuery) {
      throw new Error('followQuery adapter required for FollowState use case.')
    }
    this.execute = this.execute.bind(this)
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
