import { assert } from 'chai'
import sinon from 'sinon'
import TopicsRESTControllerLib from '../../../src/controllers/rest-api/topics/controller.js'

describe('#TopicsRESTController', () => {
  let uut
  let sandbox

  beforeEach(() => {
    sandbox = sinon.createSandbox()
    uut = new TopicsRESTControllerLib({
      adapters: {},
      useCases: {
        listTopics: {
          execute: sandbox.stub().resolves({
            topics: [
              { room: 'bitcoin', postCount: 2 },
              { room: 'cash', postCount: 1 }
            ]
          })
        },
        listTopicPosts: {
          execute: sandbox.stub().resolves({
            posts: [{ txid: 'post-300', blockHeight: 300 }],
            pagination: { limit: 100, offset: 0, total: 1, hasMore: false }
          })
        }
      }
    })
  })

  afterEach(() => sandbox.restore())

  it('should return topics from use case', async () => {
    const ctx = { body: null, throw: sandbox.stub() }
    await uut.getTopics(ctx)

    assert.equal(uut.useCases.listTopics.execute.callCount, 1)
    assert.equal(ctx.body.topics.length, 2)
    assert.equal(ctx.body.topics[0].room, 'bitcoin')
  })

  it('should return topic posts from use case', async () => {
    const ctx = {
      params: { room: 'bitcoin' },
      query: { limit: '50', offset: '0' },
      body: null,
      throw: sandbox.stub()
    }
    await uut.getTopicPosts(ctx)

    assert.equal(uut.useCases.listTopicPosts.execute.callCount, 1)
    assert.deepEqual(uut.useCases.listTopicPosts.execute.firstCall.args[0], {
      room: 'bitcoin',
      limit: '50',
      offset: '0'
    })
    assert.equal(ctx.body.posts.length, 1)
    assert.equal(ctx.body.posts[0].txid, 'post-300')
  })
})
