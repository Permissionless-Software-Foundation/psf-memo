import { assert } from 'chai'
import { makeMemoryDb } from '../../../support/memory-db.js'
import {
  isConfirmed,
  recordProfileRecency,
  establishProfileRecency
} from '../../../../src/use-cases/action-types/profile-recency.js'

const ADDR = 'bitcoincash:qaddr-a'

function pad (height) {
  return String(height).padStart(12, '0')
}

function makeAdapters (overrides = {}) {
  return {
    profileDb: makeMemoryDb(),
    profileRecencyDb: makeMemoryDb(),
    addrPostHeightDb: makeMemoryDb(),
    postParentDb: makeMemoryDb(),
    pollDb: makeMemoryDb(),
    postDb: makeMemoryDb(),
    ...overrides
  }
}

// An adapter set with a stored profile for ADDR, the common precondition of
// the recordProfileRecency tests.
async function makeAdaptersWithProfile (overrides = {}) {
  const adapters = makeAdapters(overrides)
  await adapters.profileDb.update(ADDR, { addr: ADDR, text: 'bio' })
  return adapters
}

function assertRecency (adapters, expected, addr = ADDR) {
  assert.deepEqual(adapters.profileRecencyDb.store.get(addr), { addr, ...expected })
}

async function addAddrPost (adapters, txid, blockHeight, addr = ADDR) {
  await adapters.addrPostHeightDb.update(`${addr}:${pad(blockHeight)}:${txid}`, {
    txid, addr, blockHeight
  })
}

async function addPost (adapters, txid, fields, addr = ADDR) {
  await adapters.postDb.update(txid, { addr, ...fields })
}

describe('#isConfirmed', () => {
  it('should treat a missing block height as unconfirmed', () => {
    assert.isFalse(isConfirmed(null, 600100))
    assert.isFalse(isConfirmed(undefined, 600100))
  })

  it('should treat a post at or below the chain tip as confirmed', () => {
    assert.isTrue(isConfirmed(600100, 600100))
    assert.isTrue(isConfirmed(600099, 600100))
    assert.isFalse(isConfirmed(600101, 600100))
  })

  it('should treat every post as confirmed when there is no chain tip', () => {
    assert.isTrue(isConfirmed(600100, null))
    assert.isTrue(isConfirmed(600100, undefined))
  })
})

describe('#recordProfileRecency', () => {
  it('should record the recency for an author with a profile', async () => {
    const adapters = await makeAdaptersWithProfile()

    await recordProfileRecency(adapters, ADDR, 600100, 1000)

    assertRecency(adapters, { blockHeight: 600100, seen: 1000 })
  })

  it('should not record when the author has no profile', async () => {
    const adapters = makeAdapters()

    await recordProfileRecency(adapters, ADDR, 600100, 1000)

    assert.equal(adapters.profileRecencyDb.store.size, 0)
  })

  it('should not record an unconfirmed post', async () => {
    const adapters = await makeAdaptersWithProfile({
      statusDb: { getStatus: async () => ({ chainBlockHeight: 600050 }) }
    })

    await recordProfileRecency(adapters, ADDR, 600100, 1000)

    assert.equal(adapters.profileRecencyDb.store.size, 0)
  })

  it('should keep the greatest height regardless of processing order', async () => {
    const adapters = await makeAdaptersWithProfile()

    await recordProfileRecency(adapters, ADDR, 600200, 100)
    await recordProfileRecency(adapters, ADDR, 600100, 200)

    assertRecency(adapters, { blockHeight: 600200, seen: 100 })
  })

  it('should keep the greatest seen at an equal height', async () => {
    const adapters = await makeAdaptersWithProfile()

    await recordProfileRecency(adapters, ADDR, 600200, 100)
    await recordProfileRecency(adapters, ADDR, 600200, 300)

    assertRecency(adapters, { blockHeight: 600200, seen: 300 })
  })

  it('should be idempotent for the same post', async () => {
    const adapters = await makeAdaptersWithProfile()

    await recordProfileRecency(adapters, ADDR, 600100, 100)
    await recordProfileRecency(adapters, ADDR, 600100, 100)

    assertRecency(adapters, { blockHeight: 600100, seen: 100 })
  })

  it('should default a missing seen value to 0', async () => {
    const adapters = await makeAdaptersWithProfile()

    await recordProfileRecency(adapters, ADDR, 600100, null)

    assertRecency(adapters, { blockHeight: 600100, seen: 0 })
  })

  it('should treat a recency record missing blockHeight as height 0', async () => {
    const adapters = await makeAdaptersWithProfile()
    await adapters.profileRecencyDb.update(ADDR, { addr: ADDR })

    await recordProfileRecency(adapters, ADDR, 0, 1)

    assertRecency(adapters, { blockHeight: 0, seen: 1 })
  })

  it('should treat a recency record missing seen as seen 0', async () => {
    const adapters = await makeAdaptersWithProfile()
    await adapters.profileRecencyDb.update(ADDR, { addr: ADDR, blockHeight: 600100 })

    await recordProfileRecency(adapters, ADDR, 600100, 1)

    assertRecency(adapters, { blockHeight: 600100, seen: 1 })
  })

  it('should return null when the profileRecency store is not configured', async () => {
    const adapters = await makeAdaptersWithProfile({ profileRecencyDb: undefined })

    const result = await recordProfileRecency(adapters, ADDR, 600100, 100)

    assert.equal(result, null)
  })
})

