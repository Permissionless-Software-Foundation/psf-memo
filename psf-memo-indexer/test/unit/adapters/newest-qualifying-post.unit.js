import { assert } from 'chai'
import sinon from 'sinon'
import axios from 'axios'
import config from '../../../config/index.js'
import { createNewestQualifyingPost } from '../../../src/adapters/newest-qualifying-post.js'

const ALICE = 'bitcoincash:qaddr-alice'

describe('#createNewestQualifyingPost', () => {
  let sandbox
  let get

  beforeEach(() => {
    sandbox = sinon.createSandbox()
    get = sandbox.stub(axios, 'get')
  })

  afterEach(() => sandbox.restore())

  it('should fetch the newest qualifying post from the configured URL with an encoded address', async () => {
    get.resolves({ data: { addr: ALICE, blockHeight: 600100, seen: 100 } })
    const uut = createNewestQualifyingPost({ psfMemoDbUrl: 'http://db.example:5021' })

    const result = await uut.get(ALICE)

    assert.deepEqual(result, { addr: ALICE, blockHeight: 600100, seen: 100 })
    assert.isTrue(get.calledOnce)
    assert.equal(
      get.firstCall.args[0],
      `http://db.example:5021/profile/newest-post/${encodeURIComponent(ALICE)}`
    )
  })

  it('should fall back to the configured database URL', async () => {
    get.resolves({ data: { addr: ALICE, blockHeight: 600100, seen: 100 } })
    const uut = createNewestQualifyingPost()

    await uut.get(ALICE)

    assert.equal(
      get.firstCall.args[0],
      `${config.psfMemoDbUrl}/profile/newest-post/${encodeURIComponent(ALICE)}`
    )
  })

  it('should return null when the response has no address', async () => {
    get.resolves({ data: {} })
    const uut = createNewestQualifyingPost()

    const result = await uut.get(ALICE)

    assert.equal(result, null)
  })

  it('should return null when the response is empty', async () => {
    get.resolves({ data: null })
    const uut = createNewestQualifyingPost()

    const result = await uut.get(ALICE)

    assert.equal(result, null)
  })

  it('should propagate a request error', async () => {
    get.rejects(new Error('db unreachable'))
    const uut = createNewestQualifyingPost()

    let error
    try {
      await uut.get(ALICE)
    } catch (err) {
      error = err
    }

    assert.equal(error?.message, 'db unreachable')
  })
})
