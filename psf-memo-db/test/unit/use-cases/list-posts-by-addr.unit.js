import { assert } from 'chai'
import sinon from 'sinon'
import ListPostsByAddr from '../../../src/use-cases/list-posts-by-addr.js'

describe('#ListPostsByAddr', () => {
  let uut
  let sandbox

  const mockPosts = [
    { txid: 'tx-a', addr: 'addr-a', text: 'a', seen: 100, blockHeight: 600100 },
    { txid: 'tx-b', addr: 'addr-b', text: 'b', seen: 200, blockHeight: 600200 },
    { txid: 'tx-c', addr: 'addr-a', text: 'c', seen: 50, blockHeight: 600200 }
  ]

  beforeEach(() => {
    sandbox = sinon.createSandbox()
    uut = new ListPostsByAddr({
      adapters: {
        postQuery: {
          scanPostsByAddr: sandbox.stub().callsFake(async (addr) => {
            return mockPosts.filter((post) => post.addr === addr)
          })
        }
      }
    })
  })

  afterEach(() => sandbox.restore())

  it('should return posts for an address sorted by block height descending', async () => {
    const result = await uut.execute({ addr: 'addr-a', limit: 10, offset: 0 })

    assert.equal(result.posts.length, 2)
    assert.equal(result.posts[0].txid, 'tx-c')
    assert.equal(result.posts[1].txid, 'tx-a')
    assert.equal(result.pagination.total, 2)
  })

  it('should reject missing addr', async () => {
    try {
      await uut.execute({ limit: 10 })
      assert.fail('Expected error')
    } catch (err) {
      assert.equal(err.status, 400)
      assert.include(err.message, 'addr is required')
    }
  })
})
