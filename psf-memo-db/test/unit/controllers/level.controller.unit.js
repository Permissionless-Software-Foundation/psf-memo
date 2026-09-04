/*
  Unit tests for level REST controller.
*/

import { assert } from 'chai'
import sinon from 'sinon'
import LevelRESTControllerLib from '../../../src/controllers/rest-api/level/controller.js'

describe('#LevelRESTController', () => {
  let uut
  let sandbox
  const mockDb = {
    get: sinon.stub().resolves({ text: 'hello' }),
    put: sinon.stub().resolves(),
    del: sinon.stub().resolves()
  }

  beforeEach(() => {
    sandbox = sinon.createSandbox()
    uut = new LevelRESTControllerLib({
      adapters: {
        level: { postsDb: mockDb, postHeightsDb: mockDb, statusDb: mockDb },
        dbBackup: { zipDb: sandbox.stub().resolves(true) }
      },
      useCases: {}
    })
  })

  afterEach(() => sandbox.restore())

  it('should get status', async () => {
    const ctx = { params: { statusKey: 'status' }, body: null }
    await uut.getStatus(ctx)
    assert.deepEqual(ctx.body, { text: 'hello' })
  })

  it('should create a post via entity handler', async () => {
    const ctx = {
      params: {},
      request: { body: { txid: 'abc', postData: { addr: '1', text: 'hi' } } },
      body: null
    }
    await uut.entityHandlers.post.create(ctx)
    assert.equal(ctx.body.success, true)
    assert.equal(ctx.body.txid, 'abc')
  })

  it('should expose a postheight entity handler', async () => {
    const ctx = {
      params: {},
      request: { body: { key: '600000:abc', postHeightData: { txid: 'abc', blockHeight: 600000 } } },
      body: null
    }
    await uut.entityHandlers.postheight.create(ctx)
    assert.equal(ctx.body.success, true)
    assert.equal(ctx.body.key, '600000:abc')
  })

  it('should throw the error status when err has a status', () => {
    const ctx = { throw: sandbox.stub() }
    const err = { status: 400, message: 'Bad request' }
    uut.handleError(ctx, err)

    assert.equal(ctx.throw.callCount, 1)
    assert.equal(ctx.throw.firstCall.args[0], 400)
    assert.equal(ctx.throw.firstCall.args[1], 'Bad request')
  })

  it('should throw 422 when err has no status', () => {
    const ctx = { throw: sandbox.stub() }
    const err = new Error('boom')
    uut.handleError(ctx, err)

    assert.equal(ctx.throw.callCount, 1)
    assert.equal(ctx.throw.firstCall.args[0], 422)
  })
})
