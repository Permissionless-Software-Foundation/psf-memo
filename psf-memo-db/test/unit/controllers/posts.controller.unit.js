import { assert } from 'chai'
import sinon from 'sinon'
import PostsRESTControllerLib from '../../../src/controllers/rest-api/posts/controller.js'

describe('#PostsRESTController', () => {
  let uut
  let sandbox

  beforeEach(() => {
    sandbox = sinon.createSandbox()
    uut = new PostsRESTControllerLib({
      adapters: {},
      useCases: {
        listRecentPosts: {
          execute: sandbox.stub().resolves({
            posts: [{ txid: 'tx1', blockHeight: 600000 }],
            pagination: { limit: 100, offset: 0, total: 1, hasMore: false }
          })
        },
        listPostsByAddr: {
          execute: sandbox.stub().resolves({
            posts: [{ txid: 'tx2', addr: 'addr-a', blockHeight: 600100 }],
            pagination: { limit: 100, offset: 0, total: 1, hasMore: false }
          })
        },
        listFollowingFeed: {
          execute: sandbox.stub().resolves({
            posts: [{ txid: 'tx3', addr: 'addr-b', blockHeight: 600200 }],
            pagination: { limit: 100, offset: 0, total: 1, hasMore: false }
          })
        }
      }
    })
  })

  afterEach(() => sandbox.restore())

  it('should return recent posts from use case', async () => {
    const ctx = { query: { limit: '50', offset: '0' }, body: null, throw: sandbox.stub() }
    await uut.getRecentPosts(ctx)

    assert.equal(uut.useCases.listRecentPosts.execute.callCount, 1)
    assert.deepEqual(uut.useCases.listRecentPosts.execute.firstCall.args[0], {
      limit: '50',
      offset: '0'
    })
    assert.equal(ctx.body.posts.length, 1)
    assert.equal(ctx.body.pagination.total, 1)
  })

  it('should return posts by address from use case', async () => {
    const ctx = {
      params: { addr: 'addr-a' },
      query: { limit: '25', offset: '0' },
      body: null,
      throw: sandbox.stub()
    }
    await uut.getPostsByAddr(ctx)

    assert.equal(uut.useCases.listPostsByAddr.execute.callCount, 1)
    assert.deepEqual(uut.useCases.listPostsByAddr.execute.firstCall.args[0], {
      addr: 'addr-a',
      limit: '25',
      offset: '0'
    })
    assert.equal(ctx.body.posts.length, 1)
    assert.equal(ctx.body.posts[0].txid, 'tx2')
  })

  it('should return following feed from use case', async () => {
    const ctx = {
      params: { addr: 'addr-b' },
      query: { limit: '25', offset: '0' },
      body: null,
      throw: sandbox.stub()
    }
    await uut.getFollowingFeed(ctx)

    assert.equal(uut.useCases.listFollowingFeed.execute.callCount, 1)
    assert.deepEqual(uut.useCases.listFollowingFeed.execute.firstCall.args[0], {
      addr: 'addr-b',
      limit: '25',
      offset: '0'
    })
    assert.equal(ctx.body.posts.length, 1)
    assert.equal(ctx.body.posts[0].txid, 'tx3')
  })

  it('should map a use-case error with a status to that status', async () => {
    uut.useCases.listFollowingFeed.execute = sandbox.stub().rejects(
      Object.assign(new Error('boom'), { status: 400 })
    )
    const ctx = {
      params: { addr: 'addr-b' },
      query: {},
      body: null,
      throw: sandbox.stub()
    }
    await uut.getFollowingFeed(ctx)

    assert.equal(ctx.body, null)
    assert.equal(ctx.throw.callCount, 1)
    assert.equal(ctx.throw.firstCall.args[0], 400)
    assert.include(ctx.throw.firstCall.args[1], 'boom')
  })

  it('should map an unknown use-case error to a 500', async () => {
    uut.useCases.listFollowingFeed.execute = sandbox.stub().rejects(new Error('boom'))
    const ctx = {
      params: { addr: 'addr-b' },
      query: {},
      body: null,
      throw: sandbox.stub()
    }
    await uut.getFollowingFeed(ctx)

    assert.equal(ctx.body, null)
    assert.equal(ctx.throw.callCount, 1)
    assert.equal(ctx.throw.firstCall.args[0], 500)
    assert.include(ctx.throw.firstCall.args[1], 'boom')
  })

  it('should return a post thread from use case', async () => {
    const ctx = {
      params: { txid: 'tx4' },
      body: null,
      throw: sandbox.stub()
    }
    uut.useCases.getPostThread = {
      execute: sandbox.stub().resolves({ txid: 'tx4', text: 'thread' })
    }
    await uut.getPostThread(ctx)

    assert.equal(uut.useCases.getPostThread.execute.callCount, 1)
    assert.deepEqual(uut.useCases.getPostThread.execute.firstCall.args[0], { txid: 'tx4' })
    assert.equal(ctx.body.text, 'thread')
  })
})
