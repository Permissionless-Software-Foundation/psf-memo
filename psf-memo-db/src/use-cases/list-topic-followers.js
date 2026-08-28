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

// mutate4javascript-manifest-begin
// {"version":1,"tested_at":"2026-08-28T20:05:30.757Z","module_hash":"c2df7f5656fb718fe66f800585bef77d926c25b780925c4bafcb05a4888c7bb3","functions":[{"id":"func/ListTopicFollowers.constructor","name":"ListTopicFollowers.constructor","line":10,"end_line":12,"hash":"032be6dff5472c86a00dbfece93708dcfb41f0d5fa3d5aa9a08c3e97ca5a922e"},{"id":"func/ListTopicFollowers.execute","name":"ListTopicFollowers.execute","line":14,"end_line":23,"hash":"744248c669d8dbf5ced565d5a3328c9273ebac5f5db44bb5e947e7d26d4177a6"}]}
// mutate4javascript-manifest-end
