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
})
