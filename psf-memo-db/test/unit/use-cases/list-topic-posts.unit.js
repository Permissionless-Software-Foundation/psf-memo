import { assert } from 'chai'
import sinon from 'sinon'
import ListTopicPosts from '../../../src/use-cases/list-topic-posts.js'

describe('#ListTopicPosts', () => {
  let uut
  let sandbox
  let topicQuery
  let postQuery

  const mockPosts = {
    'post-300': { addr: 'addr-a', text: 'hello bitcoin', seen: 100, blockHeight: 300 },
    'post-200': { addr: 'addr-b', text: 'bitcoin again', seen: 200, blockHeight: 200 }
  }

  beforeEach(() => {
    sandbox = sinon.createSandbox()
    topicQuery = {
      getTopicPostTxids: sandbox.stub().resolves({ txids: ['post-300', 'post-200'], total: 2 })
    }
    postQuery = {
      loadPostsByTxids: sandbox.stub().callsFake(async (txids) => {
        return txids.map((txid) => ({ txid, ...mockPosts[txid] }))
      }),
      countRepliesForTxids: sandbox.stub().resolves(new Map()),
      countLikesForTxids: sandbox.stub().resolves(new Map([['post-300', 1]]))
    }
    uut = new ListTopicPosts({
      adapters: { topicQuery, postQuery }
    })
  })

  afterEach(() => sandbox.restore())

  it('should throw when adapters are missing', () => {
    try {
      // eslint-disable-next-line no-new
      new ListTopicPosts({})
      assert.fail('Expected error')
    } catch (err) {
      assert.include(err.message, 'Adapters required')
    }
  })

  it('should throw when topicQuery adapter is missing', () => {
    try {
      // eslint-disable-next-line no-new
      new ListTopicPosts({ adapters: { postQuery } })
      assert.fail('Expected error')
    } catch (err) {
      assert.include(err.message, 'topicQuery adapter required')
    }
  })

  it('should throw when postQuery adapter is missing', () => {
    try {
      // eslint-disable-next-line no-new
      new ListTopicPosts({ adapters: { topicQuery } })
      assert.fail('Expected error')
    } catch (err) {
      assert.include(err.message, 'postQuery adapter required')
    }
  })

  it('should reject a missing room', async () => {
    try {
      await uut.execute({})
      assert.fail('Expected error')
    } catch (err) {
      assert.equal(err.status, 400)
      assert.include(err.message, 'room is required')
    }
  })

  it('should reject a non-string room', async () => {
    try {
      await uut.execute({ room: 123 })
      assert.fail('Expected error')
    } catch (err) {
      assert.equal(err.status, 400)
      assert.include(err.message, 'room is required')
    }
  })

  it('should return topic posts sorted by block height descending', async () => {
    const result = await uut.execute({ room: 'bitcoin', limit: 10, offset: 0 })

    assert.equal(result.posts.length, 2)
    assert.equal(result.posts[0].txid, 'post-300')
    assert.equal(result.posts[1].txid, 'post-200')
    assert.equal(result.posts[0].likeCount, 1)
    assert.equal(result.posts[1].likeCount, 0)
    assert.equal(result.pagination.total, 2)
    assert.equal(result.pagination.hasMore, false)
  })

  it('should report hasMore true on a partial last page', async () => {
    topicQuery.getTopicPostTxids.resolves({ txids: ['post-200'], total: 2 })
    postQuery.loadPostsByTxids.callsFake(async (txids) => {
      return txids.map((txid) => ({ txid, ...mockPosts[txid] }))
    })

    const result = await uut.execute({ room: 'bitcoin', limit: 1, offset: 1 })

    assert.deepEqual(result.posts.map((p) => p.txid), ['post-200'])
    assert.equal(result.pagination.total, 2)
    assert.equal(result.pagination.hasMore, true)
  })

  it('should paginate topic posts', async () => {
    topicQuery.getTopicPostTxids.resolves({ txids: ['post-300'], total: 2 })
    postQuery.loadPostsByTxids.callsFake(async (txids) => {
      return txids.map((txid) => ({ txid, ...mockPosts[txid] }))
    })

    const result = await uut.execute({ room: 'bitcoin', limit: 1, offset: 0 })

    assert.deepEqual(result.posts.map((p) => p.txid), ['post-300'])
    assert.equal(result.pagination.total, 2)
    assert.equal(result.pagination.hasMore, true)
  })

  it('should default limit and offset', async () => {
    await uut.execute({ room: 'bitcoin' })

    assert.equal(topicQuery.getTopicPostTxids.firstCall.args[1].limit, 100)
    assert.equal(topicQuery.getTopicPostTxids.firstCall.args[1].offset, 0)
  })

  it('should reject limit over 100', async () => {
    try {
      await uut.execute({ room: 'bitcoin', limit: 101 })
      assert.fail('Expected error')
    } catch (err) {
      assert.equal(err.status, 400)
      assert.include(err.message, 'limit cannot exceed')
    }
  })
})
