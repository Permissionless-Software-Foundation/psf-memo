/*
  Adapter for aggregating the viewer's notifications.

  Notifications are read-only: the DB collects likes on the viewer's posts,
  replies to the viewer's posts, and new follows of the viewer, then returns
  them sorted newest-first with limit/offset pagination.

  The work is bounded to the viewer's activity inside a configurable block
  window (notificationBlockWindow, default 25000; cutoff =
  status.chainBlockHeight - window):

    - the viewer's own posts come from the addrPostHeights index, range-limited
      to the window;
    - likes and replies come from prefix-scanning postLikes and postChildren
      for those posts only; the global likes store is never iterated and
      postChildren is only scanned per viewer post;
    - follows come from the followeeHeights index, range-limited to the window;
      the follows store is never iterated.

  A notification is drawn from the viewer's content inside the window, so an
  interaction with a post older than the window is not returned even when the
  interaction itself is recent.
*/

import BCHJS from '@psf/bch-js'
import { getPostOrNull } from './lib/get-post-or-null.js'
import { loadMutedAddrs } from './lib/muted-posts.js'

const HEIGHT_PAD = 12
const DEFAULT_NOTIFICATION_BLOCK_WINDOW = 25000

function padHeight (blockHeight) {
  return String(blockHeight ?? 0).padStart(HEIGHT_PAD, '0')
}

// The half-open key range covering one prefix's records at or above cutoff:
// `${prefix}<paddedCutoff>` .. `${prefix}\uffff`. A null cutoff starts at the
// prefix itself, so the whole history is in range.
function prefixRange (prefix, cutoff) {
  const start = cutoff === null ? prefix : `${prefix}${padHeight(cutoff)}`
  return { start, end: `${prefix}\uffff` }
}

// The txid carried by a per-post index entry, falling back to the final
// colon-delimited key segment when the value omits it.
function txidFromKey (key) {
  return String(key).slice(String(key).lastIndexOf(':') + 1)
}

// The first value that is neither null nor undefined, else 0. Used to pick the
// most specific block height across a record, its parent, and the post.
function firstDefined (...values) {
  for (const value of values) {
    if (value !== null && value !== undefined) return value
  }
  return 0
}

// An actor never notifies themselves, and muted actors never notify.
function isSuppressedActor (actorAddr, addr, mutedAddrs) {
  return actorAddr === addr || mutedAddrs.has(actorAddr)
}

function isNotFoundError (err) {
  return Boolean(
    err?.notFound ||
    err?.code === 'LEVEL_NOT_FOUND' ||
    err?.response?.status === 404
  )
}

// Read a record by key, returning null when it does not exist.
async function getRecordOrNull (db, key) {
  try {
    return await db.get(key)
  } catch (err) {
    if (isNotFoundError(err)) return null
    throw err
  }
}

class NotificationsQuery {
  constructor (localConfig = {}) {
    const {
      postsDb,
      addrPostHeightsDb,
      postChildrenDb,
      postLikesDb,
      likesDb,
      followeeHeightsDb,
      statusDb = null,
      muteQuery,
      notificationBlockWindow,
      bchjs = new BCHJS({ restURL: process.env.RESTURL || 'https://api.fullstack.cash/v5/' })
    } = localConfig

    if (!postsDb) {
      throw new Error('postsDb required when instantiating NotificationsQuery adapter.')
    }
    if (!addrPostHeightsDb) {
      throw new Error('addrPostHeightsDb required when instantiating NotificationsQuery adapter.')
    }
    if (!postChildrenDb) {
      throw new Error('postChildrenDb required when instantiating NotificationsQuery adapter.')
    }
    if (!postLikesDb) {
      throw new Error('postLikesDb required when instantiating NotificationsQuery adapter.')
    }
    if (!likesDb) {
      throw new Error('likesDb required when instantiating NotificationsQuery adapter.')
    }
    if (!followeeHeightsDb) {
      throw new Error('followeeHeightsDb required when instantiating NotificationsQuery adapter.')
    }

    this.postsDb = postsDb
    this.addrPostHeightsDb = addrPostHeightsDb
    this.postChildrenDb = postChildrenDb
    this.postLikesDb = postLikesDb
    this.likesDb = likesDb
    this.followeeHeightsDb = followeeHeightsDb
    this.statusDb = statusDb
    this.muteQuery = muteQuery || null
    this.notificationBlockWindow = notificationBlockWindow ?? DEFAULT_NOTIFICATION_BLOCK_WINDOW
    this.bchjs = bchjs

    this.listNotifications = this.listNotifications.bind(this)
    this._windowCutoff = this._windowCutoff.bind(this)
    this._scanViewerPosts = this._scanViewerPosts.bind(this)
    this._scanPostIndex = this._scanPostIndex.bind(this)
    this._collectFollowNotifications = this._collectFollowNotifications.bind(this)
    this._followNotifications = this._followNotifications.bind(this)
    this._collectLikeNotifications = this._collectLikeNotifications.bind(this)
    this._collectReplyNotifications = this._collectReplyNotifications.bind(this)
    this._followerFromKey = this._followerFromKey.bind(this)
    this._sortNotifications = this._sortNotifications.bind(this)
  }

