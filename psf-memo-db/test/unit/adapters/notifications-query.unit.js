import { assert } from 'chai'
import sinon from 'sinon'
import NotificationsQuery from '../../../src/adapters/notifications-query.js'

describe('#NotificationsQuery', () => {
  let sandbox
  let postsDb
  let postChildrenDb
  let likesDb
  let followsDb
  let bchjs
  let uut

  const MY_ADDR = 'bitcoincash:qqlrzp23w08434twtmvr4fxw672whkjy0py26r63g3d'
  const THEIR_ADDR = 'bitcoincash:qr95sy3j9xwd2ap32xkykttr4cvcu7as4y0qverfuy'
  const MY_HASH160 = 'myhash160'
  const THEIR_HASH160 = 'theirhash160'

  function makeIterator (items) {
    return (async function * () {
      for (const item of items) yield item
    }())
  }

  beforeEach(() => {
    sandbox = sinon.createSandbox()

    postsDb = { get: sandbox.stub() }
    postChildrenDb = { iterator: sandbox.stub() }
    likesDb = { iterator: sandbox.stub() }
    followsDb = { iterator: sandbox.stub() }

    bchjs = {
      Address: {
        toHash160: sandbox.stub()
      }
    }

    bchjs.Address.toHash160.withArgs(MY_ADDR).returns(MY_HASH160)
    bchjs.Address.toHash160.withArgs(THEIR_ADDR).returns(THEIR_HASH160)

    uut = new NotificationsQuery({
      postsDb,
      postParentsDb: {},
      postChildrenDb,
      likesDb,
      postLikesDb: {},
      followsDb,
      bchjs
    })
  })

  afterEach(() => sandbox.restore())

  it('should throw when postsDb is missing', () => {
    try {
      // eslint-disable-next-line no-new
      new NotificationsQuery({ postChildrenDb, likesDb, followsDb, bchjs })
      assert.fail('Expected error')
    } catch (err) {
      assert.include(err.message, 'postsDb required')
    }
  })

  it('should throw when postChildrenDb is missing', () => {
    try {
      // eslint-disable-next-line no-new
      new NotificationsQuery({ postsDb, postParentsDb: {}, likesDb, postLikesDb: {}, followsDb, bchjs })
      assert.fail('Expected error')
    } catch (err) {
      assert.include(err.message, 'postChildrenDb required')
    }
  })

  it('should throw when likesDb is missing', () => {
    try {
      // eslint-disable-next-line no-new
      new NotificationsQuery({ postsDb, postParentsDb: {}, postChildrenDb, postLikesDb: {}, followsDb, bchjs })
      assert.fail('Expected error')
    } catch (err) {
      assert.include(err.message, 'likesDb required')
    }
  })

  it('should throw when followsDb is missing', () => {
    try {
      // eslint-disable-next-line no-new
      new NotificationsQuery({ postsDb, postParentsDb: {}, postChildrenDb, likesDb, postLikesDb: {}, bchjs })
      assert.fail('Expected error')
    } catch (err) {
      assert.include(err.message, 'followsDb required')
    }
  })

  it('should include a reply to my post', async () => {
    const myPostTxid = 'a'.repeat(64)
    const replyTxid = 'b'.repeat(64)

    postChildrenDb.iterator.returns(makeIterator([
      [`${myPostTxid}:${replyTxid}`, { parentTxid: myPostTxid, childTxid: replyTxid, blockHeight: 200 }]
    ]))
    likesDb.iterator.returns(makeIterator([]))
    followsDb.iterator.returns(makeIterator([]))

    postsDb.get.withArgs(myPostTxid).resolves({ addr: MY_ADDR, text: 'hello' })
    postsDb.get.withArgs(replyTxid).resolves({ addr: THEIR_ADDR, text: 'nice post', blockHeight: 200 })

    const result = await uut.listNotifications(MY_ADDR, { limit: 100, offset: 0 })

    assert.equal(result.total, 1)
    assert.equal(result.notifications.length, 1)
    const n = result.notifications[0]
    assert.equal(n.type, 'reply')
    assert.equal(n.txid, replyTxid)
    assert.equal(n.addr, THEIR_ADDR)
    assert.equal(n.postTxid, myPostTxid)
    assert.equal(n.text, 'nice post')
  })

  it('should include a like on my post', async () => {
    const myPostTxid = 'a'.repeat(64)
    const likeTxid = 'b'.repeat(64)

    postChildrenDb.iterator.returns(makeIterator([]))
    followsDb.iterator.returns(makeIterator([]))
    likesDb.iterator.returns(makeIterator([
      [likeTxid, { addr: THEIR_ADDR, postTxid: myPostTxid, blockHeight: 300 }]
    ]))

    postsDb.get.withArgs(myPostTxid).resolves({ addr: MY_ADDR, text: 'hello' })

    const result = await uut.listNotifications(MY_ADDR, { limit: 100, offset: 0 })

    assert.equal(result.total, 1)
    const n = result.notifications[0]
    assert.equal(n.type, 'like')
    assert.equal(n.txid, likeTxid)
    assert.equal(n.addr, THEIR_ADDR)
    assert.equal(n.postTxid, myPostTxid)
  })

  it('should include a follow of me', async () => {
    postChildrenDb.iterator.returns(makeIterator([]))
    likesDb.iterator.returns(makeIterator([]))
    followsDb.iterator.returns(makeIterator([
      [`${THEIR_ADDR}:${MY_HASH160}`, { followerAddr: THEIR_ADDR, followeePkHash: MY_HASH160, unfollow: false, txid: 'c'.repeat(64), blockHeight: 150 }]
    ]))

    const result = await uut.listNotifications(MY_ADDR, { limit: 100, offset: 0 })

    assert.equal(result.total, 1)
    const n = result.notifications[0]
    assert.equal(n.type, 'follow')
    assert.equal(n.txid, 'c'.repeat(64))
    assert.equal(n.addr, THEIR_ADDR)
  })

  it('should exclude my own replies', async () => {
    const myPostTxid = 'a'.repeat(64)
    const replyTxid = 'b'.repeat(64)

    postChildrenDb.iterator.returns(makeIterator([
      [`${myPostTxid}:${replyTxid}`, { parentTxid: myPostTxid, childTxid: replyTxid, blockHeight: 100 }]
    ]))
    likesDb.iterator.returns(makeIterator([]))
    followsDb.iterator.returns(makeIterator([]))

    postsDb.get.withArgs(myPostTxid).resolves({ addr: MY_ADDR, text: 'hello' })
    postsDb.get.withArgs(replyTxid).resolves({ addr: MY_ADDR, text: 'my own reply' })

    const result = await uut.listNotifications(MY_ADDR, { limit: 100, offset: 0 })

    assert.equal(result.total, 0)
  })

  it('should exclude replies to posts by other people', async () => {
    const theirPostTxid = 'a'.repeat(64)
    const replyTxid = 'b'.repeat(64)

    postChildrenDb.iterator.returns(makeIterator([
      [`${theirPostTxid}:${replyTxid}`, { parentTxid: theirPostTxid, childTxid: replyTxid, blockHeight: 100 }]
    ]))
    likesDb.iterator.returns(makeIterator([]))
    followsDb.iterator.returns(makeIterator([]))

    postsDb.get.withArgs(theirPostTxid).resolves({ addr: THEIR_ADDR, text: 'alice post' })
    postsDb.get.withArgs(replyTxid).resolves({ addr: 'bitcoincash:other', text: 'reply' })

    const result = await uut.listNotifications(MY_ADDR, { limit: 100, offset: 0 })

    assert.equal(result.total, 0)
  })

  it('should exclude unfollows', async () => {
    postChildrenDb.iterator.returns(makeIterator([]))
    likesDb.iterator.returns(makeIterator([]))
    followsDb.iterator.returns(makeIterator([
      [`${THEIR_ADDR}:${MY_HASH160}`, { followerAddr: THEIR_ADDR, followeePkHash: MY_HASH160, unfollow: true, txid: 'c'.repeat(64), blockHeight: 150 }]
    ]))

    const result = await uut.listNotifications(MY_ADDR, { limit: 100, offset: 0 })

    assert.equal(result.total, 0)
  })

  it('should sort notifications by block height descending', async () => {
    const myPostTxid = 'a'.repeat(64)
    const replyTxid = 'b'.repeat(64)
    const likeTxid = 'c'.repeat(64)

    postChildrenDb.iterator.returns(makeIterator([
      [`${myPostTxid}:${replyTxid}`, { parentTxid: myPostTxid, childTxid: replyTxid, blockHeight: 100 }]
    ]))
    likesDb.iterator.returns(makeIterator([
      [likeTxid, { addr: THEIR_ADDR, postTxid: myPostTxid, blockHeight: 300 }]
    ]))
    followsDb.iterator.returns(makeIterator([]))

    postsDb.get.withArgs(myPostTxid).resolves({ addr: MY_ADDR, text: 'hello' })
    postsDb.get.withArgs(replyTxid).resolves({ addr: THEIR_ADDR, text: 'reply' })

    const result = await uut.listNotifications(MY_ADDR, { limit: 100, offset: 0 })

    assert.equal(result.total, 2)
    assert.equal(result.notifications[0].type, 'like')
    assert.equal(result.notifications[1].type, 'reply')
  })

  it('should paginate notifications', async () => {
    const myPostTxid = 'a'.repeat(64)
    const replyTxid = 'b'.repeat(64)
    const likeTxid = 'c'.repeat(64)

    postChildrenDb.iterator.returns(makeIterator([
      [`${myPostTxid}:${replyTxid}`, { parentTxid: myPostTxid, childTxid: replyTxid, blockHeight: 100 }]
    ]))
    likesDb.iterator.returns(makeIterator([
      [likeTxid, { addr: THEIR_ADDR, postTxid: myPostTxid, blockHeight: 300 }]
    ]))
    followsDb.iterator.returns(makeIterator([]))

    postsDb.get.withArgs(myPostTxid).resolves({ addr: MY_ADDR, text: 'hello' })
    postsDb.get.withArgs(replyTxid).resolves({ addr: THEIR_ADDR, text: 'reply' })

    const result = await uut.listNotifications(MY_ADDR, { limit: 1, offset: 0 })

    assert.equal(result.total, 2)
    assert.equal(result.notifications.length, 1)
    assert.equal(result.notifications[0].type, 'like')
  })
})
