/*
  Property tests for the notifications aggregation.

  The unit suite probes listNotifications at a handful of fixed fixtures.
  These properties pin down invariants that should hold over broad random
  notification records:

    - newest-first ordering: notifications are returned sorted by blockHeight
      descending.
    - tie-break ordering: when blockHeights tie, notifications are ordered by
      seen descending.
    - pagination conservation: applying offset/limit returns exactly the full
      matching set sliced to the page, and reports an exact total.
    - membership: every returned notification originated from an active follow,
      a like on one of my posts, or a reply to one of my posts.

  The reference implementation below mirrors the adapter's aggregation and
  sort logic so the two can be cross-checked.
*/

import test from 'node:test'
import { seededRandom, forAll, intGen } from './harness.js'
import NotificationsQuery from '../../src/adapters/notifications-query.js'

const rng = seededRandom(20260903)

const VIEWER = 'bitcoincash:viewer'
const MY_HASH = 'hash-viewer'
const OTHERS = ['bitcoincash:a', 'bitcoincash:b', 'bitcoincash:c']
const VIEWER_POSTS = ['vp1', 'vp2', 'vp3', 'vp4']

function makeIterator (items) {
  return (async function * () {
    for (const item of items) yield item
  }())
}

function buildQuery ({ posts, follows, likes, children }) {
  const postsDb = {
    async get (txid) {
      const post = posts.get(txid)
      if (!post) {
        const err = new Error('not found')
        err.notFound = true
        throw err
      }
      return post
    }
  }
  const bchjs = {
    Address: {
      toHash160: (addr) => (addr === VIEWER ? MY_HASH : 'hash-' + addr)
    }
  }
  return new NotificationsQuery({
    postsDb,
    postParentsDb: {},
    postChildrenDb: { iterator: () => makeIterator(children) },
    likesDb: { iterator: () => makeIterator(likes) },
    postLikesDb: {},
    followsDb: { iterator: () => makeIterator(follows) },
    bchjs
  })
}

function fixtureGen () {
  return () => {
    const posts = new Map(VIEWER_POSTS.map((txid) => [txid, { addr: VIEWER }]))
    const follows = []
    const likeKeys = []
    const danglingLikes = []
    const children = []
    const childPosts = []

    // Active follow records of me by other addresses.
    const nFollows = intGen(rng, 0, 6)()
    for (let i = 0; i < nFollows; i++) {
      const follower = OTHERS[Math.floor(rng() * OTHERS.length)]
      const toMe = rng() < 0.7
      follows.push([
        `${follower}:${toMe ? MY_HASH : 'hash-other'}`,
        {
          followerAddr: follower,
          followeePkHash: toMe ? MY_HASH : 'hash-other',
          unfollow: rng() < 0.2,
          txid: 'follow' + i,
          // a fraction omit blockHeight/seen to exercise the ?? 0 defaults
          blockHeight: rng() < 0.2 ? undefined : intGen(rng, 0, 5000)(),
          seen: rng() < 0.2 ? undefined : intGen(rng, 0, 1000)()
        }
      ])
    }

    // Likes on my posts by other addresses.
    const nLikes = intGen(rng, 0, 6)()
    for (let i = 0; i < nLikes; i++) {
      const postTxid = VIEWER_POSTS[Math.floor(rng() * VIEWER_POSTS.length)]
      likeKeys.push(['like' + i, {
        addr: OTHERS[Math.floor(rng() * OTHERS.length)],
        postTxid,
        blockHeight: intGen(rng, 0, 5000)(),
        seen: intGen(rng, 0, 1000)()
      }])
    }

    // Likes whose target post is missing, to exercise the exclusion path.
    const nDangling = intGen(rng, 0, 3)()
    for (let i = 0; i < nDangling; i++) {
      danglingLikes.push(['dl' + i, { addr: OTHERS[0], postTxid: 'missing-post', blockHeight: 1, seen: 1 }])
    }
    const allLikes = likeKeys.concat(danglingLikes)

    // Replies to my posts by other addresses.
    const nReplies = intGen(rng, 0, 6)()
    for (let i = 0; i < nReplies; i++) {
      const parentTxid = VIEWER_POSTS[Math.floor(rng() * VIEWER_POSTS.length)]
      const childTxid = 'child' + i
      const childPost = {
        addr: OTHERS[Math.floor(rng() * OTHERS.length)],
        blockHeight: intGen(rng, 0, 5000)(),
        seen: intGen(rng, 0, 1000)()
      }
      childPosts.push(childTxid)
      posts.set(childTxid, childPost)
      children.push([`${parentTxid}:${childTxid}`, { parentTxid, childTxid }])
    }

    return {
      query: buildQuery({ posts, follows, likes: allLikes, children }),
      follows,
      likeKeys,
      childPosts,
      posts,
      limit: intGen(rng, 1, 8)(),
      offset: intGen(rng, 0, 10)()
    }
  }
}

function buildExpected ({ follows, likeKeys, childPosts, posts, limit, offset }) {
  const out = []

  for (const [, record] of follows) {
    if (record.unfollow === true) continue
    if (record.followeePkHash !== MY_HASH) continue
    if (record.followerAddr === VIEWER) continue
    out.push({ blockHeight: record.blockHeight ?? 0, seen: record.seen ?? 0 })
  }

  for (const [, like] of likeKeys) {
    if (!like || like.addr === VIEWER) continue
    const post = posts.get(like.postTxid)
    if (!post || post.addr !== VIEWER) continue
    out.push({ blockHeight: like.blockHeight ?? 0, seen: like.seen ?? 0 })
  }

  for (const childTxid of childPosts) {
    // Parent and child both exist in the fixture; child is always authored by
    // a non-viewer, parent by the viewer, so every child here qualifies.
    out.push({ blockHeight: posts.get(childTxid).blockHeight ?? 0, seen: posts.get(childTxid).seen ?? 0 })
  }

  out.sort((a, b) => {
    if (b.blockHeight !== a.blockHeight) return b.blockHeight - a.blockHeight
    return (b.seen ?? 0) - (a.seen ?? 0)
  })

  return {
    total: out.length,
    page: out.slice(offset, offset + limit)
  }
}

test('notifications are sorted newest-first with seen tie-break and exact pagination', async () => {
  await forAll(
    fixtureGen(),
    async ({ query, follows, likeKeys, childPosts, posts, limit, offset }) => {
      const { notifications, total } = await query.listNotifications(VIEWER, { limit, offset })
      const expected = buildExpected({ follows, likeKeys, childPosts, posts, limit, offset })

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
    async ({ query, limit, offset }) => {
      const { notifications } = await query.listNotifications(VIEWER, { limit, offset })
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
