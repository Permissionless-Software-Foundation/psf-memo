import { assert } from 'chai'
import sinon from 'sinon'
import ListRecentPosts from '../../../src/use-cases/list-recent-posts.js'

describe('#ListRecentPosts', () => {
  let uut
  let sandbox
  let postQuery

  const mockPosts = {
    'tx-a': { addr: 'addr-a', text: 'a', seen: 100, blockHeight: 600100 },
    'tx-b': { addr: 'addr-b', text: 'b', seen: 200, blockHeight: 600200 },
    'tx-c': { addr: 'addr-c', text: 'c', seen: 50, blockHeight: 600200 }
  }

  beforeEach(() => {
    sandbox = sinon.createSandbox()
    postQuery = {
      scanRecentPostTxidsAndCount: sandbox.stub().resolves({ txids: ['tx-b', 'tx-c', 'tx-a'], total: 3 }),
      loadPostsByTxids: sandbox.stub().callsFake(async (txids) => {
        return txids.map((txid) => ({ txid, ...mockPosts[txid] }))
      }),
      countRepliesForTxids: sandbox.stub().resolves(new Map([['tx-b', 1]])),
      countLikesForTxids: sandbox.stub().resolves(new Map([['tx-b', 3], ['tx-a', 5]]))
    }
    uut = new ListRecentPosts({
      adapters: { postQuery }
    })
  })

  afterEach(() => sandbox.restore())

  it('should return posts sorted by block height descending', async () => {
    const result = await uut.execute({ limit: 10, offset: 0 })

    assert.equal(result.posts.length, 3)
    assert.equal(result.posts[0].txid, 'tx-b')
    assert.equal(result.posts[1].txid, 'tx-c')
    assert.equal(result.posts[2].txid, 'tx-a')
    assert.equal(result.posts[0].replyCount, 1)
    assert.equal(result.posts[1].replyCount, 0)
    assert.equal(result.posts[0].likeCount, 3)
    assert.equal(result.posts[1].likeCount, 0)
    assert.equal(result.posts[2].likeCount, 5)
    assert.equal(result.pagination.total, 3)
    assert.equal(result.pagination.hasMore, false)
  })

  it('should paginate with limit and offset', async () => {
    postQuery.scanRecentPostTxidsAndCount.resolves({ txids: ['tx-c'], total: 3 })
    const result = await uut.execute({ limit: 1, offset: 1 })

    assert.equal(result.posts.length, 1)
    assert.equal(result.posts[0].txid, 'tx-c')
    assert.equal(result.pagination.limit, 1)
    assert.equal(result.pagination.offset, 1)
    assert.equal(result.pagination.hasMore, true)
  })

  it('should default limit to 100 and offset to 0', async () => {
    const result = await uut.execute({})

    assert.equal(result.pagination.limit, 100)
    assert.equal(result.pagination.offset, 0)
  })

  it('should reject limit over 100', async () => {
    try {
      await uut.execute({ limit: 101 })
      assert.fail('Expected error')
    } catch (err) {
      assert.equal(err.status, 400)
      assert.include(err.message, 'limit cannot exceed')
    }
  })

  it('should pass limit and offset to postQuery', async () => {
    await uut.execute({ limit: 5, offset: 10 })

    assert.equal(postQuery.scanRecentPostTxidsAndCount.calledOnce, true)
    assert.deepEqual(postQuery.scanRecentPostTxidsAndCount.firstCall.args[0], { limit: 5, offset: 10 })
  })
})
