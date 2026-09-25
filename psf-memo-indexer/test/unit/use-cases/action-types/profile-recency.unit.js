import { assert } from 'chai'
import { makeMemoryDb } from '../../../support/memory-db.js'
import {
  isConfirmed,
  recordProfileRecency,
  establishProfileRecency
} from '../../../../src/use-cases/action-types/profile-recency.js'

const ADDR = 'bitcoincash:qaddr-a'

function makeAdapters (overrides = {}) {
  return {
    profileDb: makeMemoryDb(),
    profileRecencyDb: makeMemoryDb(),
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
  function makeEstablishAdapters (post, overrides = {}) {
    const reads = []
    const newestQualifyingPost = {
      get: async (addr) => {
        reads.push(addr)
        return post
      }
    }
    return { adapters: makeAdapters({ newestQualifyingPost, ...overrides }), reads }
  }

  it('should record the newest qualifying post returned by the db read API', async () => {
    const { adapters, reads } = makeEstablishAdapters({
      addr: ADDR, blockHeight: 600100, seen: 100
    })

    await establishProfileRecency(adapters, ADDR)

    assertRecency(adapters, { blockHeight: 600100, seen: 100 })
    assert.deepEqual(reads, [ADDR])
  })

  it('should not record when the read API returns no qualifying post', async () => {
    const { adapters } = makeEstablishAdapters(null)

    await establishProfileRecency(adapters, ADDR)

    assert.equal(adapters.profileRecencyDb.store.size, 0)
  })

  it('should default a missing block height and seen to 0', async () => {
    const { adapters } = makeEstablishAdapters({ addr: ADDR })

    await establishProfileRecency(adapters, ADDR)

    assertRecency(adapters, { blockHeight: 0, seen: 0 })
  })

  it('should return null when the read API adapter is not configured', async () => {
    const adapters = makeAdapters()

    const result = await establishProfileRecency(adapters, ADDR)

    assert.equal(result, null)
  })

  it('should return null when the profileRecency store is not configured', async () => {
    const { adapters } = makeEstablishAdapters(
      { addr: ADDR, blockHeight: 600100, seen: 100 },
      { profileRecencyDb: undefined }
    )

    const result = await establishProfileRecency(adapters, ADDR)

    assert.equal(result, null)
  })
})
