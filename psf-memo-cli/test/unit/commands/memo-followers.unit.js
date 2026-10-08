/*
  Unit tests for the memo-followers read command.

  These drive the real command against an injected MemoDb class so the requested
  followee address, the reported followers list, the missing-address usage
  error, the failed request, and the endpoint override are pinned without a
  network.
*/

// Global npm libraries
import { assert } from 'chai'

// Local libraries
import MemoFollowers from '../../../src/commands/memo-followers.js'
import { captureStream } from '../../support/capture.js'

const RESULT = { followeeAddr: 'addrA', followers: ['addrD', 'addrE'] }

// Build a MemoDb stand-in that records its options and the requested address,
// then resolves the supplied result or error.
function fakeMemoDb ({ result, error } = {}) {
  const calls = { opts: null, addr: null }
  class FakeMemoDb {
    constructor (opts) {
      calls.opts = opts
    }

    async getFollowers (addr) {
      calls.addr = addr
      if (error) throw error
      return result
    }
  }
  return { FakeMemoDb, calls }
}

function makeCommand (fake, { envUrl = null } = {}) {
  const out = captureStream()
  const err = captureStream()
  const command = new MemoFollowers({
    MemoDbClass: fake.FakeMemoDb,
    envUrl,
    stdout: out.stream,
    stderr: err.stream
  })
  return { command, out, err }
}

describe('#memo-followers command', () => {
  let originalExitCode

  beforeEach(() => {
    originalExitCode = process.exitCode
  })

  afterEach(() => {
    process.exitCode = originalExitCode
  })

  it('reads the followers list and reports the addresses as JSON', async () => {
    const fake = fakeMemoDb({ result: RESULT })
    const { command, out, err } = makeCommand(fake)

    const code = await command.run({ json: true, addr: 'addrA' })

    assert.equal(code, 0)
    assert.equal(fake.calls.addr, 'addrA')
    const data = JSON.parse(out.text())
    assert.deepEqual(data.followers, RESULT.followers)
    assert.equal(err.text(), '')
  })

  it('reports a missing address as the documented usage error (exit 2)', async () => {
    const fake = fakeMemoDb({ result: RESULT })
    const { command, err } = makeCommand(fake)

    const code = await command.run({ json: true })

    assert.equal(code, 2)
    assert.deepEqual(JSON.parse(err.text()), {
      error: 'You must specify a followee address with the -a flag.'
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
    const fake = fakeMemoDb({ result: RESULT })
    const { command } = makeCommand(fake, { envUrl: 'https://env.example' })

    await command.run({ json: true, addr: 'addrA', dbUrl: 'https://flag.example' })

    assert.equal(fake.calls.opts.envUrl, 'https://env.example')
    assert.equal(fake.calls.opts.dbUrl, 'https://flag.example')
  })

  it('resolves the address flag without reading', () => {
    const command = new MemoFollowers({ MemoDbClass: fakeMemoDb().FakeMemoDb })

    assert.deepEqual(command.validateFlags({ addr: 'addrA' }), { address: 'addrA' })
  })
})
