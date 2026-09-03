/*
  Adapter for aggregating the viewer's notifications.

  Notifications are read-only: the DB collects replies to the viewer's posts,
  likes on the viewer's posts, and new follows of the viewer, then returns them
  sorted newest-first with limit/offset pagination.
*/

import BCHJS from '@psf/bch-js'
import { getPostOrNull } from './lib/get-post-or-null.js'

class NotificationsQuery {
  constructor (localConfig = {}) {
    const {
      postsDb,
      postParentsDb,
      postChildrenDb,
      likesDb,
      postLikesDb,
      followsDb,
      bchjs = new BCHJS({ restURL: process.env.RESTURL || 'https://api.fullstack.cash/v5/' })
    } = localConfig

    if (!postsDb) {
      throw new Error('postsDb required when instantiating NotificationsQuery adapter.')
    }
    if (!postParentsDb) {
      throw new Error('postParentsDb required when instantiating NotificationsQuery adapter.')
    }
    if (!postChildrenDb) {
      throw new Error('postChildrenDb required when instantiating NotificationsQuery adapter.')
    }
    if (!likesDb) {
      throw new Error('likesDb required when instantiating NotificationsQuery adapter.')
    }
    if (!postLikesDb) {
      throw new Error('postLikesDb required when instantiating NotificationsQuery adapter.')
    }
    if (!followsDb) {
      throw new Error('followsDb required when instantiating NotificationsQuery adapter.')
    }

    this.postsDb = postsDb
    this.postParentsDb = postParentsDb
    this.postChildrenDb = postChildrenDb
    this.likesDb = likesDb
    this.postLikesDb = postLikesDb
    this.followsDb = followsDb
    this.bchjs = bchjs

    this.listNotifications = this.listNotifications.bind(this)
    this._collectFollowNotifications = this._collectFollowNotifications.bind(this)
    this._collectLikeNotifications = this._collectLikeNotifications.bind(this)
    this._collectReplyNotifications = this._collectReplyNotifications.bind(this)
    this._replyNotificationChild = this._replyNotificationChild.bind(this)
    this._sortNotifications = this._sortNotifications.bind(this)
  }

  // Collect active follows where this address is the followee.
  async _collectFollowNotifications (addr) {
    const myHash160 = this.bchjs.Address.toHash160(addr)
    const notifications = []

    for await (const [key, record] of this.followsDb.iterator()) {
      if (record.unfollow === true) continue
      if (record.followeePkHash !== myHash160) continue

      const followerAddr = record.followerAddr || key.split(':')[0]
      if (followerAddr === addr) continue

      notifications.push({
        type: 'follow',
        txid: record.txid,
        addr: followerAddr,
        blockHeight: record.blockHeight ?? 0,
        seen: record.seen ?? 0
      })
    }

    return notifications
  }

  // Collect likes on posts authored by this address, excluding self-likes.
  async _collectLikeNotifications (addr) {
    const notifications = []

    for await (const [likeTxid, like] of this.likesDb.iterator()) {
      if (!like || like.addr === addr) continue

      const post = await getPostOrNull(this.postsDb, like.postTxid)
      if (!post || post.addr !== addr) continue

      notifications.push({
        type: 'like',
        txid: likeTxid,
        addr: like.addr,
        postTxid: like.postTxid,
        blockHeight: like.blockHeight ?? 0,
        seen: like.seen ?? 0
      })
    }

    return notifications
  }

  // Collect replies to posts authored by this address, excluding own replies.
  async _collectReplyNotifications (addr) {
    const notifications = []

    for await (const [, child] of this.postChildrenDb.iterator()) {
      const parentTxid = child?.parentTxid
      const childTxid = child?.childTxid
      if (!parentTxid || !childTxid) continue

      const childPost = await this._replyNotificationChild(child, addr)
      if (!childPost) continue

      notifications.push({
        type: 'reply',
        txid: childTxid,
        addr: childPost.addr,
        postTxid: parentTxid,
        text: childPost.text,
        blockHeight: child.blockHeight ?? childPost.blockHeight ?? 0,
        seen: childPost.seen ?? 0
      })
    }

    return notifications
  }

  // Return the child post when a child record is a valid reply notification
  // for addr: it links a parent authored by addr to a child authored by someone
  // else. Returns null when the parent is missing or not authored by addr, or
  // the child is missing or authored by addr. Callers must have already
  // verified the record carries parentTxid and childTxid.
  async _replyNotificationChild (child, addr) {
    const parent = await getPostOrNull(this.postsDb, child.parentTxid)
    if (!parent || parent.addr !== addr) return null

    const childPost = await getPostOrNull(this.postsDb, child.childTxid)
    if (!childPost || childPost.addr === addr) return null

    return childPost
  }

  _sortNotifications (notifications) {
    return notifications.sort((a, b) => {
      if (b.blockHeight !== a.blockHeight) return b.blockHeight - a.blockHeight
      return (b.seen ?? 0) - (a.seen ?? 0)
    })
  }

  // Return paginated notifications for addr, sorted newest-first.
  async listNotifications (addr, { limit, offset } = {}) {
    const follows = await this._collectFollowNotifications(addr)
    const likes = await this._collectLikeNotifications(addr)
    const replies = await this._collectReplyNotifications(addr)

    const all = this._sortNotifications(follows.concat(likes).concat(replies))
    const total = all.length
    const page = all.slice(offset, offset + limit)

    return { notifications: page, total }
  }
}

export default NotificationsQuery

// mutate4javascript-manifest-begin
// {"version":1,"tested_at":"2026-09-03T20:56:26.158Z","module_hash":"99eb9f1bc59e4fe3331ab1058437c7b3d4fa7fea42fc9997174d0eb68c7b5f58","functions":[{"id":"func/NotificationsQuery.constructor","name":"NotificationsQuery.constructor","line":13,"end_line":57,"hash":"278a2ce990616f369eb5f038721f1acaca4a0b9525e8f5ab346a073eeb7bf25b"},{"id":"func/NotificationsQuery._collectFollowNotifications","name":"NotificationsQuery._collectFollowNotifications","line":60,"end_line":81,"hash":"702150793e1b80639ff125864d0841f8037a83701b1773e5e41451cc087d2995"},{"id":"func/NotificationsQuery._collectLikeNotifications","name":"NotificationsQuery._collectLikeNotifications","line":84,"end_line":104,"hash":"7054e1a936cd1a9006c93fd23fe7f32873aa7ce4a3efce9defb55d72e6bc3384"},{"id":"func/NotificationsQuery._collectReplyNotifications","name":"NotificationsQuery._collectReplyNotifications","line":107,"end_line":130,"hash":"ab0acd3f37231a52065caee1728913abaa8c9d154d1a7068f743588521a94d4b"},{"id":"func/NotificationsQuery._replyNotificationChild","name":"NotificationsQuery._replyNotificationChild","line":137,"end_line":145,"hash":"7ed6bf9d9f5147ba189c99304b76a1a0d77bc9c7909e194f9b74545c84227ed0"},{"id":"func/NotificationsQuery._sortNotifications","name":"NotificationsQuery._sortNotifications","line":147,"end_line":152,"hash":"61b4ae0b6d450e172db3e59240a3c2ccd5fdf0e6ea1e31023df7bb3d52fdbd5c"},{"id":"func/NotificationsQuery.listNotifications","name":"NotificationsQuery.listNotifications","line":155,"end_line":165,"hash":"02d410897747d5e7a7c7ab1df393dfef13e61569ea53442922786ffd7f172554"}]}
// mutate4javascript-manifest-end
