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
