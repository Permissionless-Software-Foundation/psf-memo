/*
  Unit tests for the Follow REST controller.
*/

import { assert } from 'chai'
import sinon from 'sinon'
import FollowRESTControllerLib from '../../../src/controllers/rest-api/follow/controller.js'

describe('#FollowRESTController', () => {
  let sandbox

  beforeEach(() => {
    sandbox = sinon.createSandbox()
  })

  afterEach(() => sandbox.restore())

  function makeUut (useCases) {
    return new FollowRESTControllerLib({
      adapters: {},
      useCases
    })
  }

  function makeCtx (query = {}, params = {}) {
    return { query, params, body: null, throw: sandbox.stub() }
  }

  it('should return follow state from use case', async () => {
    const followState = { execute: sandbox.stub().resolves({ followerAddr: 'a', followeeAddr: 'b', following: true }) }
    const uut = makeUut({ followState })
    const ctx = makeCtx({ follower: 'a', followee: 'b' })

    await uut.getFollowState(ctx)

    assert.equal(followState.execute.callCount, 1)
    assert.deepEqual(followState.execute.firstCall.args[0], { followerAddr: 'a', followeeAddr: 'b' })
    assert.equal(ctx.body.following, true)
  })

  it('should return following list from use case', async () => {
    const listFollowing = { execute: sandbox.stub().resolves({ followerAddr: 'a', following: ['b', 'c'] }) }
    const uut = makeUut({ listFollowing })
    const ctx = makeCtx({}, { follower: 'a' })

    await uut.getFollowing(ctx)

    assert.equal(listFollowing.execute.callCount, 1)
    assert.deepEqual(listFollowing.execute.firstCall.args[0], { followerAddr: 'a' })
    assert.deepEqual(ctx.body.following, ['b', 'c'])
  })

  it('should return followers list from use case', async () => {
    const listFollowers = { execute: sandbox.stub().resolves({ followeeAddr: 'b', followers: ['a', 'c'] }) }
    const uut = makeUut({ listFollowers })
    const ctx = makeCtx({}, { followee: 'b' })

    await uut.getFollowers(ctx)

    assert.equal(listFollowers.execute.callCount, 1)
    assert.deepEqual(listFollowers.execute.firstCall.args[0], { followeeAddr: 'b' })
    assert.deepEqual(ctx.body.followers, ['a', 'c'])
  })

  it('should handle use case errors', async () => {
    const followState = { execute: sandbox.stub().rejects(new Error('boom')) }
    const uut = makeUut({ followState })
    const ctx = makeCtx({ follower: 'a', followee: 'b' })

    await uut.getFollowState(ctx)

    assert.equal(ctx.throw.callCount, 1)
    assert.equal(ctx.throw.firstCall.args[0], 500)
  })
})
