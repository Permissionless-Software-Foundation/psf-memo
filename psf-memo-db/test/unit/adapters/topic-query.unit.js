import { assert } from 'chai'
import sinon from 'sinon'
import TopicQuery from '../../../src/adapters/topic-query.js'
import { topicRecencyKey } from '../../../src/lib/backfill-topic-indexes.js'

function makeRoomsDb (records = {}) {
  const store = new Map(Object.entries(records))
  return {
    async get (key) {
      if (!store.has(key)) {
        const err = new Error('not found')
        err.notFound = true
        throw err
      }
      return store.get(key)
    },
    iterator (opts = {}) {
      const entries = Array.from(store.entries()).sort((a, b) => a[0].localeCompare(b[0]))
      const { gte, lte } = opts
      const filtered = entries.filter(([key]) => {
        if (gte && key < gte) return false
        if (lte && key > lte) return false
        return true
      })
      let i = 0
      return {
        [Symbol.asyncIterator] () {
          return this
        },
        async next () {
          if (i >= filtered.length) return { value: undefined, done: true }
          const entry = filtered[i++]
          return { value: entry, done: false }
        },
        async close () {}
      }
    }
  }
}

// In-memory index store whose iterator honors the LevelDB `limit` option, so
// the read path's bounded recency reads can be asserted.
function makeIteratorDb (records = []) {
  const store = new Map(records)
  return {
    async get (key) {
      if (!store.has(key)) {
        const err = new Error('not found')
        err.notFound = true
        throw err
      }
      return store.get(key)
    },
    async * iterator (opts = {}) {
      let keys = Array.from(store.keys()).sort()
      if (opts.gte !== undefined) keys = keys.filter((k) => k >= opts.gte)
      if (opts.lte !== undefined) keys = keys.filter((k) => k <= opts.lte)
      const limit = opts.limit === undefined ? keys.length : opts.limit
      for (const key of keys.slice(0, limit)) {
        yield [key, store.get(key)]
      }
    }
  }
}

