import { assert } from 'chai'
import sinon from 'sinon'
import GetPostThread from '../../../src/use-cases/get-post-thread.js'

describe('#GetPostThread', () => {
  let uut
  let sandbox
  let postQuery
  let postsGetCounter
  let childLists

  const mockPosts = {
    'root-1': { addr: 'addr-a', text: 'root', seen: 100, blockHeight: 600100 },
    'reply-1': { addr: 'addr-a', text: 'reply', seen: 90, blockHeight: 600090 },
    'reply-2': { addr: 'addr-b', text: 'reply b', seen: 80, blockHeight: 600080 }
  }

  beforeEach(() => {
    sandbox = sinon.createSandbox()
    postsGetCounter = { calls: 0 }
    Object.assign(mockPosts, {
      'root-1': { addr: 'addr-a', text: 'root', seen: 100, blockHeight: 600100 },
      'reply-1': { addr: 'addr-a', text: 'reply', seen: 90, blockHeight: 600090 },
      'reply-2': { addr: 'addr-b', text: 'reply b', seen: 80, blockHeight: 600080 }
    })
    childLists = { 'root-1': ['reply-1', 'reply-2'] }
    postQuery = {
      // The use case must depend only on the PostQuery interface; the
      // postChildren key format and prefix bounds are the adapter's concern.
      getPostOrNull: sandbox.stub().callsFake(async (txid) => {
        postsGetCounter.calls++
        return mockPosts[txid] || null
      }),
      listChildTxids: sandbox.stub().callsFake(async (txid) => childLists[txid] || []),
      countLikesForTxids: sandbox.stub().resolves(new Map([
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

  it('should count likes only for the txids in the thread', async () => {
    await uut.execute({ txid: 'root-1' })

    assert.isTrue(postQuery.countLikesForTxids.calledOnce)
    const txids = postQuery.countLikesForTxids.firstCall.args[0]
    assert.deepEqual([...txids].sort(), ['reply-1', 'reply-2', 'root-1'])
  })

  it('should only load posts that belong to the thread', async () => {
    await uut.execute({ txid: 'root-1' })

    // root-1 plus the two replies; no per-like post lookups.
    assert.equal(postsGetCounter.calls, 3)
  })

  it('should request child txids from the adapter for each thread node', async () => {
    await uut.execute({ txid: 'root-1' })

    const requested = postQuery.listChildTxids.args.map(([txid]) => txid).sort()
    assert.deepEqual(requested, ['reply-1', 'reply-2', 'root-1'])
  })

  it('should prune a child post that no longer exists', async () => {
    childLists['root-1'] = ['reply-1', 'missing-reply']

    const result = await uut.execute({ txid: 'root-1' })

    assert.equal(result.post.replyCount, 1)
    assert.deepEqual(result.post.replies.map((r) => r.txid), ['reply-1'])
  })

  it('should terminate on a reply cycle and keep each post once', async () => {
    childLists['reply-1'] = ['root-1']

    const result = await uut.execute({ txid: 'root-1' })

    // root-1 -> reply-1 -> root-1 (cycle back-edge is pruned); reply-2 is a
    // sibling with no children.
    assert.equal(result.post.replyCount, 2)
    const reply1 = result.post.replies.find((r) => r.txid === 'reply-1')
    assert.equal(reply1.replyCount, 0)
  })

  it('should sort replies by blockHeight ascending then seen ascending', async () => {
    const result = await uut.execute({ txid: 'root-1' })

    const txids = result.post.replies.map((r) => r.txid)
    // reply-2 has blockHeight 600080, reply-1 has 600090.
    assert.deepEqual(txids, ['reply-2', 'reply-1'])
  })

  it('should tie-break replies with equal blockHeight by seen ascending', async () => {
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
    mockPosts['reply-1'] = { addr: 'addr-a', text: 'reply', blockHeight: 600100 }
    mockPosts['reply-2'] = { addr: 'addr-b', text: 'reply b', seen: 0, blockHeight: 600100 }

    const result = await uut.execute({ txid: 'root-1' })

    const txids = result.post.replies.map((r) => r.txid)
    // Equal blockHeight: reply-1 (missing seen => 0) ties with reply-2 (seen 0)
    // and keeps insertion order, so reply-1 sorts first.
    assert.deepEqual(txids, ['reply-1', 'reply-2'])
  })

  it('should default missing blockHeight to 0 when comparing replies', async () => {
    mockPosts['reply-1'] = { addr: 'addr-a', text: 'reply', seen: 100 }
    mockPosts['reply-2'] = { addr: 'addr-b', text: 'reply b', seen: 100, blockHeight: 0 }

    const result = await uut.execute({ txid: 'root-1' })

    const txids = result.post.replies.map((r) => r.txid)
    // Equal seen: reply-1 (missing blockHeight => 0) ties with reply-2 (blockHeight 0)
    // and keeps insertion order, so reply-1 sorts first.
    assert.deepEqual(txids, ['reply-1', 'reply-2'])
  })

  it('should treat a missing blockHeight on the second operand as 0', async () => {
    mockPosts['reply-1'] = { addr: 'addr-a', text: 'reply', seen: 100, blockHeight: 1 }
    mockPosts['reply-2'] = { addr: 'addr-b', text: 'reply b', seen: 100 }

    const result = await uut.execute({ txid: 'root-1' })

    const txids = result.post.replies.map((r) => r.txid)
    // reply-1 blockHeight 1 > reply-2 missing (=> 0), so reply-1 sorts after reply-2.
    assert.deepEqual(txids, ['reply-2', 'reply-1'])
  })

  it('should treat a missing seen on the second operand as 0', async () => {
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

  it('should throw when adapters are missing', () => {
    assert.throws(() => new GetPostThread({}), /Adapters required/)
  })

  it('should rethrow unexpected post lookup errors', async () => {
    const boom = new Error('disk failure')
    postQuery.getPostOrNull.rejects(boom)

    try {
      await uut.execute({ txid: 'root-1' })
      assert.fail('Expected error')
    } catch (err) {
      assert.equal(err, boom)
    }
  })
})
