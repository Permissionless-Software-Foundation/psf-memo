/*
  Shared test scaffolding for the sibling follow-list command unit tests.

  memo-following and memo-followers share the same observable read contract
  (JSON report, request failure, endpoint override). This module builds each
  command with captured streams and a fake Memo DB, and registers the shared
  assertions so each command's test file keeps only its command-specific cases.
*/

// Global npm libraries
import { assert } from 'chai'

// Local libraries
import { captureStream } from './capture.js'

// Build a MemoDb stand-in that records its options and the requested address for
// the given method, then resolves the supplied result or throws the supplied
// error.
export function fakeAddressMemoDb (method, { result, error } = {}) {
  const calls = { opts: null, addr: null }
  class FakeMemoDb {
    constructor (opts) {
      calls.opts = opts
    }

    async [method] (addr) {
      calls.addr = addr
      if (error) throw error
      return result
    }
  }
  return { FakeMemoDb, calls }
}

// Build a command with captured stdout/stderr and the injected dependencies.
export function makeCommand (CommandClass, fake, { walletUtil, envUrl = null } = {}) {
  const out = captureStream()
  const err = captureStream()
  const command = new CommandClass({
    MemoDbClass: fake.FakeMemoDb,
    walletUtil,
    envUrl,
    stdout: out.stream,
    stderr: err.stream
  })
  return { command, out, err }
}

// Register the read-contract tests shared by both follow-list commands.
export function defineFollowCommandTests ({
  label,
  CommandClass,
  method,
  validFlags,
  resultKey,
  result,
  expectedAddr = 'addrA',
  walletUtil
}) {
  const fake = (opts) => fakeAddressMemoDb(method, opts)

  it(`reads the ${label} list and reports the addresses as JSON`, async () => {
    const f = fake({ result })
    const { command, out, err } = makeCommand(CommandClass, f, { walletUtil })

    const code = await command.run({ json: true, ...validFlags })

    assert.equal(code, 0)
    assert.equal(f.calls.addr, expectedAddr)
    const data = JSON.parse(out.text())
    assert.deepEqual(data[resultKey], result[resultKey])
    assert.equal(err.text(), '')
  })

  it('reports a failed request on stderr with exit 1', async () => {
    const f = fake({ error: new Error('Memo DB request failed with HTTP 500') })
    const { command, err } = makeCommand(CommandClass, f, { walletUtil })

    const code = await command.run({ json: true, ...validFlags })

    assert.equal(code, 1)
    assert.equal(JSON.parse(err.text()).error, 'Memo DB request failed with HTTP 500')
  })

  it('forwards the environment and db-url override to the client', async () => {
    const f = fake({ result })
    const { command } = makeCommand(CommandClass, f, { walletUtil, envUrl: 'https://env.example' })

    await command.run({ json: true, ...validFlags, dbUrl: 'https://flag.example' })

    assert.equal(f.calls.opts.envUrl, 'https://env.example')
    assert.equal(f.calls.opts.dbUrl, 'https://flag.example')
  })
}
