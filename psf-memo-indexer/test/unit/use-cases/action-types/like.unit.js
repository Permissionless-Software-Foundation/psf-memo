import { assert } from 'chai'
import sinon from 'sinon'
import { handleLike } from '../../../../src/use-cases/action-types/like.js'
import { PREFIX_LIKE } from '../../../../src/lib/memo-codes.js'

describe('#handleLike', () => {
  it('should save a like and its postLikes index entry', async () => {
    const postTxid = Buffer.alloc(32, 0xab)

    const likeCreate = sinon.stub().resolves({ success: true })
    const postLikeCreate = sinon.stub().resolves({ success: true })
    const processErrorDb = { create: sinon.stub() }

    const adapters = {
      likeDb: { create: likeCreate },
      postLikeDb: { create: postLikeCreate },
      processErrorDb
    }

    await handleLike({
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
      }
    })

    assert.equal(likeCreate.callCount, 1)
    assert.equal(likeCreate.firstCall.args[0], 'like-abc')
    assert.equal(likeCreate.firstCall.args[1].postTxid, postTxid.toString('hex').match(/.{2}/g).reverse().join(''))

    assert.equal(postLikeCreate.callCount, 1)
    const expectedPostTxid = postTxid.toString('hex').match(/.{2}/g).reverse().join('')
    assert.equal(postLikeCreate.firstCall.args[0], `${expectedPostTxid}:like-abc`)
    assert.equal(postLikeCreate.firstCall.args[1].postTxid, expectedPostTxid)
    assert.equal(postLikeCreate.firstCall.args[1].txid, 'like-abc')
  })
})
