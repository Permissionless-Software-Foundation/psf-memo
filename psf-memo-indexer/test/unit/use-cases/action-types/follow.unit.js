import { assert } from 'chai'
import sinon from 'sinon'
import { handleFollow } from '../../../../src/use-cases/action-types/follow.js'
import { PREFIX_UNFOLLOW } from '../../../../src/lib/memo-codes.js'

describe('#handleFollow', () => {
  let adapters
  let followCreate
  let followeeHeightCreate
  let processErrorCreate

  const FOLLOWER = 'bitcoincash:qqlrzp23w08434twmvr4fxw672whkjy0py26r63g3d'
  const FOLLOWER2 = 'bitcoincash:qpm2qsznhks23z7629mms6s4cwef74vcwvy22gdx6a'
  const FOLLOWEE_HASH = 'cb481232299cd5743151ac4b2d63ae198e7bb0a9'

  function baseCtx (overrides = {}) {
    const hashBuf = Buffer.from(FOLLOWEE_HASH, 'hex')
    return {
      adapters,
      txid: 'follow-tx',
      signerAddr: FOLLOWER,
      seen: 1000,
      blockHeight: 690100,
      decoded: {
        action: 'follow',
        prefix: Buffer.from('6d06', 'hex'),
        pushDatas: [Buffer.from('6d06', 'hex'), hashBuf]
      },
      ...overrides
    }
  }

  beforeEach(() => {
    followCreate = sinon.stub().resolves({ success: true })
    followeeHeightCreate = sinon.stub().resolves({ success: true })
    processErrorCreate = sinon.stub().resolves({ success: true })
    adapters = {
      followDb: { create: followCreate },
      followeeHeightDb: { create: followeeHeightCreate },
      processErrorDb: { create: processErrorCreate }
    }
  })

  it('should save the follows record and mirror it into followeeHeights', async () => {
    await handleFollow(baseCtx())

    assert.equal(followCreate.callCount, 1)
    assert.equal(followCreate.firstCall.args[0], `${FOLLOWER}:${FOLLOWEE_HASH}`)
    assert.equal(followCreate.firstCall.args[1].followerAddr, FOLLOWER)
    assert.equal(followCreate.firstCall.args[1].followeePkHash, FOLLOWEE_HASH)
    assert.equal(followCreate.firstCall.args[1].unfollow, false)

    assert.equal(followeeHeightCreate.callCount, 1)
    assert.equal(
      followeeHeightCreate.firstCall.args[0],
      `${FOLLOWEE_HASH}:000000690100:${FOLLOWER}`
    )
    const indexed = followeeHeightCreate.firstCall.args[1]
    assert.equal(indexed.followerAddr, FOLLOWER)
    assert.equal(indexed.followeePkHash, FOLLOWEE_HASH)
    assert.equal(indexed.unfollow, false)
    assert.equal(indexed.txid, 'follow-tx')
    assert.equal(indexed.blockHeight, 690100)
  })

  it('should mark an unfollow entry as unfollow true', async () => {
    await handleFollow(baseCtx({
      decoded: {
        action: 'unfollow',
        prefix: PREFIX_UNFOLLOW,
        pushDatas: [PREFIX_UNFOLLOW, Buffer.from(FOLLOWEE_HASH, 'hex')]
      }
    }))

    assert.equal(followCreate.firstCall.args[1].unfollow, true)
    assert.equal(followeeHeightCreate.callCount, 1)
    assert.equal(followeeHeightCreate.firstCall.args[1].unfollow, true)
  })

  it('should use the same followeeHeights key when a follow is reprocessed', async () => {
    await handleFollow(baseCtx())
    await handleFollow(baseCtx())

    assert.equal(followeeHeightCreate.callCount, 2)
    assert.equal(
      followeeHeightCreate.firstCall.args[0],
      followeeHeightCreate.secondCall.args[0]
    )
  })

  it('should scope the followeeHeights key to the follower and height', async () => {
    await handleFollow(baseCtx({ signerAddr: FOLLOWER2, blockHeight: 690200 }))

    assert.equal(
      followeeHeightCreate.firstCall.args[0],
      `${FOLLOWEE_HASH}:000000690200:${FOLLOWER2}`
    )
  })

  it('should log a process error when push data count is not 2', async () => {
    await handleFollow(baseCtx({
      decoded: { pushDatas: [Buffer.from('6d06', 'hex'), Buffer.alloc(20, 1), Buffer.alloc(20, 2)] }
    }))

    assert.equal(processErrorCreate.callCount, 1)
    assert.include(processErrorCreate.firstCall.args[1].error, 'invalid follow push data count')
    assert.equal(followCreate.callCount, 0)
    assert.equal(followeeHeightCreate.callCount, 0)
  })

  it('should log a process error when the followee hash has the wrong size', async () => {
    await handleFollow(baseCtx({
      decoded: { pushDatas: [Buffer.from('6d06', 'hex'), Buffer.alloc(32, 1)] }
    }))

    assert.equal(processErrorCreate.callCount, 1)
    assert.include(processErrorCreate.firstCall.args[1].error, 'follow pk hash wrong size')
    assert.equal(followCreate.callCount, 0)
    assert.equal(followeeHeightCreate.callCount, 0)
  })
})
