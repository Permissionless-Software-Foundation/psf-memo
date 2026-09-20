import { assert } from 'chai'
import { makeMemoryDb } from '../../../support/memory-db.js'
import {
  recordProfileRecency,
  establishProfileRecency
} from '../../../../src/use-cases/action-types/profile-recency.js'

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

describe('#recordProfileRecency', () => {
  it('should record the recency for an author with a profile', async () => {
    const adapters = makeAdapters()
    await adapters.profileDb.update('bitcoincash:qaddr-a', { addr: 'bitcoincash:qaddr-a', text: 'bio' })

    await recordProfileRecency(adapters, 'bitcoincash:qaddr-a', 600100, 1000)

    assert.deepEqual(adapters.profileRecencyDb.store.get('bitcoincash:qaddr-a'), {
      addr: 'bitcoincash:qaddr-a',
      blockHeight: 600100,
      seen: 1000
    })
  })

  it('should not record when the author has no profile', async () => {
    const adapters = makeAdapters()

    await recordProfileRecency(adapters, 'bitcoincash:qaddr-a', 600100, 1000)

    assert.equal(adapters.profileRecencyDb.store.size, 0)
  })

  it('should not record an unconfirmed post', async () => {
    const adapters = makeAdapters({
      statusDb: { getStatus: async () => ({ chainBlockHeight: 600050 }) }
    })
    await adapters.profileDb.update('bitcoincash:qaddr-a', { addr: 'bitcoincash:qaddr-a', text: 'bio' })

    await recordProfileRecency(adapters, 'bitcoincash:qaddr-a', 600100, 1000)

    assert.equal(adapters.profileRecencyDb.store.size, 0)
  })

  it('should keep the greatest height regardless of processing order', async () => {
    const adapters = makeAdapters()
    await adapters.profileDb.update('bitcoincash:qaddr-a', { addr: 'bitcoincash:qaddr-a', text: 'bio' })

    await recordProfileRecency(adapters, 'bitcoincash:qaddr-a', 600200, 100)
    await recordProfileRecency(adapters, 'bitcoincash:qaddr-a', 600100, 200)

    assert.equal(adapters.profileRecencyDb.store.get('bitcoincash:qaddr-a').blockHeight, 600200)
    assert.equal(adapters.profileRecencyDb.store.get('bitcoincash:qaddr-a').seen, 100)
  })

  it('should keep the greatest seen at an equal height', async () => {
    const adapters = makeAdapters()
    await adapters.profileDb.update('bitcoincash:qaddr-a', { addr: 'bitcoincash:qaddr-a', text: 'bio' })

    await recordProfileRecency(adapters, 'bitcoincash:qaddr-a', 600200, 100)
    await recordProfileRecency(adapters, 'bitcoincash:qaddr-a', 600200, 300)

    assert.equal(adapters.profileRecencyDb.store.get('bitcoincash:qaddr-a').seen, 300)
  })

  it('should be idempotent for the same post', async () => {
    const adapters = makeAdapters()
    await adapters.profileDb.update('bitcoincash:qaddr-a', { addr: 'bitcoincash:qaddr-a', text: 'bio' })

    await recordProfileRecency(adapters, 'bitcoincash:qaddr-a', 600100, 100)
    await recordProfileRecency(adapters, 'bitcoincash:qaddr-a', 600100, 100)

    assert.deepEqual(adapters.profileRecencyDb.store.get('bitcoincash:qaddr-a'), {
      addr: 'bitcoincash:qaddr-a',
      blockHeight: 600100,
      seen: 100
    })
  })
})

describe('#establishProfileRecency', () => {
  it('should pick the newest qualifying post and exclude replies and polls', async () => {
    const adapters = makeAdapters()
    await adapters.addrPostHeightDb.update('bitcoincash:qaddr-a:000000600100:post-a1', {
      txid: 'post-a1', addr: 'bitcoincash:qaddr-a', blockHeight: 600100
    })
    await adapters.addrPostHeightDb.update('bitcoincash:qaddr-a:000000600200:poll-a1', {
      txid: 'poll-a1', addr: 'bitcoincash:qaddr-a', blockHeight: 600200
    })
    await adapters.addrPostHeightDb.update('bitcoincash:qaddr-a:000000600300:reply-a1', {
      txid: 'reply-a1', addr: 'bitcoincash:qaddr-a', blockHeight: 600300
    })
    await adapters.postDb.update('post-a1', { addr: 'bitcoincash:qaddr-a', seen: 100, blockHeight: 600100 })
    await adapters.postParentDb.update('reply-a1', { txid: 'reply-a1', parentTxid: 'post-a1' })
    await adapters.pollDb.update('poll-a1', { txid: 'poll-a1' })

    await establishProfileRecency(adapters, 'bitcoincash:qaddr-a')

    assert.deepEqual(adapters.profileRecencyDb.store.get('bitcoincash:qaddr-a'), {
      addr: 'bitcoincash:qaddr-a',
      blockHeight: 600100,
      seen: 100
    })
  })

  it('should ignore an unconfirmed qualifying post', async () => {
    const adapters = makeAdapters({
      statusDb: { getStatus: async () => ({ chainBlockHeight: 600450 }) }
    })
    await adapters.addrPostHeightDb.update('bitcoincash:qaddr-b:000000600500:post-b2', {
      txid: 'post-b2', addr: 'bitcoincash:qaddr-b', blockHeight: 600500
    })
    await adapters.postDb.update('post-b2', { addr: 'bitcoincash:qaddr-b', seen: 250, blockHeight: 600500 })

    await establishProfileRecency(adapters, 'bitcoincash:qaddr-b')

    assert.equal(adapters.profileRecencyDb.store.size, 0)
  })

  it('should not record a profile with no qualifying post', async () => {
    const adapters = makeAdapters()

    await establishProfileRecency(adapters, 'bitcoincash:qaddr-nopost')

    assert.equal(adapters.profileRecencyDb.store.size, 0)
  })
})
