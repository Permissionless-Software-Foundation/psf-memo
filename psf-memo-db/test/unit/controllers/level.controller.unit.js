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
  const mockMutesDb = {
    get: sinon.stub().resolves({ unmute: false }),
    put: sinon.stub().resolves(),
    del: sinon.stub().resolves()
  }

  beforeEach(() => {
    sandbox = sinon.createSandbox()
    uut = new LevelRESTControllerLib({
      adapters: {
        level: { postsDb: mockDb, postHeightsDb: mockDb, statusDb: mockDb, mutesDb: mockMutesDb },
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

  it('should expose a mute entity handler that upserts into the mutes store', async () => {
    const muteData = {
      muterAddr: 'bitcoincash:muter',
      muteePkHash: 'aabbccdd',
      unmute: false,
      txid: 'mute-tx',
      seen: 1,
      blockHeight: 600100
    }
    const ctx = {
      params: {},
      request: { body: { key: 'bitcoincash:muter:aabbccdd', muteData } },
      body: null
    }
    await uut.entityHandlers.mute.create(ctx)

    assert.equal(mockMutesDb.put.callCount, 1)
    assert.deepEqual(mockMutesDb.put.firstCall.args, ['bitcoincash:muter:aabbccdd', muteData])
    assert.equal(ctx.body.success, true)
    assert.equal(ctx.body.key, 'bitcoincash:muter:aabbccdd')
  })

  it('should read a mute through the entity handler registry', async () => {
    const ctx = { params: { key: 'bitcoincash:muter:aabbccdd' }, body: null }
    await uut.entityHandlers.mute.get(ctx)
    assert.deepEqual(ctx.body, { unmute: false })
  })

  it('should update a mute through the entity handler registry', async () => {
    const muteData = { unmute: true, blockHeight: 600200 }
    const ctx = {
      params: { key: 'bitcoincash:muter:aabbccdd' },
      request: { body: { key: 'bitcoincash:muter:aabbccdd', muteData } },
      body: null
    }
    await uut.entityHandlers.mute.update(ctx)

    assert.deepEqual(mockMutesDb.put.lastCall.args, ['bitcoincash:muter:aabbccdd', muteData])
    assert.deepEqual(ctx.body, { key: 'bitcoincash:muter:aabbccdd', success: true })
  })

  it('should delete a mute through the entity handler registry', async () => {
    const ctx = { params: { key: 'bitcoincash:muter:aabbccdd' }, body: null }
    await uut.entityHandlers.mute.delete(ctx)

    assert.deepEqual(mockMutesDb.del.lastCall.args, ['bitcoincash:muter:aabbccdd'])
    assert.deepEqual(ctx.body, { key: 'bitcoincash:muter:aabbccdd', success: true })
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
