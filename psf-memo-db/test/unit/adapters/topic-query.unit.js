import { assert } from 'chai'
import sinon from 'sinon'
import TopicQuery from '../../../src/adapters/topic-query.js'

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

describe('#TopicQuery', () => {
  let uut
  let sandbox
  let roomsDb
  let postsDb

  beforeEach(() => {
    sandbox = sinon.createSandbox()
    roomsDb = {
      iterator: sandbox.stub(),
      get: sandbox.stub()
    }
    postsDb = {
      get: sandbox.stub()
    }

    uut = new TopicQuery({ roomsDb, postsDb })
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
      new TopicQuery({ roomsDb })
      assert.fail('Expected error')
    } catch (err) {
      assert.include(err.message, 'postsDb required')
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

  describe('#listTopics', () => {
    it('should return distinct topics with post counts', async () => {
      async function * mockRooms () {
        yield ['bitcoin:post-300', { room: 'bitcoin', txid: 'post-300', type: 'post', blockHeight: 300 }]
        yield ['bitcoin:post-200', { room: 'bitcoin', txid: 'post-200', type: 'post', blockHeight: 200 }]
        yield ['cash:post-250', { room: 'cash', txid: 'post-250', type: 'post', blockHeight: 250 }]
        yield ['dev:post-100', { room: 'dev', txid: 'post-100', type: 'post', blockHeight: 100 }]
        yield ['lone:addr-f', { room: 'lone', addr: 'addr-f', type: 'follow', unfollow: false }]
      }
      roomsDb.iterator.returns(mockRooms())

      const result = await uut.listTopics()

      assert.deepEqual(result, [
        { room: 'bitcoin', postCount: 2 },
        { room: 'cash', postCount: 1 },
        { room: 'dev', postCount: 1 },
        { room: 'lone', postCount: 0 }
      ])
    })

    it('should sort topics by room name', async () => {
      async function * mockRooms () {
        yield ['zoo:post-1', { room: 'zoo', txid: 'post-1', type: 'post', blockHeight: 1 }]
        yield ['alpha:post-1', { room: 'alpha', txid: 'post-1', type: 'post', blockHeight: 1 }]
      }
      roomsDb.iterator.returns(mockRooms())

      const result = await uut.listTopics()

      assert.deepEqual(result.map((t) => t.room), ['alpha', 'zoo'])
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

    it('should treat a post without a block height as height 0', async () => {
      async function * mockRooms () {
        yield ['bitcoin:post-a', { room: 'bitcoin', txid: 'post-a', type: 'post', blockHeight: 0 }]
        yield ['bitcoin:post-b', { room: 'bitcoin', txid: 'post-b', type: 'post' }]
      }
      roomsDb.iterator
        .withArgs(sinon.match({ gte: 'bitcoin:', lte: 'bitcoin:\uffff' }))
        .returns(mockRooms())

      const result = await uut.getTopicPostTxids('bitcoin', { limit: 100, offset: 0 })

      assert.deepEqual(result.txids, ['post-a', 'post-b'])
      assert.equal(result.total, 2)
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
        postsDb
      })

      const result = await query.listRoomFollowers('bitcoin')
      assert.deepEqual(result, ['addr-a', 'addr-b'])
    })

    it('should fall back to the key address when the value has no addr', async () => {
      const query = new TopicQuery({
        roomsDb: makeRoomsDb({
          'bitcoin:addr-a': { room: 'bitcoin', type: 'follow', unfollow: false }
        }),
        postsDb
      })

      const result = await query.listRoomFollowers('bitcoin')
      assert.deepEqual(result, ['addr-a'])
    })

    it('should return an empty array for a room with no followers', async () => {
      const query = new TopicQuery({
        roomsDb: makeRoomsDb({}),
        postsDb
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
