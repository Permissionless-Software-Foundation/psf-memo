import { assert } from 'chai'
import { backfillProfileRecency, partsFromAddrPostHeightKey } from '../../../src/lib/backfill-profile-recency.js'
import { FakeDb } from '../../support/level-double.js'

const ALICE = 'bitcoincash:qaddr-alice'
const BOB = 'bitcoincash:qaddr-bob'
const NOPOST = 'bitcoincash:qaddr-nopost'

function pad (height) {
  return String(height).padStart(12, '0')
}

function addrPostHeightKey (addr, height, txid) {
  return `${addr}:${pad(height)}:${txid}`
}

function fixtureStores () {
  const profilesDb = new FakeDb([
    [ALICE, { text: 'alice bio', txid: 'profile-alice' }],
    [BOB, { text: 'bob bio', txid: 'profile-bob' }],
    [NOPOST, { text: 'nopost bio', txid: 'profile-nopost' }]
  ])

  const postsDb = new FakeDb([
    ['post-a1', { addr: ALICE, seen: 100, blockHeight: 600100 }],
    ['reply-a1', { addr: ALICE, seen: 150, blockHeight: 600300 }],
    ['post-b1', { addr: BOB, seen: 200, blockHeight: 600400 }],
    ['post-b2', { addr: BOB, seen: 250, blockHeight: 600500 }]
  ])

  const addrPostHeightsDb = new FakeDb([
    [addrPostHeightKey(ALICE, 600100, 'post-a1'), { txid: 'post-a1', addr: ALICE, blockHeight: 600100 }],
    [addrPostHeightKey(ALICE, 600300, 'reply-a1'), { txid: 'reply-a1', addr: ALICE, blockHeight: 600300 }],
    [addrPostHeightKey(ALICE, 600200, 'poll-a1'), { txid: 'poll-a1', addr: ALICE, blockHeight: 600200 }],
    [addrPostHeightKey(BOB, 600400, 'post-b1'), { txid: 'post-b1', addr: BOB, blockHeight: 600400 }],
    [addrPostHeightKey(BOB, 600500, 'post-b2'), { txid: 'post-b2', addr: BOB, blockHeight: 600500 }]
  ])

  const postParentsDb = new FakeDb([
    ['reply-a1', { txid: 'reply-a1', parentTxid: 'post-a1' }]
  ])
  const pollsDb = new FakeDb([
    ['poll-a1', { txid: 'poll-a1' }]
  ])
  const statusDb = new FakeDb([
    ['status', { chainBlockHeight: 600450 }]
  ])
  const profileRecencyDb = new FakeDb()

  return { profilesDb, postsDb, addrPostHeightsDb, postParentsDb, pollsDb, statusDb, profileRecencyDb }
}

describe('#backfillProfileRecency', () => {
  it('should record each profile newest confirmed qualifying post', async () => {
    const stores = fixtureStores()

    const result = await backfillProfileRecency(stores)

    assert.equal(result.profiles, 2)
    assert.deepEqual(stores.profileRecencyDb.store.get(ALICE), {
      addr: ALICE, blockHeight: 600100, seen: 100
    })
    assert.deepEqual(stores.profileRecencyDb.store.get(BOB), {
      addr: BOB, blockHeight: 600400, seen: 200
    })
  })

  it('should not record a profile with no qualifying post', async () => {
    const stores = fixtureStores()

    await backfillProfileRecency(stores)

    assert.isFalse(stores.profileRecencyDb.store.has(NOPOST))
  })

  it('should be idempotent', async () => {
    const stores = fixtureStores()

    await backfillProfileRecency(stores)
    const afterFirst = new Map(stores.profileRecencyDb.store)
    await backfillProfileRecency(stores)

    assert.deepEqual(stores.profileRecencyDb.store, afterFirst)
  })

  it('should remove stale recency records for addresses that no longer qualify', async () => {
    const stores = fixtureStores()
    stores.profileRecencyDb.put(NOPOST, { addr: NOPOST, blockHeight: 600900, seen: 9 })

    await backfillProfileRecency(stores)

    assert.isFalse(stores.profileRecencyDb.store.has(NOPOST))
  })
})

describe('#partsFromAddrPostHeightKey', () => {
  it('should recover the address, height, and txid from a key', () => {
    assert.deepEqual(partsFromAddrPostHeightKey(addrPostHeightKey(ALICE, 600100, 'post-a1')), {
      addr: ALICE,
      blockHeight: 600100,
      txid: 'post-a1'
    })
  })
})