describe('#establishProfileRecency', () => {
  it('should pick the newest qualifying post and exclude replies and polls', async () => {
    const adapters = makeAdapters()
    await addAddrPost(adapters, 'post-a1', 600100)
    await addAddrPost(adapters, 'poll-a1', 600200)
    await addAddrPost(adapters, 'reply-a1', 600300)
    await addPost(adapters, 'post-a1', { seen: 100, blockHeight: 600100 })
    await adapters.postParentDb.update('reply-a1', { txid: 'reply-a1', parentTxid: 'post-a1' })
    await adapters.pollDb.update('poll-a1', { txid: 'poll-a1' })

    await establishProfileRecency(adapters, ADDR)

    assertRecency(adapters, { blockHeight: 600100, seen: 100 })
  })

  it('should ignore an unconfirmed qualifying post', async () => {
    const adapters = makeAdapters({
      statusDb: { getStatus: async () => ({ chainBlockHeight: 600450 }) }
    })
    const addr = 'bitcoincash:qaddr-b'
    await addAddrPost(adapters, 'post-b2', 600500, addr)
    await addPost(adapters, 'post-b2', { seen: 250, blockHeight: 600500 }, addr)

    await establishProfileRecency(adapters, addr)

    assert.equal(adapters.profileRecencyDb.store.size, 0)
  })

  it('should not record a profile with no qualifying post', async () => {
    const adapters = makeAdapters()

    await establishProfileRecency(adapters, 'bitcoincash:qaddr-nopost')

    assert.equal(adapters.profileRecencyDb.store.size, 0)
  })

  it('should default a missing addrPostHeight block height to 0', async () => {
    const adapters = makeAdapters()
    await adapters.addrPostHeightDb.update(`${ADDR}:${pad(600100)}:post-a1`, {
      txid: 'post-a1', addr: ADDR
    })
    await addPost(adapters, 'post-a1', { seen: 42 })

    await establishProfileRecency(adapters, ADDR)

    assertRecency(adapters, { blockHeight: 0, seen: 42 })
  })

  it('should default a missing post seen to 0', async () => {
    const adapters = makeAdapters()
    await addAddrPost(adapters, 'post-a1', 600100)
    await adapters.postDb.update('post-a1', { addr: ADDR })

    await establishProfileRecency(adapters, ADDR)

    assertRecency(adapters, { blockHeight: 600100, seen: 0 })
  })

  it('should pick the newest of several qualifying posts', async () => {
    const adapters = makeAdapters()
    await addAddrPost(adapters, 'post-a1', 600100)
    await addAddrPost(adapters, 'post-a2', 600300)
    await addPost(adapters, 'post-a1', { seen: 100 })
    await addPost(adapters, 'post-a2', { seen: 300 })

    await establishProfileRecency(adapters, ADDR)

    assertRecency(adapters, { blockHeight: 600300, seen: 300 })
  })

  it('should return null when the addrPostHeight store is not configured', async () => {
    const adapters = makeAdapters({ addrPostHeightDb: undefined })

    const result = await establishProfileRecency(adapters, ADDR)

    assert.equal(result, null)
  })

  it('should treat a status read error as no chain tip', async () => {
    const adapters = makeAdapters({
      statusDb: { getStatus: async () => { throw new Error('status down') } }
    })
    await addAddrPost(adapters, 'post-a1', 600100)
    await addPost(adapters, 'post-a1', { seen: 100 })

    await establishProfileRecency(adapters, ADDR)

    assertRecency(adapters, { blockHeight: 600100, seen: 100 })
  })
})
