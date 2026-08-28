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
