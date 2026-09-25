import { assert } from 'chai'
import sinon from 'sinon'
import GetNewestQualifyingPost from '../../../src/use-cases/get-newest-qualifying-post.js'

describe('#GetNewestQualifyingPost', () => {
  let sandbox

  beforeEach(() => {
    sandbox = sinon.createSandbox()
  })

  afterEach(() => sandbox.restore())

  function makeUseCase (result = { addr: 'bitcoincash:qaddr-a', blockHeight: 600100, seen: 100 }) {
    const profileQuery = {
      getNewestQualifyingPost: sandbox.stub().resolves(result)
    }
    return { uut: new GetNewestQualifyingPost({ adapters: { profileQuery } }), profileQuery }
  }

  it('should return the adapter result for the address', async () => {
    const { uut, profileQuery } = makeUseCase()

    const result = await uut.execute({ addr: 'bitcoincash:qaddr-a' })

    assert.deepEqual(result, { addr: 'bitcoincash:qaddr-a', blockHeight: 600100, seen: 100 })
    assert.isTrue(profileQuery.getNewestQualifyingPost.calledOnceWith('bitcoincash:qaddr-a'))
  })

  it('should pass through an empty response', async () => {
    const { uut } = makeUseCase({})

    const result = await uut.execute({ addr: 'bitcoincash:qaddr-nopost' })

    assert.deepEqual(result, {})
  })

  it('should reject a missing address', async () => {
    const { uut } = makeUseCase()

    try {
      await uut.execute({})
      assert.fail('Expected error')
    } catch (err) {
      assert.equal(err.status, 400)
      assert.include(err.message, 'address is required')
    }
  })

  it('should reject a non-string address', async () => {
    const { uut } = makeUseCase()

    try {
      await uut.execute({ addr: 12345 })
      assert.fail('Expected error')
    } catch (err) {
      assert.equal(err.status, 400)
      assert.include(err.message, 'address is required')
    }
  })

  it('should throw when adapters are missing', () => {
    assert.throws(() => new GetNewestQualifyingPost({}), /Adapters required/)
  })

  it('should throw when the profileQuery adapter is missing', () => {
    assert.throws(() => new GetNewestQualifyingPost({ adapters: {} }), /profileQuery adapter required/)
  })
})
