import { assert } from 'chai'
import sinon from 'sinon'
import TopicQuery from '../../../src/adapters/topic-query.js'
import { topicRecencyKey } from '../../../src/lib/backfill-topic-indexes.js'
import { FakeDb } from '../../support/level-double.js'

function makeRoomsDb (records = {}) {
  return new FakeDb(Object.entries(records))
}

// In-memory index store whose iterator honors the LevelDB `limit` option, so
// the read path's bounded recency reads can be asserted.
function makeIteratorDb (records = []) {
  return new FakeDb(records)
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

  for (const { method, presentKey, fallbackKey } of [
    { method: 'roomFromKey', presentKey: 'ignored:post-1', fallbackKey: 'cash:post-1' },
    { method: 'summaryRoom', presentKey: 'ignored', fallbackKey: 'cash' }
  ]) {
    describe(`#${method}`, () => {
      it('should return the room from the value when present', () => {
        assert.equal(uut[method](presentKey, { room: 'bitcoin' }), 'bitcoin')
      })

      it('should fall back to the key when the value omits the room', () => {
        assert.equal(uut[method](fallbackKey, {}), 'cash')
      })
    })
  }

  describe('#txidFromKey', () => {
    it('should return the last segment of the key', () => {
      assert.equal(uut.txidFromKey('bitcoin:post-300'), 'post-300')
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

    it('should default a missing postCount to zero for a summary that omits it', async () => {
      uut = new TopicQuery({
        roomsDb,
        postsDb,
        topicSummariesDb: makeIteratorDb([
          ['memo', { room: 'memo', lastHeight: 600500, lastSeen: 1700020000000, followerCount: 2 }]
        ]),
        topicRecencyDb: makeIteratorDb([
          [topicRecencyKey(600500, 'memo'), { room: 'memo', blockHeight: 600500 }]
        ])
      })

      const result = await uut.listTopics({ limit: 100, offset: 0 })

      assert.deepEqual(result.topics, [
        { room: 'memo', postCount: 0, lastSeen: 1700020000000, followerCount: 2 }
      ])
    })

    it('should default limit and offset when called with no arguments', async () => {
      uut = new TopicQuery({
        roomsDb,
        postsDb,
        topicSummariesDb: makeIteratorDb(summaries),
        topicRecencyDb: makeIteratorDb(recency)
      })

      const result = await uut.listTopics()

      assert.equal(result.pagination.limit, 100)
      assert.equal(result.pagination.offset, 0)
      assert.deepEqual(result.topics.map((t) => t.room), [
        'memo',
        'cash',
        'dance',
        'anime',
        'lone',
        'quiet'
      ])
    })

    for (const { name, limit, offset, expectedRooms, hasMore } of [
      { name: 'should paginate using recency order and report total and hasMore', limit: 2, offset: 2, expectedRooms: ['dance', 'anime'], hasMore: true },
      { name: 'should report hasMore false on the last page', limit: 2, offset: 4, expectedRooms: ['lone', 'quiet'], hasMore: false }
    ]) {
      it(name, async () => {
        uut = new TopicQuery({
          roomsDb,
          postsDb,
          topicSummariesDb: makeIteratorDb(summaries),
          topicRecencyDb: makeIteratorDb(recency)
        })

        const result = await uut.listTopics({ limit, offset })

        assert.deepEqual(result.topics.map((t) => t.room), expectedRooms)
        assert.equal(result.pagination.total, 6)
        assert.equal(result.pagination.hasMore, hasMore)
      })
    }

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

    for (const { name, limit, offset, txids } of [
      { name: 'should paginate topic posts', limit: 1, offset: 0, txids: ['post-300'] },
      { name: 'should apply offset', limit: 100, offset: 1, txids: ['post-200'] }
    ]) {
      it(name, async () => {
        async function * mockRooms () {
          yield ['bitcoin:post-300', { room: 'bitcoin', txid: 'post-300', type: 'post', blockHeight: 300 }]
          yield ['bitcoin:post-200', { room: 'bitcoin', txid: 'post-200', type: 'post', blockHeight: 200 }]
        }
        roomsDb.iterator
          .withArgs(sinon.match({ gte: 'bitcoin:', lte: 'bitcoin:\uffff' }))
          .returns(mockRooms())

        const result = await uut.getTopicPostTxids('bitcoin', { limit, offset })

        assert.deepEqual(result.txids, txids)
        assert.equal(result.total, 2)
      })
    }

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

    it('should default a missing post block height to zero when ordering', async () => {
      async function * mockRooms () {
        // Yield the height-less post first: with a zero default it sorts after
        // the height-1 post, while a one default would leave it first (stable
        // tie), so the asserted order distinguishes the default.
        yield ['bitcoin:post-missing', { room: 'bitcoin', txid: 'post-missing', type: 'post' }]
        yield ['bitcoin:post-1', { room: 'bitcoin', txid: 'post-1', type: 'post', blockHeight: 1 }]
      }
      roomsDb.iterator
        .withArgs(sinon.match({ gte: 'bitcoin:', lte: 'bitcoin:\uffff' }))
        .returns(mockRooms())

      const result = await uut.getTopicPostTxids('bitcoin', { limit: 100, offset: 0 })

      assert.deepEqual(result.txids, ['post-1', 'post-missing'])
      assert.equal(result.total, 2)
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

    for (const { addr, unfollow, expected } of [
      { addr: 'addr-a', unfollow: false, expected: true },
      { addr: 'addr-c', unfollow: true, expected: false }
    ]) {
      it(`should return ${expected} for a follow record with unfollow ${unfollow}`, async () => {
        roomsDb.get.withArgs(`bitcoin:${addr}`).resolves({ room: 'bitcoin', addr, type: 'follow', unfollow })

        const result = await uut.isFollowingRoom(addr, 'bitcoin')
        assert.equal(result, expected)
      })
    }

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
