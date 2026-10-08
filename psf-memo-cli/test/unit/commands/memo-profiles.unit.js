/*
  Unit tests for the memo-profiles read command.

  These drive the real command against an injected MemoDb class so the resolved
  page, the raw profile fields (including null identity fields), the pagination
  passthrough, the failed request, and the endpoint override are pinned without
  a network.
*/

// Global npm libraries
import { assert } from 'chai'

// Local libraries
import MemoProfiles from '../../../src/commands/memo-profiles.js'
import { captureStream } from '../../support/capture.js'

const PAGE = {
  profiles: [
    { addr: 'addrA', text: 'alice bio', name: 'alice', profilePicUrl: 'https://example.com/alice.png', txid: 'txA', blockHeight: 600300, seen: 300 },
    { addr: 'addrB', text: 'bob bio', name: null, profilePicUrl: null, txid: 'txB', blockHeight: 600200, seen: 200 }
  ],
  pagination: { limit: 50, offset: 0, total: 2, hasMore: false }
}

// Build a MemoDb stand-in that records its options and the requested page, then
// resolves the supplied result or error.
function fakeMemoDb ({ result, error } = {}) {
  const calls = { opts: null, page: null }
  class FakeMemoDb {
    constructor (opts) {
      calls.opts = opts
    }

    async getRecentProfiles (page) {
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
  const command = new MemoProfiles({
    MemoDbClass: fake.FakeMemoDb,
    envUrl,
    stdout: out.stream,
    stderr: err.stream
  })
  return { command, out, err }
}

describe('#memo-profiles command', () => {
  let originalExitCode

  beforeEach(() => {
    originalExitCode = process.exitCode
  })

  afterEach(() => {
    process.exitCode = originalExitCode
  })

  it('reads the profile page and reports the profiles and pagination as JSON', async () => {
    const fake = fakeMemoDb({ result: PAGE })
    const { command, out, err } = makeCommand(fake)

    const code = await command.run({ json: true })

    assert.equal(code, 0)
    assert.deepEqual(fake.calls.page, { limit: 50, offset: 0 })
    const data = JSON.parse(out.text())
    assert.deepEqual(data.profiles, PAGE.profiles)
    assert.deepEqual(data.pagination, PAGE.pagination)
    assert.equal(err.text(), '')
  })

  it('reports a null display name and avatar verbatim', async () => {
    const fake = fakeMemoDb({ result: PAGE })
    const { command, out } = makeCommand(fake)

    await command.run({ json: true })

    const data = JSON.parse(out.text())
    assert.isNull(data.profiles[1].name)
    assert.isNull(data.profiles[1].profilePicUrl)
  })

  it('forwards the requested page to the service', async () => {
    const fake = fakeMemoDb({ result: PAGE })
    const { command } = makeCommand(fake)

    await command.run({ json: true, limit: '2', offset: '4' })

    assert.deepEqual(fake.calls.page, { limit: 2, offset: 4 })
  })

  it('reports a failed request on stderr with exit 1', async () => {
    const fake = fakeMemoDb({ error: new Error('Memo DB request failed with HTTP 500') })
    const { command, err } = makeCommand(fake)

    const code = await command.run({ json: true })

    assert.equal(code, 1)
    assert.equal(JSON.parse(err.text()).error, 'Memo DB request failed with HTTP 500')
  })

  it('forwards the environment and db-url override to the client', async () => {
    const fake = fakeMemoDb({ result: PAGE })
    const { command } = makeCommand(fake, { envUrl: 'https://env.example' })

    await command.run({ json: true, dbUrl: 'https://flag.example' })

    assert.equal(fake.calls.opts.envUrl, 'https://env.example')
    assert.equal(fake.calls.opts.dbUrl, 'https://flag.example')
  })

  it('resolves the page flags without reading', () => {
    const command = new MemoProfiles({ MemoDbClass: fakeMemoDb().FakeMemoDb })

    assert.deepEqual(command.validateFlags({ limit: '2', offset: '3' }), { limit: 2, offset: 3 })
  })
})
