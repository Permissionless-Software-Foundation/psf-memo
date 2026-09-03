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

// mutate4javascript-manifest-begin
// {"version":1,"tested_at":"2026-09-02T19:56:07.544Z","module_hash":"647bc4fca66811725670506e32f4db2a94b387b4d318a658a925490607b2caa7","functions":[{"id":"func/NotificationsPage.constructor","name":"NotificationsPage.constructor","line":13,"end_line":19,"hash":"52eca9540d0f0c524cd8b2c6c2a80c37cc1769c2a109bae7c97f080bede56130"},{"id":"func/NotificationsPage.getMyAddress","name":"NotificationsPage.getMyAddress","line":21,"end_line":23,"hash":"3e5d4ac4df379300933a772020528b4ecf4ed83c7386a066f5c270df81adcddd"},{"id":"func/NotificationsPage.load","name":"NotificationsPage.load","line":25,"end_line":45,"hash":"99ce6b9176f964e8794325b59c7e67318514b64388117df930e5addb8ece7ea5"},{"id":"func/NotificationsPage.canLoadMore","name":"NotificationsPage.canLoadMore","line":47,"end_line":49,"hash":"634983bcc6bbe560daad8326db0dd4bf31d5cb9e45c40112565351dceaf8e5d5"},{"id":"func/NotificationsPage.getNotification","name":"NotificationsPage.getNotification","line":51,"end_line":53,"hash":"d01238c7fddb85e9ca7427d512c828ec6524657feb1156a820516641ed27105c"}]}
// mutate4javascript-manifest-end
