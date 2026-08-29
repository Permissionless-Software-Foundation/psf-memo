import { assert } from 'chai'
import sinon from 'sinon'
import ListFollowingFeed from '../../../src/use-cases/list-following-feed.js'

describe('#ListFollowingFeed', () => {
  let uut
  let sandbox
  let postQuery
  let followQuery

  const viewerAddr = 'bitcoincash:viewer'
  const followeeAddr = 'bitcoincash:followee'
  const otherAddr = 'bitcoincash:other'

  const mockPosts = {
    'tx-a': { addr: followeeAddr, text: 'a', seen: 100, blockHeight: 600100 },
    'tx-b': { addr: followeeAddr, text: 'b', seen: 200, blockHeight: 600200 },
    'tx-c': { addr: otherAddr, text: 'c', seen: 50, blockHeight: 600300 }
  }

  beforeEach(() => {
    sandbox = sinon.createSandbox()
    postQuery = {
      scanFollowingFeedTxidsAndCount: sandbox.stub().callsFake(async (viewer, followees, { limit, offset }) => {
        const all = Object.entries(mockPosts)
          .filter(([txid, post]) => followees.includes(post.addr) && post.addr !== viewer)
          .sort((a, b) => b[1].blockHeight - a[1].blockHeight)
          .map(([txid]) => txid)
        return {
          txids: all.slice(offset, offset + limit),
          total: all.length
        }
      }),
      loadPostsByTxids: sandbox.stub().callsFake(async (txids) => {
        return txids.map((txid) => ({ txid, ...mockPosts[txid] }))
      }),
      countRepliesForTxids: sandbox.stub().resolves(new Map()),
      countLikesForTxids: sandbox.stub().resolves(new Map([['tx-a', 2]]))
    }
    followQuery = {
      listFollowing: sandbox.stub().resolves([followeeAddr])
    }
    uut = new ListFollowingFeed({
      adapters: { postQuery, followQuery }
    })
  })

  afterEach(() => sandbox.restore())

  it('should return posts from followed addresses sorted by block height descending', async () => {
    const result = await uut.execute({ addr: viewerAddr, limit: 10, offset: 0 })

    assert.equal(result.posts.length, 2)
    assert.equal(result.posts[0].txid, 'tx-b')
    assert.equal(result.posts[1].txid, 'tx-a')
    assert.equal(result.posts[1].likeCount, 2)
    assert.equal(result.pagination.total, 2)
    assert.equal(result.pagination.hasMore, false)
  })

  it('should list who the viewer follows', async () => {
    await uut.execute({ addr: viewerAddr })

    assert.equal(followQuery.listFollowing.calledOnce, true)
    assert.equal(followQuery.listFollowing.firstCall.args[0], viewerAddr)
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
    await uut.execute({ addr: viewerAddr, limit: 5, offset: 10 })

    assert.equal(postQuery.scanFollowingFeedTxidsAndCount.calledOnce, true)
    assert.equal(postQuery.scanFollowingFeedTxidsAndCount.firstCall.args[0], viewerAddr)
    assert.deepEqual(postQuery.scanFollowingFeedTxidsAndCount.firstCall.args[1], [followeeAddr])
    assert.deepEqual(postQuery.scanFollowingFeedTxidsAndCount.firstCall.args[2], { limit: 5, offset: 10 })
  })

  it('should require the postQuery adapter', () => {
    try {
      // eslint-disable-next-line no-new
      new ListFollowingFeed({ adapters: { followQuery } })
      assert.fail('Expected error')
    } catch (err) {
      assert.include(err.message, 'postQuery adapter required')
    }
  })

  it('should require the followQuery adapter', () => {
    try {
      // eslint-disable-next-line no-new
      new ListFollowingFeed({ adapters: { postQuery } })
      assert.fail('Expected error')
    } catch (err) {
      assert.include(err.message, 'followQuery adapter required')
    }
  })
})
