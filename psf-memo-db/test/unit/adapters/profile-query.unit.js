import { assert } from 'chai'
import sinon from 'sinon'
import ProfileQuery from '../../../src/adapters/profile-query.js'

describe('#ProfileQuery', () => {
  let uut
  let sandbox
  let profilesDb
  let profileRecencyDb
  let namesDb
  let profilePicsDb

  beforeEach(() => {
    sandbox = sinon.createSandbox()
    profilesDb = { get: sandbox.stub(), iterator: sandbox.stub() }
    profileRecencyDb = { iterator: sandbox.stub() }
    namesDb = { get: sandbox.stub() }
    profilePicsDb = { get: sandbox.stub() }
    uut = new ProfileQuery({ profilesDb, namesDb, profilePicsDb, profileRecencyDb })
  })

  afterEach(() => sandbox.restore())

  function stubRecency (records) {
    profileRecencyDb.iterator.returns((async function * () {
      for (const [addr, record] of Object.entries(records)) {
        yield [addr, record]
      }
    })())
  }

  function stubProfiles (profiles) {
    profilesDb.get.callsFake(async (addr) => {
      if (Object.prototype.hasOwnProperty.call(profiles, addr)) return profiles[addr]
      const err = new Error('not found')
      err.notFound = true
      throw err
    })
  }

  it('should order profiles by post height descending, then seen descending, then address ascending', async () => {
    stubRecency({
      'bitcoincash:qaddr-alice': { addr: 'bitcoincash:qaddr-alice', blockHeight: 600300, seen: 300 },
      'bitcoincash:qaddr-bob': { addr: 'bitcoincash:qaddr-bob', blockHeight: 600300, seen: 200 },
      'bitcoincash:qaddr-erin': { addr: 'bitcoincash:qaddr-erin', blockHeight: 600300, seen: 200 },
      'bitcoincash:qaddr-carol': { addr: 'bitcoincash:qaddr-carol', blockHeight: 600200, seen: 400 }
    })
    stubProfiles({
      'bitcoincash:qaddr-alice': { text: 'alice bio', txid: 'profile-alice' },
      'bitcoincash:qaddr-bob': { text: 'bob bio', txid: 'profile-bob' },
      'bitcoincash:qaddr-erin': { text: 'erin bio', txid: 'profile-erin' },
      'bitcoincash:qaddr-carol': { text: 'carol bio', txid: 'profile-carol' }
    })

    const { profiles, total } = await uut.listRecentProfiles({ limit: 5, offset: 0 })

    assert.equal(total, 4)
    assert.deepEqual(profiles.map((p) => p.addr), [
      'bitcoincash:qaddr-alice',
      'bitcoincash:qaddr-bob',
      'bitcoincash:qaddr-erin',
      'bitcoincash:qaddr-carol'
    ])
  })

  it('should report the recency block height and seen, not the profile record values', async () => {
    stubRecency({
      'bitcoincash:qaddr-alice': { addr: 'bitcoincash:qaddr-alice', blockHeight: 600300, seen: 300 }
    })
    stubProfiles({
      'bitcoincash:qaddr-alice': { text: 'alice bio', txid: 'profile-alice', blockHeight: 600010, seen: 10 }
    })

    const { profiles } = await uut.listRecentProfiles({ limit: 5, offset: 0 })

    assert.deepEqual(profiles[0], {
      addr: 'bitcoincash:qaddr-alice',
      text: 'alice bio',
      txid: 'profile-alice',
      blockHeight: 600300,
      seen: 300
    })
  })

  it('should paginate the ordered recency entries', async () => {
    stubRecency({
      'bitcoincash:qaddr-a': { addr: 'bitcoincash:qaddr-a', blockHeight: 600300, seen: 3 },
      'bitcoincash:qaddr-b': { addr: 'bitcoincash:qaddr-b', blockHeight: 600200, seen: 2 },
      'bitcoincash:qaddr-c': { addr: 'bitcoincash:qaddr-c', blockHeight: 600100, seen: 1 }
    })
    stubProfiles({
      'bitcoincash:qaddr-a': { text: 'a bio', txid: 'profile-a' },
      'bitcoincash:qaddr-b': { text: 'b bio', txid: 'profile-b' },
      'bitcoincash:qaddr-c': { text: 'c bio', txid: 'profile-c' }
    })

    const { profiles, total } = await uut.listRecentProfiles({ limit: 1, offset: 1 })

    assert.equal(total, 3)
    assert.deepEqual(profiles.map((p) => p.addr), ['bitcoincash:qaddr-b'])
  })

  it('should omit a recency record whose profile is missing', async () => {
    stubRecency({
      'bitcoincash:qaddr-a': { addr: 'bitcoincash:qaddr-a', blockHeight: 600300, seen: 3 },
      'bitcoincash:qaddr-gone': { addr: 'bitcoincash:qaddr-gone', blockHeight: 600200, seen: 2 }
    })
    stubProfiles({
      'bitcoincash:qaddr-a': { text: 'a bio', txid: 'profile-a' }
    })

    const { profiles } = await uut.listRecentProfiles({ limit: 5, offset: 0 })

    assert.deepEqual(profiles.map((p) => p.addr), ['bitcoincash:qaddr-a'])
  })

  it('should return an empty page when no recency store is configured', async () => {
    const uutWithoutRecency = new ProfileQuery({ profilesDb })

    const { profiles, total } = await uutWithoutRecency.listRecentProfiles({ limit: 5, offset: 0 })

    assert.deepEqual(profiles, [])
    assert.equal(total, 0)
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
