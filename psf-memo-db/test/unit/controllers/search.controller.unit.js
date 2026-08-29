import { assert } from 'chai'
import sinon from 'sinon'
import SearchRESTControllerLib from '../../../src/controllers/rest-api/search/controller.js'

describe('#SearchRESTController', () => {
  let uut
  let sandbox

  beforeEach(() => {
    sandbox = sinon.createSandbox()
    uut = new SearchRESTControllerLib({
      adapters: {},
      useCases: {
        searchAll: {
          execute: sandbox.stub().resolves({
            posts: [{ txid: 'tx1', text: 'hello' }],
            profiles: [{ addr: 'addr1', name: 'Alice' }],
            pagination: { limit: 100, offset: 0, total: 2, hasMore: false }
          })
        }
      }
    })
  })

  afterEach(() => sandbox.restore())

  it('should return search results from use case', async () => {
    const ctx = { query: { q: 'hello', limit: '50', offset: '0' }, body: null, throw: sandbox.stub() }
    await uut.search(ctx)

    assert.equal(uut.useCases.searchAll.execute.callCount, 1)
    assert.deepEqual(uut.useCases.searchAll.execute.firstCall.args[0], {
      q: 'hello',
      limit: '50',
      offset: '0'
    })
    assert.equal(ctx.body.posts.length, 1)
    assert.equal(ctx.body.profiles.length, 1)
    assert.equal(ctx.body.pagination.total, 2)
  })

  it('should handle an empty query', async () => {
    const ctx = { query: { q: '' }, body: null, throw: sandbox.stub() }
    await uut.search(ctx)

    assert.deepEqual(uut.useCases.searchAll.execute.firstCall.args[0], {
      q: '',
      limit: undefined,
      offset: undefined
    })
  })
})
