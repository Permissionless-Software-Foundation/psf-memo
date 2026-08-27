import { assert } from 'chai'
import sinon from 'sinon'
import ListPostsByAddr from '../../../src/use-cases/list-posts-by-addr.js'

describe('#ListPostsByAddr', () => {
  let uut
  let sandbox
  let postQuery

  const mockPosts = {
    'tx-a': { addr: 'addr-a', text: 'a', seen: 100, blockHeight: 600100 },
    'tx-b': { addr: 'addr-b', text: 'b', seen: 200, blockHeight: 600200 },
    'tx-c': { addr: 'addr-a', text: 'c', seen: 50, blockHeight: 600200 }
  }

  beforeEach(() => {
    sandbox = sinon.createSandbox()
    postQuery = {
      scanPostsByAddrTxids: sandbox.stub().callsFake(async (addr, { limit, offset }) => {
        const all = Object.entries(mockPosts)
          .filter(([txid, post]) => post.addr === addr)
          .sort((a, b) => b[1].blockHeight - a[1].blockHeight)
          .map(([txid]) => txid)
        return all.slice(offset, offset + limit)
      }),
      loadPostsByTxids: sandbox.stub().callsFake(async (txids) => {
        return txids.map((txid) => ({ txid, ...mockPosts[txid] }))
      }),
      buildReplyCountMap: sandbox.stub().resolves(new Map()),
      buildLikeCountMap: sandbox.stub().resolves(new Map([['tx-c', 7]])),
      countTopLevelPostsByAddr: sandbox.stub().resolves(2)
    }
    uut = new ListPostsByAddr({
      adapters: { postQuery }
    })
  })

  afterEach(() => sandbox.restore())

  it('should return posts for an address sorted by block height descending', async () => {
    const result = await uut.execute({ addr: 'addr-a', limit: 10, offset: 0 })

    assert.equal(result.posts.length, 2)
    assert.equal(result.posts[0].txid, 'tx-c')
    assert.equal(result.posts[1].txid, 'tx-a')
    assert.equal(result.posts[0].likeCount, 7)
    assert.equal(result.posts[1].likeCount, 0)
    assert.equal(result.pagination.total, 2)
    // Page is exactly full (offset 0 + 2 returned == 2 total), so hasMore must be false.
    assert.equal(result.pagination.hasMore, false)
  })

  it('should report hasMore when a further page exists', async () => {
    // One page of one item still leaves one more page available.
    postQuery.scanPostsByAddrTxids.callsFake(async (addr, { limit, offset }) => {
      return Object.entries(mockPosts)
        .filter(([txid, post]) => post.addr === addr)
        .map(([txid]) => txid)
        .slice(offset, offset + limit)
    })
    const result = await uut.execute({ addr: 'addr-a', limit: 1, offset: 0 })

    assert.equal(result.posts.length, 1)
    assert.equal(result.pagination.hasMore, true)
  })

  it('should reject missing addr', async () => {
    try {
      await uut.execute({ limit: 10 })
      assert.fail('Expected error')
    } catch (err) {
      assert.equal(err.status, 400)
      assert.include(err.message, 'addr is required')
    }
  })

  it('should reject a non-string addr', async () => {
    try {
      await uut.execute({ addr: 12345, limit: 10 })
      assert.fail('Expected error')
    } catch (err) {
      assert.equal(err.status, 400)
      assert.include(err.message, 'addr is required')
    }
  })

  it('should pass addr, limit, and offset to postQuery', async () => {
    await uut.execute({ addr: 'addr-a', limit: 5, offset: 10 })

    assert.equal(postQuery.scanPostsByAddrTxids.calledOnce, true)
    assert.equal(postQuery.scanPostsByAddrTxids.firstCall.args[0], 'addr-a')
    assert.deepEqual(postQuery.scanPostsByAddrTxids.firstCall.args[1], { limit: 5, offset: 10 })
  })
})
