/*
  Notifications Page behavior: load and display replies, likes, and follows
  that involve the viewer.

  This is the testable controller behind the React Notifications page. It
  wraps the MemoDb client, identifies the viewer from the injected wallet, and
  exposes the loaded notifications so the view can render them.
*/

const NOTIFICATIONS_PATH = '/notifications'

class NotificationsPage {
  constructor (deps = {}) {
    this.memoDb = deps.memoDb || null
    this.wallet = deps.wallet || null
    this.notifications = []
    this.pagination = null
    this.empty = false
  }

  getMyAddress () {
    return this.wallet?.walletInfo?.cashAddress || null
  }

  async load ({ limit = 100, offset = 0 } = {}) {
    if (!this.memoDb) {
      throw new Error('Notifications page requires a memo db client.')
    }

    const myAddr = this.getMyAddress()
    if (!myAddr) {
      throw new Error('Notifications page requires an authenticated wallet.')
    }

    const data = await this.memoDb.getNotifications(myAddr, { limit, offset })
    this.notifications = data.notifications || []
    this.pagination = data.pagination || null
    this.empty = this.notifications.length === 0 && offset === 0

    return {
      notifications: this.notifications,
      pagination: this.pagination,
      empty: this.empty
    }
  }

  canLoadMore () {
    return this.pagination?.hasMore ?? false
  }

  getNotification (txid) {
    return this.notifications.find((n) => n.txid === txid) || null
  }
}

NotificationsPage.NOTIFICATIONS_PATH = NOTIFICATIONS_PATH

module.exports = NotificationsPage
