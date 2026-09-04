/*
  Adapter for aggregating the viewer's notifications.

  Notifications are read-only: the DB collects replies to the viewer's posts,
  likes on the viewer's posts, and new follows of the viewer, then returns them
  sorted newest-first with limit/offset pagination.
*/

import BCHJS from '@psf/bch-js'
import { getPostOrNull } from './lib/get-post-or-null.js'
import { loadMutedAddrs } from './lib/muted-posts.js'

class NotificationsQuery {
  constructor (localConfig = {}) {
    const {
      postsDb,
      postParentsDb,
      postChildrenDb,
      likesDb,
      postLikesDb,
      followsDb,
      muteQuery,
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
    this.muteQuery = muteQuery || null
    this.bchjs = bchjs

    this.listNotifications = this.listNotifications.bind(this)
    this._collectFollowNotifications = this._collectFollowNotifications.bind(this)
    this._collectLikeNotifications = this._collectLikeNotifications.bind(this)
    this._collectReplyNotifications = this._collectReplyNotifications.bind(this)
    this._replyNotificationChild = this._replyNotificationChild.bind(this)
    this._followNotificationAddr = this._followNotificationAddr.bind(this)
    this._likeNotificationPost = this._likeNotificationPost.bind(this)
    this._sortNotifications = this._sortNotifications.bind(this)
  }

  // Collect active follows where this address is the followee.
  async _collectFollowNotifications (addr, mutedAddrs) {
    const myHash160 = this.bchjs.Address.toHash160(addr)
    const notifications = []

    for await (const [key, record] of this.followsDb.iterator()) {
      const followerAddr = this._followNotificationAddr(key, record, addr, myHash160, mutedAddrs)
      if (followerAddr === null) continue

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

  // Return the follower address when a follow record is a valid follow
  // notification for addr, else null. Filters out unfollow records, follows of
  // other addresses, self-follows, and follows from muted addresses.
  _followNotificationAddr (key, record, addr, myHash160, mutedAddrs) {
    if (record.unfollow === true) return null
    if (record.followeePkHash !== myHash160) return null
    const followerAddr = record.followerAddr || key.slice(0, key.lastIndexOf(':'))
    if (followerAddr === addr) return null
    if (mutedAddrs.has(followerAddr)) return null
    return followerAddr
  }

  // Collect likes on posts authored by this address, excluding self-likes.
  async _collectLikeNotifications (addr, mutedAddrs) {
    const notifications = []

    for await (const [likeTxid, like] of this.likesDb.iterator()) {
      const post = await this._likeNotificationPost(like, addr, mutedAddrs)
      if (!post) continue

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

  // Return the liked post when a like is a valid like notification for addr,
  // else null. Filters out missing likes, self-likes, likes from muted
  // addresses, and likes on posts not authored by addr.
  async _likeNotificationPost (like, addr, mutedAddrs) {
    if (!like || like.addr === addr || mutedAddrs.has(like.addr)) return null
    const post = await getPostOrNull(this.postsDb, like.postTxid)
    if (!post || post.addr !== addr) return null
    return post
  }

  // Collect replies to posts authored by this address, excluding own replies.
  async _collectReplyNotifications (addr, mutedAddrs) {
    const notifications = []

    for await (const [, child] of this.postChildrenDb.iterator()) {
      const parentTxid = child?.parentTxid
      const childTxid = child?.childTxid
      if (!parentTxid || !childTxid) continue

      const childPost = await this._replyNotificationChild(child, addr)
      if (!childPost) continue
      if (mutedAddrs.has(childPost.addr)) continue

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
    const mutedAddrs = await loadMutedAddrs(this.muteQuery, addr)

    const follows = await this._collectFollowNotifications(addr, mutedAddrs)
    const likes = await this._collectLikeNotifications(addr, mutedAddrs)
    const replies = await this._collectReplyNotifications(addr, mutedAddrs)

    const all = this._sortNotifications(follows.concat(likes).concat(replies))
    const total = all.length
    const page = all.slice(offset, offset + limit)

    return { notifications: page, total }
  }
}

export default NotificationsQuery

// mutate4javascript-manifest-begin
// {"version":1,"tested_at":"2026-09-04T20:09:09.555Z","module_hash":"5ba9ad53d1edc8797d7922446cb19e75a4158f8822eea588d9e94bb1fb2fa971","functions":[{"id":"func/NotificationsQuery.constructor","name":"NotificationsQuery.constructor","line":14,"end_line":62,"hash":"87579ac7d3e764ab30e21e73d9780aaa4c6d562c610b5e13b4ede182b694845e"},{"id":"func/NotificationsQuery._collectFollowNotifications","name":"NotificationsQuery._collectFollowNotifications","line":65,"end_line":83,"hash":"a4b9f141ee0de921232efff0aaf73503c0c4313fedac4c37b79894cd74f29877"},{"id":"func/NotificationsQuery._followNotificationAddr","name":"NotificationsQuery._followNotificationAddr","line":88,"end_line":95,"hash":"814bf4e51edac65108806f012ed3f0c12dc5e9dbe09dfb83af95e8292aab1669"},{"id":"func/NotificationsQuery._collectLikeNotifications","name":"NotificationsQuery._collectLikeNotifications","line":98,"end_line":116,"hash":"e3ab4911550211f3bd9f8f85139d69392433bb95d824b0fd8ac628eb9fe755cf"},{"id":"func/NotificationsQuery._likeNotificationPost","name":"NotificationsQuery._likeNotificationPost","line":121,"end_line":126,"hash":"c72690ed0975ca35ec00f1fb22a602c7301a327e8d36b17032e8e9a36a89adcb"},{"id":"func/NotificationsQuery._collectReplyNotifications","name":"NotificationsQuery._collectReplyNotifications","line":129,"end_line":153,"hash":"270ba026b18025bcef2c92776bbf8143f5f56da0c565285708d5196cf777ba83"},{"id":"func/NotificationsQuery._replyNotificationChild","name":"NotificationsQuery._replyNotificationChild","line":160,"end_line":168,"hash":"7ed6bf9d9f5147ba189c99304b76a1a0d77bc9c7909e194f9b74545c84227ed0"},{"id":"func/NotificationsQuery._sortNotifications","name":"NotificationsQuery._sortNotifications","line":170,"end_line":175,"hash":"61b4ae0b6d450e172db3e59240a3c2ccd5fdf0e6ea1e31023df7bb3d52fdbd5c"},{"id":"func/NotificationsQuery.listNotifications","name":"NotificationsQuery.listNotifications","line":178,"end_line":190,"hash":"3507c459f6dc22482aa693a92fe13da16af05d65dd4e37366a9b8db98654ec14"}]}
// mutate4javascript-manifest-end
