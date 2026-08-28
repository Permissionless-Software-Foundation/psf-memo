/*
  Use case: report whether an address follows a Memo topic.

  Returns { room, addr, following: boolean }.
*/

import { ListUseCase } from './lib/use-case.js'

class TopicFollowState extends ListUseCase {
  constructor (localConfig = {}) {
    super(localConfig, { useCaseName: 'TopicFollowState', adapterName: 'topicQuery' })
  }

  async execute (inObj = {}) {
    const { room, addr } = inObj
    if (!room || typeof room !== 'string') {
      throw new Error('room is required')
    }
    if (!addr || typeof addr !== 'string') {
      throw new Error('addr is required')
    }

    const following = await this.adapters.topicQuery.isFollowingRoom(addr, room)

    return { room, addr, following }
  }
}

export default TopicFollowState
