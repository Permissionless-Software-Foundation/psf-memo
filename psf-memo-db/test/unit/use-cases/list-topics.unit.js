import { assert } from 'chai'
import sinon from 'sinon'
import ListTopics from '../../../src/use-cases/list-topics.js'

describe('#ListTopics', () => {
  let uut
  let sandbox
  let topicQuery

  const adapterResult = {
    topics: [
      { room: 'bitcoin', postCount: 2 },
      { room: 'cash', postCount: 1 }
    ],
    pagination: { limit: 100, offset: 0, total: 2, hasMore: false }
  }

  beforeEach(() => {
    sandbox = sinon.createSandbox()
    topicQuery = {
      listTopics: sandbox.stub().resolves(adapterResult)
    }
    uut = new ListTopics({
      adapters: { topicQuery }
    })
  })

  afterEach(() => sandbox.restore())

  it('should throw when adapters are missing', () => {
    try {
      // eslint-disable-next-line no-new
      new ListTopics({})
      assert.fail('Expected error')
    } catch (err) {
      assert.include(err.message, 'Adapters required')
    }
  })

  it('should throw when topicQuery adapter is missing', () => {
    try {
      // eslint-disable-next-line no-new
      new ListTopics({ adapters: {} })
      assert.fail('Expected error')
    } catch (err) {
      assert.include(err.message, 'topicQuery adapter required')
    }
  })

  it('should return the adapter page with default limit and offset', async () => {
    const result = await uut.execute()

    assert.deepEqual(result, adapterResult)
    assert.deepEqual(topicQuery.listTopics.firstCall.args[0], { limit: 100, offset: 0 })
  })

  it('should forward limit and offset to the adapter', async () => {
    await uut.execute({ limit: 2, offset: 4 })

    assert.deepEqual(topicQuery.listTopics.firstCall.args[0], { limit: 2, offset: 4 })
  })

  it('should reject a non-positive limit', async () => {
    try {
      await uut.execute({ limit: 0 })
      assert.fail('Expected error')
    } catch (err) {
      assert.include(err.message, 'limit must be a positive integer')
      assert.equal(err.status, 400)
    }
  })

  it('should reject a negative offset', async () => {
    try {
      await uut.execute({ offset: -1 })
      assert.fail('Expected error')
    } catch (err) {
      assert.include(err.message, 'offset must be a non-negative integer')
      assert.equal(err.status, 400)
    }
  })
})
