import { assert } from 'chai'
import sinon from 'sinon'
import { handleReply } from '../../../../src/use-cases/action-types/reply.js'
import { PREFIX_REPLY } from '../../../../src/lib/memo-codes.js'

describe('#handleReply', () => {
  it('should save a reply and its postHeight index entry', async () => {
    const parentTxid = Buffer.alloc(32, 0xab)
    const message = Buffer.from('hi there')

    const postParentCreate = sinon.stub().resolves({ success: true })
    const postChildCreate = sinon.stub().resolves({ success: true })
    const postDbGet = sinon.stub().rejects(new Error('not found'))
    const postDbCreate = sinon.stub().resolves({ success: true })
    const postHeightGet = sinon.stub().rejects(new Error('not found'))
    const postHeightCreate = sinon.stub().resolves({ success: true })
    const addrPostHeightGet = sinon.stub().rejects(new Error('not found'))
    const addrPostHeightCreate = sinon.stub().resolves({ success: true })

    const adapters = {
      postParentDb: { create: postParentCreate },
      postChildDb: { create: postChildCreate },
      postDb: { get: postDbGet, create: postDbCreate },
      postHeightDb: { get: postHeightGet, create: postHeightCreate },
      addrPostHeightDb: { get: addrPostHeightGet, create: addrPostHeightCreate },
      processErrorDb: { create: sinon.stub() }
    }

    await handleReply({
      adapters,
      txid: 'reply-abc',
      signerAddr: 'bitcoincash:qptest',
      seen: 1000,
      blockHeight: 600150,
      decoded: {
        action: 'reply',
        prefix: PREFIX_REPLY,
        pushDatas: [PREFIX_REPLY, parentTxid, message]
      }
    })

    assert.equal(postParentCreate.callCount, 1)
    assert.equal(postParentCreate.firstCall.args[0], 'reply-abc')
    assert.equal(postParentCreate.firstCall.args[1].parentTxid, parentTxid.toString('hex'))

    assert.equal(postChildCreate.callCount, 1)
    assert.include(postChildCreate.firstCall.args[0], 'reply-abc')

    assert.equal(postDbCreate.callCount, 1)
    assert.equal(postDbCreate.firstCall.args[0], 'reply-abc')
    assert.equal(postDbCreate.firstCall.args[1].text, 'hi there')

    assert.equal(postHeightCreate.callCount, 1)
    assert.equal(postHeightCreate.firstCall.args[0], '000000600150:reply-abc')
    assert.equal(postHeightCreate.firstCall.args[1].txid, 'reply-abc')

    assert.equal(addrPostHeightCreate.callCount, 1)
    assert.equal(addrPostHeightCreate.firstCall.args[0], 'bitcoincash:qptest:000000600150:reply-abc')
    assert.equal(addrPostHeightCreate.firstCall.args[1].txid, 'reply-abc')
  })
})
