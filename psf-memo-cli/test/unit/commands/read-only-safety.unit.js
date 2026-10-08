/*
  Unit tests for the read-only safety invariant (X4).

  A read command resolves a wallet only when the requested data is
  wallet-relative. The viewer-independent reads (memo-feed, memo-status,
  memo-profile) must run with no wallet at all, even when a wallet resolver is
  supplied, and a viewer supplied as an address is not a wallet. The
  wallet-relative read (memo-notifications) resolves the wallet it is given
  exactly once and reports a missing wallet as a runtime error.
*/

// Global npm libraries
import { assert } from 'chai'

// Local libraries
import MemoFeed from '../../../src/commands/memo-feed.js'
import MemoStatus from '../../../src/commands/memo-status.js'
import MemoProfile from '../../../src/commands/memo-profile.js'
import MemoNotifications from '../../../src/commands/memo-notifications.js'
import { captureStream } from '../../support/capture.js'

// A wallet resolver that records every resolution and serves the configured
// addresses, rejecting any name it does not know.
function recordingWalletResolver (wallets = {}) {
  const calls = []
  const resolve = (key, kind) => {
    calls.push(key)
    if (!(key in wallets)) throw new Error(`Unknown ${kind} ${key}`)
    return { walletInfo: { cashAddress: wallets[key] } }
  }
  return {
    calls,
    instanceWallet: async (name) => resolve(name, 'wallet'),
    instanceWalletFromWif: async (wif) => resolve(wif, 'wif')
  }
}

// A MemoDb stand-in that serves default results and records the
// address-scoped notification read.
class FakeMemoDb {
  constructor () {
    this.notificationAddr = null
  }

  async getRecentPosts () {
    return { posts: [], pagination: {} }
  }

  async getStatus () {
    return { startBlockHeight: 1, syncedBlockHeight: 2, chainBlockHeight: 3 }
  }

  async getName () {
    return { name: 'name' }
  }

  async getProfile () {
    return { text: 'bio' }
  }

  async getProfilePic () {
    return { url: 'avatar' }
  }

  async getPostsByAddr () {
    return { posts: [], pagination: {} }
  }

  async getFollowState () {
    return { following: false }
  }

  async getNotifications (addr) {
    this.notificationAddr = addr
    return { notifications: [], pagination: {} }
  }
}

// Capture streams plus a command built with the shared read-command fakes.
function readCommand (CommandClass, extra = {}) {
  const out = captureStream()
  const err = captureStream()
  const command = new CommandClass({
    MemoDbClass: FakeMemoDb,
    envUrl: null,
    stdout: out.stream,
    stderr: err.stream,
    ...extra
  })
  return { command, out, err }
}

// Run a viewer-independent read with a resolver available and assert it never
// touched the wallet boundary.
async function assertNeverResolvesWallet (CommandClass, flags = { json: true }) {
  const resolver = recordingWalletResolver()
  const { command } = readCommand(CommandClass, { walletUtil: resolver })

  const code = await command.run(flags)

  assert.equal(code, 0)
  assert.deepEqual(resolver.calls, [])
}

describe('#read-only safety', () => {
  let originalExitCode

  beforeEach(() => {
    originalExitCode = process.exitCode
  })

  afterEach(() => {
    process.exitCode = originalExitCode
  })

  it('memo-feed never resolves a wallet, even when a resolver is available', async () => {
    await assertNeverResolvesWallet(MemoFeed)
  })

  it('memo-status never resolves a wallet, even when a resolver is available', async () => {
    await assertNeverResolvesWallet(MemoStatus)
  })

  it('a memo-profile viewer is an address, not a wallet', async () => {
    const viewer = 'bitcoincash:qqlrzp23w08434twmvr4fxw672whkjy0py26r63g3d'
    await assertNeverResolvesWallet(MemoProfile, { json: true, addr: viewer, viewer })
  })

  it('memo-notifications resolves the wallet it is given exactly once', async () => {
    const resolver = recordingWalletResolver({ viewer1: 'addrA' })
    const { command } = readCommand(MemoNotifications, { walletUtil: resolver })

    const code = await command.run({ json: true, name: 'viewer1' })

    assert.equal(code, 0)
    assert.deepEqual(resolver.calls, ['viewer1'])
  })

  it('memo-notifications reports a missing wallet as a runtime error', async () => {
    const resolver = recordingWalletResolver()
    const { command, err } = readCommand(MemoNotifications, { walletUtil: resolver })

    const code = await command.run({ json: true, name: 'missing-wallet' })

    assert.equal(code, 1)
    assert.deepEqual(resolver.calls, ['missing-wallet'])
    assert.equal(JSON.parse(err.text()).error, 'Unknown wallet missing-wallet')
  })
})
