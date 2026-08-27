/*
  Use case: list the addresses that currently follow a followee.

  Returns { followeeAddr, followers: string[] }.
*/

class ListFollowers {
  constructor (localConfig = {}) {
    this.adapters = localConfig.adapters
    if (!this.adapters) {
      throw new Error('Adapters required when instantiating ListFollowers use case.')
    }
    if (!this.adapters.followQuery) {
      throw new Error('followQuery adapter required for ListFollowers use case.')
    }
    this.execute = this.execute.bind(this)
  }

  async execute (inObj = {}) {
    const { followeeAddr } = inObj
    if (!followeeAddr || typeof followeeAddr !== 'string') {
      throw new Error('followeeAddr is required')
    }

    const followers = await this.adapters.followQuery.listFollowers(followeeAddr)

    return { followeeAddr, followers }
  }
}

export default ListFollowers
