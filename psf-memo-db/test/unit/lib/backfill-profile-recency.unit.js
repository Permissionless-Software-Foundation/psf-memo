import { assert } from 'chai'
import { backfillProfileRecency } from '../../../src/lib/backfill-profile-recency.js'
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

  it('should rethrow an unexpected store error instead of treating it as not found', async () => {
    const stores = fixtureStores()
    stores.profilesDb.get = async () => { throw new Error('store boom') }

    const error = await backfillProfileRecency(stores).catch((err) => err)

    assert.equal(error?.message, 'store boom')
  })

  it('should treat every entry as confirmed when the status store has no chain tip', async () => {
    const stores = fixtureStores()
    stores.statusDb = new FakeDb()

    await backfillProfileRecency(stores)

    // With no tip, Bob's unconfirmed post-b2 at 600500 is the newest.
    assert.deepEqual(stores.profileRecencyDb.store.get(BOB), {
      addr: BOB, blockHeight: 600500, seen: 250
    })
  })

  it('should treat a post exactly at the chain tip as confirmed', async () => {
    const stores = fixtureStores()
    stores.statusDb = new FakeDb([['status', { chainBlockHeight: 600500 }]])

    await backfillProfileRecency(stores)

    assert.deepEqual(stores.profileRecencyDb.store.get(BOB), {
      addr: BOB, blockHeight: 600500, seen: 250
    })
  })

  it('should not record a qualifying post from an address without a profile', async () => {
    const stores = fixtureStores()
    const noprofile = 'bitcoincash:qaddr-noprofile'
    stores.addrPostHeightsDb.put(addrPostHeightKey(noprofile, 600100, 'post-np'), {
      txid: 'post-np', addr: noprofile, blockHeight: 600100
    })
    stores.postsDb.put('post-np', { addr: noprofile, seen: 50, blockHeight: 600100 })

    await backfillProfileRecency(stores)

    assert.isFalse(stores.profileRecencyDb.store.has(noprofile))
  })

  it('should ignore an addrPostHeights entry with no txid', async () => {
    const stores = fixtureStores()
    stores.addrPostHeightsDb.put(addrPostHeightKey(ALICE, 600350, ''), null)

    await backfillProfileRecency(stores)

    // The malformed entry must not displace Alice's real post-a1.
    assert.deepEqual(stores.profileRecencyDb.store.get(ALICE), {
      addr: ALICE, blockHeight: 600100, seen: 100
    })
  })

  it('should default the seen time to 0 when the post record is missing', async () => {
    const stores = fixtureStores()
    const ghost = 'bitcoincash:qaddr-ghost'
    stores.profilesDb.put(ghost, { text: 'ghost bio', txid: 'profile-ghost' })
    stores.addrPostHeightsDb.put(addrPostHeightKey(ghost, 600100, 'post-ghost'), {
      txid: 'post-ghost', addr: ghost, blockHeight: 600100
    })

    await backfillProfileRecency(stores)

    assert.deepEqual(stores.profileRecencyDb.store.get(ghost), {
      addr: ghost, blockHeight: 600100, seen: 0
    })
  })

  it('should tolerate missing optional reply/poll stores', async () => {
    const stores = fixtureStores()
    delete stores.postParentsDb
    delete stores.pollsDb

    await backfillProfileRecency(stores)

    // Without the reply store, reply-a1 at 600300 becomes Alice's newest.
    assert.deepEqual(stores.profileRecencyDb.store.get(ALICE), {
      addr: ALICE, blockHeight: 600300, seen: 150
    })
  })

  it('should pick the greater seen time for two posts at equal height', async () => {
    const stores = fixtureStores()
    const tie = 'bitcoincash:qaddr-tie'
    stores.profilesDb.put(tie, { text: 'tie bio', txid: 'profile-tie' })
    stores.addrPostHeightsDb.put(addrPostHeightKey(tie, 600100, 'post-t1'), {
      txid: 'post-t1', addr: tie, blockHeight: 600100
    })
    stores.addrPostHeightsDb.put(addrPostHeightKey(tie, 600100, 'post-t2'), {
      txid: 'post-t2', addr: tie, blockHeight: 600100
    })
    stores.postsDb.put('post-t1', { addr: tie, seen: 50, blockHeight: 600100 })
    stores.postsDb.put('post-t2', { addr: tie, seen: 80, blockHeight: 600100 })

    await backfillProfileRecency(stores)

    assert.deepEqual(stores.profileRecencyDb.store.get(tie), {
      addr: tie, blockHeight: 600100, seen: 80
    })
  })
})
