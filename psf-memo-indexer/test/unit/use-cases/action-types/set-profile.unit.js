import { assert } from 'chai'
import { makeMemoryDb } from '../../../support/memory-db.js'
import { handleSetProfile } from '../../../../src/use-cases/action-types/set-profile.js'

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
})
