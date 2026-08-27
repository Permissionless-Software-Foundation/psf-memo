/*
  Use case: list the addresses a follower currently follows.

  Returns { followerAddr, following: string[] }.
*/

class ListFollowing {
  constructor (localConfig = {}) {
    this.adapters = localConfig.adapters
    if (!this.adapters) {
      throw new Error('Adapters required when instantiating ListFollowing use case.')
    }
    if (!this.adapters.followQuery) {
      throw new Error('followQuery adapter required for ListFollowing use case.')
    }
    this.execute = this.execute.bind(this)
  }

  async execute (inObj = {}) {
    const { followerAddr } = inObj
    if (!followerAddr || typeof followerAddr !== 'string') {
      throw new Error('followerAddr is required')
    }

    const following = await this.adapters.followQuery.listFollowing(followerAddr)

    return { followerAddr, following }
  }
}

export default ListFollowing
