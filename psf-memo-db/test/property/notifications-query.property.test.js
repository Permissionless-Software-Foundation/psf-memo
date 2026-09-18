/*
  Property tests for the notifications aggregation.

  The unit suite probes listNotifications at a handful of fixed fixtures.
  These properties pin down invariants that should hold over broad random
  notification records when every interaction is inside the window:

    - membership: every returned notification originated from an active follow,
      a like on one of the viewer's posts, or a reply to one of the viewer's
      posts;
    - newest-first ordering: notifications are returned sorted by blockHeight
      descending, with seen descending as the tie-break;
    - pagination conservation: applying offset/limit returns exactly the full
      matching set sliced to the page, and reports an exact total.

  The reference implementation below mirrors the adapter's window-free
  aggregation and sort logic so the two can be cross-checked.
*/

import test from 'node:test'
import { seededRandom, forAll, intGen } from './harness.js'
import NotificationsQuery from '../../src/adapters/notifications-query.js'
import { FakeDb } from '../support/level-double.js'

const rng = seededRandom(20260918)

const VIEWER = 'bitcoincash:viewer'
const MY_HASH = 'hash-viewer'
const OTHERS = ['bitcoincash:a', 'bitcoincash:b', 'bitcoincash:c']
const VIEWER_POSTS = ['vp1', 'vp2', 'vp3', 'vp4']

const PAD = 12
const pad = (h) => String(h).padStart(PAD, '0')

const makeDb = (entries = []) => new FakeDb(entries)

function buildQuery () {
  // statusDb null => no window; every generated interaction is in scope.
  return new NotificationsQuery({
    postsDb: makeDb(),
    addrPostHeightsDb: makeDb(),
    postChildrenDb: makeDb(),
    postLikesDb: makeDb(),
    likesDb: makeDb(),
    followeeHeightsDb: makeDb(),
    statusDb: null,
    bchjs: { Address: { toHash160: (addr) => (addr === VIEWER ? MY_HASH : `hash-${addr}`) } }
  })
}

function randomNotification () {
  return {
    blockHeight: intGen(rng, 0, 5000)(),
    seen: intGen(rng, 0, 1000)()
  }
}

function fixtureGen () {
  return () => {
    const postsDbEntries = []
    const addrPostHeightEntries = []
    const postLikesEntries = []
    const likesEntries = []
    const postChildrenEntries = []
    const followeeHeightEntries = []

    for (const txid of VIEWER_POSTS) {
      postsDbEntries.push([txid, { addr: VIEWER }])
      addrPostHeightEntries.push([`${VIEWER}:${pad(0)}:${txid}`, { txid, addr: VIEWER, blockHeight: 0 }])
    }

    // Follows: random events, including repeated followers so the newest-wins
    // rule is exercised. Recorded in the expected order.
    const events = []
    const nFollows = intGen(rng, 0, 8)()
    for (let i = 0; i < nFollows; i++) {
      const follower = OTHERS[Math.floor(rng() * OTHERS.length)]
      const n = randomNotification()
      const unfollow = rng() < 0.25
      const followTxid = `follow${i}`
      events.push({ follower, txid: followTxid, ...n, unfollow })
      followeeHeightEntries.push([
        `${MY_HASH}:${pad(n.blockHeight)}:${follower}`,
        { followerAddr: follower, followeePkHash: MY_HASH, unfollow, txid: followTxid, seen: n.seen, blockHeight: n.blockHeight }
      ])
    }

    // Likes on the viewer's posts by other addresses.
    const likeRecords = []
    const nLikes = intGen(rng, 0, 8)()
    for (let i = 0; i < nLikes; i++) {
      const postTxid = VIEWER_POSTS[Math.floor(rng() * VIEWER_POSTS.length)]
      const actor = OTHERS[Math.floor(rng() * OTHERS.length)]
      const n = randomNotification()
      const likeTxid = `like${i}`
      likeRecords.push({ likeTxid, txid: likeTxid, addr: actor, postTxid, ...n })
      postLikesEntries.push([`${postTxid}:${likeTxid}`, { postTxid, txid: likeTxid }])
      likesEntries.push([likeTxid, { addr: actor, postTxid, blockHeight: n.blockHeight, seen: n.seen }])
    }

    // Replies to the viewer's posts by other addresses.
    const replyRecords = []
    const nReplies = intGen(rng, 0, 8)()
    for (let i = 0; i < nReplies; i++) {
      const parentTxid = VIEWER_POSTS[Math.floor(rng() * VIEWER_POSTS.length)]
      const childTxid = `child${i}`
      const actor = OTHERS[Math.floor(rng() * OTHERS.length)]
      const n = randomNotification()
      replyRecords.push({ childTxid, txid: childTxid, addr: actor, parentTxid, ...n })
      postChildrenEntries.push([`${parentTxid}:${childTxid}`, { parentTxid, childTxid, blockHeight: n.blockHeight }])
      postsDbEntries.push([childTxid, { addr: actor, text: 'reply', blockHeight: n.blockHeight, seen: n.seen }])
    }

    return {
      events,
      likeRecords,
      replyRecords,
      postsDbEntries,
      addrPostHeightEntries,
      postLikesEntries,
      likesEntries,
      postChildrenEntries,
      followeeHeightEntries,
      limit: intGen(rng, 1, 8)(),
      offset: intGen(rng, 0, 10)()
    }
  }
}

