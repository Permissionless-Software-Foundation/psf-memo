import { assert } from 'chai'
import sinon from 'sinon'
import ListRecentProfiles from '../../../src/use-cases/list-recent-profiles.js'

describe('#ListRecentProfiles', () => {
  let uut
  let sandbox

  const page = [
    { addr: 'addr-b', text: 'b', txid: 'tx-b', seen: 200, blockHeight: 600200 },
    { addr: 'addr-c', text: 'c', txid: 'tx-c', seen: 50, blockHeight: 600200 }
  ]

  beforeEach(() => {
    sandbox = sinon.createSandbox()
    uut = new ListRecentProfiles({
      adapters: {
        profileQuery: {
          listRecentProfiles: sandbox.stub().resolves({ profiles: [...page], total: 3 }),
          getProfileIdentity: sandbox.stub().resolves({ name: null, profilePicUrl: null })
        }
      }
    })
  })

  afterEach(() => sandbox.restore())

  it('should join each returned profile display name and avatar', async () => {
    uut.adapters.profileQuery.getProfileIdentity.callsFake(async (addr) => {
      if (addr === 'addr-b') {
        return { name: 'Bob', profilePicUrl: 'https://example.com/bob.jpg' }
      }
      return { name: null, profilePicUrl: null }
    })

    const result = await uut.execute({ limit: 10, offset: 0 })

    const bob = result.profiles.find((p) => p.addr === 'addr-b')
    assert.equal(bob.name, 'Bob')
    assert.equal(bob.profilePicUrl, 'https://example.com/bob.jpg')
    const carol = result.profiles.find((p) => p.addr === 'addr-c')
    assert.equal(carol.name, null)
    assert.equal(carol.profilePicUrl, null)
  })

  it('should only join identities for the profiles the adapter returns', async () => {
    await uut.execute({ limit: 2, offset: 1 })

    assert.equal(uut.adapters.profileQuery.getProfileIdentity.callCount, 2)
    assert.equal(uut.adapters.profileQuery.getProfileIdentity.firstCall.args[0], 'addr-b')
    assert.equal(uut.adapters.profileQuery.getProfileIdentity.secondCall.args[0], 'addr-c')
  })

  it('should preserve adapter order and pagination metadata when joining identities', async () => {
    const result = await uut.execute({ limit: 2, offset: 1 })

    assert.deepEqual(result.profiles.map((p) => p.addr), ['addr-b', 'addr-c'])
    assert.equal(result.pagination.total, 3)
    assert.equal(result.pagination.hasMore, false)
  })

  it('should pass limit and offset through to the adapter', async () => {
    await uut.execute({ limit: 7, offset: 14 })

    assert.deepEqual(uut.adapters.profileQuery.listRecentProfiles.firstCall.args[0], {
      limit: 7,
      offset: 14
    })
  })

  it('should default limit to 100 and offset to 0', async () => {
    const result = await uut.execute({})

    assert.equal(result.pagination.limit, 100)
    assert.equal(result.pagination.offset, 0)
  })

  it('should reject limit over 100', async () => {
    try {
      await uut.execute({ limit: 101 })
      assert.fail('Expected error')
    } catch (err) {
      assert.equal(err.status, 400)
      assert.include(err.message, 'limit cannot exceed')
    }
  })
})
