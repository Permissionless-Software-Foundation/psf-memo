import { assert } from 'chai'
import { makeMemoryDb } from '../../../support/memory-db.js'
import { handleSetProfile } from '../../../../src/use-cases/action-types/set-profile.js'
import { MAX_POST_SIZE } from '../../../../src/lib/memo-codes.js'

const PREFIX_SET_PROFILE = Buffer.from('6d05', 'hex')

function makeAdapters () {
  return {
    profileDb: makeMemoryDb(),
    profileRecencyDb: makeMemoryDb(),
    addrPostHeightDb: makeMemoryDb(),
    postDb: makeMemoryDb(),
    postParentDb: makeMemoryDb(),
    pollDb: makeMemoryDb(),
    processErrorDb: makeMemoryDb()
  }
}

describe('#handleSetProfile', () => {
  it('should establish recency from the newest existing qualifying post', async () => {
    const adapters = makeAdapters()
    await adapters.addrPostHeightDb.update('bitcoincash:qaddr-a:000000600100:post-a1', {
      txid: 'post-a1', addr: 'bitcoincash:qaddr-a', blockHeight: 600100
    })
    await adapters.addrPostHeightDb.update('bitcoincash:qaddr-a:000000600300:reply-a1', {
      txid: 'reply-a1', addr: 'bitcoincash:qaddr-a', blockHeight: 600300
    })
    await adapters.postDb.update('post-a1', { addr: 'bitcoincash:qaddr-a', seen: 100, blockHeight: 600100 })
    await adapters.postParentDb.update('reply-a1', { txid: 'reply-a1', parentTxid: 'post-a1' })

    await handleSetProfile({
      adapters,
      txid: 'profile-a1',
      signerAddr: 'bitcoincash:qaddr-a',
      seen: 500,
      blockHeight: 600400,
      decoded: {
        action: 'setProfile',
        prefix: PREFIX_SET_PROFILE,
        pushDatas: [PREFIX_SET_PROFILE, Buffer.from('my bio')]
      }
    })

    assert.deepEqual(adapters.profileRecencyDb.store.get('bitcoincash:qaddr-a'), {
      addr: 'bitcoincash:qaddr-a',
      blockHeight: 600100,
      seen: 100
    })
    assert.equal(adapters.profileDb.store.get('bitcoincash:qaddr-a').text, 'my bio')
  })

  it('should not create a recency record when the address has no qualifying post', async () => {
    const adapters = makeAdapters()

    await handleSetProfile({
      adapters,
      txid: 'profile-a1',
      signerAddr: 'bitcoincash:qaddr-a',
      seen: 500,
      blockHeight: 600400,
      decoded: {
        action: 'setProfile',
        prefix: PREFIX_SET_PROFILE,
        pushDatas: [PREFIX_SET_PROFILE, Buffer.from('my bio')]
      }
    })

    assert.equal(adapters.profileRecencyDb.store.size, 0)
  })

  it('should accept a profile whose text is exactly the maximum size', async () => {
    const adapters = makeAdapters()
    const text = 'a'.repeat(MAX_POST_SIZE)

    await handleSetProfile({
      adapters,
      txid: 'profile-a1',
      signerAddr: 'bitcoincash:qaddr-a',
      seen: 500,
      blockHeight: 600400,
      decoded: {
        action: 'setProfile',
        prefix: PREFIX_SET_PROFILE,
        pushDatas: [PREFIX_SET_PROFILE, Buffer.from(text)]
      }
    })

    assert.equal(adapters.profileDb.store.get('bitcoincash:qaddr-a').text.length, MAX_POST_SIZE)
  })

  it('should reject a profile larger than the maximum size', async () => {
    const adapters = makeAdapters()
    const text = 'a'.repeat(MAX_POST_SIZE + 1)

    await handleSetProfile({
      adapters,
      txid: 'profile-a1',
      signerAddr: 'bitcoincash:qaddr-a',
      seen: 500,
      blockHeight: 600400,
      decoded: {
        action: 'setProfile',
        prefix: PREFIX_SET_PROFILE,
        pushDatas: [PREFIX_SET_PROFILE, Buffer.from(text)]
      }
    })

    assert.isFalse(adapters.profileDb.store.has('bitcoincash:qaddr-a'))
  })
})
