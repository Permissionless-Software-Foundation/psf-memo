import { assert } from 'chai'
import sinon from 'sinon'
import ProfileRESTControllerLib from '../../../src/controllers/rest-api/profile/controller.js'

describe('#ProfileRESTController', () => {
  let uut
  let sandbox

  beforeEach(() => {
    sandbox = sinon.createSandbox()
    uut = new ProfileRESTControllerLib({
      adapters: {},
      useCases: {
        listRecentProfiles: {
          execute: sandbox.stub().resolves({
            profiles: [{ addr: 'q1', blockHeight: 600000 }],
            pagination: { limit: 100, offset: 0, total: 1, hasMore: false }
          })
        }
      }
    })
  })

  afterEach(() => sandbox.restore())

  it('should return recent profiles from use case', async () => {
    const ctx = { query: { limit: '50', offset: '0' }, body: null, throw: sandbox.stub() }
    await uut.getRecentProfiles(ctx)

    assert.equal(uut.useCases.listRecentProfiles.execute.callCount, 1)
    assert.deepEqual(uut.useCases.listRecentProfiles.execute.firstCall.args[0], {
      limit: '50',
      offset: '0'
    })
    assert.equal(ctx.body.profiles.length, 1)
    assert.equal(ctx.body.pagination.total, 1)
  })

  it('should throw the error status when err has a status', () => {
    const ctx = { throw: sandbox.stub() }
    const err = { status: 404, message: 'Not found' }
    uut.handleError(ctx, err)

    assert.equal(ctx.throw.callCount, 1)
    assert.equal(ctx.throw.firstCall.args[0], 404)
    assert.equal(ctx.throw.firstCall.args[1], 'Not found')
  })

  it('should throw 500 when err has no status', () => {
    const ctx = { throw: sandbox.stub() }
    const err = new Error('boom')
    uut.handleError(ctx, err)

    assert.equal(ctx.throw.callCount, 1)
    assert.equal(ctx.throw.firstCall.args[0], 500)
  })
})
