/*
  Unit tests for the memo-identity read command.

  These drive the real command against injected wallet and Memo DB fakes so the
  required wallet source, the address, BCH and token balances, the profile
  fields (including unset and not-found), and the transport error are pinned
  without a network or wallet file.
*/

// Global npm libraries
import { assert } from 'chai'

// Local libraries
import MemoIdentity from '../../../src/commands/memo-identity.js'
import { captureStream } from '../../support/capture.js'

function makeWallet (address, { bchSats = 0, type1 = [] } = {}) {
  const wallet = {
    walletInfo: { cashAddress: address },
    utxos: {
      utxoStore: {
        bchUtxos: [{ value: bchSats }],
        slpUtxos: {
          type1: { tokens: type1 },
          group: { tokens: [] },
          nft: { tokens: [] }
        }
      }
    },
    initialize: async () => {
      wallet.initialized = true
    }
  }
  return wallet
}

function walletUtilFor (wallet) {
  return {
    instanceWallet: async () => wallet,
    instanceWalletFromWif: async () => wallet
  }
}

// Build a MemoDb stand-in that records its constructor options and resolves
// the supplied name/profile/picture documents or a transport error.
function fakeMemoDb ({ name = null, profile = null, pic = null, error = null } = {}) {
  const calls = { opts: null, addresses: [] }
  class FakeMemoDb {
    constructor (opts) {
      calls.opts = opts
    }

    async getName (addr) {
      calls.addresses.push(addr)
      if (error) throw error
      return name
    }

    async getProfile (addr) {
      calls.addresses.push(addr)
      if (error) throw error
      return profile
    }

    async getProfilePic (addr) {
      calls.addresses.push(addr)
      if (error) throw error
      return pic
    }
  }
  return { FakeMemoDb, calls }
}

describe('#memo-identity command', () => {
  let originalExitCode

  beforeEach(() => {
    originalExitCode = process.exitCode
  })

  afterEach(() => {
    process.exitCode = originalExitCode
  })

  it('reports a missing wallet source as the documented usage error (exit 2)', async () => {
    const out = captureStream()
    const err = captureStream()
    const { FakeMemoDb } = fakeMemoDb()
    const command = new MemoIdentity({
      MemoDbClass: FakeMemoDb,
      envUrl: null,
      walletUtil: walletUtilFor(null),
      stdout: out.stream,
      stderr: err.stream
    })

    const code = await command.run({ json: true })

    assert.equal(code, 2)
    assert.deepEqual(JSON.parse(err.text()), {
      error: 'You must specify a wallet name with the -n flag or a WIF with the --wif flag.'
    })
  })

  it('reports the address, BCH balance, and token balances as JSON', async () => {
    const out = captureStream()
    const err = captureStream()
    const wallet = makeWallet('addrB', {
      bchSats: 123456789,
      type1: [
        { ticker: 'TKN', tokenId: 'TKN', qtyStr: '100' },
        { ticker: 'TKN', tokenId: 'TKN', qtyStr: '50' }
      ]
    })
    const { FakeMemoDb, calls } = fakeMemoDb()
    const command = new MemoIdentity({
      MemoDbClass: FakeMemoDb,
      envUrl: null,
      walletUtil: walletUtilFor(wallet),
      stdout: out.stream,
      stderr: err.stream
    })

    const code = await command.run({ json: true, name: 'wallet1' })

    assert.equal(code, 0)
    assert.equal(wallet.initialized, true)
    assert.deepEqual(calls.addresses, ['addrB', 'addrB', 'addrB'])
    const data = JSON.parse(out.text())
    assert.equal(data.address, 'addrB')
    assert.equal(data.bchBalance, 1.23456789)
    assert.deepEqual(data.tokens, [{ ticker: 'TKN', tokenId: 'TKN', qty: 150 }])
    assert.equal(err.text(), '')
  })

  it('reports the name, bio, and avatar from the Memo DB service', async () => {
    const out = captureStream()
    const { FakeMemoDb } = fakeMemoDb({
      name: { name: 'alice' },
      profile: { text: 'hello memo' },
      pic: { url: 'https://example/a.png' }
    })
    const command = new MemoIdentity({
      MemoDbClass: FakeMemoDb,
      envUrl: null,
      walletUtil: walletUtilFor(makeWallet('addrA')),
      stdout: out.stream,
      stderr: captureStream().stream
    })

    await command.run({ json: true, wif: 'wif-one' })

    const data = JSON.parse(out.text())
    assert.equal(data.name, 'alice')
    assert.equal(data.bio, 'hello memo')
    assert.equal(data.avatar, 'https://example/a.png')
  })

  it('reports unset profile fields when no records exist', async () => {
    const out = captureStream()
    const { FakeMemoDb } = fakeMemoDb({ name: null, profile: null, pic: null })
    const command = new MemoIdentity({
      MemoDbClass: FakeMemoDb,
      envUrl: null,
      walletUtil: walletUtilFor(makeWallet('addrA')),
      stdout: out.stream,
      stderr: captureStream().stream
    })

    const code = await command.run({ json: true, name: 'wallet1' })

    assert.equal(code, 0)
    const data = JSON.parse(out.text())
    assert.equal(data.name, '')
    assert.equal(data.bio, '')
    assert.equal(data.avatar, '')
  })

  it('reports a failed profile request on stderr with exit 1', async () => {
    const out = captureStream()
    const err = captureStream()
    const { FakeMemoDb } = fakeMemoDb({ error: new Error('Memo DB request failed: fetch failed') })
    const command = new MemoIdentity({
      MemoDbClass: FakeMemoDb,
      envUrl: null,
      walletUtil: walletUtilFor(makeWallet('addrA')),
      stdout: out.stream,
      stderr: err.stream
    })

    const code = await command.run({ json: true, name: 'wallet1' })

    assert.equal(code, 1)
    assert.equal(JSON.parse(err.text()).error, 'Memo DB request failed: fetch failed')
  })

  it('accepts the optional flags with no required values', () => {
    const command = new MemoIdentity({ MemoDbClass: fakeMemoDb().FakeMemoDb })

    assert.equal(command.validateFlags({}), true)
  })
})
