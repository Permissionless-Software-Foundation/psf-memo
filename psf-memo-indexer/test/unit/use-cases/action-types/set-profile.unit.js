import { assert } from 'chai'
import { makeMemoryDb } from '../../../support/memory-db.js'
import { handleSetProfile } from '../../../../src/use-cases/action-types/set-profile.js'
import { MAX_POST_SIZE } from '../../../../src/lib/memo-codes.js'

const PREFIX_SET_PROFILE = Buffer.from('6d05', 'hex')

function makeAdapters (overrides = {}) {
  return {
    profileDb: makeMemoryDb(),
    profileRecencyDb: makeMemoryDb(),
    newestQualifyingPost: { get: async () => null },
    processErrorDb: makeMemoryDb(),
    ...overrides
  }
}

function setProfileCtx (adapters, { text = 'my bio', addr = 'bitcoincash:qaddr-a' } = {}) {
  return {
    adapters,
    txid: 'profile-a1',
    signerAddr: addr,
    seen: 500,
    blockHeight: 600400,
    decoded: {
      action: 'setProfile',
      prefix: PREFIX_SET_PROFILE,
      pushDatas: [PREFIX_SET_PROFILE, Buffer.from(text)]
    }
  }
}

describe('#handleSetProfile', () => {
  it('should establish recency from the newest qualifying post read from psf-memo-db', async () => {
    const reads = []
    const adapters = makeAdapters({
      newestQualifyingPost: {
        get: async (addr) => {
          reads.push(addr)
          return { addr, blockHeight: 600100, seen: 100 }
        }
      }
    })

    await handleSetProfile(setProfileCtx(adapters))

    assert.deepEqual(adapters.profileRecencyDb.store.get('bitcoincash:qaddr-a'), {
      addr: 'bitcoincash:qaddr-a',
      blockHeight: 600100,
      seen: 100
    })
    assert.equal(adapters.profileDb.store.get('bitcoincash:qaddr-a').text, 'my bio')
    assert.deepEqual(reads, ['bitcoincash:qaddr-a'])
  })

  it('should not create a recency record when the address has no qualifying post', async () => {
    const adapters = makeAdapters()

    await handleSetProfile(setProfileCtx(adapters))

    assert.equal(adapters.profileRecencyDb.store.size, 0)
  })

  it('should accept a profile whose text is exactly the maximum size', async () => {
    const adapters = makeAdapters()
    const text = 'a'.repeat(MAX_POST_SIZE)

    await handleSetProfile(setProfileCtx(adapters, { text }))

    assert.equal(adapters.profileDb.store.get('bitcoincash:qaddr-a').text.length, MAX_POST_SIZE)
  })

  it('should reject a profile larger than the maximum size', async () => {
    const adapters = makeAdapters()
    const text = 'a'.repeat(MAX_POST_SIZE + 1)

    await handleSetProfile(setProfileCtx(adapters, { text }))

    assert.isFalse(adapters.profileDb.store.has('bitcoincash:qaddr-a'))
  })
})
