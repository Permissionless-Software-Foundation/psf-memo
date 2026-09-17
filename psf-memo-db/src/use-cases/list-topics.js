/*
  Use case: list a page of distinct Memo topics ordered by most recent post.
*/

import { ListUseCase } from './lib/use-case.js'
import { parseLimit, parseOffset } from './lib/pagination.js'

class ListTopics extends ListUseCase {
  constructor (localConfig = {}) {
    super(localConfig, { useCaseName: 'ListTopics', adapterName: 'topicQuery' })
  }

  async execute (inObj = {}) {
    const limit = parseLimit(inObj.limit)
    const offset = parseOffset(inObj.offset)
    return this.adapters.topicQuery.listTopics({ limit, offset })
  }
}

export default ListTopics

// mutate4javascript-manifest-begin
// {"version":1,"tested_at":"2026-09-17T16:41:57.476Z","module_hash":"07fb13faa0cead7ef6f073eab4f16dd74ece5eb290c37b306827735fa154320d","functions":[{"id":"func/ListTopics.constructor","name":"ListTopics.constructor","line":9,"end_line":11,"hash":"0e6872a32236c0cb076d7a728a37d8a40f2aca9bada0395d502cd3dba466c273"},{"id":"func/ListTopics.execute","name":"ListTopics.execute","line":13,"end_line":17,"hash":"b54242b912b2b499a9e0023a2428c193c0a2c9989e4b3187d61ad76c8e31ec47"}]}
// mutate4javascript-manifest-end
