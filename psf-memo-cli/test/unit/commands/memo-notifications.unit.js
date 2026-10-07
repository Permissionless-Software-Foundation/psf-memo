/*
  Unit tests for the memo-notifications read command.

  These drive the real command against injected wallet and MemoDb fakes so the
  wallet-relative address, the resolved page, the pagination passthrough, the
  missing-wallet usage error, the failed request, and the endpoint override are
  pinned without a network or a wallet file.
*/

// Global npm libraries
import { assert } from 'chai'

// Local libraries
import MemoNotifications from '../../../src/commands/memo-notifications.js'
import { captureStream } from '../../support/capture.js'

const PAGE = {
  notifications: [
    { txid: 'notif-1', type: 'follow', addr: 'followerA' },
    { txid: 'notif-2', type: 'reply', addr: 'replier', postTxid: 'post-x', text: 'hi' }
  ],
  pagination: { limit: 50, offset: 0, total: 2, hasMore: false }
}

// Build a MemoDb stand-in that records its options, the requested address, and
// the requested page, then resolves the supplied result or error.
function fakeMemoDb ({ result, error } = {}) {
  const calls = { opts: null, addr: null, page: null }
  class FakeMemoDb {
    constructor (opts) {
      calls.opts = opts
    }

    async getNotifications (addr, page) {
      calls.addr = addr
      calls.page = page
      if (error) throw error
      return result
    }
  }
  return { FakeMemoDb, calls }
}

function walletUtilFor (address = 'addrA') {
  const wallet = { walletInfo: { cashAddress: address } }
  return {
    instanceWallet: async () => wallet,
    instanceWalletFromWif: async () => wallet
  }
}

describe('#memo-notifications command', () => {
  let originalExitCode

  beforeEach(() => {
    originalExitCode = process.exitCode
  })

  afterEach(() => {
    process.exitCode = originalExitCode
  })

  it('resolves the wallet address and reports the notifications page as JSON', async () => {
    const out = captureStream()
    const err = captureStream()
    const { FakeMemoDb, calls } = fakeMemoDb({ result: PAGE })
    const command = new MemoNotifications({
      MemoDbClass: FakeMemoDb,
      envUrl: null,
      walletUtil: walletUtilFor('addrA'),
      stdout: out.stream,
      stderr: err.stream
    })

    const code = await command.run({ json: true, name: 'wallet1' })

    assert.equal(code, 0)
    assert.equal(calls.addr, 'addrA')
    assert.deepEqual(calls.page, { limit: 50, offset: 0 })
    const data = JSON.parse(out.text())
    assert.deepEqual(data.notifications, PAGE.notifications)
    assert.deepEqual(data.pagination, PAGE.pagination)
    assert.equal(err.text(), '')
  })

  it('accepts a WIF wallet source', async () => {
    const out = captureStream()
    const { FakeMemoDb, calls } = fakeMemoDb({ result: PAGE })
    const command = new MemoNotifications({
      MemoDbClass: FakeMemoDb,
      envUrl: null,
      walletUtil: walletUtilFor('addrW'),
      stdout: out.stream,
      stderr: captureStream().stream
    })

    const code = await command.run({ json: true, wif: 'wif-one' })

    assert.equal(code, 0)
    assert.equal(calls.addr, 'addrW')
  })

  it('reports a missing wallet source as the documented usage error (exit 2)', async () => {
    const out = captureStream()
    const err = captureStream()
    const { FakeMemoDb, calls } = fakeMemoDb({ result: PAGE })
    const command = new MemoNotifications({
      MemoDbClass: FakeMemoDb,
      envUrl: null,
      walletUtil: walletUtilFor(),
      stdout: out.stream,
      stderr: err.stream
    })

    const code = await command.run({ json: true })

    assert.equal(code, 2)
    assert.deepEqual(JSON.parse(err.text()), {
      error: 'You must specify a wallet name with the -n flag or a WIF with the --wif flag.'
    })
    assert.equal(calls.addr, null)
  })

  it('forwards the resolved page to the service', async () => {
    const out = captureStream()
    const { FakeMemoDb, calls } = fakeMemoDb({ result: PAGE })
    const command = new MemoNotifications({
      MemoDbClass: FakeMemoDb,
      envUrl: null,
      walletUtil: walletUtilFor(),
      stdout: out.stream,
      stderr: captureStream().stream
    })

    await command.run({ json: true, name: 'wallet1', limit: '2', offset: '4' })

    assert.deepEqual(calls.page, { limit: 2, offset: 4 })
  })

  it('reports a failed request on stderr with exit 1', async () => {
    const out = captureStream()
    const err = captureStream()
    const { FakeMemoDb } = fakeMemoDb({ error: new Error('Memo DB request failed with HTTP 500') })
    const command = new MemoNotifications({
      MemoDbClass: FakeMemoDb,
      envUrl: null,
      walletUtil: walletUtilFor(),
      stdout: out.stream,
      stderr: err.stream
    })

    const code = await command.run({ json: true, name: 'wallet1' })

    assert.equal(code, 1)
    assert.equal(JSON.parse(err.text()).error, 'Memo DB request failed with HTTP 500')
  })

  it('forwards the environment and db-url override to the client', async () => {
    const out = captureStream()
    const { FakeMemoDb, calls } = fakeMemoDb({ result: PAGE })
    const command = new MemoNotifications({
      MemoDbClass: FakeMemoDb,
      envUrl: 'https://env.example',
      walletUtil: walletUtilFor(),
      stdout: out.stream,
      stderr: captureStream().stream
    })

    await command.run({ json: true, name: 'wallet1', dbUrl: 'https://flag.example' })

    assert.equal(calls.opts.envUrl, 'https://env.example')
    assert.equal(calls.opts.dbUrl, 'https://flag.example')
  })

  it('resolves the page flags without reading', () => {
    const command = new MemoNotifications({
      MemoDbClass: fakeMemoDb().FakeMemoDb,
      walletUtil: walletUtilFor()
    })

    assert.deepEqual(command.validateFlags({ limit: '2', offset: '3' }), { limit: 2, offset: 3 })
  })
})
