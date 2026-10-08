/*
  Unit tests for the memo-search read command.

  These drive the real command against an injected MemoDb class so the required
  query, the resolved page and viewer, the reported posts and profiles, the
  blank-query empty page, the failed request, and the endpoint override are
  pinned without a network.
*/

// Global npm libraries
import { assert } from 'chai'

// Local libraries
import MemoSearch from '../../../src/commands/memo-search.js'
import { captureStream } from '../../support/capture.js'

const PAGE = {
  posts: [
    { txid: 'alpha', addr: 'addrA', text: 'first memo' },
    { txid: 'bravo', addr: 'addrA', text: 'second memo' }
  ],
  profiles: [
    { addr: 'bitcoincash:qcarol', name: 'Carol Search' }
  ],
  pagination: { limit: 50, offset: 0, total: 3, hasMore: false }
}

// Build a MemoDb stand-in that records its options, the requested query, and
// the requested page, then resolves the supplied result or error.
function fakeMemoDb ({ result, error } = {}) {
  const calls = { opts: null, query: null, page: null, count: 0 }
  class FakeMemoDb {
    constructor (opts) {
      calls.opts = opts
    }

    async search (query, page) {
      calls.count++
      calls.query = query
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
  const command = new MemoSearch({
    MemoDbClass: fake.FakeMemoDb,
    envUrl,
    stdout: out.stream,
    stderr: err.stream
  })
  return { command, out, err }
}

describe('#memo-search command', () => {
  let originalExitCode

  beforeEach(() => {
    originalExitCode = process.exitCode
  })

  afterEach(() => {
    process.exitCode = originalExitCode
  })

  it('reads the search page and reports posts, profiles, and pagination as JSON', async () => {
    const fake = fakeMemoDb({ result: PAGE })
    const { command, out, err } = makeCommand(fake)

    const code = await command.run({ json: true, query: 'memo' })

    assert.equal(code, 0)
    assert.equal(fake.calls.query, 'memo')
    assert.deepEqual(fake.calls.page, { limit: 50, offset: 0, viewer: null })
    const data = JSON.parse(out.text())
    assert.deepEqual(data.posts, PAGE.posts)
    assert.deepEqual(data.profiles, PAGE.profiles)
    assert.deepEqual(data.pagination, PAGE.pagination)
    assert.equal(err.text(), '')
  })

  it('forwards the requested page and viewer to the service', async () => {
    const fake = fakeMemoDb({ result: PAGE })
    const { command } = makeCommand(fake)

    await command.run({ json: true, query: 'memo', viewer: 'viewerB', limit: '2', offset: '4' })

    assert.deepEqual(fake.calls.page, { limit: 2, offset: 4, viewer: 'viewerB' })
  })

  it('returns an empty page for a blank query without calling the service', async () => {
    const fake = fakeMemoDb({ result: PAGE })
    const { command, out } = makeCommand(fake)

    const code = await command.run({ json: true, query: '   ' })

    assert.equal(code, 0)
    assert.equal(fake.calls.count, 0)
    const data = JSON.parse(out.text())
    assert.deepEqual(data.posts, [])
    assert.deepEqual(data.profiles, [])
    assert.deepEqual(data.pagination, { limit: 50, offset: 0, total: 0, hasMore: false })
  })

  it('reports a missing query as the documented usage error (exit 2)', async () => {
    const fake = fakeMemoDb({ result: PAGE })
    const { command, err } = makeCommand(fake)

    const code = await command.run({ json: true })

    assert.equal(code, 2)
    assert.deepEqual(JSON.parse(err.text()), {
      error: 'You must specify a search query with the -q flag.'
    })
    assert.equal(fake.calls.count, 0)
  })

  it('reports a failed request on stderr with exit 1', async () => {
    const fake = fakeMemoDb({ error: new Error('Memo DB request failed with HTTP 500') })
    const { command, err } = makeCommand(fake)

    const code = await command.run({ json: true, query: 'memo' })

    assert.equal(code, 1)
    assert.equal(JSON.parse(err.text()).error, 'Memo DB request failed with HTTP 500')
  })

  it('forwards the environment and db-url override to the client', async () => {
    const fake = fakeMemoDb({ result: PAGE })
    const { command } = makeCommand(fake, { envUrl: 'https://env.example' })

    await command.run({ json: true, query: 'memo', dbUrl: 'https://flag.example' })

    assert.equal(fake.calls.opts.envUrl, 'https://env.example')
    assert.equal(fake.calls.opts.dbUrl, 'https://flag.example')
  })

  it('resolves the search flags without reading', () => {
    const command = new MemoSearch({ MemoDbClass: fakeMemoDb().FakeMemoDb })

    assert.deepEqual(command.validateFlags({ query: 'memo', viewer: 'viewerB', limit: '2', offset: '3' }), {
      query: 'memo',
      viewer: 'viewerB',
      limit: 2,
      offset: 3
    })
  })
})
