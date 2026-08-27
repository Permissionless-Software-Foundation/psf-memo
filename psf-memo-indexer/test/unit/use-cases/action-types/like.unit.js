import { assert } from 'chai'
import sinon from 'sinon'
import { handleLike, computeLikeTip } from '../../../../src/use-cases/action-types/like.js'
import { PREFIX_LIKE } from '../../../../src/lib/memo-codes.js'

describe('#handleLike', () => {
  let adapters
  let likeCreate
  let postLikeCreate
  let processErrorCreate

  function baseCtx (overrides = {}) {
    const postTxid = Buffer.alloc(32, 0xab)
    return {
      adapters,
      txid: 'like-abc',
      signerAddr: 'bitcoincash:qptest',
      seen: 1000,
      blockHeight: 600150,
      txDetails: { vout: [] },
      decoded: {
        action: 'like',
        prefix: PREFIX_LIKE,
        pushDatas: [PREFIX_LIKE, postTxid]
      },
      ...overrides
    }
  }

  beforeEach(() => {
    likeCreate = sinon.stub().resolves({ success: true })
    postLikeCreate = sinon.stub().resolves({ success: true })
    processErrorCreate = sinon.stub().resolves({ success: true })
    adapters = {
      likeDb: { create: likeCreate },
      postLikeDb: { create: postLikeCreate },
      processErrorDb: { create: processErrorCreate },
      postDb: { get: sinon.stub().rejects(new Error('not found')) }
    }
  })

  it('should save a like and its postLikes index entry', async () => {
    const postTxid = Buffer.alloc(32, 0xab)
    const expectedPostTxid = postTxid.toString('hex').match(/.{2}/g).reverse().join('')

    await handleLike(baseCtx())

    assert.equal(likeCreate.callCount, 1)
    assert.equal(likeCreate.firstCall.args[0], 'like-abc')
    assert.equal(likeCreate.firstCall.args[1].postTxid, expectedPostTxid)
    assert.equal(likeCreate.firstCall.args[1].tip, 0)

    assert.equal(postLikeCreate.callCount, 1)
    assert.equal(postLikeCreate.firstCall.args[0], `${expectedPostTxid}:like-abc`)
    assert.equal(postLikeCreate.firstCall.args[1].postTxid, expectedPostTxid)
    assert.equal(postLikeCreate.firstCall.args[1].txid, 'like-abc')
  })

  it('should log a process error when push data count is not 2', async () => {
    await handleLike(baseCtx({
      decoded: { pushDatas: [PREFIX_LIKE, Buffer.alloc(32, 1), Buffer.alloc(32, 2)] }
    }))

    assert.equal(processErrorCreate.callCount, 1)
    assert.equal(likeCreate.callCount, 0)
    assert.equal(postLikeCreate.callCount, 0)
    assert.include(processErrorCreate.firstCall.args[1].error, 'invalid like push data count')
  })

  it('should log a process error when the post tx hash has the wrong size', async () => {
    await handleLike(baseCtx({
      decoded: { pushDatas: [PREFIX_LIKE, Buffer.alloc(20, 1)] }
    }))

    assert.equal(processErrorCreate.callCount, 1)
    assert.equal(likeCreate.callCount, 0)
    assert.include(processErrorCreate.firstCall.args[1].error, 'like post tx hash wrong size')
  })

  it('should compute tip from vouts paid to the post owner address', async () => {
    adapters.postDb.get.resolves({ addr: 'bitcoincash:qpostowner', text: 'x', seen: 1, blockHeight: 600100 })
    const ctx = baseCtx({
      txDetails: {
        vout: [
          { value: 0.5, scriptPubKey: { addresses: ['bitcoincash:qother'] } },
          { value: 0.75, scriptPubKey: { addresses: ['bitcoincash:qpostowner'] } },
          { value: 1.25, scriptPubKey: { addresses: ['bitcoincash:qpostowner'] } }
        ]
      }
    })

    await handleLike(ctx)

    assert.equal(likeCreate.firstCall.args[1].tip, 200000000)
  })

  it('should keep tip 0 when the post is owned by the liker', async () => {
    adapters.postDb.get.resolves({ addr: 'bitcoincash:qptest', text: 'x', seen: 1, blockHeight: 600100 })
    const ctx = baseCtx({
      txDetails: { vout: [{ value: 5, scriptPubKey: { addresses: ['bitcoincash:qptest'] } }] }
    })

    await handleLike(ctx)

    assert.equal(likeCreate.firstCall.args[1].tip, 0)
  })
})

describe('#computeLikeTip', () => {
  it('should return 0 when the post is unknown', () => {
    const tip = computeLikeTip({ vout: [{ value: 1, scriptPubKey: { addresses: ['bitcoincash:qpostowner'] } }] }, null, 'bitcoincash:qptest')
    assert.equal(tip, 0)
  })

  it('should return 0 when the post is owned by the liker', () => {
    const post = { addr: 'bitcoincash:qptest' }
    const tip = computeLikeTip({ vout: [{ value: 1, scriptPubKey: { addresses: ['bitcoincash:qptest'] } }] }, post, 'bitcoincash:qptest')
    assert.equal(tip, 0)
  })

  it('should accumulate tip from vouts matching the post owner', () => {
    const post = { addr: 'bitcoincash:qpostowner' }
    const txDetails = {
      vout: [
        { value: 1, scriptPubKey: { addresses: ['bitcoincash:qother'] } },
        { value: 2, scriptPubKey: { addresses: ['bitcoincash:qpostowner'] } }
      ]
    }
    assert.equal(computeLikeTip(txDetails, post, 'bitcoincash:qptest'), 200000000)
  })

  it('should handle vouts without addresses', () => {
    const post = { addr: 'bitcoincash:qpostowner' }
    const txDetails = { vout: [{ value: 3, scriptPubKey: {} }] }
    assert.equal(computeLikeTip(txDetails, post, 'bitcoincash:qptest'), 0)
  })
})
