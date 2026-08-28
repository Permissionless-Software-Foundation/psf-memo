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

// mutate4javascript-manifest-begin
// {"version":1,"tested_at":"2026-08-28T19:53:30.917Z","module_hash":"48b427de8b141c64275851761259c085142d7137817712cebaa6d42eea27a366","functions":[{"id":"func/TopicFollowState.constructor","name":"TopicFollowState.constructor","line":10,"end_line":12,"hash":"028e260fea5ad97395eaa65be5eaea9aa3134ae1a37c530b96b66df6e864fb0b"},{"id":"func/TopicFollowState.execute","name":"TopicFollowState.execute","line":14,"end_line":26,"hash":"7474d322e757cdb2ab2a03c65f17456c33196811171b478dd813fbc020d8e4bf"}]}
// mutate4javascript-manifest-end