// Build the adapter with the generated stores populated.
function populate (input) {
  const query = buildQuery()
  input.postsDbEntries.forEach(([key, value]) => query.postsDb.map.set(key, value))
  input.addrPostHeightEntries.forEach(([key, value]) => query.addrPostHeightsDb.map.set(key, value))
  input.postLikesEntries.forEach(([key, value]) => query.postLikesDb.map.set(key, value))
  input.likesEntries.forEach(([key, value]) => query.likesDb.map.set(key, value))
  input.postChildrenEntries.forEach(([key, value]) => query.postChildrenDb.map.set(key, value))
  input.followeeHeightEntries.forEach(([key, value]) => query.followeeHeightsDb.map.set(key, value))
  return query
}

// Mirror the adapter's window-free aggregation without using the adapter.
function buildExpected ({ events, likeRecords, replyRecords, limit, offset }) {
  const out = []

  // Newest follow event per follower wins.
  const newestByFollower = new Map()
  for (const event of [...events].sort((a, b) => a.blockHeight - b.blockHeight)) {
    newestByFollower.set(event.follower, event)
  }
  for (const event of newestByFollower.values()) {
    if (event.unfollow) continue
    out.push({ blockHeight: event.blockHeight, seen: event.seen })
  }

  for (const like of likeRecords) out.push({ blockHeight: like.blockHeight, seen: like.seen })
  for (const reply of replyRecords) out.push({ blockHeight: reply.blockHeight, seen: reply.seen })

  out.sort((a, b) => {
    if (b.blockHeight !== a.blockHeight) return b.blockHeight - a.blockHeight
    return (b.seen ?? 0) - (a.seen ?? 0)
  })

  return { total: out.length, page: out.slice(offset, offset + limit) }
}

// The identity of a notification: the txid of the active follow, like, or
// reply that produced it. Two notifications with the same identity cannot be
// distinct.
function identityOf (notification) {
  return notification.txid
}

// The set of txids the adapter is allowed to return, derived directly from the
// generated input. It mirrors the newest-follow-wins rule.
function expectedIdentities ({ events, likeRecords, replyRecords }) {
  const ids = new Set()
  const newestByFollower = new Map()
  for (const event of [...events].sort((a, b) => a.blockHeight - b.blockHeight)) {
    newestByFollower.set(event.follower, event)
  }
  for (const event of newestByFollower.values()) {
    if (!event.unfollow) ids.add(event.txid)
  }
  for (const like of likeRecords) ids.add(like.txid)
  for (const reply of replyRecords) ids.add(reply.txid)
  return ids
}

test('notifications are sorted newest-first with seen tie-break and exact pagination', async () => {
  await forAll(
    fixtureGen(),
    async (input) => {
      const query = populate(input)
      const { notifications, total } = await query.listNotifications(VIEWER, {
        limit: input.limit,
        offset: input.offset
      })
      const expected = buildExpected(input)

      if (total !== expected.total) return false
      if (notifications.length !== expected.page.length) return false

      return notifications.every((n, i) => {
        const e = expected.page[i]
        return n.blockHeight === e.blockHeight && n.seen === e.seen
      })
    },
    { label: 'notifications ordering and pagination conservation' }
  )
})

test('the returned page is globally ordered by blockHeight then seen descending', async () => {
  await forAll(
    fixtureGen(),
    async (input) => {
      const query = populate(input)
      const { notifications } = await query.listNotifications(VIEWER, {
        limit: input.limit,
        offset: input.offset
      })
      for (let i = 1; i < notifications.length; i++) {
        const prev = notifications[i - 1]
        const cur = notifications[i]
        if (cur.blockHeight > prev.blockHeight) return false
        if (cur.blockHeight === prev.blockHeight && cur.seen > prev.seen) return false
      }
      return true
    },
    { label: 'notifications global ordering invariant' }
  )
})

test('every returned notification maps to exactly one generated interaction', async () => {
  await forAll(
    fixtureGen(),
    async (input) => {
      const query = populate(input)
      const { notifications } = await query.listNotifications(VIEWER, { limit: 1000, offset: 0 })
      const expected = expectedIdentities(input)
      const actual = new Set(notifications.map(identityOf))

      // No duplicate identities and no missing or spurious notifications.
      if (actual.size !== notifications.length) return false
      if (actual.size !== expected.size) return false
      for (const id of actual) {
        if (!expected.has(id)) return false
      }
      return true
    },
    { label: 'notification membership matches generated interactions' }
  )
})
