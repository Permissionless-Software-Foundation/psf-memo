/*
  Unit tests for the memo-profile read command.

  These drive the real command against an injected MemoDb class so the composed
  identity, the address's post page, the optional viewer follow state, the
  no-viewer default, the required address, the failed request, and the endpoint
  override are pinned without a network.
*/

// Global npm libraries
import { assert } from 'chai'

// Local libraries
import MemoProfile from '../../../src/commands/memo-profile.js'
import { captureStream } from '../../support/capture.js'

const IDENTITY = {
  name: { name: 'alice' },
  profile: { text: 'hello memo' },
  pic: { url: 'https://example/a.png' }
}

const PAGE = {
  posts: [{ txid: 'alpha', addr: 'addrA', text: 'first', replyCount: 1, likeCount: 2 }],
  pagination: { limit: 50, offset: 0, total: 1, hasMore: false }
}

// Build a MemoDb stand-in that records every call and resolves the supplied
// identity, page, follow state, or error.
function fakeMemoDb ({ identity = IDENTITY, page = PAGE, following = false, error = null } = {}) {
  const calls = { opts: null, name: [], profile: [], pic: [], posts: [], follow: [] }
  class FakeMemoDb {
    constructor (opts) {
      calls.opts = opts
    }

    async getName (addr) {
      calls.name.push(addr)
      if (error) throw error
      return identity.name
    }

    async getProfile (addr) {
      calls.profile.push(addr)
      if (error) throw error
      return identity.profile
    }

    async getProfilePic (addr) {
      calls.pic.push(addr)
      if (error) throw error
      return identity.pic
    }

    async getPostsByAddr (addr, opts) {
      calls.posts.push({ addr, opts })
      if (error) throw error
      return page
    }

    async getFollowState (follower, followee) {
      calls.follow.push({ follower, followee })
      if (error) throw error
      return { following }
    }
  }
  return { FakeMemoDb, calls }
}

function makeCommand (fake, { envUrl = null } = {}) {
  const out = captureStream()
  const err = captureStream()
  const command = new MemoProfile({
    MemoDbClass: fake.FakeMemoDb,
    envUrl,
    stdout: out.stream,
    stderr: err.stream
  })
  return { command, out, err }
}

describe('#memo-profile command', () => {
  let originalExitCode

  beforeEach(() => {
    originalExitCode = process.exitCode
  })

  afterEach(() => {
    process.exitCode = originalExitCode
  })

  it('composes the identity, post page, and viewer follow state as JSON', async () => {
    const fake = fakeMemoDb({ following: true })
    const { command, out, err } = makeCommand(fake)

    const code = await command.run({ json: true, addr: 'addrA', viewer: 'viewerB', limit: '2', offset: '4' })

    assert.equal(code, 0)
    assert.deepEqual(fake.calls.name, ['addrA'])
    assert.deepEqual(fake.calls.posts, [{ addr: 'addrA', opts: { limit: 2, offset: 4 } }])
    assert.deepEqual(fake.calls.follow, [{ follower: 'viewerB', followee: 'addrA' }])

    const data = JSON.parse(out.text())
    assert.equal(data.address, 'addrA')
    assert.equal(data.name, 'alice')
    assert.equal(data.bio, 'hello memo')
    assert.equal(data.avatar, 'https://example/a.png')
    assert.deepEqual(data.posts, PAGE.posts)
    assert.deepEqual(data.pagination, PAGE.pagination)
    assert.equal(data.following, true)
    assert.include(data.message, 'address: addrA')
    assert.equal(err.text(), '')
  })

  it('reports not followed without a viewer and never asks for the follow state', async () => {
    const fake = fakeMemoDb()
    const { command, out } = makeCommand(fake)

    const code = await command.run({ json: true, addr: 'addrA' })

    assert.equal(code, 0)
    assert.equal(fake.calls.follow.length, 0)
    assert.equal(JSON.parse(out.text()).following, false)
  })

  it('reports a missing address as the documented usage error (exit 2)', async () => {
    const fake = fakeMemoDb()
    const { command, err } = makeCommand(fake)

    const code = await command.run({ json: true })

    assert.equal(code, 2)
    assert.deepEqual(JSON.parse(err.text()), {
      error: 'You must specify a profile address with the -a flag.'
    })
    assert.deepEqual(fake.calls.name, [])
  })

  it('reports a failed request on stderr with exit 1', async () => {
    const fake = fakeMemoDb({ error: new Error('Memo DB request failed with HTTP 500') })
    const { command, err } = makeCommand(fake)

    const code = await command.run({ json: true, addr: 'addrA' })

    assert.equal(code, 1)
    assert.equal(JSON.parse(err.text()).error, 'Memo DB request failed with HTTP 500')
  })

  it('forwards the environment and db-url override to the client', async () => {
    const fake = fakeMemoDb()
    const { command } = makeCommand(fake, { envUrl: 'https://env.example' })

    await command.run({ json: true, addr: 'addrA', dbUrl: 'https://flag.example' })

    assert.equal(fake.calls.opts.envUrl, 'https://env.example')
    assert.equal(fake.calls.opts.dbUrl, 'https://flag.example')
  })

  it('resolves the profile flags without reading', () => {
    const command = new MemoProfile({ MemoDbClass: fakeMemoDb().FakeMemoDb })

    assert.deepEqual(command.validateFlags({ addr: 'addrA', viewer: 'viewerB', limit: '2', offset: '3' }), {
      address: 'addrA',
      viewer: 'viewerB',
      limit: 2,
      offset: 3
    })
  })
})
