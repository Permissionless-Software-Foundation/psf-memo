import { assert } from 'chai'
import sinon from 'sinon'
import SearchAll from '../../../src/use-cases/search-all.js'

describe('#SearchAll', () => {
  let uut
  let sandbox
  let searchQuery

  beforeEach(() => {
    sandbox = sinon.createSandbox()
    searchQuery = {
      searchPosts: sandbox.stub().resolves([]),
      searchProfiles: sandbox.stub().resolves([])
    }
    uut = new SearchAll({
      adapters: { searchQuery }
    })
  })

  afterEach(() => sandbox.restore())

  it('should require searchQuery adapter', () => {
    assert.throws(() => {
      return new SearchAll({ adapters: {} })
    }, /searchQuery adapter required/)
  })

  it('should return empty results for an empty query', async () => {
    const result = await uut.execute({ q: '' })

    assert.deepEqual(result.posts, [])
    assert.deepEqual(result.profiles, [])
    assert.equal(result.pagination.total, 0)
    assert.equal(result.pagination.hasMore, false)
  })

  it('should pass query to the adapter and return results', async () => {
    searchQuery.searchPosts.resolves([
      { txid: 'tx1', addr: 'addr1', text: 'hello world', seen: 100, blockHeight: 600100 }
    ])
    searchQuery.searchProfiles.resolves([
      { addr: 'addr1', name: 'Alice Trout', text: 'bitcoin fan', seen: 100, blockHeight: 600100 }
    ])

    const result = await uut.execute({ q: 'hello' })

    assert.equal(result.posts.length, 1)
    assert.equal(result.posts[0].text, 'hello world')
    assert.equal(result.profiles.length, 1)
    assert.equal(result.profiles[0].name, 'Alice Trout')
    assert.equal(searchQuery.searchPosts.firstCall.args[0], 'hello')
    assert.equal(searchQuery.searchProfiles.firstCall.args[0], 'hello')
  })

  it('should default limit to 100 and offset to 0', async () => {
    searchQuery.searchPosts.resolves([])
    searchQuery.searchProfiles.resolves([])

    const result = await uut.execute({ q: 'test' })

    assert.equal(result.pagination.limit, 100)
    assert.equal(result.pagination.offset, 0)
  })

  it('should reject limit over 100', async () => {
    try {
      await uut.execute({ q: 'test', limit: 101 })
      assert.fail('Expected error')
    } catch (err) {
      assert.equal(err.status, 400)
      assert.include(err.message, 'limit cannot exceed')
    }
  })

  it('should paginate results', async () => {
    searchQuery.searchPosts.resolves([
      { txid: 'tx1', addr: 'addr1', text: 'a', seen: 100, blockHeight: 600100 },
      { txid: 'tx2', addr: 'addr2', text: 'b', seen: 200, blockHeight: 600200 }
    ])
    searchQuery.searchProfiles.resolves([
      { addr: 'addr1', name: 'Alice', text: 'bio', seen: 100, blockHeight: 600100 },
      { addr: 'addr2', name: 'Bob', text: 'bio', seen: 200, blockHeight: 600200 }
    ])

    const result = await uut.execute({ q: 'test', limit: 1, offset: 0 })

    assert.equal(result.posts.length, 1)
    assert.equal(result.profiles.length, 1)
    assert.equal(result.pagination.limit, 1)
    assert.equal(result.pagination.offset, 0)
    assert.equal(result.pagination.total, 4)
    assert.equal(result.pagination.hasMore, true)
  })

  it('should trim whitespace from query', async () => {
    searchQuery.searchPosts.resolves([])
    searchQuery.searchProfiles.resolves([])

    await uut.execute({ q: '  hello  ' })

    assert.equal(searchQuery.searchPosts.firstCall.args[0], 'hello')
    assert.equal(searchQuery.searchProfiles.firstCall.args[0], 'hello')
  })
})
