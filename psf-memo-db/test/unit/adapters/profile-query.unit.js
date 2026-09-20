import { assert } from 'chai'
import sinon from 'sinon'
import ProfileQuery from '../../../src/adapters/profile-query.js'

describe('#ProfileQuery', () => {
  let uut
  let sandbox
  let profilesDb
  let namesDb
  let profilePicsDb

  beforeEach(() => {
    sandbox = sinon.createSandbox()
    profilesDb = {
      iterator: sandbox.stub()
    }
    namesDb = {
      get: sandbox.stub()
    }
    profilePicsDb = {
      get: sandbox.stub()
    }
    uut = new ProfileQuery({ profilesDb, namesDb, profilePicsDb })
  })

  afterEach(() => sandbox.restore())

  it('should scan profiles and read block height from stored document', async () => {
    async function * mockIterator () {
      yield ['addr1', { text: 'hi', txid: 'tx1', seen: 1000, blockHeight: 600100 }]
      yield ['addr2', { text: 'bye', txid: 'tx2', seen: 2000, blockHeight: 600200 }]
    }
    profilesDb.iterator.returns(mockIterator())

    const result = await uut.scanProfilesWithBlockHeight()

    assert.equal(result.length, 2)
    assert.equal(result[0].blockHeight, 600100)
    assert.equal(result[1].blockHeight, 600200)
  })

  it('should use block height 0 when field is missing', async () => {
    async function * mockIterator () {
      yield ['addr1', { text: 'hi', txid: 'tx1', seen: 1000 }]
    }
    profilesDb.iterator.returns(mockIterator())

    const result = await uut.scanProfilesWithBlockHeight()

    assert.equal(result[0].blockHeight, 0)
  })

  it('should join the display name and avatar for an address', async () => {
    namesDb.get.withArgs('addr1').resolves({ name: 'Alice', txid: 'name-1', blockHeight: 600250 })
    profilePicsDb.get.withArgs('addr1').resolves({ url: 'https://example.com/alice.png', txid: 'pic-1', blockHeight: 600260 })

    const identity = await uut.getProfileIdentity('addr1')

    assert.deepEqual(identity, {
      name: 'Alice',
      profilePicUrl: 'https://example.com/alice.png'
    })
  })

  it('should report null identity fields when both records are missing', async () => {
    const notFound = new Error('not found')
    notFound.notFound = true
    namesDb.get.rejects(notFound)
    profilePicsDb.get.rejects(notFound)

    const identity = await uut.getProfileIdentity('addr1')

    assert.deepEqual(identity, { name: null, profilePicUrl: null })
  })

  it('should resolve each identity field independently', async () => {
    namesDb.get.resolves({ name: 'Bob' })
    const notFound = new Error('not found')
    notFound.code = 'LEVEL_NOT_FOUND'
    profilePicsDb.get.rejects(notFound)

    const identity = await uut.getProfileIdentity('addr2')

    assert.equal(identity.name, 'Bob')
    assert.equal(identity.profilePicUrl, null)
  })

  it('should rethrow unexpected lookup errors', async () => {
    namesDb.get.rejects(new Error('lookup boom'))
    profilePicsDb.get.resolves(null)

    try {
      await uut.getProfileIdentity('addr1')
      assert.fail('Expected error')
    } catch (err) {
      assert.equal(err.message, 'lookup boom')
    }
  })

  it('should report a null identity when a store is not configured', async () => {
    const uutWithoutStores = new ProfileQuery({ profilesDb })

    const identity = await uutWithoutStores.getProfileIdentity('addr1')

    assert.deepEqual(identity, { name: null, profilePicUrl: null })
  })
})
