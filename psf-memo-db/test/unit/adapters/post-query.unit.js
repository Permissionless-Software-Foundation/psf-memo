import { assert } from 'chai'
import sinon from 'sinon'
import PostQuery from '../../../src/adapters/post-query.js'

describe('#PostQuery', () => {
  let uut
  let sandbox
  let postsDb
  let postHeightsDb
  let addrPostHeightsDb
  let postParentsDb
  let postChildrenDb
  let likesDb
  let postLikesDb

  beforeEach(() => {
    sandbox = sinon.createSandbox()
    postsDb = {
      iterator: sandbox.stub(),
      get: sandbox.stub()
    }
    postHeightsDb = {
      iterator: sandbox.stub()
    }
    addrPostHeightsDb = {
      iterator: sandbox.stub()
    }
    postParentsDb = {
      iterator: sandbox.stub(),
      get: sandbox.stub()
    }
    postChildrenDb = {
      iterator: sandbox.stub()
    }
    likesDb = {
      iterator: sandbox.stub()
    }
    postLikesDb = {
      iterator: sandbox.stub()
    }

    async function * empty () {}
    postHeightsDb.iterator.returns(empty())
    addrPostHeightsDb.iterator.returns(empty())
    postParentsDb.iterator.returns(empty())
    postChildrenDb.iterator.returns(empty())
    likesDb.iterator.returns(empty())
    postLikesDb.iterator.returns(empty())

    const notFoundErr = new Error('not found')
    notFoundErr.notFound = true
    postParentsDb.get.rejects(notFoundErr)

    uut = new PostQuery({
      postsDb,
      postHeightsDb,
      addrPostHeightsDb,
      postParentsDb,
      postChildrenDb,
      likesDb,
      postLikesDb
    })
  })

  afterEach(() => sandbox.restore())

  it('should throw when postHeightsDb is missing', () => {
    try {
      // eslint-disable-next-line no-new
      new PostQuery({ postsDb, postParentsDb, postChildrenDb, likesDb, postLikesDb })
      assert.fail('Expected error')
    } catch (err) {
      assert.include(err.message, 'postHeightsDb required')
    }
  })

  it('should throw when addrPostHeightsDb is missing', () => {
    try {
      // eslint-disable-next-line no-new
      new PostQuery({ postsDb, postHeightsDb, postParentsDb, postChildrenDb, likesDb, postLikesDb })
      assert.fail('Expected error')
    } catch (err) {
      assert.include(err.message, 'addrPostHeightsDb required')
    }
  })

  it('should throw when postLikesDb is missing', () => {
    try {
      // eslint-disable-next-line no-new
      new PostQuery({ postsDb, postHeightsDb, addrPostHeightsDb, postParentsDb, postChildrenDb, likesDb })
      assert.fail('Expected error')
    } catch (err) {
      assert.include(err.message, 'postLikesDb required')
    }
  })

  it('should throw when postsDb is missing', () => {
    try {
      // eslint-disable-next-line no-new
      new PostQuery({ postHeightsDb, addrPostHeightsDb, postParentsDb, postChildrenDb, likesDb, postLikesDb })
      assert.fail('Expected error')
    } catch (err) {
      assert.include(err.message, 'postsDb required')
    }
  })

  it('should throw when postParentsDb is missing', () => {
    try {
      // eslint-disable-next-line no-new
      new PostQuery({ postsDb, postHeightsDb, addrPostHeightsDb, postChildrenDb, likesDb, postLikesDb })
      assert.fail('Expected error')
    } catch (err) {
      assert.include(err.message, 'postParentsDb required')
    }
  })

  it('should throw when postChildrenDb is missing', () => {
    try {
      // eslint-disable-next-line no-new
      new PostQuery({ postsDb, postHeightsDb, addrPostHeightsDb, postParentsDb, likesDb, postLikesDb })
      assert.fail('Expected error')
    } catch (err) {
      assert.include(err.message, 'postChildrenDb required')
    }
  })

  it('should throw when likesDb is missing', () => {
    try {
      // eslint-disable-next-line no-new
      new PostQuery({ postsDb, postHeightsDb, addrPostHeightsDb, postParentsDb, postChildrenDb, postLikesDb })
      assert.fail('Expected error')
    } catch (err) {
      assert.include(err.message, 'likesDb required')
    }
  })

  describe('#static key helpers', () => {
    it('should pad block heights to a fixed width for lexicographic ordering', () => {
      assert.equal(PostQuery.padHeight(600200), '000000600200')
      assert.equal(PostQuery.padHeight(1), '000000000001')
    })

    it('should compose postHeight, addrPostHeight, and postLike keys', () => {
      assert.equal(PostQuery.postHeightKey(600200, 'post-a'), '000000600200:post-a')
      assert.equal(PostQuery.addrPostHeightKey('bitcoincash:addr', 600200, 'post-a'), 'bitcoincash:addr:000000600200:post-a')
      assert.equal(PostQuery.postLikeKey('post-a', 'like-1'), 'post-a:like-1')
    })
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
      postParentsDb.get.withArgs('reply-1').resolves({ parentTxid: 'post-200-a', childTxid: 'reply-1', blockHeight: 600150 })
      async function * mockHeights () {
        yield ['000000600200:post-200-b', { txid: 'post-200-b' }]
        yield ['000000600200:post-200-a', { txid: 'post-200-a' }]
        yield ['000000600150:reply-1', { txid: 'reply-1' }]
        yield ['000000600100:post-100', { txid: 'post-100' }]
      }
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

  describe('#scanRecentPostTxidsAndCount', () => {
    it('should report the exact total when the index is smaller than the default cap', async () => {
      async function * mockHeights () {
        for (let i = 20; i >= 0; i--) {
          const id = String(i).padStart(3, '0')
          yield [`000000${600000 + i}:post-${id}`, { txid: `post-${id}` }]
        }
      }
      postHeightsDb.iterator.withArgs({ reverse: true }).returns(mockHeights())

      const result = await uut.scanRecentPostTxidsAndCount({ limit: 3, offset: 0 })

      assert.deepEqual(result.txids, ['post-020', 'post-019', 'post-018'])
      assert.equal(result.total, 21)
    })

    it('should default the total scan cap to 500', async () => {
      let reads = 0
      async function * mockHeights () {
        for (let i = 599; i >= 0; i--) {
          reads++
          const id = String(i).padStart(3, '0')
          yield [`000000${600000 + i}:post-${id}`, { txid: `post-${id}` }]
        }
      }
      postHeightsDb.iterator.withArgs({ reverse: true }).returns(mockHeights())

      const result = await uut.scanRecentPostTxidsAndCount({ limit: 3, offset: 0 })

      assert.equal(result.total, 500)
      assert.equal(reads, 503) // offset + limit + default cap
    })

    it('should cap the raw postHeights scan to limit + offset + cap', async () => {
      async function * mockHeights () {
        for (let i = 20; i >= 0; i--) {
          const id = String(i).padStart(3, '0')
          yield [`000000${600000 + i}:post-${id}`, { txid: `post-${id}` }]
        }
      }
      postHeightsDb.iterator.withArgs({ reverse: true }).returns(mockHeights())

      const result = await uut.scanRecentPostTxidsAndCount({ limit: 5, offset: 0, totalScanCap: 10 })

      assert.deepEqual(result.txids.length, 5)
      assert.equal(result.total, 10)
    })

    it('should stop the raw scan at exactly offset + limit + cap entries', async () => {
      let reads = 0
      async function * mockHeights () {
        for (let i = 20; i >= 0; i--) {
          reads++
          const id = String(i).padStart(3, '0')
          yield [`000000${600000 + i}:post-${id}`, { txid: `post-${id}` }]
        }
      }
      postHeightsDb.iterator.withArgs({ reverse: true }).returns(mockHeights())

      await uut.scanRecentPostTxidsAndCount({ limit: 3, offset: 0, totalScanCap: 10 })

      assert.equal(reads, 13) // offset + limit + cap
    })

    it('should return actual total when the index exhausts before the cap', async () => {
      async function * mockHeights () {
        yield ['000000600200:post-200-b', { txid: 'post-200-b' }]
        yield ['000000600200:post-200-a', { txid: 'post-200-a' }]
        yield ['000000600100:post-100', { txid: 'post-100' }]
      }
      postHeightsDb.iterator.withArgs({ reverse: true }).returns(mockHeights())

      const result = await uut.scanRecentPostTxidsAndCount({ limit: 10, offset: 0, totalScanCap: 10 })

      assert.deepEqual(result.txids, ['post-200-b', 'post-200-a', 'post-100'])
      assert.equal(result.total, 3)
    })

    it('should skip replies when counting and selecting recent posts', async () => {
      postParentsDb.get.withArgs('reply-1').resolves({ parentTxid: 'post-200-a', childTxid: 'reply-1', blockHeight: 600150 })
      async function * mockHeights () {
        yield ['000000600200:post-200-b', { txid: 'post-200-b' }]
        yield ['000000600200:post-200-a', { txid: 'post-200-a' }]
        yield ['000000600150:reply-1', { txid: 'reply-1' }]
        yield ['000000600100:post-100', { txid: 'post-100' }]
      }
      postHeightsDb.iterator.withArgs({ reverse: true }).returns(mockHeights())

      const result = await uut.scanRecentPostTxidsAndCount({ limit: 2, offset: 0, totalScanCap: 10 })

      assert.deepEqual(result.txids, ['post-200-b', 'post-200-a'])
      assert.equal(result.total, 3)
    })
  })

  describe('#scanPostsByAddrTxids', () => {
    beforeEach(() => {
      const err = new Error('not found')
      err.notFound = true
      postParentsDb.get.rejects(err)
    })

    it('should return txids for the address sorted by block height descending', async () => {
      async function * mockAddrHeights () {
        yield ['bitcoincash:qaddr-a:000000600200:post-200-a', { txid: 'post-200-a' }]
        yield ['bitcoincash:qaddr-a:000000600100:post-100', { txid: 'post-100' }]
      }
      addrPostHeightsDb.iterator
        .withArgs({ gte: 'bitcoincash:qaddr-a:', lte: 'bitcoincash:qaddr-a:\uffff', reverse: true })
        .returns(mockAddrHeights())

      const result = await uut.scanPostsByAddrTxids('bitcoincash:qaddr-a', { limit: 2, offset: 0 })

      assert.deepEqual(result, ['post-200-a', 'post-100'])
    })

    it('should skip replies when selecting posts by address', async () => {
      async function * mockAddrHeights () {
        yield ['bitcoincash:qaddr-a:000000600200:post-200-a', { txid: 'post-200-a' }]
        yield ['bitcoincash:qaddr-a:000000600100:post-100', { txid: 'post-100' }]
        yield ['bitcoincash:qaddr-a:000000600050:reply-1', { txid: 'reply-1' }]
      }
      postParentsDb.get.callsFake(async (txid) => {
        if (txid === 'reply-1') return { parentTxid: 'post-200-a', childTxid: 'reply-1', blockHeight: 600050 }
        const err = new Error('not found')
        err.notFound = true
        throw err
      })
      addrPostHeightsDb.iterator
        .withArgs({ gte: 'bitcoincash:qaddr-a:', lte: 'bitcoincash:qaddr-a:\uffff', reverse: true })
        .returns(mockAddrHeights())

      const result = await uut.scanPostsByAddrTxids('bitcoincash:qaddr-a', { limit: 2, offset: 0 })

      assert.deepEqual(result, ['post-200-a', 'post-100'])
    })

    it('should apply offset and limit for the address', async () => {
      async function * mockAddrHeights () {
        yield ['bitcoincash:qaddr-a:000000600200:post-200-a', { txid: 'post-200-a' }]
        yield ['bitcoincash:qaddr-a:000000600100:post-100', { txid: 'post-100' }]
      }
      addrPostHeightsDb.iterator
        .withArgs({ gte: 'bitcoincash:qaddr-a:', lte: 'bitcoincash:qaddr-a:\uffff', reverse: true })
        .returns(mockAddrHeights())

      const result = await uut.scanPostsByAddrTxids('bitcoincash:qaddr-a', { limit: 1, offset: 1 })

      assert.deepEqual(result, ['post-100'])
    })
  })

  describe('#scanPostsByAddrTxidsAndCount', () => {
    it('should return the total top-level post count for the address', async () => {
      async function * mockAddrHeights () {
        yield ['bitcoincash:qaddr-a:000000600200:post-200-a', { txid: 'post-200-a' }]
        yield ['bitcoincash:qaddr-a:000000600100:post-100', { txid: 'post-100' }]
      }
      const err = new Error('not found')
      err.notFound = true
      postParentsDb.get.rejects(err)
      addrPostHeightsDb.iterator
        .withArgs({ gte: 'bitcoincash:qaddr-a:', lte: 'bitcoincash:qaddr-a:\uffff', reverse: true })
        .returns(mockAddrHeights())

      const result = await uut.scanPostsByAddrTxidsAndCount('bitcoincash:qaddr-a', { limit: 2, offset: 0 })

      assert.equal(result.total, 2)
    })

    it('should not push txids beyond the limit even when more posts remain', async () => {
      async function * mockAddrHeights () {
        yield ['bitcoincash:qaddr-a:000000600300:post-300-a', { txid: 'post-300-a' }]
        yield ['bitcoincash:qaddr-a:000000600200:post-200-a', { txid: 'post-200-a' }]
        yield ['bitcoincash:qaddr-a:000000600100:post-100', { txid: 'post-100' }]
      }
      const err = new Error('not found')
      err.notFound = true
      postParentsDb.get.rejects(err)
      addrPostHeightsDb.iterator
        .withArgs({ gte: 'bitcoincash:qaddr-a:', lte: 'bitcoincash:qaddr-a:\uffff', reverse: true })
        .returns(mockAddrHeights())

      const result = await uut.scanPostsByAddrTxidsAndCount('bitcoincash:qaddr-a', { limit: 1, offset: 0 })

      assert.deepEqual(result.txids, ['post-300-a'])
      assert.equal(result.total, 3)
    })
  })

  describe('#scanFollowingFeedTxidsAndCount', () => {
    const viewerAddr = 'bitcoincash:viewer'
    const followeeA = 'bitcoincash:followee-a'
    const followeeB = 'bitcoincash:followee-b'

    it('should return posts only from followed addresses excluding the viewer', async () => {
      async function * mockHeights () {
        yield ['000000600300:post-a', { txid: 'post-a' }]
        yield ['000000600250:post-viewer', { txid: 'post-viewer' }]
        yield ['000000600200:post-b', { txid: 'post-b' }]
        yield ['000000600100:post-other', { txid: 'post-other' }]
      }
      postHeightsDb.iterator.withArgs({ reverse: true }).returns(mockHeights())
      postsDb.get.callsFake(async (txid) => {
        const map = {
          'post-a': { addr: followeeA, text: 'a' },
          'post-viewer': { addr: viewerAddr, text: 'mine' },
          'post-b': { addr: followeeB, text: 'b' },
          'post-other': { addr: 'bitcoincash:other', text: 'other' }
        }
        return map[txid]
      })

      const result = await uut.scanFollowingFeedTxidsAndCount(
        viewerAddr,
        [followeeA, followeeB],
        { limit: 10, offset: 0 }
      )

      assert.deepEqual(result.txids, ['post-a', 'post-b'])
      assert.equal(result.total, 2)
    })

    it('should exclude replies using point lookups without iterating postParents', async () => {
      async function * mockHeights () {
        yield ['000000600300:reply-a', { txid: 'reply-a' }]
        yield ['000000600200:post-a', { txid: 'post-a' }]
      }
      postHeightsDb.iterator.withArgs({ reverse: true }).returns(mockHeights())
      postParentsDb.get.callsFake(async (txid) => {
        if (txid === 'reply-a') return { parentTxid: 'post-a', childTxid: 'reply-a' }
        const err = new Error('not found')
        err.notFound = true
        throw err
      })
      postsDb.get.callsFake(async (txid) => {
        return { addr: followeeA, text: txid }
      })

      const result = await uut.scanFollowingFeedTxidsAndCount(
        viewerAddr,
        [followeeA],
        { limit: 10, offset: 0 }
      )

      assert.deepEqual(result.txids, ['post-a'])
      assert.equal(result.total, 1)
      assert.equal(postParentsDb.iterator.called, false)
    })

    it('should cap the total at 500 and stop scanning after offset + limit + cap eligible posts', async () => {
      let reads = 0
      async function * mockHeights () {
        for (let i = 599; i >= 0; i--) {
          reads++
          const id = String(i).padStart(3, '0')
          yield [`000000${600000 + i}:post-${id}`, { txid: `post-${id}` }]
        }
      }
      postHeightsDb.iterator.withArgs({ reverse: true }).returns(mockHeights())
      postsDb.get.callsFake(async (txid) => ({ addr: followeeA, text: txid }))

      const result = await uut.scanFollowingFeedTxidsAndCount(
        viewerAddr,
        [followeeA],
        { limit: 3, offset: 0 }
      )

      assert.deepEqual(result.txids, ['post-599', 'post-598', 'post-597'])
      assert.equal(result.total, 500)
      assert.equal(reads, 503) // offset + limit + default cap eligible posts
    })

    it('should report the exact total when eligible posts are below the cap', async () => {
      async function * mockHeights () {
        yield ['000000600200:post-a', { txid: 'post-a' }]
        yield ['000000600100:post-b', { txid: 'post-b' }]
      }
      postHeightsDb.iterator.withArgs({ reverse: true }).returns(mockHeights())
      postsDb.get.callsFake(async (txid) => ({ addr: followeeA, text: txid }))

      const result = await uut.scanFollowingFeedTxidsAndCount(
        viewerAddr,
        [followeeA],
        { limit: 10, offset: 0 }
      )

      assert.deepEqual(result.txids, ['post-a', 'post-b'])
      assert.equal(result.total, 2)
    })

    it('should count only eligible followed posts toward the scan cap', async () => {
      let reads = 0
      async function * mockHeights () {
        // Interleave eligible followed posts with non-followed top-level posts.
        for (let i = 1199; i >= 0; i--) {
          reads++
          const txid = i % 2 === 0 ? `followed-${i}` : `other-${i}`
          yield [`000000${600000 + i}:${txid}`, { txid }]
        }
      }
      postHeightsDb.iterator.withArgs({ reverse: true }).returns(mockHeights())
      postsDb.get.callsFake(async (txid) => ({
        addr: txid.startsWith('followed') ? followeeA : 'bitcoincash:other',
        text: txid
      }))

      const result = await uut.scanFollowingFeedTxidsAndCount(
        viewerAddr,
        [followeeA],
        { limit: 3, offset: 0 }
      )

      assert.deepEqual(result.txids, ['followed-1198', 'followed-1196', 'followed-1194'])
      assert.equal(result.total, 500)
      // Non-eligible raw entries do not count toward the cap, so the scan keeps
      // going past 503 raw entries until it has seen 503 eligible posts.
      assert.isAbove(reads, 503)
    })

    it('should apply limit and offset', async () => {
      async function * mockHeights () {
        yield ['000000600400:post-a', { txid: 'post-a' }]
        yield ['000000600300:post-b', { txid: 'post-b' }]
        yield ['000000600200:post-c', { txid: 'post-c' }]
      }
      postHeightsDb.iterator.withArgs({ reverse: true }).returns(mockHeights())
      postsDb.get.callsFake(async (txid) => {
        return { addr: followeeA, text: txid }
      })

      const result = await uut.scanFollowingFeedTxidsAndCount(
        viewerAddr,
        [followeeA],
        { limit: 1, offset: 1 }
      )

      assert.deepEqual(result.txids, ['post-b'])
      assert.equal(result.total, 3)
    })

    it('should skip missing posts', async () => {
      async function * mockHeights () {
        yield ['000000600200:post-a', { txid: 'post-a' }]
        yield ['000000600100:missing', { txid: 'missing' }]
      }
      postHeightsDb.iterator.withArgs({ reverse: true }).returns(mockHeights())
      postsDb.get.callsFake(async (txid) => {
        if (txid === 'missing') {
          const err = new Error('not found')
          err.notFound = true
          throw err
        }
        return { addr: followeeA, text: txid }
      })

      const result = await uut.scanFollowingFeedTxidsAndCount(
        viewerAddr,
        [followeeA],
        { limit: 10, offset: 0 }
      )

      assert.deepEqual(result.txids, ['post-a'])
      assert.equal(result.total, 1)
    })
  })

  describe('#isReply', () => {
    it('should return true when the txid has a parent post', async () => {
      postParentsDb.get.withArgs('reply-1').resolves({ parentTxid: 'parent-1' })
      assert.equal(await uut.isReply('reply-1'), true)
    })

    it('should return false when the txid is not a reply (not found)', async () => {
      const err = new Error('not found')
      err.notFound = true
      postParentsDb.get.withArgs('post-1').rejects(err)
      assert.equal(await uut.isReply('post-1'), false)
    })

    it('should return false when the txid is not a reply (LEVEL_NOT_FOUND)', async () => {
      const err = new Error('missing')
      err.code = 'LEVEL_NOT_FOUND'
      postParentsDb.get.withArgs('post-1').rejects(err)
      assert.equal(await uut.isReply('post-1'), false)
    })

    it('should rethrow errors that are not not-found', async () => {
      postParentsDb.get.withArgs('post-1').rejects(new Error('leveldb is locked'))
      try {
        await uut.isReply('post-1')
        assert.fail('Expected error')
      } catch (err) {
        assert.include(err.message, 'leveldb is locked')
      }
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

  describe('#countRepliesForTxids', () => {
    it('should count replies per txid from postChildren', async () => {
      async function * mockChildrenTx1 () {
        yield ['tx1:reply-a', { parentTxid: 'tx1', childTxid: 'reply-a', blockHeight: 600150 }]
        yield ['tx1:reply-b', { parentTxid: 'tx1', childTxid: 'reply-b', blockHeight: 600160 }]
      }
      async function * mockChildrenTx2 () {
        yield ['tx2:reply-c', { parentTxid: 'tx2', childTxid: 'reply-c', blockHeight: 600170 }]
      }
      postChildrenDb.iterator
        .withArgs(sinon.match({ gte: 'tx1:', lte: 'tx1:\uffff' }))
        .returns(mockChildrenTx1())
      postChildrenDb.iterator
        .withArgs(sinon.match({ gte: 'tx2:', lte: 'tx2:\uffff' }))
        .returns(mockChildrenTx2())

      const result = await uut.countRepliesForTxids(['tx1', 'tx2'])

      assert.equal(result.get('tx1'), 2)
      assert.equal(result.get('tx2'), 1)
    })
  })

  describe('#listChildTxids', () => {
    it('should prefix-scan postChildren for the parent and return its child txids', async () => {
      async function * mockChildren () {
        yield ['tx1:reply-a', { parentTxid: 'tx1', childTxid: 'reply-a' }]
        yield ['tx1:reply-b', { parentTxid: 'tx1', childTxid: 'reply-b' }]
      }
      postChildrenDb.iterator
        .withArgs(sinon.match({ gte: 'tx1:', lte: 'tx1:\uffff' }))
        .returns(mockChildren())

      const result = await uut.listChildTxids('tx1')

      assert.deepEqual(result, ['reply-a', 'reply-b'])
      assert.isTrue(postChildrenDb.iterator.calledWith({ gte: 'tx1:', lte: 'tx1:\uffff' }))
    })

    it('should skip entries whose parentTxid does not match the requested parent', async () => {
      async function * mockChildren () {
        // A parent txid that is a string prefix of tx1 can land in the range.
        yield ['tx1:reply-a', { parentTxid: 'tx1x', childTxid: 'reply-a' }]
        yield ['tx1:reply-b', { parentTxid: 'tx1', childTxid: 'reply-b' }]
      }
      postChildrenDb.iterator
        .withArgs(sinon.match({ gte: 'tx1:', lte: 'tx1:\uffff' }))
        .returns(mockChildren())

      const result = await uut.listChildTxids('tx1')

      assert.deepEqual(result, ['reply-b'])
    })

    it('should skip entries with no child txid', async () => {
      async function * mockChildren () {
        yield ['tx1:reply-a', { parentTxid: 'tx1' }]
        yield ['tx1:reply-b', { parentTxid: 'tx1', childTxid: 'reply-b' }]
      }
      postChildrenDb.iterator
        .withArgs(sinon.match({ gte: 'tx1:', lte: 'tx1:\uffff' }))
        .returns(mockChildren())

      const result = await uut.listChildTxids('tx1')

      assert.deepEqual(result, ['reply-b'])
    })

    it('should return an empty list when the parent has no children', async () => {
      const result = await uut.listChildTxids('tx1')

      assert.deepEqual(result, [])
    })
  })

  describe('#likeTxidFromPostLike', () => {
    it('should return the likeTxid from the value when present', () => {
      assert.equal(uut.likeTxidFromPostLike('tx1:like-a', { likeTxid: 'like-a' }), 'like-a')
    })

    it('should fall back to the txid field in the value', () => {
      assert.equal(uut.likeTxidFromPostLike('tx1:like-a', { txid: 'like-a' }), 'like-a')
    })

    it('should parse the like txid from the key when the value is absent', () => {
      assert.equal(uut.likeTxidFromPostLike('tx1:like-a', null), 'like-a')
      assert.equal(uut.likeTxidFromPostLike('tx1:like-a', {}), 'like-a')
    })
  })

  describe('#getPostOrNull', () => {
    it('should return the post when present', async () => {
      postsDb.get.withArgs('tx1').resolves({ addr: 'a1', text: 'hello' })
      const post = await uut.getPostOrNull('tx1')
      assert.equal(post.text, 'hello')
    })

    it('should return null when the post is not found', async () => {
      const err = new Error('not found')
      err.notFound = true
      postsDb.get.withArgs('tx1').rejects(err)
      assert.equal(await uut.getPostOrNull('tx1'), null)
    })

    it('should rethrow errors that are not not-found', async () => {
      postsDb.get.withArgs('tx1').rejects(new Error('leveldb is locked'))
      try {
        await uut.getPostOrNull('tx1')
        assert.fail('Expected error')
      } catch (err) {
        assert.include(err.message, 'leveldb is locked')
      }
    })
  })

  describe('#countLikesForTxids', () => {
    it('should count likes per txid from postLikes', async () => {
      async function * mockPostLikesTx1 () {
        yield ['tx1:like-a', { postTxid: 'tx1', txid: 'like-a' }]
        yield ['tx1:like-b', { postTxid: 'tx1', txid: 'like-b' }]
      }
      async function * mockPostLikesTx2 () {
        yield ['tx2:like-c', { postTxid: 'tx2', txid: 'like-c' }]
      }
      postLikesDb.iterator
        .withArgs(sinon.match({ gte: 'tx1:', lte: 'tx1:\uffff' }))
        .returns(mockPostLikesTx1())
      postLikesDb.iterator
        .withArgs(sinon.match({ gte: 'tx2:', lte: 'tx2:\uffff' }))
        .returns(mockPostLikesTx2())

      const result = await uut.countLikesForTxids(['tx1', 'tx2'])

      assert.equal(result.get('tx1'), 2)
      assert.equal(result.get('tx2'), 1)
    })
  })

  describe('#postTxidFromPostLike', () => {
    it('should return the postTxid from the value when present', () => {
      assert.equal(uut.postTxidFromPostLike('tx1:like-a', { postTxid: 'tx1' }), 'tx1')
    })

    it('should parse the post txid from the key when the value is absent', () => {
      assert.equal(uut.postTxidFromPostLike('tx1:like-a'), 'tx1')
      assert.equal(uut.postTxidFromPostLike('tx1:like-a', {}), 'tx1')
    })
  })

  describe('#mute filtering', () => {
    it('should exclude posts from muted addresses in recent posts', async () => {
      async function * mockHeights () {
        yield ['000000600300:post-300-muted', { txid: 'post-300-muted' }]
        yield ['000000600200:post-200', { txid: 'post-200' }]
        yield ['000000600100:post-100-muted', { txid: 'post-100-muted' }]
      }
      postHeightsDb.iterator.withArgs({ reverse: true }).returns(mockHeights())
      postsDb.get.callsFake(async (txid) => {
        if (txid === 'post-300-muted') return { addr: 'muted-addr', text: 'x', seen: 1, blockHeight: 600300 }
        if (txid === 'post-200') return { addr: 'other-addr', text: 'x', seen: 2, blockHeight: 600200 }
        if (txid === 'post-100-muted') return { addr: 'muted-addr', text: 'x', seen: 3, blockHeight: 600100 }
        const err = new Error('not found')
        err.notFound = true
        throw err
      })

      const muteQuery = {
        listMuted: sandbox.stub().resolves(['muted-addr'])
      }
      uut = new PostQuery({
        postsDb,
        postHeightsDb,
        addrPostHeightsDb,
        postParentsDb,
        postChildrenDb,
        likesDb,
        postLikesDb,
        muteQuery
      })

      const result = await uut.scanRecentPostTxids({ limit: 2, offset: 0, viewerAddr: 'viewer-addr' })

      assert.deepEqual(result, ['post-200'])
      assert.isTrue(muteQuery.listMuted.calledOnceWith('viewer-addr'))
    })
  })
})
