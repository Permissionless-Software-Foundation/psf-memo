/*
  Unit tests for the memo-posts read command.

  These drive the real command against an injected MemoDb class so the required
  address, the resolved page, the pagination passthrough, the failed request,
  and the endpoint override are pinned without a network.
*/

// Global npm libraries
import { assert } from 'chai'

// Local libraries
import MemoPosts from '../../../src/commands/memo-posts.js'
import { captureStream } from '../../support/capture.js'

const PAGE = {
  posts: [
    { txid: 'alpha', addr: 'addrA', text: 'first memo', replyCount: 2, likeCount: 3 },
    { txid: 'bravo', addr: 'addrA', text: 'second memo', replyCount: 0, likeCount: 0 }
  ],
  pagination: { limit: 50, offset: 0, total: 2, hasMore: false }
}

// Build a MemoDb stand-in that records its options and the requested page, then
// resolves the supplied result or error.
function fakeMemoDb ({ result, error } = {}) {
  const calls = { opts: null, addr: null, page: null }
  class FakeMemoDb {
    constructor (opts) {
      calls.opts = opts
    }

    async getPostsByAddr (addr, page) {
      calls.addr = addr
      calls.page = page
      if (error) throw error
      return result
    }
  }
  return { FakeMemoDb, calls }
}

function makeCommand (fake, { envUrl = null } = {}) {
  const out = captureStream()
  const err = captureStream()
  const command = new MemoPosts({
    MemoDbClass: fake.FakeMemoDb,
    envUrl,
    stdout: out.stream,
    stderr: err.stream
  })
  return { command, out, err }
}

describe('#memo-posts command', () => {
  let originalExitCode

  beforeEach(() => {
    originalExitCode = process.exitCode
  })

  afterEach(() => {
    process.exitCode = originalExitCode
  })

  it('reads the address page and reports the posts and pagination as JSON', async () => {
    const fake = fakeMemoDb({ result: PAGE })
    const { command, out, err } = makeCommand(fake)

    const code = await command.run({ json: true, addr: 'addrA' })

    assert.equal(code, 0)
    assert.equal(fake.calls.addr, 'addrA')
    assert.deepEqual(fake.calls.page, { limit: 50, offset: 0 })
    const data = JSON.parse(out.text())
    assert.deepEqual(data.posts, PAGE.posts)
    assert.deepEqual(data.pagination, PAGE.pagination)
    assert.equal(err.text(), '')
  })

  it('forwards the requested page to the service', async () => {
    const fake = fakeMemoDb({ result: PAGE })
    const { command } = makeCommand(fake)

    await command.run({ json: true, addr: 'addrA', limit: '2', offset: '4' })

    assert.deepEqual(fake.calls.page, { limit: 2, offset: 4 })
  })

  it('reports a missing address as the documented usage error (exit 2)', async () => {
    const fake = fakeMemoDb({ result: PAGE })
    const { command, err } = makeCommand(fake)

    const code = await command.run({ json: true })

    assert.equal(code, 2)
    assert.deepEqual(JSON.parse(err.text()), {
      error: 'You must specify an author address with the -a flag.'
    })
    assert.equal(fake.calls.addr, null)
  })

  it('reports a failed request on stderr with exit 1', async () => {
    const fake = fakeMemoDb({ error: new Error('Memo DB request failed with HTTP 500') })
    const { command, err } = makeCommand(fake)

    const code = await command.run({ json: true, addr: 'addrA' })

    assert.equal(code, 1)
    assert.equal(JSON.parse(err.text()).error, 'Memo DB request failed with HTTP 500')
  })

  it('forwards the environment and db-url override to the client', async () => {
    const fake = fakeMemoDb({ result: PAGE })
    const { command } = makeCommand(fake, { envUrl: 'https://env.example' })

    await command.run({ json: true, addr: 'addrA', dbUrl: 'https://flag.example' })

    assert.equal(fake.calls.opts.envUrl, 'https://env.example')
    assert.equal(fake.calls.opts.dbUrl, 'https://flag.example')
  })

  it('resolves the page flags without reading', () => {
    const command = new MemoPosts({ MemoDbClass: fakeMemoDb().FakeMemoDb })

    assert.deepEqual(command.validateFlags({ addr: 'addrA', limit: '2', offset: '3' }), {
      address: 'addrA',
      limit: 2,
      offset: 3
    })
  })
})
