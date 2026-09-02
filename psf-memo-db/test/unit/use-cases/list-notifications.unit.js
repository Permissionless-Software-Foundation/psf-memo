import { assert } from 'chai'
import sinon from 'sinon'
import ListNotifications from '../../../src/use-cases/list-notifications.js'

describe('#ListNotifications', () => {
  let uut
  let sandbox
  let notificationsQuery

  beforeEach(() => {
    sandbox = sinon.createSandbox()
    notificationsQuery = {
      listNotifications: sandbox.stub().resolves({
        notifications: [{ type: 'follow', txid: 'tx1', addr: 'addr-a' }],
        total: 1
      })
    }
    uut = new ListNotifications({ adapters: { notificationsQuery } })
  })

  afterEach(() => sandbox.restore())

  it('should throw when adapters are missing', () => {
    try {
      // eslint-disable-next-line no-new
      new ListNotifications({})
      assert.fail('Expected error')
    } catch (err) {
      assert.include(err.message, 'Adapters required')
    }
  })

  it('should throw when notificationsQuery adapter is missing', () => {
    try {
      // eslint-disable-next-line no-new
      new ListNotifications({ adapters: {} })
      assert.fail('Expected error')
    } catch (err) {
      assert.include(err.message, 'notificationsQuery adapter required')
    }
  })

  it('should reject a missing addr', async () => {
    try {
      await uut.execute({})
      assert.fail('Expected error')
    } catch (err) {
      assert.equal(err.status, 400)
      assert.include(err.message, 'addr is required')
    }
  })

  it('should pass addr, limit, and offset to the query adapter', async () => {
    await uut.execute({ addr: 'addr-a', limit: '10', offset: '5' })

    assert.equal(notificationsQuery.listNotifications.callCount, 1)
    assert.deepEqual(notificationsQuery.listNotifications.firstCall.args[0], 'addr-a')
    assert.deepEqual(notificationsQuery.listNotifications.firstCall.args[1], { limit: 10, offset: 5 })
  })

  it('should default limit and offset', async () => {
    await uut.execute({ addr: 'addr-a' })

    assert.deepEqual(notificationsQuery.listNotifications.firstCall.args[1], { limit: 100, offset: 0 })
  })

  it('should reject limit over 100', async () => {
    try {
      await uut.execute({ addr: 'addr-a', limit: '101' })
      assert.fail('Expected error')
    } catch (err) {
      assert.equal(err.status, 400)
      assert.include(err.message, 'limit cannot exceed')
    }
  })

  it('should attach pagination metadata', async () => {
    notificationsQuery.listNotifications.resolves({
      notifications: [{ type: 'like', txid: 'tx1', addr: 'addr-a' }],
      total: 2
    })

    const result = await uut.execute({ addr: 'addr-a', limit: '1', offset: '0' })

    assert.equal(result.notifications.length, 1)
    assert.equal(result.pagination.limit, 1)
    assert.equal(result.pagination.offset, 0)
    assert.equal(result.pagination.total, 2)
    assert.equal(result.pagination.hasMore, true)
  })
})
