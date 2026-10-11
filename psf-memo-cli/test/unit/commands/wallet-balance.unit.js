/*
  Unit tests for the wallet-balance command.

  The balance summarization/rendering is pure and tested directly; the command
  is tested for the shared output contract (human, JSON, usage exit 2, runtime
  exit 1) and the wallet UTXO summing.
*/

// Global npm libraries
import { assert } from 'chai'
import sinon from 'sinon'
import { promises as fs } from 'fs'

// Local libraries
import WalletCreate from '../../../src/commands/wallet-create.js'
import BchWalletMock from '../../mocks/msw-mock.js'
import WalletBalance from '../../../src/commands/wallet-balance.js'
import { summarizeBalance, formatBalanceMessage } from '../../../src/lib/wallet-balance.js'
import { UsageError } from '../../../src/lib/reporter.js'
import { captureStream } from '../../support/capture.js'

const walletCreate = new WalletCreate()

const __dirname = import.meta.dirname
const filename = `${__dirname.toString()}/../../../.wallets/test123.json`

// Build a minimal wallet-shaped object for summarizeBalance tests.
function buildWalletData ({ tokens = [], mintBatons = [] } = {}) {
  return {
    satBalance: 0,
    bchBalance: 0,
    utxos: {
      utxoStore: {
        slpUtxos: {
          type1: { tokens, mintBatons },
          group: { tokens: [], mintBatons: [] },
          nft: { tokens: [] }
        }
      }
    }
  }
}

describe('#wallet-balance', () => {
  let uut
  let sandbox

  before(async () => {
    await walletCreate.createWallet(filename)
  })

  beforeEach(async () => {
    sandbox = sinon.createSandbox()

    uut = new WalletBalance()
  })

  afterEach(() => {
    sandbox.restore()
  })

  after(async () => {
    await fs.rm(filename)
  })

  describe('#wallet-balance helper', () => {
    it('summarizes the BCH balance, tokens, and minting batons', () => {
      const summary = summarizeBalance({
        ...buildWalletData({
          tokens: [
            { tokenId: 'a', ticker: 'AAA', qtyStr: '1' },
            { tokenId: 'b', ticker: 'BBB', qtyStr: '2' }
          ],
          mintBatons: [{ ticker: 'AAA', tokenType: 129, tokenId: 'a' }]
        }),
        satBalance: 100000,
        bchBalance: 0.001
      })

      assert.equal(summary.satBalance, 100000)
      assert.equal(summary.bchBalance, 0.001)
      assert.deepEqual(summary.tokens, [
        { tokenId: 'a', qty: 1, ticker: 'AAA' },
        { tokenId: 'b', qty: 2, ticker: 'BBB' }
      ])
      assert.equal(summary.mintBatons.length, 1)
    })

    it('renders the BCH balance, every token, and every minting baton', () => {
      const message = formatBalanceMessage({
        satBalance: 100000,
        bchBalance: 0.001,
        tokens: [
          { tokenId: 'a', ticker: 'AAA', qty: 1 },
          { tokenId: 'b', ticker: 'BBB', qty: 2 }
        ],
        mintBatons: [{ ticker: 'AAA', tokenType: 129, tokenId: 'a' }]
      })

      assert.include(message, 'BCH balance: 100000 satoshis or 0.001 BCH')
      assert.include(message, 'AAA 1 a')
      assert.include(message, 'BBB 2 b')
      assert.include(message, 'Minting Batons')
      assert.include(message, 'AAA (Group) a')
    })

    it('labels a type-1 baton as Fungible', () => {
      const message = formatBalanceMessage({
        satBalance: 0,
        bchBalance: 0,
        tokens: [],
        mintBatons: [{ ticker: 'AAA', tokenType: 1, tokenId: 'a' }]
      })

      assert.include(message, 'AAA (Fungible) a')
    })

    it('omits the minting-batons section when there are none', () => {
      const message = formatBalanceMessage({ satBalance: 0, bchBalance: 0, tokens: [], mintBatons: [] })

      assert.notInclude(message, 'Minting Batons')
    })
  })

  describe('#getBalances', () => {
    it('should return wallet instance with updated UTXOs', async () => {
      // Mock dependencies
      uut.bchWallet = new BchWalletMock()

      const result = await uut.getBalances()

      assert.property(result, 'walletInfo')
      assert.property(result, 'utxos')
      assert.property(result.utxos, 'utxoStore')
      assert.equal(result.satBalance, 20406)
      assert.isNumber(result.bchBalance)
    })

    it('should catch and throw errors', async () => {
      try {
        await uut.getBalances()

        assert.fail('Unexpected code path')
      } catch (err) {
        assert.include(err.message, 'read properties')
      }
    })
  })

  describe('#validateFlags()', () => {
    it('validateFlags() should return true if name is supplied.', () => {
      assert.equal(uut.validateFlags({ name: 'test' }), true, 'return true')
    })

    it('validateFlags() should throw a UsageError if name is not supplied.', () => {
      try {
        uut.validateFlags({})

        assert.fail('Unexpected code path')
      } catch (err) {
        assert.instanceOf(err, UsageError)
        assert.include(
          err.message,
          'You must specify a wallet name with the -n flag',
          'Expected error message.'
        )
      }
    })
  })

  describe('#run', () => {
    it('prints one JSON object with the BCH and token balances', async () => {
      const out = captureStream()
      const err = captureStream()
      const wallet = new BchWalletMock()
      wallet.utxos.utxoStore.slpUtxos.type1.tokens = [
        { tokenId: 'tkn', ticker: 'TKN', qtyStr: '42.5' }
      ]
      const command = new WalletBalance({
        walletUtil: { instanceWallet: async () => wallet },
        stdout: out.stream,
        stderr: err.stream
      })

      const code = await command.run({ name: 'agent', json: true })

      assert.equal(code, 0)
      assert.equal(err.text(), '')
      const parsed = JSON.parse(out.text())
      assert.equal(parsed.bchBalance, 20406 / 1e8)
      const token = parsed.tokens.find((entry) => entry.ticker === 'TKN')
      assert.equal(token.qty, 42.5)
    })

    it('prints the human balance lines', async () => {
      const out = captureStream()
      const wallet = new BchWalletMock()
      const command = new WalletBalance({
        walletUtil: { instanceWallet: async () => wallet },
        stdout: out.stream
      })

      const code = await command.run({ name: 'agent' })

      assert.equal(code, 0)
      assert.include(out.text(), 'BCH balance: 20406 satoshis')
      assert.include(out.text(), 'Tokens:')
    })

    it('reports a missing name as a usage error (exit 2)', async () => {
      const out = captureStream()
      const err = captureStream()
      const command = new WalletBalance({ stdout: out.stream, stderr: err.stream })

      const code = await command.run({ json: true })

      assert.equal(code, 2)
      assert.equal(out.text(), '')
      assert.deepEqual(JSON.parse(err.text()), {
        error: 'You must specify a wallet name with the -n flag.'
      })
    })

    it('reports a wallet backend failure as a runtime error (exit 1)', async () => {
      const out = captureStream()
      const err = captureStream()
      const command = new WalletBalance({
        walletUtil: { instanceWallet: async () => { throw new Error('wallet backend unavailable') } },
        stdout: out.stream,
        stderr: err.stream
      })

      const code = await command.run({ name: 'agent', json: true })

      assert.equal(code, 1)
      assert.equal(out.text(), '')
      assert.deepEqual(JSON.parse(err.text()), { error: 'wallet backend unavailable' })
    })
  })
})
