/*
  Use case: list all distinct Memo topics with their post counts.
*/

import { ListUseCase } from './lib/use-case.js'

class ListTopics extends ListUseCase {
  constructor (localConfig = {}) {
    super(localConfig, { useCaseName: 'ListTopics', adapterName: 'topicQuery' })
  }

  async execute (inObj = {}) {
    const topics = await this.adapters.topicQuery.listTopics()
    return { topics }
  }
}

export default ListTopics

// mutate4javascript-manifest-begin
// {"version":1,"tested_at":"2026-08-28T15:09:18.069Z","module_hash":"4d7755c0ac3ab79ea014862e6c728fde8af6e76c65046c9691f81ecd00993734","functions":[{"id":"func/ListTopics.constructor","name":"ListTopics.constructor","line":8,"end_line":10,"hash":"0e6872a32236c0cb076d7a728a37d8a40f2aca9bada0395d502cd3dba466c273"},{"id":"func/ListTopics.execute","name":"ListTopics.execute","line":12,"end_line":15,"hash":"c41d34757567d55659cc3a8ba77730a34478dfff9a95af00868aa8c5b2db159a"}]}
// mutate4javascript-manifest-end
