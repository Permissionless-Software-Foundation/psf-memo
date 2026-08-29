/*
  Unit tests for the Mute REST controller.
*/

import { assert } from 'chai'
import sinon from 'sinon'
import MuteRESTControllerLib from '../../../src/controllers/rest-api/mute/controller.js'

describe('#MuteRESTController', () => {
  let sandbox

  beforeEach(() => {
    sandbox = sinon.createSandbox()
  })

  afterEach(() => sandbox.restore())

  function makeUut (useCases) {
    return new MuteRESTControllerLib({
      adapters: {},
      useCases
    })
  }

  function makeCtx (query = {}, params = {}) {
    return { query, params, body: null, throw: sandbox.stub() }
  }

  it('should return mute state from use case', async () => {
    const muteState = { execute: sandbox.stub().resolves({ muterAddr: 'a', muteeAddr: 'b', muted: true }) }
    const uut = makeUut({ muteState })
    const ctx = makeCtx({ muter: 'a', mutee: 'b' })

    await uut.getMuteState(ctx)

    assert.equal(muteState.execute.callCount, 1)
    assert.deepEqual(muteState.execute.firstCall.args[0], { muterAddr: 'a', muteeAddr: 'b' })
    assert.equal(ctx.body.muted, true)
  })

  it('should return muted list from use case', async () => {
    const listMuted = { execute: sandbox.stub().resolves({ muterAddr: 'a', muted: ['b', 'c'] }) }
    const uut = makeUut({ listMuted })
    const ctx = makeCtx({}, { muter: 'a' })

    await uut.getMuted(ctx)

    assert.equal(listMuted.execute.callCount, 1)
    assert.deepEqual(listMuted.execute.firstCall.args[0], { muterAddr: 'a' })
    assert.deepEqual(ctx.body.muted, ['b', 'c'])
  })

  it('should handle use case errors', async () => {
    const muteState = { execute: sandbox.stub().rejects(new Error('boom')) }
    const uut = makeUut({ muteState })
    const ctx = makeCtx({ muter: 'a', mutee: 'b' })

    await uut.getMuteState(ctx)

    assert.equal(ctx.throw.callCount, 1)
    assert.equal(ctx.throw.firstCall.args[0], 500)
  })

  it('should rethrow a statused error with its message', async () => {
    const err = new Error('bad request')
    err.status = 400
    const muteState = { execute: sandbox.stub().rejects(err) }
    const uut = makeUut({ muteState })
    const ctx = makeCtx({ muter: 'a', mutee: 'b' })

    await uut.getMuteState(ctx)

    assert.equal(ctx.throw.callCount, 1)
    assert.equal(ctx.throw.firstCall.args[0], 400)
    assert.equal(ctx.throw.firstCall.args[1], 'bad request')
  })

  it('should rethrow a statused error without a message', async () => {
    const err = new Error()
    err.status = 404
    const muteState = { execute: sandbox.stub().rejects(err) }
    const uut = makeUut({ muteState })
    const ctx = makeCtx({ muter: 'a', mutee: 'b' })

    await uut.getMuteState(ctx)

    assert.equal(ctx.throw.callCount, 1)
    assert.equal(ctx.throw.firstCall.args[0], 404)
    assert.equal(ctx.throw.firstCall.args[1], err)
  })
})
