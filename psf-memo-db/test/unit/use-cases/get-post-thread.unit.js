import { assert } from 'chai'
import sinon from 'sinon'
import GetPostThread from '../../../src/use-cases/get-post-thread.js'

describe('#GetPostThread', () => {
  let uut
  let sandbox
  let postQuery

  const mockPosts = {
    'root-1': { addr: 'addr-a', text: 'root', seen: 100, blockHeight: 600100 },
    'reply-1': { addr: 'addr-a', text: 'reply', seen: 90, blockHeight: 600090 },
    'reply-2': { addr: 'addr-b', text: 'reply b', seen: 80, blockHeight: 600080 }
  }

  beforeEach(() => {
    sandbox = sinon.createSandbox()
    postQuery = {
      postsDb: {
        get: sandbox.stub().callsFake(async (txid) => {
          if (mockPosts[txid]) return mockPosts[txid]
          const err = new Error('not found')
          err.notFound = true
          throw err
        })
      },
      postChildrenDb: {
        iterator: sandbox.stub().callsFake(function * () {
          yield ['root-1:reply-1', { parentTxid: 'root-1', childTxid: 'reply-1' }]
          yield ['root-1:reply-2', { parentTxid: 'root-1', childTxid: 'reply-2' }]
        })
      },
      buildLikeCountMap: sandbox.stub().resolves(new Map([
        ['root-1', 4],
        ['reply-1', 2]
      ]))
    }
    uut = new GetPostThread({ adapters: { postQuery } })
  })

  afterEach(() => sandbox.restore())

  it('should reject a missing txid', async () => {
    try {
      await uut.execute({})
      assert.fail('Expected error')
    } catch (err) {
      assert.equal(err.status, 400)
      assert.include(err.message, 'transaction ID is required')
    }
  })

  it('should return 404 when the post is missing', async () => {
    try {
      await uut.execute({ txid: 'missing' })
      assert.fail('Expected error')
    } catch (err) {
      assert.equal(err.status, 404)
      assert.include(err.message, 'Post not found')
    }
  })

  it('should attach likeCount to the root post and replies', async () => {
    const result = await uut.execute({ txid: 'root-1' })

    assert.equal(result.post.txid, 'root-1')
    assert.equal(result.post.likeCount, 4)
    assert.equal(result.post.replyCount, 2)

    const reply1 = result.post.replies.find((r) => r.txid === 'reply-1')
    const reply2 = result.post.replies.find((r) => r.txid === 'reply-2')
    assert.equal(reply1.likeCount, 2)
    assert.equal(reply2.likeCount, 0)
  })
})
