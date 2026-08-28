/*
  Use case: list the addresses that currently follow a Memo topic.

  Returns { room, followers: string[] }.
*/

import { ListUseCase } from './lib/use-case.js'

class ListTopicFollowers extends ListUseCase {
  constructor (localConfig = {}) {
    super(localConfig, { useCaseName: 'ListTopicFollowers', adapterName: 'topicQuery' })
  }

  async execute (inObj = {}) {
    const { room } = inObj
    if (!room || typeof room !== 'string') {
      throw new Error('room is required')
    }

    const followers = await this.adapters.topicQuery.listRoomFollowers(room)

    return { room, followers }
  }
}

export default ListTopicFollowers
