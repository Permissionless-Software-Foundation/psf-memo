import { assert } from 'chai'
import sinon from 'sinon'
import ListRecentProfiles from '../../../src/use-cases/list-recent-profiles.js'

describe('#ListRecentProfiles', () => {
  let uut
  let sandbox

  const mockProfiles = [
    { addr: 'addr-a', text: 'a', txid: 'tx-a', seen: 100, blockHeight: 600100 },
    { addr: 'addr-b', text: 'b', txid: 'tx-b', seen: 200, blockHeight: 600200 },
    { addr: 'addr-c', text: 'c', txid: 'tx-c', seen: 50, blockHeight: 600200 }
  ]

  beforeEach(() => {
    sandbox = sinon.createSandbox()
    uut = new ListRecentProfiles({
      adapters: {
        profileQuery: {
          scanProfilesWithBlockHeight: sandbox.stub().resolves([...mockProfiles])
        }
      }
    })
  })

  afterEach(() => sandbox.restore())

  it('should return profiles sorted by block height descending', async () => {
    const result = await uut.execute({ limit: 10, offset: 0 })

    assert.equal(result.profiles.length, 3)
    assert.equal(result.profiles[0].addr, 'addr-b')
    assert.equal(result.profiles[1].addr, 'addr-c')
    assert.equal(result.profiles[2].addr, 'addr-a')
    assert.equal(result.pagination.total, 3)
    assert.equal(result.pagination.hasMore, false)
  })

  it('should paginate with limit and offset', async () => {
    const result = await uut.execute({ limit: 1, offset: 1 })

    assert.equal(result.profiles.length, 1)
    assert.equal(result.profiles[0].addr, 'addr-c')
    assert.equal(result.pagination.limit, 1)
    assert.equal(result.pagination.offset, 1)
    assert.equal(result.pagination.hasMore, true)
  })

  it('should default limit to 100 and offset to 0', async () => {
    const result = await uut.execute({})

    assert.equal(result.pagination.limit, 100)
    assert.equal(result.pagination.offset, 0)
  })

  it('should sort equal-height profiles by seen descending, falsy seen last', async () => {
    // Same blockHeight so only the `seen` tie-break matters. The dataset mixes
    // truthy and falsy (0) seen values; a broken comparator is observable here
    // because the falsy profiles are not already in descending input order.
    const ties = [
      { addr: 'addr-a', txid: 't-a', seen: 0, blockHeight: 700000 },
      { addr: 'addr-b', txid: 't-b', seen: 0, blockHeight: 700000 },
      { addr: 'addr-c', txid: 't-c', seen: 1, blockHeight: 700000 }
    ]
    uut.adapters.profileQuery.scanProfilesWithBlockHeight.resolves(ties)

    const result = await uut.execute({ limit: 10, offset: 0 })

    assert.deepEqual(result.profiles.map((p) => p.addr), ['addr-c', 'addr-a', 'addr-b'])
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
