import { assert } from 'chai'
import SearchQuery from '../../../src/adapters/search-query.js'

function makeIterator (entries) {
  return async function * () {
    for (const entry of entries) {
      yield entry
    }
  }
}

describe('#SearchQuery', () => {
  let postsDb
  let postParentsDb
  let namesDb
  let profilesDb

  beforeEach(() => {
    postsDb = { iterator: () => makeIterator([])() }
    postParentsDb = { iterator: () => makeIterator([])() }
    namesDb = { iterator: () => makeIterator([])() }
    profilesDb = { iterator: () => makeIterator([])() }
  })

  it('should require postsDb', () => {
    assert.throws(() => {
      return new SearchQuery({ postParentsDb, namesDb, profilesDb })
    }, /postsDb required/)
  })

  it('should require postParentsDb', () => {
    assert.throws(() => {
      return new SearchQuery({ postsDb, namesDb, profilesDb })
    }, /postParentsDb required/)
  })

  it('should require namesDb', () => {
    assert.throws(() => {
      return new SearchQuery({ postsDb, postParentsDb, profilesDb })
    }, /namesDb required/)
  })

  it('should require profilesDb', () => {
    assert.throws(() => {
      return new SearchQuery({ postsDb, postParentsDb, namesDb })
    }, /profilesDb required/)
  })

  it('should match top-level posts by text substring case-insensitively', async () => {
    postsDb.iterator = () => makeIterator([
      ['tx1', { addr: 'addr1', text: 'hello world', seen: 100, blockHeight: 600100 }],
      ['tx2', { addr: 'addr2', text: 'bitcoin cash', seen: 200, blockHeight: 600200 }]
    ])()
    postParentsDb.iterator = () => makeIterator([])()

    const uut = new SearchQuery({ postsDb, postParentsDb, namesDb, profilesDb })
    const result = await uut.searchPosts('HELLO')

    assert.equal(result.length, 1)
    assert.equal(result[0].txid, 'tx1')
    assert.equal(result[0].text, 'hello world')
  })

  it('should exclude replies from post search results', async () => {
    postsDb.iterator = () => makeIterator([
      ['tx1', { addr: 'addr1', text: 'hello world', seen: 100, blockHeight: 600100 }],
      ['tx2', { addr: 'addr2', text: 'hello reply', seen: 200, blockHeight: 600200 }]
    ])()
    postParentsDb.iterator = () => makeIterator([
      ['tx2', { parentTxid: 'tx1' }]
    ])()

    const uut = new SearchQuery({ postsDb, postParentsDb, namesDb, profilesDb })
    const result = await uut.searchPosts('hello')

    assert.equal(result.length, 1)
    assert.equal(result[0].txid, 'tx1')
  })

  it('should match profiles by name case-insensitively', async () => {
    namesDb.iterator = () => makeIterator([
      ['addr1', { name: 'Alice Trout', txid: 'tx1', seen: 100, blockHeight: 600100 }],
      ['addr2', { name: 'Bob Builder', txid: 'tx2', seen: 200, blockHeight: 600200 }]
    ])()
    profilesDb.iterator = () => makeIterator([])()

    const uut = new SearchQuery({ postsDb, postParentsDb, namesDb, profilesDb })
    const result = await uut.searchProfiles('alice')

    assert.equal(result.length, 1)
    assert.equal(result[0].addr, 'addr1')
    assert.equal(result[0].name, 'Alice Trout')
  })

  it('should match profiles by bio case-insensitively', async () => {
    namesDb.iterator = () => makeIterator([])()
    profilesDb.iterator = () => makeIterator([
      ['addr1', { text: 'bitcoin cash enthusiast', txid: 'tx1', seen: 100, blockHeight: 600100 }],
      ['addr2', { text: 'building on BCH', txid: 'tx2', seen: 200, blockHeight: 600200 }]
    ])()

    const uut = new SearchQuery({ postsDb, postParentsDb, namesDb, profilesDb })
    const result = await uut.searchProfiles('enthusiast')

    assert.equal(result.length, 1)
    assert.equal(result[0].addr, 'addr1')
    assert.equal(result[0].text, 'bitcoin cash enthusiast')
  })

  it('should return profile name and bio together when both exist', async () => {
    namesDb.iterator = () => makeIterator([
      ['addr1', { name: 'Alice Trout', txid: 'tx1', seen: 100, blockHeight: 600100 }]
    ])()
    profilesDb.iterator = () => makeIterator([
      ['addr1', { text: 'bitcoin cash enthusiast', txid: 'tx2', seen: 200, blockHeight: 600200 }]
    ])()

    const uut = new SearchQuery({ postsDb, postParentsDb, namesDb, profilesDb })
    const result = await uut.searchProfiles('bitcoin')

    assert.equal(result.length, 1)
    assert.equal(result[0].name, 'Alice Trout')
    assert.equal(result[0].text, 'bitcoin cash enthusiast')
  })

  it('should return no posts when query is empty', async () => {
    postsDb.iterator = () => makeIterator([
      ['tx1', { addr: 'addr1', text: 'hello world', seen: 100, blockHeight: 600100 }]
    ])()
    postParentsDb.iterator = () => makeIterator([])()

    const uut = new SearchQuery({ postsDb, postParentsDb, namesDb, profilesDb })
    const result = await uut.searchPosts('')

    assert.equal(result.length, 0)
  })

  it('should return no profiles when query is empty', async () => {
    namesDb.iterator = () => makeIterator([
      ['addr1', { name: 'Alice Trout', txid: 'tx1', seen: 100, blockHeight: 600100 }]
    ])()
    profilesDb.iterator = () => makeIterator([])()

    const uut = new SearchQuery({ postsDb, postParentsDb, namesDb, profilesDb })
    const result = await uut.searchProfiles('')

    assert.equal(result.length, 0)
  })
})
