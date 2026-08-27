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

// mutate4javascript-manifest-begin
// {"version":1,"tested_at":"2026-08-27T18:14:50.321Z","module_hash":"605ab43948d281d2c9756032a377369f29aeb9c51cb6df0eaddc106486a0295d","functions":[{"id":"func/FollowState.constructor","name":"FollowState.constructor","line":10,"end_line":12,"hash":"5609d7879b06b8c44554c987d15ff1b1e61fc0adedabc42c7ac3caebb0f71741"},{"id":"func/FollowState.execute","name":"FollowState.execute","line":14,"end_line":26,"hash":"0c610f8b4d676fff9d0dbba025370748a8ad7b1567712f17064322b6e15eade2"}]}
// mutate4javascript-manifest-end
