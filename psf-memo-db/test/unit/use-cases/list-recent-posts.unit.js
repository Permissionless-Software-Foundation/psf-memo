import { assert } from 'chai'
import sinon from 'sinon'
import ListRecentPosts from '../../../src/use-cases/list-recent-posts.js'

describe('#ListRecentPosts', () => {
  let uut
  let sandbox

  const mockPosts = [
    { txid: 'tx-a', addr: 'addr-a', text: 'a', seen: 100, blockHeight: 600100 },
    { txid: 'tx-b', addr: 'addr-b', text: 'b', seen: 200, blockHeight: 600200 },
    { txid: 'tx-c', addr: 'addr-c', text: 'c', seen: 50, blockHeight: 600200 }
  ]

  beforeEach(() => {
    sandbox = sinon.createSandbox()
    uut = new ListRecentPosts({
      adapters: {
        postQuery: {
          scanPostsWithBlockHeight: sandbox.stub().resolves([...mockPosts])
        }
      }
    })
  })

  afterEach(() => sandbox.restore())

  it('should return posts sorted by block height descending', async () => {
    const result = await uut.execute({ limit: 10, offset: 0 })

    assert.equal(result.posts.length, 3)
    assert.equal(result.posts[0].txid, 'tx-b')
    assert.equal(result.posts[1].txid, 'tx-c')
    assert.equal(result.posts[2].txid, 'tx-a')
    assert.equal(result.pagination.total, 3)
    assert.equal(result.pagination.hasMore, false)
  })

  it('should paginate with limit and offset', async () => {
    const result = await uut.execute({ limit: 1, offset: 1 })

    assert.equal(result.posts.length, 1)
    assert.equal(result.posts[0].txid, 'tx-c')
    assert.equal(result.pagination.limit, 1)
    assert.equal(result.pagination.offset, 1)
    assert.equal(result.pagination.hasMore, true)
  })

  it('should default limit to 100 and offset to 0', async () => {
    const result = await uut.execute({})

    assert.equal(result.pagination.limit, 100)
    assert.equal(result.pagination.offset, 0)
  })

  it('should reject limit over 100', async () => {
    try {
      await uut.execute({ limit: 101 })
      assert.fail('Expected error')
    } catch (err) {
      assert.equal(err.status, 400)
      assert.include(err.message, 'limit cannot exceed')
    }
  })
})
