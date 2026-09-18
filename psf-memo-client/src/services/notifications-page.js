/*
  Notifications Page behavior: load and display replies, likes, and follows
  that involve the viewer.

  This is the testable controller behind the React Notifications page. It
  wraps the MemoDb client, identifies the viewer from the injected wallet, and
  exposes the loaded notifications so the view can render them.
*/

const NOTIFICATIONS_PATH = '/notifications'

const { buildNotificationEntry } = require('./notification-entry')

class NotificationsPage {
  constructor (deps = {}) {
    this.memoDb = deps.memoDb || null
    this.wallet = deps.wallet || null
    this.notifications = []
    this.profiles = {}
    this.pagination = null
    this.empty = false
  }

  getMyAddress () {
    return this.wallet?.walletInfo?.cashAddress || null
  }

  async load ({ limit = 50, offset = 0 } = {}) {
    if (!this.memoDb) {
      throw new Error('Notifications page requires a memo db client.')
    }

    const myAddr = this.getMyAddress()
    if (!myAddr) {
      throw new Error('Notifications page requires an authenticated wallet.')
    }

    const data = await this.memoDb.getNotifications(myAddr, { limit, offset })
    this.notifications = data.notifications || []
    this.profiles = await this._loadProfiles(this.notifications)
    this.pagination = data.pagination || null
    this.empty = this.notifications.length === 0 && offset === 0

    return {
      notifications: this.notifications,
      profiles: this.profiles,
      pagination: this.pagination,
      empty: this.empty
    }
  }

  // Resolve the actor profile for every notification so the view can name and
  // avatar each entry. A missing actor address is skipped.
  async _loadProfiles (notifications) {
    const addresses = [...new Set(notifications.map((n) => n.addr).filter(Boolean))]
    const entries = await Promise.all(
      addresses.map(async (addr) => [addr, await this._loadProfile(addr)])
    )
    return Object.fromEntries(entries)
  }

  // Resolve one actor's name and avatar URL, falling back to an empty profile
  // when the lookup fails or the db client does not expose profile lookups.
  async _loadProfile (addr) {
    try {
      const [nameRecord, picRecord] = await Promise.all([
        this._loadProfileField('getName', addr),
        this._loadProfileField('getProfilePic', addr)
      ])
      return {
        name: nameRecord?.name || null,
        profilePicUrl: picRecord?.url || null
      }
    } catch (err) {
      return { name: null, profilePicUrl: null }
    }
  }

  async _loadProfileField (method, addr) {
    if (typeof this.memoDb[method] !== 'function') return null
    return this.memoDb[method](addr)
  }

  canLoadMore () {
    return this.pagination?.hasMore ?? false
  }

  getNotification (txid) {
    return this.notifications.find((n) => n.txid === txid) || null
  }

  // The view models for every loaded notification.
  getEntries () {
    return this.notifications.map((n) => this.getEntry(n.txid))
  }

  // The view model for a loaded notification by txid.
  getEntry (txid) {
    const notification = this.getNotification(txid)
    if (!notification) return null
    return buildNotificationEntry(notification, this.profiles[notification.addr])
  }

  // The view model for the notification whose actor is `addr`.
  getEntryByAddr (addr) {
    const notification = this.notifications.find((n) => n.addr === addr)
    if (!notification) return null
    return this.getEntry(notification.txid)
  }
}

NotificationsPage.NOTIFICATIONS_PATH = NOTIFICATIONS_PATH

module.exports = NotificationsPage

// mutate4javascript-manifest-begin
// {"version":1,"tested_at":"2026-09-18T19:40:56.858Z","module_hash":"db9565ee912fd31eed870808332e98f57e4b9c01b573a03bd11fe36a66fb6989","functions":[{"id":"func/NotificationsPage.constructor","name":"NotificationsPage.constructor","line":15,"end_line":22,"hash":"e9f52dab100cd73a4149081fd1e1ac59bcfbfe58a3a3ef32f2f2bf83c613f9ab"},{"id":"func/NotificationsPage.getMyAddress","name":"NotificationsPage.getMyAddress","line":24,"end_line":26,"hash":"3e5d4ac4df379300933a772020528b4ecf4ed83c7386a066f5c270df81adcddd"},{"id":"func/NotificationsPage.load","name":"NotificationsPage.load","line":28,"end_line":50,"hash":"aeba628bcf9228754a2a57807a9bf8bb84236ed95a8d89c5493de9ef362cb937"},{"id":"func/NotificationsPage._loadProfiles","name":"NotificationsPage._loadProfiles","line":54,"end_line":60,"hash":"bf78658c8e7d10ed90d64ede96ccdc215f07045834fe1e44f54f25c0af4d54a6"},{"id":"func/NotificationsPage._loadProfile","name":"NotificationsPage._loadProfile","line":64,"end_line":77,"hash":"f5de92a5e6a20e82d365c30749d086d255b665f23b916aa2a2f03ad08798dd63"},{"id":"func/NotificationsPage._loadProfileField","name":"NotificationsPage._loadProfileField","line":79,"end_line":82,"hash":"8d3814b475e60aa26a45bb99c4f2d3ffc6cc78225e319c85c073afad0c611086"},{"id":"func/NotificationsPage.canLoadMore","name":"NotificationsPage.canLoadMore","line":84,"end_line":86,"hash":"634983bcc6bbe560daad8326db0dd4bf31d5cb9e45c40112565351dceaf8e5d5"},{"id":"func/NotificationsPage.getNotification","name":"NotificationsPage.getNotification","line":88,"end_line":90,"hash":"d01238c7fddb85e9ca7427d512c828ec6524657feb1156a820516641ed27105c"},{"id":"func/NotificationsPage.getEntries","name":"NotificationsPage.getEntries","line":93,"end_line":95,"hash":"9481b5ecf1a0f770df7d4eb764e695387d6362ee58a0936ea3914357292dec14"},{"id":"func/NotificationsPage.getEntry","name":"NotificationsPage.getEntry","line":98,"end_line":102,"hash":"5a259b305609fd6e8529588a571f4ba0397fb8d93c69569a68d8d5ad4b942033"},{"id":"func/NotificationsPage.getEntryByAddr","name":"NotificationsPage.getEntryByAddr","line":105,"end_line":109,"hash":"a99ae43f45702447dd3abfa5f8dd2ffa8acf79b655a24765299f84709bc98624"}]}
// mutate4javascript-manifest-end
