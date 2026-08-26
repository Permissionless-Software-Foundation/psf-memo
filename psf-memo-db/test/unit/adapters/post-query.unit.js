import { assert } from 'chai'
import sinon from 'sinon'
import PostQuery from '../../../src/adapters/post-query.js'

describe('#PostQuery', () => {
  let uut
  let sandbox
  let postsDb
  let postParentsDb
  let postChildrenDb

  beforeEach(() => {
    sandbox = sinon.createSandbox()
    postsDb = {
      iterator: sandbox.stub()
    }
    postParentsDb = {
      iterator: sandbox.stub()
    }
    postChildrenDb = {
      iterator: sandbox.stub()
    }
    async function * emptyParents () {}
    async function * emptyChildren () {}
    postParentsDb.iterator.returns(emptyParents())
    postChildrenDb.iterator.returns(emptyChildren())
    uut = new PostQuery({ postsDb, postParentsDb, postChildrenDb })
  })

  afterEach(() => sandbox.restore())

  it('should scan posts and read block height from stored document', async () => {
    async function * mockIterator () {
      yield ['tx1', { addr: 'addr1', text: 'hello', seen: 1000, blockHeight: 600100 }]
      yield ['tx2', { addr: 'addr2', text: 'world', seen: 2000, blockHeight: 600200 }]
    }
    postsDb.iterator.returns(mockIterator())

    const result = await uut.scanPostsWithBlockHeight()

    assert.equal(result.length, 2)
    assert.equal(result[0].txid, 'tx1')
    assert.equal(result[0].blockHeight, 600100)
    assert.equal(result[0].replyCount, 0)
    assert.equal(result[1].txid, 'tx2')
    assert.equal(result[1].blockHeight, 600200)
    assert.equal(result[1].replyCount, 0)
  })

  it('should use block height 0 when field is missing', async () => {
    async function * mockIterator () {
      yield ['tx-missing', { addr: 'addr1', text: 'hi', seen: 1000 }]
    }
    postsDb.iterator.returns(mockIterator())

    const result = await uut.scanPostsWithBlockHeight()

    assert.equal(result[0].blockHeight, 0)
    assert.equal(result[0].replyCount, 0)
  })

  it('should scan posts for a single address', async () => {
    async function * mockIterator () {
      yield ['tx1', { addr: 'addr-a', text: 'hello', seen: 1000, blockHeight: 600100 }]
      yield ['tx2', { addr: 'addr-b', text: 'world', seen: 2000, blockHeight: 600200 }]
      yield ['tx3', { addr: 'addr-a', text: 'again', seen: 3000, blockHeight: 600300 }]
    }
    postsDb.iterator.returns(mockIterator())

    const result = await uut.scanPostsByAddr('addr-a')

    assert.equal(result.length, 2)
    assert.equal(result[0].txid, 'tx1')
    assert.equal(result[1].txid, 'tx3')
  })

  it('should exclude reply posts from recent scan', async () => {
    async function * mockParents () {
      yield ['tx-reply', { parentTxid: 'tx1', childTxid: 'tx-reply', blockHeight: 600150 }]
    }
    async function * mockPosts () {
      yield ['tx1', { addr: 'addr1', text: 'top', seen: 1000, blockHeight: 600100 }]
      yield ['tx-reply', { addr: 'addr1', text: 'reply', seen: 1500, blockHeight: 600150 }]
      yield ['tx2', { addr: 'addr2', text: 'other', seen: 2000, blockHeight: 600200 }]
    }
    postParentsDb.iterator.returns(mockParents())
    postsDb.iterator.returns(mockPosts())

    const result = await uut.scanPostsWithBlockHeight()

    assert.equal(result.length, 2)
    assert.equal(result[0].txid, 'tx1')
    assert.equal(result[1].txid, 'tx2')
  })

  it('should exclude reply posts from address scan', async () => {
    async function * mockParents () {
      yield ['tx-reply', { parentTxid: 'tx1', childTxid: 'tx-reply', blockHeight: 600150 }]
    }
    async function * mockPosts () {
      yield ['tx1', { addr: 'addr-a', text: 'top', seen: 1000, blockHeight: 600100 }]
      yield ['tx-reply', { addr: 'addr-a', text: 'reply', seen: 1500, blockHeight: 600150 }]
    }
    postParentsDb.iterator.returns(mockParents())
    postsDb.iterator.returns(mockPosts())

    const result = await uut.scanPostsByAddr('addr-a')

    assert.equal(result.length, 1)
    assert.equal(result[0].txid, 'tx1')
  })

  it('should include replyCount from postChildren scan', async () => {
    async function * mockChildren () {
      yield ['tx1:reply-a', { parentTxid: 'tx1', childTxid: 'reply-a', blockHeight: 600150 }]
      yield ['tx1:reply-b', { parentTxid: 'tx1', childTxid: 'reply-b', blockHeight: 600160 }]
      yield ['tx2:reply-c', { parentTxid: 'tx2', childTxid: 'reply-c', blockHeight: 600170 }]
    }
    async function * mockPosts () {
      yield ['tx1', { addr: 'addr1', text: 'top', seen: 1000, blockHeight: 600100 }]
      yield ['tx2', { addr: 'addr2', text: 'other', seen: 2000, blockHeight: 600200 }]
    }
    postChildrenDb.iterator.returns(mockChildren())
    postsDb.iterator.returns(mockPosts())

    const result = await uut.scanPostsWithBlockHeight()

    assert.equal(result.length, 2)
    assert.equal(result.find((p) => p.txid === 'tx1').replyCount, 2)
    assert.equal(result.find((p) => p.txid === 'tx2').replyCount, 1)
  })

  it('should default replyCount to 0 when post has no replies', async () => {
    async function * mockPosts () {
      yield ['tx1', { addr: 'addr1', text: 'solo', seen: 1000, blockHeight: 600100 }]
    }
    postsDb.iterator.returns(mockPosts())

    const result = await uut.scanPostsByAddr('addr1')

    assert.equal(result.length, 1)
    assert.equal(result[0].replyCount, 0)
  })
})
