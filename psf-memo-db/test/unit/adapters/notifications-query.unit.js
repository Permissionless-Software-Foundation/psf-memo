import { assert } from 'chai'
import sinon from 'sinon'
import NotificationsQuery from '../../../src/adapters/notifications-query.js'
import { getPostOrNull } from '../../../src/adapters/lib/get-post-or-null.js'

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

  it('should throw when postParentsDb is missing', () => {
    try {
      // eslint-disable-next-line no-new
      new NotificationsQuery({ postsDb, postChildrenDb, likesDb, postLikesDb: {}, followsDb, bchjs })
      assert.fail('Expected error')
    } catch (err) {
      assert.include(err.message, 'postParentsDb required')
    }
  })

  it('should throw when postLikesDb is missing', () => {
    try {
      // eslint-disable-next-line no-new
      new NotificationsQuery({ postsDb, postParentsDb: {}, postChildrenDb, likesDb, followsDb, bchjs })
      assert.fail('Expected error')
    } catch (err) {
      assert.include(err.message, 'postLikesDb required')
    }
  })

  it('should exclude notifications from muted addresses when a mute query is provided', async () => {
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

    const muteQuery = {
      listMuted: sandbox.stub().resolves([THEIR_ADDR])
    }
    uut = new NotificationsQuery({
      postsDb,
      postParentsDb: {},
      postChildrenDb,
      likesDb,
      postLikesDb: {},
      followsDb,
      muteQuery,
      bchjs
    })

    const result = await uut.listNotifications(MY_ADDR, { limit: 100, offset: 0 })

    assert.equal(result.total, 0)
    assert.isTrue(muteQuery.listMuted.calledOnceWith(MY_ADDR))
  })

  it('should return null from getPostOrNull when the post is not found', async () => {
    const missingTxid = 'c'.repeat(64)
    const notFound = new Error('not found')
    notFound.notFound = true
    postsDb.get.withArgs(missingTxid).rejects(notFound)

    const result = await getPostOrNull(postsDb, missingTxid)
    assert.equal(result, null)
  })

  it('should rethrow non-notFound errors from getPostOrNull', async () => {
    const txid = 'd'.repeat(64)
    const boom = new Error('boom')
    postsDb.get.withArgs(txid).rejects(boom)

    try {
      await getPostOrNull(postsDb, txid)
      assert.fail('Expected error')
    } catch (err) {
      assert.equal(err, boom)
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

  it('should exclude follows of other people', async () => {
    postChildrenDb.iterator.returns(makeIterator([]))
    likesDb.iterator.returns(makeIterator([]))
    followsDb.iterator.returns(makeIterator([
      [`${THEIR_ADDR}:${'otherhash'}`, { followerAddr: THEIR_ADDR, followeePkHash: 'otherhash', unfollow: false, txid: 'c'.repeat(64), blockHeight: 150 }]
    ]))

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

  it('should sort three notifications by block height descending', async () => {
    const myPostTxid = 'a'.repeat(64)
    const replyTxid = 'b'.repeat(64)
    const likeTxid = 'c'.repeat(64)

    postChildrenDb.iterator.returns(makeIterator([
      [`${myPostTxid}:${replyTxid}`, { parentTxid: myPostTxid, childTxid: replyTxid, blockHeight: 200 }]
    ]))
    likesDb.iterator.returns(makeIterator([
      [likeTxid, { addr: THEIR_ADDR, postTxid: myPostTxid, blockHeight: 300 }]
    ]))
    followsDb.iterator.returns(makeIterator([
      [`${THEIR_ADDR}:${MY_HASH160}`, { followerAddr: THEIR_ADDR, followeePkHash: MY_HASH160, unfollow: false, txid: 'd'.repeat(64), blockHeight: 100 }]
    ]))

    postsDb.get.withArgs(myPostTxid).resolves({ addr: MY_ADDR, text: 'hello' })
    postsDb.get.withArgs(replyTxid).resolves({ addr: THEIR_ADDR, text: 'reply' })

    const result = await uut.listNotifications(MY_ADDR, { limit: 100, offset: 0 })

    assert.equal(result.total, 3)
    assert.equal(result.notifications[0].type, 'like')
    assert.equal(result.notifications[0].blockHeight, 300)
    assert.equal(result.notifications[1].type, 'reply')
    assert.equal(result.notifications[1].blockHeight, 200)
    assert.equal(result.notifications[2].type, 'follow')
    assert.equal(result.notifications[2].blockHeight, 100)
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

  it('should default follow blockHeight and seen to 0 when missing', async () => {
    postChildrenDb.iterator.returns(makeIterator([]))
    likesDb.iterator.returns(makeIterator([]))
    followsDb.iterator.returns(makeIterator([
      [`${THEIR_ADDR}:${MY_HASH160}`, { followerAddr: THEIR_ADDR, followeePkHash: MY_HASH160, unfollow: false, txid: 'c'.repeat(64) }]
    ]))

    const result = await uut.listNotifications(MY_ADDR, { limit: 100, offset: 0 })

    assert.equal(result.notifications.length, 1)
    const n = result.notifications[0]
    assert.equal(n.type, 'follow')
    assert.equal(n.blockHeight, 0)
    assert.equal(n.seen, 0)
  })

  it('should default like blockHeight and seen to 0 when missing', async () => {
    const myPostTxid = 'a'.repeat(64)
    const likeTxid = 'b'.repeat(64)

    postChildrenDb.iterator.returns(makeIterator([]))
    followsDb.iterator.returns(makeIterator([]))
    likesDb.iterator.returns(makeIterator([
      [likeTxid, { addr: THEIR_ADDR, postTxid: myPostTxid }]
    ]))
    postsDb.get.withArgs(myPostTxid).resolves({ addr: MY_ADDR, text: 'hello' })

    const result = await uut.listNotifications(MY_ADDR, { limit: 100, offset: 0 })

    assert.equal(result.notifications.length, 1)
    const n = result.notifications[0]
    assert.equal(n.type, 'like')
    assert.equal(n.blockHeight, 0)
    assert.equal(n.seen, 0)
  })

  it('should default reply blockHeight and seen to 0 when missing', async () => {
    const myPostTxid = 'a'.repeat(64)
    const replyTxid = 'b'.repeat(64)

    postChildrenDb.iterator.returns(makeIterator([
      [`${myPostTxid}:${replyTxid}`, { parentTxid: myPostTxid, childTxid: replyTxid }]
    ]))
    likesDb.iterator.returns(makeIterator([]))
    followsDb.iterator.returns(makeIterator([]))
    postsDb.get.withArgs(myPostTxid).resolves({ addr: MY_ADDR, text: 'hello' })
    postsDb.get.withArgs(replyTxid).resolves({ addr: THEIR_ADDR, text: 'reply' })

    const result = await uut.listNotifications(MY_ADDR, { limit: 100, offset: 0 })

    assert.equal(result.notifications.length, 1)
    const n = result.notifications[0]
    assert.equal(n.type, 'reply')
    assert.equal(n.blockHeight, 0)
    assert.equal(n.seen, 0)
  })

  it('should use the child post blockHeight when the child record lacks one', async () => {
    const myPostTxid = 'a'.repeat(64)
    const replyTxid = 'b'.repeat(64)

    postChildrenDb.iterator.returns(makeIterator([
      [`${myPostTxid}:${replyTxid}`, { parentTxid: myPostTxid, childTxid: replyTxid }]
    ]))
    likesDb.iterator.returns(makeIterator([]))
    followsDb.iterator.returns(makeIterator([]))
    postsDb.get.withArgs(myPostTxid).resolves({ addr: MY_ADDR, text: 'hello' })
    postsDb.get.withArgs(replyTxid).resolves({ addr: THEIR_ADDR, text: 'reply', blockHeight: 500, seen: 7 })

    const result = await uut.listNotifications(MY_ADDR, { limit: 100, offset: 0 })

    assert.equal(result.notifications.length, 1)
    const n = result.notifications[0]
    assert.equal(n.blockHeight, 500)
    assert.equal(n.seen, 7)
  })

  it('should break sort ties by seen descending when blockHeight is equal', async () => {
    const myPostTxid = 'a'.repeat(64)

    postChildrenDb.iterator.returns(makeIterator([]))
    followsDb.iterator.returns(makeIterator([]))
    likesDb.iterator.returns(makeIterator([
      ['b1'.repeat(32), { addr: THEIR_ADDR, postTxid: myPostTxid, blockHeight: 300, seen: 100 }],
      ['b2'.repeat(32), { addr: 'bitcoincash:qother2', postTxid: myPostTxid, blockHeight: 300, seen: 200 }]
    ]))
    postsDb.get.withArgs(myPostTxid).resolves({ addr: MY_ADDR, text: 'hello' })

    const result = await uut.listNotifications(MY_ADDR, { limit: 100, offset: 0 })

    assert.equal(result.notifications.length, 2)
    assert.equal(result.notifications[0].seen, 200)
    assert.equal(result.notifications[1].seen, 100)
  })

  it('should skip a like whose post is missing', async () => {
    const myPostTxid = 'a'.repeat(64)
    const likeTxid = 'b'.repeat(64)
    const missingPost = new Error('not found')
    missingPost.notFound = true

    postChildrenDb.iterator.returns(makeIterator([]))
    followsDb.iterator.returns(makeIterator([]))
    likesDb.iterator.returns(makeIterator([
      [likeTxid, { addr: THEIR_ADDR, postTxid: myPostTxid, blockHeight: 300 }]
    ]))
    postsDb.get.withArgs(myPostTxid).rejects(missingPost)

    const result = await uut.listNotifications(MY_ADDR, { limit: 100, offset: 0 })

    assert.equal(result.total, 0)
  })

  it('should skip a null like record without throwing', async () => {
    postChildrenDb.iterator.returns(makeIterator([]))
    followsDb.iterator.returns(makeIterator([]))
    likesDb.iterator.returns(makeIterator([
      [null, null]
    ]))

    const result = await uut.listNotifications(MY_ADDR, { limit: 100, offset: 0 })

    assert.equal(result.total, 0)
  })

  it('should skip a reply child record missing parentTxid or childTxid', async () => {
    postChildrenDb.iterator.returns(makeIterator([
      ['missing:child', { parentTxid: undefined, childTxid: 'b'.repeat(64), blockHeight: 100 }]
    ]))
    likesDb.iterator.returns(makeIterator([]))
    followsDb.iterator.returns(makeIterator([]))

    const result = await uut.listNotifications(MY_ADDR, { limit: 100, offset: 0 })

    assert.equal(result.total, 0)
  })
})