  // The lowest block height that counts as inside the notification window, or
  // null when no status is available (treat the whole history as in-window).
  async _windowCutoff () {
    if (!this.statusDb) return null
    const status = await getRecordOrNull(this.statusDb, 'status')
    if (!status) return null
    const chainBlockHeight = status.chainBlockHeight ?? 0
    return chainBlockHeight - this.notificationBlockWindow
  }

  // Prefix-scan the viewer's posts within the window from addrPostHeights,
  // newest-first is not required because likes/replies are scanned per txid.
  async _scanViewerPosts (addr, cutoff) {
    const { start, end } = prefixRange(`${addr}:`, cutoff)
    const posts = []

    for await (const [key, value] of this.addrPostHeightsDb.iterator({ gte: start, lte: end })) {
      const txid = value?.txid || txidFromKey(key)
      if (!txid) continue
      posts.push({ txid, blockHeight: value?.blockHeight })
    }

    return posts
  }

  // Walk a per-post index keyed `${postTxid}:${childKey}` for the viewer's
  // posts only, resolving each entry's txid. The index is never scanned
  // globally, so this bounds likes and replies to the viewer's content.
  async _scanPostIndex (db, posts, txidField) {
    const entries = []

    for (const post of posts) {
      const prefix = `${post.txid}:`
      for await (const [key, value] of db.iterator({ gte: prefix, lte: `${prefix}\uffff` })) {
        const txid = value?.[txidField] || txidFromKey(key)
        if (txid) entries.push({ txid, value, post })
      }
    }

    return entries
  }

  // Collect the viewer's follows from the followeeHeights index within the
  // window, keeping the newest entry per follower and ignoring unfollows.
  async _collectFollowNotifications (addr, cutoff, mutedAddrs) {
    const myHash160 = this.bchjs.Address.toHash160(addr)
    const { start, end } = prefixRange(`${myHash160}:`, cutoff)
    const newestByFollower = new Map()

    for await (const [key, record] of this.followeeHeightsDb.iterator({ gte: start, lte: end })) {
      const followerAddr = record?.followerAddr || this._followerFromKey(key)
      if (followerAddr) newestByFollower.set(followerAddr, record)
    }

    return this._followNotifications(newestByFollower, addr, mutedAddrs)
  }

  // Turn the newest follow entry per follower into follow notifications,
  // dropping unfollows, self-follows, and muted followers.
  _followNotifications (newestByFollower, addr, mutedAddrs) {
    const notifications = []

    for (const [followerAddr, record] of newestByFollower) {
      if (record.unfollow === true) continue
      if (isSuppressedActor(followerAddr, addr, mutedAddrs)) continue

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

  // Prefix-scan postLikes for each viewer post and load the like record to get
  // the actor and height. The global likes store is never iterated.
  async _collectLikeNotifications (posts, addr, mutedAddrs) {
    const entries = await this._scanPostIndex(this.postLikesDb, posts, 'txid')
    const notifications = []

    for (const { txid, post } of entries) {
      const like = await getRecordOrNull(this.likesDb, txid)
      if (!like) continue
      if (isSuppressedActor(like.addr, addr, mutedAddrs)) continue

      notifications.push({
        type: 'like',
        txid,
        addr: like.addr,
        postTxid: post.txid,
        blockHeight: firstDefined(like.blockHeight, post.blockHeight),
        seen: like.seen ?? 0
      })
    }

    return notifications
  }

  // Prefix-scan postChildren for each viewer post and load the child post for
  // the actor and text. postChildren is only read per viewer post, never
  // full-scanned.
  async _collectReplyNotifications (posts, addr, mutedAddrs) {
    const entries = await this._scanPostIndex(this.postChildrenDb, posts, 'childTxid')
    const notifications = []

    for (const { txid: childTxid, value: child, post } of entries) {
      if (child?.parentTxid && child.parentTxid !== post.txid) continue

      const childPost = await getPostOrNull(this.postsDb, childTxid)
      if (!childPost) continue
      if (isSuppressedActor(childPost.addr, addr, mutedAddrs)) continue

      notifications.push({
        type: 'reply',
        txid: childTxid,
        addr: childPost.addr,
        postTxid: post.txid,
        text: childPost.text,
        blockHeight: firstDefined(child?.blockHeight, childPost.blockHeight, post.blockHeight),
        seen: childPost.seen ?? 0
      })
    }

    return notifications
  }

  // Recover the follower address from a followeeHeights key of the form
  // `${followeePkHash}:${paddedHeight}:${followerAddr}`. Cash addresses contain
  // a colon, so the follower is everything after the second colon.
  _followerFromKey (key) {
    const parts = String(key).split(':')
    return parts.slice(2).join(':')
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

    const cutoff = await this._windowCutoff()
    const viewerPosts = await this._scanViewerPosts(addr, cutoff)
    const follows = await this._collectFollowNotifications(addr, cutoff, mutedAddrs)
    const likes = await this._collectLikeNotifications(viewerPosts, addr, mutedAddrs)
    const replies = await this._collectReplyNotifications(viewerPosts, addr, mutedAddrs)

    const all = this._sortNotifications(follows.concat(likes).concat(replies))
    const total = all.length
    const page = all.slice(offset, offset + limit)

    return { notifications: page, total }
  }
}

export default NotificationsQuery
