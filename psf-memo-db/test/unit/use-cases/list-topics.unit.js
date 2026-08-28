import { assert } from 'chai'
import sinon from 'sinon'
import ListTopics from '../../../src/use-cases/list-topics.js'

describe('#ListTopics', () => {
  let uut
  let sandbox
  let topicQuery

  beforeEach(() => {
    sandbox = sinon.createSandbox()
    topicQuery = {
      listTopics: sandbox.stub().resolves([
        { room: 'bitcoin', postCount: 2 },
        { room: 'cash', postCount: 1 }
      ])
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

  it('should return topics from the adapter', async () => {
    const result = await uut.execute()

    assert.deepEqual(result.topics, [
      { room: 'bitcoin', postCount: 2 },
      { room: 'cash', postCount: 1 }
    ])
  })
})
