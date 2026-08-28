import { assert } from 'chai'
import sinon from 'sinon'
import { handlePost } from '../../../../src/use-cases/action-types/post.js'
import { PREFIX_POST, MAX_POST_SIZE } from '../../../../src/lib/memo-codes.js'

describe('#handlePost', () => {
  it('should save a post to the database', async () => {
    const create = sinon.stub().resolves({ success: true })
    const get = sinon.stub().rejects(new Error('not found'))
    const postHeightCreate = sinon.stub().resolves({ success: true })
    const postHeightGet = sinon.stub().rejects(new Error('not found'))
    const addrPostHeightCreate = sinon.stub().resolves({ success: true })
    const addrPostHeightGet = sinon.stub().rejects(new Error('not found'))

    const adapters = {
      postDb: { create, get },
      postHeightDb: { create: postHeightCreate, get: postHeightGet },
      addrPostHeightDb: { create: addrPostHeightCreate, get: addrPostHeightGet },
      processErrorDb: { create: sinon.stub() }
    }

    const message = Buffer.from('hello memo')
    await handlePost({
      adapters,
      txid: 'abc123',
      signerAddr: 'bitcoincash:qptest',
      seen: 1000,
      blockHeight: 600100,
      decoded: {
        action: 'post',
        prefix: PREFIX_POST,
        pushDatas: [PREFIX_POST, message]
      }
    })

    assert.equal(create.callCount, 1)
    assert.equal(create.firstCall.args[0], 'abc123')
    assert.equal(create.firstCall.args[1].text, 'hello memo')
    assert.equal(create.firstCall.args[1].blockHeight, 600100)

    assert.equal(postHeightCreate.callCount, 1)
    assert.equal(postHeightCreate.firstCall.args[0], '000000600100:abc123')
    assert.equal(postHeightCreate.firstCall.args[1].txid, 'abc123')
    assert.equal(postHeightCreate.firstCall.args[1].blockHeight, 600100)

    assert.equal(addrPostHeightCreate.callCount, 1)
    assert.equal(addrPostHeightCreate.firstCall.args[0], 'bitcoincash:qptest:000000600100:abc123')
    assert.equal(addrPostHeightCreate.firstCall.args[1].txid, 'abc123')
    assert.equal(addrPostHeightCreate.firstCall.args[1].blockHeight, 600100)
  })

  it('should not duplicate postHeight entries when reprocessing', async () => {
    const create = sinon.stub().resolves({ success: true })
    const get = sinon.stub().resolves({ addr: 'bitcoincash:qptest', text: 'hello memo', seen: 1000, blockHeight: 600100 })
    const postHeightCreate = sinon.stub().resolves({ success: true })
    const postHeightGet = sinon.stub().resolves({ txid: 'abc123', blockHeight: 600100 })
    const addrPostHeightCreate = sinon.stub().resolves({ success: true })
    const addrPostHeightGet = sinon.stub().resolves({ txid: 'abc123', blockHeight: 600100 })

    const adapters = {
      postDb: { create, get },
      postHeightDb: { create: postHeightCreate, get: postHeightGet },
      addrPostHeightDb: { create: addrPostHeightCreate, get: addrPostHeightGet },
      processErrorDb: { create: sinon.stub() }
    }

    const message = Buffer.from('hello memo')
    await handlePost({
      adapters,
      txid: 'abc123',
      signerAddr: 'bitcoincash:qptest',
      seen: 1000,
      blockHeight: 600100,
      decoded: {
        action: 'post',
        prefix: PREFIX_POST,
        pushDatas: [PREFIX_POST, message]
      }
    })

    assert.equal(create.callCount, 0)
    assert.equal(postHeightCreate.callCount, 0)
    assert.equal(addrPostHeightCreate.callCount, 0)
  })

  it('should accept a post whose text is exactly at the maximum size', async () => {
    const create = sinon.stub().resolves({ success: true })
    const get = sinon.stub().rejects(new Error('not found'))
    const postHeightCreate = sinon.stub().resolves({ success: true })
    const postHeightGet = sinon.stub().rejects(new Error('not found'))
    const addrPostHeightCreate = sinon.stub().resolves({ success: true })
    const addrPostHeightGet = sinon.stub().rejects(new Error('not found'))
    const processErrorDb = { create: sinon.stub() }

    const adapters = {
      postDb: { create, get },
      postHeightDb: { create: postHeightCreate, get: postHeightGet },
      addrPostHeightDb: { create: addrPostHeightCreate, get: addrPostHeightGet },
      processErrorDb
    }

    const message = Buffer.alloc(MAX_POST_SIZE, 'x')
    await handlePost({
      adapters,
      txid: 'abc123',
      signerAddr: 'bitcoincash:qptest',
      seen: 1000,
      blockHeight: 600100,
      decoded: { action: 'post', prefix: PREFIX_POST, pushDatas: [PREFIX_POST, message] }
    })

    assert.equal(create.callCount, 1)
    assert.equal(processErrorDb.create.callCount, 0)
  })
})
