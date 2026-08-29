import { assert } from 'chai'
import sinon from 'sinon'
import { handleMute } from '../../../../src/use-cases/action-types/mute.js'
import { PREFIX_MUTE, PREFIX_UNMUTE } from '../../../../src/lib/memo-codes.js'

describe('#handleMute', () => {
  let adapters
  let muteCreate
  let processErrorCreate

  function baseCtx (overrides = {}) {
    const muteeHash = Buffer.alloc(20, 0xab)
    return {
      adapters,
      txid: 'mute-abc',
      signerAddr: 'bitcoincash:qptest',
      seen: 1000,
      blockHeight: 600150,
      decoded: {
        action: 'mute',
        prefix: PREFIX_MUTE,
        pushDatas: [PREFIX_MUTE, muteeHash]
      },
      ...overrides
    }
  }

  beforeEach(() => {
    muteCreate = sinon.stub().resolves({ success: true })
    processErrorCreate = sinon.stub().resolves({ success: true })
    adapters = {
      muteDb: { create: muteCreate },
      processErrorDb: { create: processErrorCreate }
    }
  })

  it('should save a mute record', async () => {
    const muteeHash = Buffer.alloc(20, 0xab)
    const expectedHash = muteeHash.toString('hex')

    await handleMute(baseCtx())

    assert.equal(muteCreate.callCount, 1)
    assert.equal(muteCreate.firstCall.args[0], 'bitcoincash:qptest:' + expectedHash)
    assert.equal(muteCreate.firstCall.args[1].muterAddr, 'bitcoincash:qptest')
    assert.equal(muteCreate.firstCall.args[1].muteePkHash, expectedHash)
    assert.equal(muteCreate.firstCall.args[1].unmute, false)
  })

  it('should save an unmute record', async () => {
    const muteeHash = Buffer.alloc(20, 0xcd)
    const expectedHash = muteeHash.toString('hex')

    await handleMute(baseCtx({
      decoded: {
        action: 'unmute',
        prefix: PREFIX_UNMUTE,
        pushDatas: [PREFIX_UNMUTE, muteeHash]
      }
    }))

    assert.equal(muteCreate.callCount, 1)
    assert.equal(muteCreate.firstCall.args[1].unmute, true)
    assert.equal(muteCreate.firstCall.args[1].muteePkHash, expectedHash)
  })

  it('should log a process error when push data count is not 2', async () => {
    await handleMute(baseCtx({
      decoded: { pushDatas: [PREFIX_MUTE, Buffer.alloc(20, 1), Buffer.alloc(20, 2)] }
    }))

    assert.equal(processErrorCreate.callCount, 1)
    assert.include(processErrorCreate.firstCall.args[1].error, 'invalid mute push data count')
    assert.equal(muteCreate.callCount, 0)
  })

  it('should log a process error when the mutee hash has the wrong size', async () => {
    await handleMute(baseCtx({
      decoded: { pushDatas: [PREFIX_MUTE, Buffer.alloc(32, 1)] }
    }))

    assert.equal(processErrorCreate.callCount, 1)
    assert.include(processErrorCreate.firstCall.args[1].error, 'mute pk hash wrong size')
    assert.equal(muteCreate.callCount, 0)
  })
})
