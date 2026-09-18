import { assert } from 'chai'
import sinon from 'sinon'
import NotificationsQuery from '../../../src/adapters/notifications-query.js'
import { FakeDb } from '../../support/level-double.js'

describe('#NotificationsQuery', () => {
  let sandbox

  const VIEWER = 'bitcoincash:viewer'
  const VIEWER_HASH = 'hash-viewer'
  const FOLLOWER = 'bitcoincash:follower'
  const OTHER = 'bitcoincash:other'
  const LIKER = 'bitcoincash:liker'
  const REPLIER = 'bitcoincash:replier'

  const HEIGHT_PAD = 12
  const pad = (h) => String(h).padStart(HEIGHT_PAD, '0')

  // The adapter only needs get and range iteration, both provided by the
  // shared in-memory LevelDB double.
  const makeDb = (entries = []) => new FakeDb(entries)

  function addrPostHeight (addr, height, txid) {
    return [`${addr}:${pad(height)}:${txid}`, { txid, addr, blockHeight: height }]
  }

  function postLike (postTxid, likeTxid) {
    return [`${postTxid}:${likeTxid}`, { postTxid, txid: likeTxid }]
  }

  function child (parentTxid, childTxid, blockHeight) {
    return [`${parentTxid}:${childTxid}`, { parentTxid, childTxid, blockHeight }]
  }

  function followeeHeight (followeeHash, height, follower, unfollow = false) {
    return [
      `${followeeHash}:${pad(height)}:${follower}`,
      { followerAddr: follower, followeePkHash: followeeHash, unfollow, txid: `follow-${height}`, seen: height, blockHeight: height }
    ]
  }

  function buildQuery (overrides = {}) {
    const postsDb = overrides.postsDb || makeDb()
    const addrPostHeightsDb = overrides.addrPostHeightsDb || makeDb()
    const postChildrenDb = overrides.postChildrenDb || makeDb()
    const postLikesDb = overrides.postLikesDb || makeDb()
    const likesDb = overrides.likesDb || makeDb()
    const followeeHeightsDb = overrides.followeeHeightsDb || makeDb()
    const statusDb = 'statusDb' in overrides
      ? overrides.statusDb
      : makeDb([['status', { chainBlockHeight: 700000 }]])

    const bchjs = {
      Address: {
        toHash160: (addr) => (addr === VIEWER ? VIEWER_HASH : `hash-${addr}`)
      }
    }

    return new NotificationsQuery({
      postsDb,
      addrPostHeightsDb,
      postChildrenDb,
      postLikesDb,
      likesDb,
      followeeHeightsDb,
      statusDb,
      notificationBlockWindow: overrides.notificationBlockWindow,
      muteQuery: overrides.muteQuery,
      bchjs
    })
  }

  beforeEach(() => {
    sandbox = sinon.createSandbox()
  })

  afterEach(() => sandbox.restore())

  it('should throw when required stores are missing', () => {
    const cases = [
      ['postsDb', /postsDb required/],
      ['addrPostHeightsDb', /addrPostHeightsDb required/],
      ['postChildrenDb', /postChildrenDb required/],
      ['postLikesDb', /postLikesDb required/],
      ['likesDb', /likesDb required/],
      ['followeeHeightsDb', /followeeHeightsDb required/]
    ]

    for (const [omit, expected] of cases) {
      const config = {
        postsDb: makeDb(),
        addrPostHeightsDb: makeDb(),
        postChildrenDb: makeDb(),
        postLikesDb: makeDb(),
        likesDb: makeDb(),
        followeeHeightsDb: makeDb()
      }
      delete config[omit]

      try {
        // eslint-disable-next-line no-new
        new NotificationsQuery(config)
        assert.fail(`Expected error for missing ${omit}`)
      } catch (err) {
        assert.match(err.message, expected)
      }
    }
  })

  it('should include an in-window follow, reply, and like sorted newest-first', async () => {
    const postsDb = makeDb([
      ['post-recent', { addr: VIEWER, text: 'hi' }],
      ['reply-recent', { addr: REPLIER, text: 'reply', blockHeight: 690150, seen: 1 }]
    ])
    const addrPostHeightsDb = makeDb([addrPostHeight(VIEWER, 690000, 'post-recent')])
    const postLikesDb = makeDb([postLike('post-recent', 'like-recent')])
    const likesDb = makeDb([['like-recent', { addr: LIKER, postTxid: 'post-recent', blockHeight: 690100, seen: 2 }]])
    const postChildrenDb = makeDb([child('post-recent', 'reply-recent', 690150)])
    const followeeHeightsDb = makeDb([followeeHeight(VIEWER_HASH, 690400, FOLLOWER)])

    const uut = buildQuery({ postsDb, addrPostHeightsDb, postLikesDb, likesDb, postChildrenDb, followeeHeightsDb })
    const result = await uut.listNotifications(VIEWER, { limit: 100, offset: 0 })

    assert.equal(result.total, 3)
    assert.deepEqual(result.notifications.map((n) => n.type), ['follow', 'reply', 'like'])
    assert.equal(result.notifications[0].addr, FOLLOWER)
    assert.equal(result.notifications[0].blockHeight, 690400)
    assert.equal(result.notifications[1].addr, REPLIER)
    assert.equal(result.notifications[2].addr, LIKER)
  })

  it('should exclude interactions with posts older than the window', async () => {
    const postsDb = makeDb([
      ['post-old', { addr: VIEWER, text: 'old' }],
      ['reply-old', { addr: REPLIER, text: 'reply', blockHeight: 690250, seen: 1 }]
    ])
    const addrPostHeightsDb = makeDb([addrPostHeight(VIEWER, 600000, 'post-old')])
    const postLikesDb = makeDb([postLike('post-old', 'like-old')])
    const likesDb = makeDb([['like-old', { addr: LIKER, postTxid: 'post-old', blockHeight: 690200, seen: 1 }]])
    const postChildrenDb = makeDb([child('post-old', 'reply-old', 690250)])
    const followeeHeightsDb = makeDb([followeeHeight(VIEWER_HASH, 690400, FOLLOWER)])

    const uut = buildQuery({ postsDb, addrPostHeightsDb, postLikesDb, likesDb, postChildrenDb, followeeHeightsDb })
    const result = await uut.listNotifications(VIEWER, { limit: 100, offset: 0 })

    // The old post's like and reply are excluded; only the in-window follow remains.
    assert.equal(result.total, 1)
    assert.deepEqual(result.notifications.map((n) => n.type), ['follow'])
  })

  it('should include an out-of-window post when the window reaches it', async () => {
    const postsDb = makeDb([['post-old', { addr: VIEWER, text: 'old' }]])
    const addrPostHeightsDb = makeDb([addrPostHeight(VIEWER, 600000, 'post-old')])
    const postLikesDb = makeDb([postLike('post-old', 'like-old')])
    const likesDb = makeDb([['like-old', { addr: LIKER, postTxid: 'post-old', blockHeight: 690200, seen: 1 }]])

    const uut = buildQuery({
      postsDb,
      addrPostHeightsDb,
      postLikesDb,
      likesDb,
      postChildrenDb: makeDb(),
      followeeHeightsDb: makeDb(),
      notificationBlockWindow: 100000
    })
    const result = await uut.listNotifications(VIEWER, { limit: 100, offset: 0 })

    assert.equal(result.total, 1)
    assert.equal(result.notifications[0].blockHeight, 690200)
  })

  it('should drop a follower whose newest entry is an unfollow', async () => {
    const followeeHeightsDb = makeDb([
      followeeHeight(VIEWER_HASH, 690550, FOLLOWER, false),
      followeeHeight(VIEWER_HASH, 690600, FOLLOWER, true)
    ])

    const uut = buildQuery({ followeeHeightsDb })
    const result = await uut.listNotifications(VIEWER, { limit: 100, offset: 0 })

    assert.equal(result.total, 0)
  })

  it('should keep a follower whose newest entry is a follow after an older unfollow', async () => {
    const followeeHeightsDb = makeDb([
      followeeHeight(VIEWER_HASH, 690550, FOLLOWER, true),
      followeeHeight(VIEWER_HASH, 690600, FOLLOWER, false)
    ])

    const uut = buildQuery({ followeeHeightsDb })
    const result = await uut.listNotifications(VIEWER, { limit: 100, offset: 0 })

    assert.equal(result.total, 1)
    assert.equal(result.notifications[0].addr, FOLLOWER)
  })

  it('should exclude self-likes, self-replies, and self-follows', async () => {
    const postsDb = makeDb([
      ['post-recent', { addr: VIEWER, text: 'hi' }],
      ['reply-self', { addr: VIEWER, text: 'mine', blockHeight: 690150 }]
    ])
    const addrPostHeightsDb = makeDb([addrPostHeight(VIEWER, 690000, 'post-recent')])
    const postLikesDb = makeDb([postLike('post-recent', 'like-self')])
    const likesDb = makeDb([['like-self', { addr: VIEWER, postTxid: 'post-recent', blockHeight: 690100 }]])
    const postChildrenDb = makeDb([child('post-recent', 'reply-self', 690150)])
    const followeeHeightsDb = makeDb([followeeHeight(VIEWER_HASH, 690400, VIEWER)])

    const uut = buildQuery({ postsDb, addrPostHeightsDb, postLikesDb, likesDb, postChildrenDb, followeeHeightsDb })
    const result = await uut.listNotifications(VIEWER, { limit: 100, offset: 0 })

    assert.equal(result.total, 0)
  })

  it('should exclude notifications from muted addresses', async () => {
    const postsDb = makeDb([['reply-recent', { addr: OTHER, text: 'reply', blockHeight: 690150 }]])
    const addrPostHeightsDb = makeDb([addrPostHeight(VIEWER, 690000, 'post-recent')])
    const postChildrenDb = makeDb([child('post-recent', 'reply-recent', 690150)])
    const muteQuery = { listMuted: sandbox.stub().resolves([OTHER]) }

    const uut = buildQuery({ postsDb, addrPostHeightsDb, postChildrenDb, muteQuery })
    const result = await uut.listNotifications(VIEWER, { limit: 100, offset: 0 })

    assert.equal(result.total, 0)
    assert.isTrue(muteQuery.listMuted.calledOnceWith(VIEWER))
  })

  it('should break sort ties by seen descending', async () => {
    const postsDb = makeDb([
      ['reply-a', { addr: REPLIER, text: 'a', blockHeight: 690150, seen: 1 }],
      ['reply-b', { addr: OTHER, text: 'b', blockHeight: 690150, seen: 2 }]
    ])
    const addrPostHeightsDb = makeDb([addrPostHeight(VIEWER, 690000, 'post-recent')])
    const postChildrenDb = makeDb([
      child('post-recent', 'reply-a', 690150),
      child('post-recent', 'reply-b', 690150)
    ])

    const uut = buildQuery({ postsDb, addrPostHeightsDb, postChildrenDb })
    const result = await uut.listNotifications(VIEWER, { limit: 100, offset: 0 })

    assert.equal(result.total, 2)
    assert.equal(result.notifications[0].seen, 2)
    assert.equal(result.notifications[1].seen, 1)
  })

  it('should paginate and report the exact in-window total', async () => {
    const followeeHeightsDb = makeDb([
      followeeHeight(VIEWER_HASH, 690400, FOLLOWER),
      followeeHeight(VIEWER_HASH, 690300, OTHER)
    ])

    const uut = buildQuery({ followeeHeightsDb })
    const result = await uut.listNotifications(VIEWER, { limit: 1, offset: 1 })

    assert.equal(result.total, 2)
    assert.equal(result.notifications.length, 1)
    assert.equal(result.notifications[0].blockHeight, 690300)
  })

  it('should never iterate the likes store', async () => {
    const postsDb = makeDb([['post-recent', { addr: VIEWER, text: 'hi' }]])
    const addrPostHeightsDb = makeDb([addrPostHeight(VIEWER, 690000, 'post-recent')])
    const postLikesDb = makeDb([postLike('post-recent', 'like-recent')])
    const likesDb = makeDb([['like-recent', { addr: LIKER, postTxid: 'post-recent', blockHeight: 690100 }]])
    const followeeHeightsDb = makeDb([followeeHeight(VIEWER_HASH, 690400, FOLLOWER)])
    likesDb.iterator = sandbox.stub().throws(new Error('likes store must not be iterated'))

    const uut = buildQuery({ postsDb, addrPostHeightsDb, postLikesDb, likesDb, postChildrenDb: makeDb(), followeeHeightsDb })
    const result = await uut.listNotifications(VIEWER, { limit: 100, offset: 0 })

    assert.equal(result.total, 2)
    assert.equal(likesDb.iterator.callCount, 0)
  })

  it('should treat the whole history as in-window when status is missing', async () => {
    const postsDb = makeDb([['post-old', { addr: VIEWER, text: 'old' }]])
    const addrPostHeightsDb = makeDb([addrPostHeight(VIEWER, 1, 'post-old')])
    const postLikesDb = makeDb([postLike('post-old', 'like-old')])
    const likesDb = makeDb([['like-old', { addr: LIKER, postTxid: 'post-old', blockHeight: 2 }]])

    const uut = buildQuery({
      postsDb,
      addrPostHeightsDb,
      postLikesDb,
      likesDb,
      postChildrenDb: makeDb(),
      followeeHeightsDb: makeDb(),
      statusDb: null
    })
    const result = await uut.listNotifications(VIEWER, { limit: 100, offset: 0 })

    assert.equal(result.total, 1)
  })

  it('should recover the follower from the followeeHeights key when the record lacks it', async () => {
    const followeeHeightsDb = makeDb([
      [`${VIEWER_HASH}:${pad(690400)}:${FOLLOWER}`, { unfollow: false, txid: 't', blockHeight: 690400 }]
    ])

    const uut = buildQuery({ followeeHeightsDb })
    const result = await uut.listNotifications(VIEWER, { limit: 100, offset: 0 })

    assert.equal(result.total, 1)
    assert.equal(result.notifications[0].addr, FOLLOWER)
  })

  it('should recover per-post index txids from keys when values omit them', async () => {
    const postsDb = makeDb([
      ['reply-keyed', { addr: REPLIER, text: 'reply' }]
    ])
    // addrPostHeights value omits txid; the key's final segment supplies it.
    const addrPostHeightsDb = makeDb([
      [`${VIEWER}:${pad(690000)}:post-recent`, { addr: VIEWER, blockHeight: 690000 }]
    ])
    // postLikes value omits txid and postChildren value omits childTxid.
    const postLikesDb = makeDb([
      ['post-recent:like-keyed', { postTxid: 'post-recent' }]
    ])
    const likesDb = makeDb([
      ['like-keyed', { addr: LIKER, postTxid: 'post-recent', blockHeight: 690100 }]
    ])
    const postChildrenDb = makeDb([
      ['post-recent:reply-keyed', { parentTxid: 'post-recent' }]
    ])

    const uut = buildQuery({ postsDb, addrPostHeightsDb, postLikesDb, likesDb, postChildrenDb })
    const result = await uut.listNotifications(VIEWER, { limit: 100, offset: 0 })

    assert.equal(result.total, 2)
    assert.deepEqual(result.notifications.map((n) => n.type).sort(), ['like', 'reply'])
  })

  it('should default a notification height and seen to 0 when no source records one', async () => {
    const postsDb = makeDb([
      ['reply-bare', { addr: REPLIER, text: 'reply' }]
    ])
    const addrPostHeightsDb = makeDb([
      [`${VIEWER}:${pad(690000)}:post-recent`, { txid: 'post-recent', addr: VIEWER }]
    ])
    const postLikesDb = makeDb([postLike('post-recent', 'like-bare')])
    const likesDb = makeDb([['like-bare', { addr: LIKER, postTxid: 'post-recent' }]])
    const postChildrenDb = makeDb([
      ['post-recent:reply-bare', { childTxid: 'reply-bare' }]
    ])

    const uut = buildQuery({ postsDb, addrPostHeightsDb, postLikesDb, likesDb, postChildrenDb })
    const result = await uut.listNotifications(VIEWER, { limit: 100, offset: 0 })

    assert.equal(result.total, 2)
    assert.deepEqual(result.notifications.map((n) => n.blockHeight), [0, 0])
    assert.deepEqual(result.notifications.map((n) => n.seen), [0, 0])
  })

  it('should skip a missing like record', async () => {
    const postsDb = makeDb([['post-recent', { addr: VIEWER, text: 'hi' }]])
    const addrPostHeightsDb = makeDb([addrPostHeight(VIEWER, 690000, 'post-recent')])
    const postLikesDb = makeDb([postLike('post-recent', 'like-missing')])

    const uut = buildQuery({ postsDb, addrPostHeightsDb, postLikesDb })
    const result = await uut.listNotifications(VIEWER, { limit: 100, offset: 0 })

    assert.equal(result.total, 0)
  })

  it('should skip a like whose record reports LEVEL_NOT_FOUND', async () => {
    const postsDb = makeDb([['post-recent', { addr: VIEWER, text: 'hi' }]])
    const addrPostHeightsDb = makeDb([addrPostHeight(VIEWER, 690000, 'post-recent')])
    const postLikesDb = makeDb([postLike('post-recent', 'like-missing')])
    const likesDb = makeDb()
    likesDb.get = async () => {
      const err = new Error('level not found')
      err.code = 'LEVEL_NOT_FOUND'
      throw err
    }

    const uut = buildQuery({ postsDb, addrPostHeightsDb, postLikesDb, likesDb })
    const result = await uut.listNotifications(VIEWER, { limit: 100, offset: 0 })

    assert.equal(result.total, 0)
  })

  it('should skip a like whose record reports an HTTP 404', async () => {
    const postsDb = makeDb([['post-recent', { addr: VIEWER, text: 'hi' }]])
    const addrPostHeightsDb = makeDb([addrPostHeight(VIEWER, 690000, 'post-recent')])
    const postLikesDb = makeDb([postLike('post-recent', 'like-missing')])
    const likesDb = makeDb()
    likesDb.get = async () => {
      const err = new Error('not found')
      err.response = { status: 404 }
      throw err
    }

    const uut = buildQuery({ postsDb, addrPostHeightsDb, postLikesDb, likesDb })
    const result = await uut.listNotifications(VIEWER, { limit: 100, offset: 0 })

    assert.equal(result.total, 0)
  })

  it('should rethrow a non-not-found error from the likes store', async () => {
    const postsDb = makeDb([['post-recent', { addr: VIEWER, text: 'hi' }]])
    const addrPostHeightsDb = makeDb([addrPostHeight(VIEWER, 690000, 'post-recent')])
    const postLikesDb = makeDb([postLike('post-recent', 'like-recent')])
    const likesDb = makeDb()
    likesDb.get = async () => { throw new Error('boom') }

    const uut = buildQuery({ postsDb, addrPostHeightsDb, postLikesDb, likesDb })
    let error
    try {
      await uut.listNotifications(VIEWER, { limit: 100, offset: 0 })
    } catch (err) {
      error = err
    }

    assert.equal(error?.message, 'boom')
  })

  it('should default a follow height and seen to 0 when the record omits them', async () => {
    const followeeHeightsDb = makeDb([
      [`${VIEWER_HASH}:${pad(690400)}:${FOLLOWER}`, { followerAddr: FOLLOWER, followeePkHash: VIEWER_HASH, unfollow: false }]
    ])

    const uut = buildQuery({ followeeHeightsDb })
    const result = await uut.listNotifications(VIEWER, { limit: 100, offset: 0 })

    assert.equal(result.total, 1)
    assert.equal(result.notifications[0].blockHeight, 0)
    assert.equal(result.notifications[0].seen, 0)
  })

  it('should treat a missing seen as 0 when it is the comparator first argument', async () => {
    // Two follows at the same height: the first has no seen, the second seen 1,
    // so the higher seen must sort first.
    const followeeHeightsDb = makeDb([
      [`${VIEWER_HASH}:${pad(690400)}:bitcoincash:aaa`, { followerAddr: 'bitcoincash:aaa', followeePkHash: VIEWER_HASH, unfollow: false, blockHeight: 690400 }],
      [`${VIEWER_HASH}:${pad(690400)}:bitcoincash:bbb`, { followerAddr: 'bitcoincash:bbb', followeePkHash: VIEWER_HASH, unfollow: false, blockHeight: 690400, seen: 1 }]
    ])

    const uut = buildQuery({ followeeHeightsDb })
    const result = await uut.listNotifications(VIEWER, { limit: 100, offset: 0 })

    assert.equal(result.notifications[0].addr, 'bitcoincash:bbb')
  })

  it('should treat a missing seen as 0 when it is the comparator second argument', async () => {
    // Equal seen (0 vs defaulted 0) keeps insertion order; a defaulted 1 would
    // wrongly promote the second entry.
    const followeeHeightsDb = makeDb([
      [`${VIEWER_HASH}:${pad(690400)}:bitcoincash:aaa`, { followerAddr: 'bitcoincash:aaa', followeePkHash: VIEWER_HASH, unfollow: false, blockHeight: 690400, seen: 0 }],
      [`${VIEWER_HASH}:${pad(690400)}:bitcoincash:bbb`, { followerAddr: 'bitcoincash:bbb', followeePkHash: VIEWER_HASH, unfollow: false, blockHeight: 690400 }]
    ])

    const uut = buildQuery({ followeeHeightsDb })
    const result = await uut.listNotifications(VIEWER, { limit: 100, offset: 0 })

    assert.equal(result.notifications[0].addr, 'bitcoincash:aaa')
  })

  it('should use a zero cutoff when status lacks a chain height and the window is 0', async () => {
    const followeeHeightsDb = makeDb([
      [`${VIEWER_HASH}:${pad(0)}:bitcoincash:aaa`, { followerAddr: 'bitcoincash:aaa', followeePkHash: VIEWER_HASH, unfollow: false, blockHeight: 0 }]
    ])

    const uut = buildQuery({
      followeeHeightsDb,
      statusDb: makeDb([['status', {}]]),
      notificationBlockWindow: 0
    })
    const result = await uut.listNotifications(VIEWER, { limit: 100, offset: 0 })

    assert.equal(result.total, 1)
    assert.equal(result.notifications[0].blockHeight, 0)
  })

  it('should default notificationBlockWindow to 25000', async () => {
    const addrPostHeightsDb = makeDb([addrPostHeight(VIEWER, 1, 'post-old')])
    const uut = buildQuery({ addrPostHeightsDb, statusDb: makeDb([['status', { chainBlockHeight: 700000 }]]) })

    // cutoff 675000: a post at height 1 is out of window.
    const result = await uut.listNotifications(VIEWER, { limit: 100, offset: 0 })
    assert.equal(result.total, 0)
    assert.equal(uut.notificationBlockWindow, 25000)
  })
})
