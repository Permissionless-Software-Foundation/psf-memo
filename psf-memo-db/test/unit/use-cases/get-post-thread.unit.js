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
    Object.assign(mockPosts, {
      'root-1': { addr: 'addr-a', text: 'root', seen: 100, blockHeight: 600100 },
      'reply-1': { addr: 'addr-a', text: 'reply', seen: 90, blockHeight: 600090 },
      'reply-2': { addr: 'addr-b', text: 'reply b', seen: 80, blockHeight: 600080 }
    })
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

  it('should reject a non-string txid', async () => {
    try {
      await uut.execute({ txid: 12345 })
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

  it('should sort replies by blockHeight ascending then seen ascending', async () => {
    const result = await uut.execute({ txid: 'root-1' })

    const txids = result.post.replies.map((r) => r.txid)
    // reply-2 has blockHeight 600080, reply-1 has 600090.
    assert.deepEqual(txids, ['reply-2', 'reply-1'])
  })

  it('should tie-break replies with equal blockHeight by seen ascending', async () => {
    postQuery.postChildrenDb.iterator = sandbox.stub().callsFake(function * () {
      yield ['root-1:reply-1', { parentTxid: 'root-1', childTxid: 'reply-1' }]
      yield ['root-1:reply-2', { parentTxid: 'root-1', childTxid: 'reply-2' }]
    })
    mockPosts['reply-1'] = { addr: 'addr-a', text: 'reply', seen: 90, blockHeight: 600100 }
    mockPosts['reply-2'] = { addr: 'addr-b', text: 'reply b', seen: 80, blockHeight: 600100 }

    const result = await uut.execute({ txid: 'root-1' })

    const txids = result.post.replies.map((r) => r.txid)
    // Equal blockHeight: reply-2 (seen 80) sorts before reply-1 (seen 90).
    assert.deepEqual(txids, ['reply-2', 'reply-1'])
  })

  it('should default missing blockHeight to 0 in the thread node', async () => {
    mockPosts['root-1'] = { addr: 'addr-a', text: 'root', seen: 100 }
    mockPosts['reply-1'] = { addr: 'addr-a', text: 'reply', seen: 90 }
    mockPosts['reply-2'] = { addr: 'addr-b', text: 'reply b', seen: 80 }

    const result = await uut.execute({ txid: 'root-1' })

    assert.equal(result.post.blockHeight, 0)
    for (const reply of result.post.replies) {
      assert.equal(reply.blockHeight, 0)
    }
  })

  it('should default missing seen to 0 when comparing replies', async () => {
    postQuery.postChildrenDb.iterator = sandbox.stub().callsFake(function * () {
      yield ['root-1:reply-1', { parentTxid: 'root-1', childTxid: 'reply-1' }]
      yield ['root-1:reply-2', { parentTxid: 'root-1', childTxid: 'reply-2' }]
    })
    mockPosts['reply-1'] = { addr: 'addr-a', text: 'reply', blockHeight: 600100 }
    mockPosts['reply-2'] = { addr: 'addr-b', text: 'reply b', seen: 0, blockHeight: 600100 }

    const result = await uut.execute({ txid: 'root-1' })

    const txids = result.post.replies.map((r) => r.txid)
    // Equal blockHeight: reply-1 (missing seen => 0) ties with reply-2 (seen 0)
    // and keeps insertion order, so reply-1 sorts first.
    assert.deepEqual(txids, ['reply-1', 'reply-2'])
  })

  it('should default missing blockHeight to 0 when comparing replies', async () => {
    postQuery.postChildrenDb.iterator = sandbox.stub().callsFake(function * () {
      yield ['root-1:reply-1', { parentTxid: 'root-1', childTxid: 'reply-1' }]
      yield ['root-1:reply-2', { parentTxid: 'root-1', childTxid: 'reply-2' }]
    })
    mockPosts['reply-1'] = { addr: 'addr-a', text: 'reply', seen: 100 }
    mockPosts['reply-2'] = { addr: 'addr-b', text: 'reply b', seen: 100, blockHeight: 0 }

    const result = await uut.execute({ txid: 'root-1' })

    const txids = result.post.replies.map((r) => r.txid)
    // Equal seen: reply-1 (missing blockHeight => 0) ties with reply-2 (blockHeight 0)
    // and keeps insertion order, so reply-1 sorts first.
    assert.deepEqual(txids, ['reply-1', 'reply-2'])
  })

  it('should treat a missing blockHeight on the second operand as 0', async () => {
    postQuery.postChildrenDb.iterator = sandbox.stub().callsFake(function * () {
      yield ['root-1:reply-1', { parentTxid: 'root-1', childTxid: 'reply-1' }]
      yield ['root-1:reply-2', { parentTxid: 'root-1', childTxid: 'reply-2' }]
    })
    mockPosts['reply-1'] = { addr: 'addr-a', text: 'reply', seen: 100, blockHeight: 1 }
    mockPosts['reply-2'] = { addr: 'addr-b', text: 'reply b', seen: 100 }

    const result = await uut.execute({ txid: 'root-1' })

    const txids = result.post.replies.map((r) => r.txid)
    // reply-1 blockHeight 1 > reply-2 missing (=> 0), so reply-1 sorts after reply-2.
    assert.deepEqual(txids, ['reply-2', 'reply-1'])
  })

  it('should treat a missing seen on the second operand as 0', async () => {
    postQuery.postChildrenDb.iterator = sandbox.stub().callsFake(function * () {
      yield ['root-1:reply-1', { parentTxid: 'root-1', childTxid: 'reply-1' }]
      yield ['root-1:reply-2', { parentTxid: 'root-1', childTxid: 'reply-2' }]
    })
    mockPosts['reply-1'] = { addr: 'addr-a', text: 'reply', seen: 1, blockHeight: 600100 }
    mockPosts['reply-2'] = { addr: 'addr-b', text: 'reply b', blockHeight: 600100 }

    const result = await uut.execute({ txid: 'root-1' })

    const txids = result.post.replies.map((r) => r.txid)
    // Equal blockHeight: reply-1 seen 1 > reply-2 missing (=> 0), so reply-1 sorts after reply-2.
    assert.deepEqual(txids, ['reply-2', 'reply-1'])
  })

  it('compareReplies defaults a missing first blockHeight to 0', () => {
    // a has no blockHeight (=> 0), b has blockHeight 1: a sorts before b.
    assert.ok(uut.compareReplies({ seen: 0 }, { seen: 0, blockHeight: 1 }) < 0)
  })

  it('compareReplies defaults a missing second blockHeight to 0', () => {
    // a has blockHeight 1, b has no blockHeight (=> 0): a sorts after b.
    assert.ok(uut.compareReplies({ seen: 0, blockHeight: 1 }, { seen: 0 }) > 0)
  })
})
