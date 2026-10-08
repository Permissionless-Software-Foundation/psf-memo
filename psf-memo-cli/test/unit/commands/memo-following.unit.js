/*
  Unit tests for the memo-following read command.

  These drive the real command against an injected MemoDb class and a fake
  wallet resolver so the resolved follower address, the reported following
  list, the missing-source usage error, the failed request, and the endpoint
  override are pinned without a network or a real wallet.
*/

// Global npm libraries
import { assert } from 'chai'

// Local libraries
import MemoFollowing from '../../../src/commands/memo-following.js'
import { captureStream } from '../../support/capture.js'

const RESULT = { followerAddr: 'addrA', following: ['addrB', 'addrC'] }

// Build a MemoDb stand-in that records its options and the requested address,
// then resolves the supplied result or error.
function fakeMemoDb ({ result, error } = {}) {
  const calls = { opts: null, addr: null }
  class FakeMemoDb {
    constructor (opts) {
      calls.opts = opts
    }

    async getFollowing (addr) {
      calls.addr = addr
      if (error) throw error
      return result
    }
  }
  return { FakeMemoDb, calls }
}

// A wallet resolver that yields a fixed cash address for any source.
function fakeWalletUtil (address = 'addrA') {
  return {
    async instanceWallet () {
      return { walletInfo: { cashAddress: address } }
    },
    async instanceWalletFromWif () {
      return { walletInfo: { cashAddress: address } }
    }
  }
}

function makeCommand (fake, { walletUtil = fakeWalletUtil(), envUrl = null } = {}) {
  const out = captureStream()
  const err = captureStream()
  const command = new MemoFollowing({
    MemoDbClass: fake.FakeMemoDb,
    walletUtil,
    envUrl,
    stdout: out.stream,
    stderr: err.stream
  })
  return { command, out, err }
}

describe('#memo-following command', () => {
  let originalExitCode

  beforeEach(() => {
    originalExitCode = process.exitCode
  })

  afterEach(() => {
    process.exitCode = originalExitCode
  })

  it('reads the following list and reports the addresses as JSON', async () => {
    const fake = fakeMemoDb({ result: RESULT })
    const { command, out, err } = makeCommand(fake)

    const code = await command.run({ json: true, name: 'wallet' })

    assert.equal(code, 0)
    assert.equal(fake.calls.addr, 'addrA')
    const data = JSON.parse(out.text())
    assert.deepEqual(data.following, RESULT.following)
    assert.equal(err.text(), '')
  })

  it('resolves the wallet from a WIF', async () => {
    const fake = fakeMemoDb({ result: RESULT })
    const { command } = makeCommand(fake)

    await command.run({ json: true, wif: 'wif-key' })

    assert.equal(fake.calls.addr, 'addrA')
  })

  it('reports a missing wallet source as the documented usage error (exit 2)', async () => {
    const fake = fakeMemoDb({ result: RESULT })
    const { command, err } = makeCommand(fake)

    const code = await command.run({ json: true })

    assert.equal(code, 2)
    assert.deepEqual(JSON.parse(err.text()), {
      error: 'You must specify a wallet name with the -n flag or a WIF with the --wif flag.'
    })
    assert.equal(fake.calls.addr, null)
  })

  it('reports a failed request on stderr with exit 1', async () => {
    const fake = fakeMemoDb({ error: new Error('Memo DB request failed with HTTP 500') })
    const { command, err } = makeCommand(fake)

    const code = await command.run({ json: true, name: 'wallet' })

    assert.equal(code, 1)
    assert.equal(JSON.parse(err.text()).error, 'Memo DB request failed with HTTP 500')
  })

  it('forwards the environment and db-url override to the client', async () => {
    const fake = fakeMemoDb({ result: RESULT })
    const { command } = makeCommand(fake, { envUrl: 'https://env.example' })

    await command.run({ json: true, name: 'wallet', dbUrl: 'https://flag.example' })

    assert.equal(fake.calls.opts.envUrl, 'https://env.example')
    assert.equal(fake.calls.opts.dbUrl, 'https://flag.example')
  })

  it('resolves the wallet flags without reading', () => {
    const command = new MemoFollowing({ MemoDbClass: fakeMemoDb().FakeMemoDb, walletUtil: fakeWalletUtil() })

    assert.deepEqual(command.validateFlags({ name: 'wallet' }), { name: 'wallet', wif: null })
  })

  it('defaults to the real wallet utility when none is injected', () => {
    const command = new MemoFollowing({ MemoDbClass: fakeMemoDb().FakeMemoDb })

    assert.isFunction(command.walletUtil.instanceWallet)
  })
})
