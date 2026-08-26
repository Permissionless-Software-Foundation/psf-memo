import { assert } from 'chai'
import sinon from 'sinon'
import PostQuery from '../../../src/adapters/post-query.js'

describe('#PostQuery', () => {
  let uut
  let sandbox
  let postsDb
  let postParentsDb
  let postChildrenDb
  let postHeightsDb

  beforeEach(() => {
    sandbox = sinon.createSandbox()
    postsDb = {
      iterator: sandbox.stub(),
      get: sandbox.stub()
    }
    postParentsDb = {
      iterator: sandbox.stub()
    }
    postChildrenDb = {
      iterator: sandbox.stub()
    }
    postHeightsDb = {
      iterator: sandbox.stub()
    }

    async function * emptyParents () {}
    async function * emptyChildren () {}
    async function * emptyHeights () {}
    postParentsDb.iterator.returns(emptyParents())
    postChildrenDb.iterator.returns(emptyChildren())
    postHeightsDb.iterator.returns(emptyHeights())

    uut = new PostQuery({ postsDb, postParentsDb, postChildrenDb, postHeightsDb })
  })

  afterEach(() => sandbox.restore())

  it('should throw when postHeightsDb is missing', () => {
    try {
      // eslint-disable-next-line no-new
      new PostQuery({ postsDb, postParentsDb, postChildrenDb })
      assert.fail('Expected error')
    } catch (err) {
      assert.include(err.message, 'postHeightsDb required')
    }
  })

  describe('#txidFromPostHeight', () => {
    it('should return the txid from the value when present', () => {
      assert.equal(uut.txidFromPostHeight('any-key', { txid: 'abc123' }), 'abc123')
    })

    it('should parse the txid from the key when value is absent', () => {
      assert.equal(uut.txidFromPostHeight('000000600200:post-200-a', null), 'post-200-a')
      assert.equal(uut.txidFromPostHeight('000000600200:post-200-a', undefined), 'post-200-a')
    })
  })

  describe('#topLevelPostTxids', () => {
    it('should iterate top-level txids in forward postHeights order by default', async () => {
      async function * mockHeights () {
        yield ['000000600100:post-100', { txid: 'post-100' }]
        yield ['000000600200:post-200-a', { txid: 'post-200-a' }]
      }
      postHeightsDb.iterator.withArgs({ reverse: false }).returns(mockHeights())

      const txids = []
      for await (const txid of uut.topLevelPostTxids()) txids.push(txid)

      assert.deepEqual(txids, ['post-100', 'post-200-a'])
    })
  })

  describe('#scanRecentPostTxids', () => {
    it('should return top-level post txids sorted by block height descending', async () => {
      async function * mockHeights () {
        yield ['000000600200:post-200-b', { txid: 'post-200-b' }]
        yield ['000000600200:post-200-a', { txid: 'post-200-a' }]
        yield ['000000600100:post-100', { txid: 'post-100' }]
      }
      postHeightsDb.iterator.withArgs({ reverse: true }).returns(mockHeights())

      const result = await uut.scanRecentPostTxids({ limit: 2, offset: 0 })

      assert.deepEqual(result, ['post-200-b', 'post-200-a'])
    })

    it('should skip replies when selecting recent posts', async () => {
      async function * mockParents () {
        yield ['reply-1', { parentTxid: 'post-200-a', childTxid: 'reply-1', blockHeight: 600150 }]
      }
      async function * mockHeights () {
        yield ['000000600200:post-200-b', { txid: 'post-200-b' }]
        yield ['000000600200:post-200-a', { txid: 'post-200-a' }]
        yield ['000000600150:reply-1', { txid: 'reply-1' }]
        yield ['000000600100:post-100', { txid: 'post-100' }]
      }
      postParentsDb.iterator.returns(mockParents())
      postHeightsDb.iterator.withArgs({ reverse: true }).returns(mockHeights())

      const result = await uut.scanRecentPostTxids({ limit: 2, offset: 0 })

      assert.deepEqual(result, ['post-200-b', 'post-200-a'])
    })

    it('should apply offset after skipping replies', async () => {
      async function * mockHeights () {
        yield ['000000600200:post-200-b', { txid: 'post-200-b' }]
        yield ['000000600200:post-200-a', { txid: 'post-200-a' }]
        yield ['000000600100:post-100', { txid: 'post-100' }]
      }
      postHeightsDb.iterator.withArgs({ reverse: true }).returns(mockHeights())

      const result = await uut.scanRecentPostTxids({ limit: 2, offset: 1 })

      assert.deepEqual(result, ['post-200-a', 'post-100'])
    })

    it('should stop reading after collecting limit top-level posts', async () => {
      async function * mockHeights () {
        yield ['000000600200:post-200-b', { txid: 'post-200-b' }]
        yield ['000000600200:post-200-a', { txid: 'post-200-a' }]
        yield ['000000600100:post-100', { txid: 'post-100' }]
      }
      postHeightsDb.iterator.withArgs({ reverse: true }).returns(mockHeights())

      await uut.scanRecentPostTxids({ limit: 2, offset: 0 })

      assert.isTrue(postHeightsDb.iterator.calledOnce)
    })
  })

  describe('#scanPostsByAddrTxids', () => {
    it('should return txids for the address sorted by block height descending', async () => {
      async function * mockHeights () {
        yield ['000000600200:post-200-b', { txid: 'post-200-b' }]
        yield ['000000600200:post-200-a', { txid: 'post-200-a' }]
        yield ['000000600100:post-100', { txid: 'post-100' }]
      }
      postHeightsDb.iterator.withArgs({ reverse: true }).returns(mockHeights())
      postsDb.get.callsFake(async (txid) => {
        const posts = {
          'post-200-b': { addr: 'addr-b', text: 'b', seen: 200, blockHeight: 600200 },
          'post-200-a': { addr: 'addr-a', text: 'a', seen: 100, blockHeight: 600200 },
          'post-100': { addr: 'addr-a', text: 'c', seen: 50, blockHeight: 600100 }
        }
        return posts[txid]
      })

      const result = await uut.scanPostsByAddrTxids('addr-a', { limit: 2, offset: 0 })

      assert.deepEqual(result, ['post-200-a', 'post-100'])
    })

    it('should apply offset and limit for the address', async () => {
      async function * mockHeights () {
        yield ['000000600200:post-200-b', { txid: 'post-200-b' }]
        yield ['000000600200:post-200-a', { txid: 'post-200-a' }]
        yield ['000000600100:post-100', { txid: 'post-100' }]
      }
      postHeightsDb.iterator.withArgs({ reverse: true }).returns(mockHeights())
      postsDb.get.callsFake(async (txid) => {
        const posts = {
          'post-200-b': { addr: 'addr-b', text: 'b', seen: 200, blockHeight: 600200 },
          'post-200-a': { addr: 'addr-a', text: 'a', seen: 100, blockHeight: 600200 },
          'post-100': { addr: 'addr-a', text: 'c', seen: 50, blockHeight: 600100 }
        }
        return posts[txid]
      })

      const result = await uut.scanPostsByAddrTxids('addr-a', { limit: 1, offset: 1 })

      assert.deepEqual(result, ['post-100'])
    })

    it('should stop at limit even when more matching posts remain', async () => {
      async function * mockHeights () {
        yield ['000000600300:post-300', { txid: 'post-300' }]
        yield ['000000600200:post-200', { txid: 'post-200' }]
        yield ['000000600100:post-100', { txid: 'post-100' }]
      }
      postHeightsDb.iterator.withArgs({ reverse: true }).returns(mockHeights())
      postsDb.get.callsFake(async (txid) => ({ addr: 'addr-a', text: 'x', seen: 1, blockHeight: 1 }))

      const result = await uut.scanPostsByAddrTxids('addr-a', { limit: 2, offset: 0 })

      assert.deepEqual(result, ['post-300', 'post-200'])
    })
  })

  describe('#loadPostsByTxids', () => {
    it('should load posts by txid', async () => {
      postsDb.get.withArgs('tx1').resolves({ addr: 'a1', text: 'hello', seen: 1000, blockHeight: 600100 })
      postsDb.get.withArgs('tx2').resolves({ addr: 'a2', text: 'world', seen: 2000, blockHeight: 600200 })

      const result = await uut.loadPostsByTxids(['tx1', 'tx2'])

      assert.equal(result.length, 2)
      assert.equal(result[0].txid, 'tx1')
      assert.equal(result[0].blockHeight, 600100)
      assert.equal(result[1].txid, 'tx2')
    })

    it('should skip missing posts', async () => {
      const err = new Error('not found')
      err.notFound = true
      postsDb.get.withArgs('tx1').rejects(err)
      postsDb.get.withArgs('tx2').resolves({ addr: 'a2', text: 'world', seen: 2000, blockHeight: 600200 })

      const result = await uut.loadPostsByTxids(['tx1', 'tx2'])

      assert.equal(result.length, 1)
      assert.equal(result[0].txid, 'tx2')
    })

    it('should default blockHeight to 0 when a post has no blockHeight', async () => {
      postsDb.get.withArgs('tx1').resolves({ addr: 'a1', text: 'hello', seen: 1000 })

      const result = await uut.loadPostsByTxids(['tx1'])

      assert.equal(result[0].blockHeight, 0)
    })
  })

  describe('#countTopLevelPosts', () => {
    it('should count top-level posts excluding replies', async () => {
      async function * mockParents () {
        yield ['reply-1', { parentTxid: 'post-200-a', childTxid: 'reply-1', blockHeight: 600150 }]
      }
      async function * mockHeights () {
        yield ['000000600200:post-200-b', { txid: 'post-200-b' }]
        yield ['000000600200:post-200-a', { txid: 'post-200-a' }]
        yield ['000000600150:reply-1', { txid: 'reply-1' }]
        yield ['000000600100:post-100', { txid: 'post-100' }]
      }
      postParentsDb.iterator.returns(mockParents())
      postHeightsDb.iterator.returns(mockHeights())

      const result = await uut.countTopLevelPosts()

      assert.equal(result, 3)
    })
  })

  describe('#countTopLevelPostsByAddr', () => {
    it('should count top-level posts for an address', async () => {
      async function * mockHeights () {
        yield ['000000600200:post-200-b', { txid: 'post-200-b' }]
        yield ['000000600200:post-200-a', { txid: 'post-200-a' }]
        yield ['000000600100:post-100', { txid: 'post-100' }]
      }
      postHeightsDb.iterator.returns(mockHeights())
      postsDb.get.callsFake(async (txid) => {
        const posts = {
          'post-200-b': { addr: 'addr-b', text: 'b', seen: 200, blockHeight: 600200 },
          'post-200-a': { addr: 'addr-a', text: 'a', seen: 100, blockHeight: 600200 },
          'post-100': { addr: 'addr-a', text: 'c', seen: 50, blockHeight: 600100 }
        }
        return posts[txid]
      })

      const result = await uut.countTopLevelPostsByAddr('addr-a')

      assert.equal(result, 2)
    })
  })

  describe('#buildReplyCountMap', () => {
    it('should count replies per parent from postChildren', async () => {
      async function * mockChildren () {
        yield ['tx1:reply-a', { parentTxid: 'tx1', childTxid: 'reply-a', blockHeight: 600150 }]
        yield ['tx1:reply-b', { parentTxid: 'tx1', childTxid: 'reply-b', blockHeight: 600160 }]
        yield ['tx2:reply-c', { parentTxid: 'tx2', childTxid: 'reply-c', blockHeight: 600170 }]
      }
      postChildrenDb.iterator.returns(mockChildren())

      const result = await uut.buildReplyCountMap()

      assert.equal(result.get('tx1'), 2)
      assert.equal(result.get('tx2'), 1)
    })
  })
})