describe('#TopicQuery', () => {
  let uut
  let sandbox
  let roomsDb
  let postsDb
  let topicSummariesDb
  let topicRecencyDb

  beforeEach(() => {
    sandbox = sinon.createSandbox()
    roomsDb = {
      iterator: sandbox.stub(),
      get: sandbox.stub()
    }
    postsDb = {
      get: sandbox.stub()
    }
    topicSummariesDb = makeIteratorDb()
    topicRecencyDb = makeIteratorDb()

    uut = new TopicQuery({ roomsDb, postsDb, topicSummariesDb, topicRecencyDb })
  })

  afterEach(() => sandbox.restore())

  it('should throw when roomsDb is missing', () => {
    try {
      // eslint-disable-next-line no-new
      new TopicQuery({ postsDb })
      assert.fail('Expected error')
    } catch (err) {
      assert.include(err.message, 'roomsDb required')
    }
  })

  it('should throw when postsDb is missing', () => {
    try {
      // eslint-disable-next-line no-new
      new TopicQuery({ roomsDb, topicSummariesDb, topicRecencyDb })
      assert.fail('Expected error')
    } catch (err) {
      assert.include(err.message, 'postsDb required')
    }
  })

  it('should throw when topicSummariesDb is missing', () => {
    try {
      // eslint-disable-next-line no-new
      new TopicQuery({ roomsDb, postsDb, topicRecencyDb })
      assert.fail('Expected error')
    } catch (err) {
      assert.include(err.message, 'topicSummariesDb required')
    }
  })

  it('should throw when topicRecencyDb is missing', () => {
    try {
      // eslint-disable-next-line no-new
      new TopicQuery({ roomsDb, postsDb, topicSummariesDb })
      assert.fail('Expected error')
    } catch (err) {
      assert.include(err.message, 'topicRecencyDb required')
    }
  })

  describe('#roomFromKey', () => {
    it('should return the room from the value when present', () => {
      assert.equal(uut.roomFromKey('ignored:post-1', { room: 'bitcoin' }), 'bitcoin')
    })

    it('should fall back to the first segment of the key', () => {
      assert.equal(uut.roomFromKey('cash:post-1', {}), 'cash')
    })
  })

  describe('#txidFromKey', () => {
    it('should return the last segment of the key', () => {
      assert.equal(uut.txidFromKey('bitcoin:post-300'), 'post-300')
    })
  })

  describe('#summaryRoom', () => {
    it('should return the room from the value when present', () => {
      assert.equal(uut.summaryRoom('ignored', { room: 'bitcoin' }), 'bitcoin')
    })

    it('should fall back to the key when the value omits the room', () => {
      assert.equal(uut.summaryRoom('cash', {}), 'cash')
    })
  })

  describe('#recencyRoom', () => {
    it('should return the room from the value when present', () => {
      assert.equal(uut.recencyRoom('ignored', { room: 'bitcoin' }), 'bitcoin')
    })

    it('should parse the room out of the inverted-height key when the value omits it', () => {
      assert.equal(uut.recencyRoom(topicRecencyKey(600100, 'bitcoin'), {}), 'bitcoin')
    })
  })

  describe('#listTopics', () => {
    const summaries = [
      ['memo', { room: 'memo', postCount: 5, lastHeight: 600500, lastSeen: 1700020000000, followerCount: 12 }],
      ['cash', { room: 'cash', postCount: 2, lastHeight: 600400, lastSeen: 1700010000000, followerCount: 4 }],
      ['dance', { room: 'dance', postCount: 3, lastHeight: 600400, lastSeen: 1700008000000, followerCount: 1 }],
      ['anime', { room: 'anime', postCount: 1, lastHeight: 600300, lastSeen: 1700006000000, followerCount: 0 }],
      ['lone', { room: 'lone', postCount: 0, lastHeight: 0, lastSeen: 0, followerCount: 7 }],
      ['quiet', { room: 'quiet', postCount: 0, lastHeight: 0, lastSeen: 0, followerCount: 0 }]
    ]
    const recency = [
      [topicRecencyKey(600500, 'memo'), { room: 'memo', blockHeight: 600500 }],
      [topicRecencyKey(600400, 'cash'), { room: 'cash', blockHeight: 600400 }],
      [topicRecencyKey(600400, 'dance'), { room: 'dance', blockHeight: 600400 }],
      [topicRecencyKey(600300, 'anime'), { room: 'anime', blockHeight: 600300 }],
      [topicRecencyKey(0, 'lone'), { room: 'lone', blockHeight: 0 }],
      [topicRecencyKey(0, 'quiet'), { room: 'quiet', blockHeight: 0 }]
    ]

    it('should return topics ordered by recency with counts from summaries', async () => {
      uut = new TopicQuery({
        roomsDb,
        postsDb,
        topicSummariesDb: makeIteratorDb(summaries),
        topicRecencyDb: makeIteratorDb(recency)
      })

      const result = await uut.listTopics({ limit: 100, offset: 0 })

      assert.deepEqual(result.topics, [
        { room: 'memo', postCount: 5, lastSeen: 1700020000000, followerCount: 12 },
        { room: 'cash', postCount: 2, lastSeen: 1700010000000, followerCount: 4 },
        { room: 'dance', postCount: 3, lastSeen: 1700008000000, followerCount: 1 },
        { room: 'anime', postCount: 1, lastSeen: 1700006000000, followerCount: 0 },
        { room: 'lone', postCount: 0, lastSeen: 0, followerCount: 7 },
        { room: 'quiet', postCount: 0, lastSeen: 0, followerCount: 0 }
      ])
      assert.deepEqual(result.pagination, { limit: 100, offset: 0, total: 6, hasMore: false })
    })

    it('should default missing metadata fields to zero for legacy summaries', async () => {
      uut = new TopicQuery({
        roomsDb,
        postsDb,
        topicSummariesDb: makeIteratorDb([
          ['memo', { room: 'memo', postCount: 5, lastHeight: 600500 }]
        ]),
        topicRecencyDb: makeIteratorDb([
          [topicRecencyKey(600500, 'memo'), { room: 'memo', blockHeight: 600500 }]
        ])
      })

      const result = await uut.listTopics({ limit: 100, offset: 0 })

      assert.deepEqual(result.topics, [
        { room: 'memo', postCount: 5, lastSeen: 0, followerCount: 0 }
      ])
    })

    it('should paginate using recency order and report total and hasMore', async () => {
      uut = new TopicQuery({
        roomsDb,
        postsDb,
        topicSummariesDb: makeIteratorDb(summaries),
        topicRecencyDb: makeIteratorDb(recency)
      })

      const result = await uut.listTopics({ limit: 2, offset: 2 })

      assert.deepEqual(result.topics.map((t) => t.room), ['dance', 'anime'])
      assert.equal(result.pagination.total, 6)
      assert.equal(result.pagination.hasMore, true)
    })

    it('should report hasMore false on the last page', async () => {
      uut = new TopicQuery({
        roomsDb,
        postsDb,
        topicSummariesDb: makeIteratorDb(summaries),
        topicRecencyDb: makeIteratorDb(recency)
      })

      const result = await uut.listTopics({ limit: 2, offset: 4 })

      assert.deepEqual(result.topics.map((t) => t.room), ['lone', 'quiet'])
      assert.equal(result.pagination.total, 6)
      assert.equal(result.pagination.hasMore, false)
    })

    it('should read the recency index without iterating the rooms store', async () => {
      uut = new TopicQuery({
        roomsDb,
        postsDb,
        topicSummariesDb: makeIteratorDb(summaries),
        topicRecencyDb: makeIteratorDb(recency)
      })

      await uut.listTopics({ limit: 2, offset: 2 })

      assert.equal(roomsDb.iterator.callCount, 0)
    })
  })

  describe('#getTopicPostTxids', () => {
    it('should return txids for a topic sorted by block height descending', async () => {
      async function * mockRooms () {
        yield ['bitcoin:post-200', { room: 'bitcoin', txid: 'post-200', type: 'post', blockHeight: 200 }]
        yield ['bitcoin:post-300', { room: 'bitcoin', txid: 'post-300', type: 'post', blockHeight: 300 }]
        yield ['bitcoin:addr-f', { room: 'bitcoin', addr: 'addr-f', type: 'follow', unfollow: false }]
      }
      roomsDb.iterator
        .withArgs(sinon.match({ gte: 'bitcoin:', lte: 'bitcoin:\uffff' }))
        .returns(mockRooms())

      const result = await uut.getTopicPostTxids('bitcoin', { limit: 100, offset: 0 })

      assert.deepEqual(result.txids, ['post-300', 'post-200'])
      assert.equal(result.total, 2)
    })

    it('should paginate topic posts', async () => {
      async function * mockRooms () {
        yield ['bitcoin:post-300', { room: 'bitcoin', txid: 'post-300', type: 'post', blockHeight: 300 }]
        yield ['bitcoin:post-200', { room: 'bitcoin', txid: 'post-200', type: 'post', blockHeight: 200 }]
      }
      roomsDb.iterator
        .withArgs(sinon.match({ gte: 'bitcoin:', lte: 'bitcoin:\uffff' }))
        .returns(mockRooms())

      const result = await uut.getTopicPostTxids('bitcoin', { limit: 1, offset: 0 })

      assert.deepEqual(result.txids, ['post-300'])
      assert.equal(result.total, 2)
    })

    it('should apply offset', async () => {
      async function * mockRooms () {
        yield ['bitcoin:post-300', { room: 'bitcoin', txid: 'post-300', type: 'post', blockHeight: 300 }]
        yield ['bitcoin:post-200', { room: 'bitcoin', txid: 'post-200', type: 'post', blockHeight: 200 }]
      }
      roomsDb.iterator
        .withArgs(sinon.match({ gte: 'bitcoin:', lte: 'bitcoin:\uffff' }))
        .returns(mockRooms())

      const result = await uut.getTopicPostTxids('bitcoin', { limit: 100, offset: 1 })

      assert.deepEqual(result.txids, ['post-200'])
      assert.equal(result.total, 2)
    })

    it('should return empty result for a topic with no posts', async () => {
      async function * empty () {}
      roomsDb.iterator
        .withArgs(sinon.match({ gte: 'lone:', lte: 'lone:\uffff' }))
        .returns(empty())

      const result = await uut.getTopicPostTxids('lone', { limit: 100, offset: 0 })

      assert.deepEqual(result.txids, [])
      assert.equal(result.total, 0)
    })

    it('should ignore entries that are not posts', async () => {
      async function * mockRooms () {
        yield ['bitcoin:addr-f', { room: 'bitcoin', addr: 'addr-f', type: 'follow', unfollow: false }]
      }
      roomsDb.iterator
        .withArgs(sinon.match({ gte: 'bitcoin:', lte: 'bitcoin:\uffff' }))
        .returns(mockRooms())

      const result = await uut.getTopicPostTxids('bitcoin', { limit: 100, offset: 0 })

      assert.deepEqual(result.txids, [])
      assert.equal(result.total, 0)
    })

    it('should fall back to the key txid when the value has no string txid', async () => {
      async function * mockRooms () {
        yield ['bitcoin:post-300', { room: 'bitcoin', type: 'post', blockHeight: 300 }]
      }
      roomsDb.iterator
        .withArgs(sinon.match({ gte: 'bitcoin:', lte: 'bitcoin:\uffff' }))
        .returns(mockRooms())

      const result = await uut.getTopicPostTxids('bitcoin', { limit: 100, offset: 0 })

      assert.deepEqual(result.txids, ['post-300'])
      assert.equal(result.total, 1)
    })

    it('should exclude posts from muted addresses when a viewer is provided', async () => {
      async function * mockRooms () {
        yield ['bitcoin:post-300', { room: 'bitcoin', txid: 'post-300', type: 'post', blockHeight: 300 }]
        yield ['bitcoin:post-200', { room: 'bitcoin', txid: 'post-200', type: 'post', blockHeight: 200 }]
      }
      roomsDb.iterator
        .withArgs(sinon.match({ gte: 'bitcoin:', lte: 'bitcoin:\uffff' }))
        .returns(mockRooms())
      postsDb.get.callsFake(async (txid) => {
        if (txid === 'post-300') return { addr: 'muted-addr', text: 'x', blockHeight: 300 }
        if (txid === 'post-200') return { addr: 'other-addr', text: 'x', blockHeight: 200 }
        const err = new Error('not found')
        err.notFound = true
        throw err
      })

      const muteQuery = {
        listMuted: sandbox.stub().resolves(['muted-addr'])
      }
      uut = new TopicQuery({ roomsDb, postsDb, topicSummariesDb, topicRecencyDb, muteQuery })

      const result = await uut.getTopicPostTxids('bitcoin', { limit: 100, offset: 0, viewerAddr: 'viewer-addr' })

      assert.deepEqual(result.txids, ['post-200'])
      assert.equal(result.total, 1)
      assert.isTrue(muteQuery.listMuted.calledOnceWith('viewer-addr'))
    })
  })

  describe('#isFollowingRoom', () => {
    it('should return false when no follow record exists', async () => {
      const err = new Error('not found')
      err.notFound = true
      roomsDb.get.withArgs('bitcoin:addr-x').rejects(err)

      const result = await uut.isFollowingRoom('addr-x', 'bitcoin')
      assert.equal(result, false)
    })

    it('should return true for an active follow record', async () => {
      roomsDb.get.withArgs('bitcoin:addr-a').resolves({ room: 'bitcoin', addr: 'addr-a', type: 'follow', unfollow: false })

      const result = await uut.isFollowingRoom('addr-a', 'bitcoin')
      assert.equal(result, true)
    })

    it('should return false for an unfollow record', async () => {
      roomsDb.get.withArgs('bitcoin:addr-c').resolves({ room: 'bitcoin', addr: 'addr-c', type: 'follow', unfollow: true })

      const result = await uut.isFollowingRoom('addr-c', 'bitcoin')
      assert.equal(result, false)
    })

    it('should return false for a non-follow record', async () => {
      roomsDb.get.withArgs('bitcoin:addr-a').resolves({ room: 'bitcoin', txid: 'post-1', type: 'post' })

      const result = await uut.isFollowingRoom('addr-a', 'bitcoin')
      assert.equal(result, false)
    })

    it('should rethrow non-not-found errors', async () => {
      roomsDb.get.withArgs('bitcoin:addr-a').rejects(new Error('db down'))

      try {
        await uut.isFollowingRoom('addr-a', 'bitcoin')
        assert.fail('Expected error')
      } catch (err) {
        assert.include(err.message, 'db down')
      }
    })
  })

  describe('#listRoomFollowers', () => {
    it('should return active followers for a room', async () => {
      const query = new TopicQuery({
        roomsDb: makeRoomsDb({
          'bitcoin:addr-a': { room: 'bitcoin', addr: 'addr-a', type: 'follow', unfollow: false },
          'bitcoin:addr-b': { room: 'bitcoin', addr: 'addr-b', type: 'follow', unfollow: false },
          'bitcoin:addr-c': { room: 'bitcoin', addr: 'addr-c', type: 'follow', unfollow: true },
          'cash:addr-a': { room: 'cash', addr: 'addr-a', type: 'follow', unfollow: false }
        }),
        postsDb,
        topicSummariesDb,
        topicRecencyDb
      })

      const result = await query.listRoomFollowers('bitcoin')
      assert.deepEqual(result, ['addr-a', 'addr-b'])
    })

    it('should fall back to the key address when the value has no addr', async () => {
      const query = new TopicQuery({
        roomsDb: makeRoomsDb({
          'bitcoin:addr-a': { room: 'bitcoin', type: 'follow', unfollow: false }
        }),
        postsDb,
        topicSummariesDb,
        topicRecencyDb
      })

      const result = await query.listRoomFollowers('bitcoin')
      assert.deepEqual(result, ['addr-a'])
    })

    it('should return an empty array for a room with no followers', async () => {
      const query = new TopicQuery({
        roomsDb: makeRoomsDb({}),
        postsDb,
        topicSummariesDb,
        topicRecencyDb
      })

      const result = await query.listRoomFollowers('lone')
      assert.deepEqual(result, [])
    })
  })

  describe('#followAddrFromValue', () => {
    it('should return the addr from the value when present', () => {
      const result = uut.followAddrFromValue({ addr: 'addr-a' }, 'bitcoin:addr-a')
      assert.equal(result, 'addr-a')
    })

    it('should fall back to the last key segment when the value has no addr', () => {
      const result = uut.followAddrFromValue({ room: 'bitcoin', type: 'follow' }, 'bitcoin:addr-a')
      assert.equal(result, 'addr-a')
    })

    it('should return null when the key has no address segment', () => {
      const result = uut.followAddrFromValue({ room: 'lone', type: 'follow' }, 'lone')
      assert.equal(result, null)
    })
  })
})
