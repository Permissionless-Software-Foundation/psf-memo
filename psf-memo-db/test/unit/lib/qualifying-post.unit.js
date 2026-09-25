import { assert } from 'chai'
import {
  findNewestQualifyingPost,
  partsFromAddrPostHeightKey
} from '../../../src/lib/qualifying-post.js'
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

  return { profilesDb, postsDb, addrPostHeightsDb, postParentsDb, pollsDb, statusDb }
}

describe('#findNewestQualifyingPost', () => {
  it('should return the newest confirmed qualifying post for the address', async () => {
    const stores = fixtureStores()

    const alice = await findNewestQualifyingPost(stores, ALICE)
    const bob = await findNewestQualifyingPost(stores, BOB)

    assert.deepEqual(alice, { addr: ALICE, blockHeight: 600100, seen: 100 })
    assert.deepEqual(bob, { addr: BOB, blockHeight: 600400, seen: 200 })
  })

  it('should exclude replies and poll creations', async () => {
    const stores = fixtureStores()
    // The reply at 600300 and the poll at 600200 are both newer than the real
    // post, so a query that ignored them would return the wrong height.
    stores.statusDb = new FakeDb([['status', { chainBlockHeight: 700000 }]])

    const alice = await findNewestQualifyingPost(stores, ALICE)

    assert.deepEqual(alice, { addr: ALICE, blockHeight: 600100, seen: 100 })
  })

  it('should ignore an unconfirmed qualifying post', async () => {
    const stores = fixtureStores()

    // Bob's newest post is post-b2 at 600500, above the 600450 chain tip.
    const bob = await findNewestQualifyingPost(stores, BOB)

    assert.deepEqual(bob, { addr: BOB, blockHeight: 600400, seen: 200 })
  })

  it('should return null for an address with no qualifying post', async () => {
    const stores = fixtureStores()

    const result = await findNewestQualifyingPost(stores, NOPOST)

    assert.equal(result, null)
  })

  it('should only consider entries for the requested address', async () => {
    const stores = fixtureStores()

    // Alice's only qualifying post is at 600100; Bob has a newer post at
    // 600400. A query without address scoping would return Bob's.
    const alice = await findNewestQualifyingPost(stores, ALICE)

    assert.equal(alice.addr, ALICE)
    assert.equal(alice.blockHeight, 600100)
  })

  it('should pick the greater seen time at equal height', async () => {
    const stores = fixtureStores()
    const tie = 'bitcoincash:qaddr-tie'
    stores.addrPostHeightsDb.put(addrPostHeightKey(tie, 600100, 'post-t1'), {
      txid: 'post-t1', addr: tie, blockHeight: 600100
    })
    stores.addrPostHeightsDb.put(addrPostHeightKey(tie, 600100, 'post-t2'), {
      txid: 'post-t2', addr: tie, blockHeight: 600100
    })
    stores.postsDb.put('post-t1', { addr: tie, seen: 50, blockHeight: 600100 })
    stores.postsDb.put('post-t2', { addr: tie, seen: 80, blockHeight: 600100 })

    const result = await findNewestQualifyingPost(stores, tie)

    assert.deepEqual(result, { addr: tie, blockHeight: 600100, seen: 80 })
  })

  it('should default the seen time to 0 when the post record is missing', async () => {
    const stores = fixtureStores()
    const ghost = 'bitcoincash:qaddr-ghost'
    stores.addrPostHeightsDb.put(addrPostHeightKey(ghost, 600100, 'post-ghost'), {
      txid: 'post-ghost', addr: ghost, blockHeight: 600100
    })

    const result = await findNewestQualifyingPost(stores, ghost)

    assert.deepEqual(result, { addr: ghost, blockHeight: 600100, seen: 0 })
  })

  it('should treat every entry as confirmed when the status store has no tip', async () => {
    const stores = fixtureStores()
    stores.statusDb = new FakeDb()

    const bob = await findNewestQualifyingPost(stores, BOB)

    assert.deepEqual(bob, { addr: BOB, blockHeight: 600500, seen: 250 })
  })

  it('should tolerate missing optional reply/poll stores', async () => {
    const stores = fixtureStores()
    delete stores.postParentsDb
    delete stores.pollsDb

    const alice = await findNewestQualifyingPost(stores, ALICE)

    // Without the reply store, reply-a1 at 600300 becomes Alice's newest.
    assert.deepEqual(alice, { addr: ALICE, blockHeight: 600300, seen: 150 })
  })

  it('should ignore an addrPostHeights entry with no txid', async () => {
    const stores = fixtureStores()
    stores.addrPostHeightsDb.put(addrPostHeightKey(ALICE, 600350, ''), null)

    const alice = await findNewestQualifyingPost(stores, ALICE)

    assert.deepEqual(alice, { addr: ALICE, blockHeight: 600100, seen: 100 })
  })

  it('should rethrow an unexpected store error instead of treating it as not found', async () => {
    const stores = fixtureStores()
    stores.postsDb.get = async () => { throw new Error('store boom') }

    let error
    try {
      await findNewestQualifyingPost(stores, ALICE)
    } catch (err) {
      error = err
    }

    assert.equal(error?.message, 'store boom')
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
