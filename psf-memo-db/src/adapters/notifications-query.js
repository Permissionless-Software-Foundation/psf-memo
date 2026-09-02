/*
  Adapter for aggregating the viewer's notifications.

  Notifications are read-only: the DB collects replies to the viewer's posts,
  likes on the viewer's posts, and new follows of the viewer, then returns them
  sorted newest-first with limit/offset pagination.
*/

import BCHJS from '@psf/bch-js'

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
    this._getPostOrNull = this._getPostOrNull.bind(this)
    this._collectFollowNotifications = this._collectFollowNotifications.bind(this)
    this._collectLikeNotifications = this._collectLikeNotifications.bind(this)
    this._collectReplyNotifications = this._collectReplyNotifications.bind(this)
    this._sortNotifications = this._sortNotifications.bind(this)
  }

  async _getPostOrNull (txid) {
    try {
      return await this.postsDb.get(txid)
    } catch (err) {
      if (err.notFound || err.code === 'LEVEL_NOT_FOUND') return null
      throw err
    }
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

      const post = await this._getPostOrNull(like.postTxid)
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

      const parent = await this._getPostOrNull(parentTxid)
      if (!parent || parent.addr !== addr) continue

      const childPost = await this._getPostOrNull(childTxid)
      if (!childPost || childPost.addr === addr) continue

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
