import { assert } from 'chai'
import { backfillFolloweeIndex, followeeHeightKey } from '../../../src/lib/backfill-followee-index.js'
import { FakeDb } from '../../support/level-double.js'

describe('#backfillFolloweeIndex', () => {
  // followeePkHash is a 20-byte hash160 hex; cash addresses are the followers.
  const VIEWER_HASH = 'a1'.repeat(20)
  const OTHER_HASH = 'b2'.repeat(20)
  const FOLLOWER_A = 'bitcoincash:qq3zyg3zyg3zyg3zyg3zyg3zyg3zyg3zygrg4dtdzf'
  const FOLLOWER_B = 'bitcoincash:qqenxvenxvenxvenxvenxvenxvenxvenxvn254yg3p'
  const FOLLOWER_C = 'bitcoincash:qpzyg3zyg3zyg3zyg3zyg3zyg3zyg3zygs7fn3s6pt'

  function followsDb () {
    return new FakeDb([
      [`${FOLLOWER_A}:${VIEWER_HASH}`, {
        followerAddr: FOLLOWER_A,
        followeePkHash: VIEWER_HASH,
        unfollow: false,
        txid: 'follow-a',
        seen: 1,
        blockHeight: 690400
      }],
      [`${FOLLOWER_B}:${VIEWER_HASH}`, {
        followerAddr: FOLLOWER_B,
        followeePkHash: VIEWER_HASH,
        unfollow: true,
        txid: 'unfollow-b',
        seen: 2,
        blockHeight: 690600
      }],
      [`${FOLLOWER_C}:${OTHER_HASH}`, {
        followerAddr: FOLLOWER_C,
        followeePkHash: OTHER_HASH,
        unfollow: false,
        txid: 'follow-c',
        seen: 3,
        blockHeight: 690200
      }]
    ])
  }

  it('should index every follow record at its height, preserving unfollow', async () => {
    const db = followsDb()
    const followeeHeightsDb = new FakeDb()

    const result = await backfillFolloweeIndex({ followsDb: db, followeeHeightsDb })

    assert.equal(result.follows, 3)
    assert.deepEqual(followeeHeightsDb.store.get(followeeHeightKey(VIEWER_HASH, 690400, FOLLOWER_A)), {
      followerAddr: FOLLOWER_A,
      followeePkHash: VIEWER_HASH,
      unfollow: false,
      txid: 'follow-a',
      seen: 1,
      blockHeight: 690400
    })
    assert.equal(followeeHeightsDb.store.get(followeeHeightKey(VIEWER_HASH, 690600, FOLLOWER_B)).unfollow, true)
    assert.equal(followeeHeightsDb.store.get(followeeHeightKey(OTHER_HASH, 690200, FOLLOWER_C)).unfollow, false)
  })

  it('should be idempotent across repeated runs', async () => {
    const db = followsDb()
    const followeeHeightsDb = new FakeDb()

    await backfillFolloweeIndex({ followsDb: db, followeeHeightsDb })
    const sizeAfterFirst = followeeHeightsDb.store.size
    await backfillFolloweeIndex({ followsDb: db, followeeHeightsDb })

    assert.equal(followeeHeightsDb.store.size, sizeAfterFirst)
    assert.equal(sizeAfterFirst, 3)
  })

  it('should leave the follows store unchanged', async () => {
    const db = followsDb()
    const before = new Map(db.store)
    const followeeHeightsDb = new FakeDb()

    await backfillFolloweeIndex({ followsDb: db, followeeHeightsDb })

    assert.deepEqual(db.store, before)
  })

  it('should pad a missing height to zero', () => {
    assert.equal(
      followeeHeightKey(VIEWER_HASH, undefined, FOLLOWER_A),
      `${VIEWER_HASH}:${'0'.repeat(12)}:${FOLLOWER_A}`
    )
  })

  it('should skip records that cannot yield a follower and default missing fields', async () => {
    const db = new FakeDb([
      [':deadbeef', {}],
      [`${FOLLOWER_A}:${VIEWER_HASH}`, { txid: 'follow-a' }]
    ])
    const followeeHeightsDb = new FakeDb()

    const result = await backfillFolloweeIndex({ followsDb: db, followeeHeightsDb })

    assert.equal(result.follows, 1)
    const stored = followeeHeightsDb.store.get(followeeHeightKey(VIEWER_HASH, 0, FOLLOWER_A))
    assert.equal(stored.unfollow, false)
    assert.equal(stored.blockHeight, 0)
  })

  it('should recover the follower and followee from the key when fields are missing', async () => {
    const db = new FakeDb([
      [`${FOLLOWER_A}:${VIEWER_HASH}`, { unfollow: false, blockHeight: 690400 }]
    ])
    const followeeHeightsDb = new FakeDb()

    await backfillFolloweeIndex({ followsDb: db, followeeHeightsDb })

    const record = followeeHeightsDb.store.get(followeeHeightKey(VIEWER_HASH, 690400, FOLLOWER_A))
    assert.equal(record.followerAddr, FOLLOWER_A)
    assert.equal(record.followeePkHash, VIEWER_HASH)
    assert.equal(record.unfollow, false)
  })
})
