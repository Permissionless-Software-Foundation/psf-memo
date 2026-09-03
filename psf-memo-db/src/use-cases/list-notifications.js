/*
  Use case: list notifications for a viewer, newest first.

  Aggregates replies to the viewer's posts, likes on the viewer's posts, and
  follows of the viewer, then paginates the combined result.
*/

import { parseLimit, parseOffset, parseRequiredString } from './lib/pagination.js'
import { ListUseCase } from './lib/use-case.js'

class ListNotifications extends ListUseCase {
  constructor (localConfig = {}) {
    super(localConfig, { useCaseName: 'ListNotifications', adapterName: 'notificationsQuery' })
  }

  async execute (inObj = {}) {
    const addr = parseRequiredString(inObj.addr, 'addr')
    const limit = parseLimit(inObj.limit)
    const offset = parseOffset(inObj.offset)

    const { notifications, total } = await this.adapters.notificationsQuery.listNotifications(addr, { limit, offset })

    return {
      notifications,
      pagination: {
        limit,
        offset,
        total,
        hasMore: offset + notifications.length < total
      }
    }
  }
}

export default ListNotifications

// mutate4javascript-manifest-begin
// {"version":1,"tested_at":"2026-09-02T20:14:19.388Z","module_hash":"9cee2e299acbb1203a40425d6d429eec8b1e3978f67fb0f3e76f5c32644d956c","functions":[{"id":"func/ListNotifications.constructor","name":"ListNotifications.constructor","line":12,"end_line":14,"hash":"84b86af8804c5aa8b25ec55f1190863b4652d4460d3d25f0cde0fdad2efda18f"},{"id":"func/ListNotifications.execute","name":"ListNotifications.execute","line":16,"end_line":32,"hash":"59384e928f105a7995ff014b410e0832f812a306c4598e19cfe18e9be570d0f0"}]}
// mutate4javascript-manifest-end
