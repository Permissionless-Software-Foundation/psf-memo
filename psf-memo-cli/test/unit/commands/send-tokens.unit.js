/*
  Unit tests for send-tokens command.
*/

// Global npm libraries
import { assert } from 'chai'
import sinon from 'sinon'
import { promises as fs } from 'fs'

// Local libraries
import WalletCreate from '../../../src/commands/wallet-create.js'
import WalletUtil from '../../../src/lib/wallet-util.js'
import SendTokens from '../../../src/commands/send-tokens.js'
import { captureStream } from '../../support/capture.js'

const walletCreate = new WalletCreate()
const walletUtil = new WalletUtil()

const __dirname = import.meta.dirname
const filename = `${__dirname.toString()}/../../../.wallets/test123.json`

describe('#send-tokens', () => {
  let uut
  let sandbox

  before(async () => {
    await walletCreate.createWallet(filename)
  })

  beforeEach(async () => {
    sandbox = sinon.createSandbox()

    uut = new SendTokens()
  })

  afterEach(() => {
    sandbox.restore()
  })

  after(async () => {
    await fs.rm(filename)
  })

  describe('#send-tokens', () => {
    it('should send SLP tokens to provided address', async () => {
      // Instantiate the minimal-slp-wallet
      uut.bchWallet = await walletUtil.instanceWallet('test123')

      uut.bchWallet.utxos.utxoStore = {
        slpUtxos: {
          type1: {
            tokens: []
          },
          group: {
            tokens: []
          },
          nft: {
            tokens: []
          }
        }
      }

      const mockTokenBalance = [
        {
          tokenId: '38e97c5d7d3585a2cbf3f9580c82ca33985f9cb0845d4dcce220cb709f9538b0',
          qty: 0.5,
          ticker: 'PSF'
        }
      ]

      // Mock the wallet functions so we don't make network calls.
      sandbox.stub(uut.bchWallet, 'initialize').resolves()
      sandbox.stub(uut, 'getTokenBalances').returns(mockTokenBalance)
      sandbox.stub(uut.bchWallet, 'sendTokens').resolves('fake-txid')

      const flags = {
        name: 'test123',
        qty: 0.01,
        addr: 'bitcoincash:qr2zqrnqdulfmeqs2qe9c5p605lrwe90v5v735s2jl',
        tokenId: '38e97c5d7d3585a2cbf3f9580c82ca33985f9cb0845d4dcce220cb709f9538b0'
      }

      const result = await uut.sendTokens(flags)

      assert.equal(result, 'fake-txid')
    })

    it('should send the exact token balance', async () => {
      // Instantiate the minimal-slp-wallet
      uut.bchWallet = await walletUtil.instanceWallet('test123')

      uut.bchWallet.utxos.utxoStore = {
        slpUtxos: {
          type1: {
            tokens: []
          },
          group: {
            tokens: []
          },
          nft: {
            tokens: []
          }
        }
      }

      const mockTokenBalance = [
        {
          tokenId: '38e97c5d7d3585a2cbf3f9580c82ca33985f9cb0845d4dcce220cb709f9538b0',
          qty: 0.5,
          ticker: 'PSF'
        }
      ]

      // Mock the wallet functions so we don't make network calls.
      sandbox.stub(uut.bchWallet, 'initialize').resolves()
      sandbox.stub(uut, 'getTokenBalances').returns(mockTokenBalance)
      sandbox.stub(uut.bchWallet, 'sendTokens').resolves('fake-txid')

      const flags = {
        name: 'test123',
        qty: 0.5,
        addr: 'bitcoincash:qr2zqrnqdulfmeqs2qe9c5p605lrwe90v5v735s2jl',
        tokenId: '38e97c5d7d3585a2cbf3f9580c82ca33985f9cb0845d4dcce220cb709f9538b0'
      }

      const result = await uut.sendTokens(flags)

      assert.equal(result, 'fake-txid')
    })

    it('should throw error if wallet balance is less than quanity to send', async () => {
      try {
      // Instantiate the minimal-slp-wallet
        uut.bchWallet = await walletUtil.instanceWallet('test123')

        uut.bchWallet.utxos.utxoStore = {
          slpUtxos: {
            type1: {
              tokens: []
            },
            group: {
              tokens: []
            },
            nft: {
              tokens: []
            }
          }
        }

        const mockTokenBalance = [
          {
            tokenId: '38e97c5d7d3585a2cbf3f9580c82ca33985f9cb0845d4dcce220cb709f9538b0',
            qty: 0.5,
            ticker: 'PSF'
          }
        ]

        // Mock the wallet functions so we don't make network calls.
        sandbox.stub(uut.bchWallet, 'initialize').resolves()
        sandbox.stub(uut, 'getTokenBalances').returns(mockTokenBalance)
        sandbox.stub(uut.bchWallet, 'sendTokens').resolves('fake-txid')

        const flags = {
          name: 'test123',
          qty: 0.75,
          addr: 'bitcoincash:qr2zqrnqdulfmeqs2qe9c5p605lrwe90v5v735s2jl',
          tokenId: '38e97c5d7d3585a2cbf3f9580c82ca33985f9cb0845d4dcce220cb709f9538b0'
        }

        await uut.sendTokens(flags)

        assert.fail('Unexpected code path')
      } catch (err) {
        assert.include(err.message, 'Insufficient funds.')
      }
    })

    it('should throw error if wallet contains no tokens', async () => {
      try {
      // Instantiate the minimal-slp-wallet
        uut.bchWallet = await walletUtil.instanceWallet('test123')

        uut.bchWallet.utxos.utxoStore = {
          slpUtxos: {
            type1: {
              tokens: []
            },
            group: {
              tokens: []
            },
            nft: {
              tokens: []
            }
          }
        }

        const mockTokenBalance = []

        // Mock the wallet functions so we don't make network calls.
        sandbox.stub(uut.bchWallet, 'initialize').resolves()
        sandbox.stub(uut, 'getTokenBalances').returns(mockTokenBalance)
        sandbox.stub(uut.bchWallet, 'sendTokens').resolves('fake-txid')

        const flags = {
          name: 'test123',
          qty: 0.75,
          addr: 'bitcoincash:qr2zqrnqdulfmeqs2qe9c5p605lrwe90v5v735s2jl',
          tokenId: '38e97c5d7d3585a2cbf3f9580c82ca33985f9cb0845d4dcce220cb709f9538b0'
        }

        await uut.sendTokens(flags)

        assert.fail('Unexpected code path')
      } catch (err) {
        assert.include(err.message, 'No tokens found on this wallet.')
      }
    })

    it('should throw error if token with token ID is not foundin wallet', async () => {
      try {
      // Instantiate the minimal-slp-wallet
        uut.bchWallet = await walletUtil.instanceWallet('test123')

        uut.bchWallet.utxos.utxoStore = {
          slpUtxos: {
            type1: {
              tokens: []
            },
            group: {
              tokens: []
            },
            nft: {
              tokens: []
            }
          }
        }

        const mockTokenBalance = [
          {
            tokenId: '38e97c5d7d3585a2cbf3f9580c82ca33985f9cb0845d4dcce220cb709f9538b1',
            qty: 0.5,
            ticker: 'PSF'
          }
        ]

        // Mock the wallet functions so we don't make network calls.
        sandbox.stub(uut.bchWallet, 'initialize').resolves()
        sandbox.stub(uut, 'getTokenBalances').returns(mockTokenBalance)
        sandbox.stub(uut.bchWallet, 'sendTokens').resolves('fake-txid')

        const flags = {
          name: 'test123',
          qty: 0.75,
          addr: 'bitcoincash:qr2zqrnqdulfmeqs2qe9c5p605lrwe90v5v735s2jl',
          tokenId: '38e97c5d7d3585a2cbf3f9580c82ca33985f9cb0845d4dcce220cb709f9538b0'
        }

        await uut.sendTokens(flags)

        assert.fail('Unexpected code path')
      } catch (err) {
        assert.include(err.message, 'No tokens in the wallet matched the given token ID.')
      }
    })
  })

  describe('#validateFlags()', () => {
    it('validateFlags() should return true if all arguments are supplied.', () => {
      const flags = {
        name: 'test123',
        qty: 1,
        addr: 'bitcoincash:qr2zqrnqdulfmeqs2qe9c5p605lrwe90v5v735s2jl',
        tokenId: '38e97c5d7d3585a2cbf3f9580c82ca33985f9cb0845d4dcce220cb709f9538b0'
      }

      assert.equal(uut.validateFlags(flags), true, 'return true')
    })

    it('validateFlags() should throw error if name is not supplied.', () => {
      try {
        uut.validateFlags({})

        assert.fail('Unexpected code path')
      } catch (err) {
        assert.include(
          err.message,
          'You must specify a wallet name with the -n flag',
          'Expected error message.'
        )
      }
    })

    it('validateFlags() should throw error if addr is not supplied.', () => {
      try {
        const flags = {
          name: 'test123'
        }
        uut.validateFlags(flags)

        assert.fail('Unexpected code path')
      } catch (err) {
        assert.include(
          err.message,
          'You must specify a receiver address with the -a flag.',
          'Expected error message.'
        )
      }
    })

    it('validateFlags() should throw error if qty is not supplied.', () => {
      try {
        const flags = {
          name: 'test123',
          addr: 'bitcoincash:qr2zqrnqdulfmeqs2qe9c5p605lrwe90v5v735s2jl'
        }
        uut.validateFlags(flags)

        assert.fail('Unexpected code path')
      } catch (err) {
        assert.include(
          err.message,
          'You must specify a quantity in BCH with the -q flag.',
          'Expected error message.'
        )
      }
    })

    it('validateFlags() should throw error if token ID is not supplied.', () => {
      try {
        const flags = {
          name: 'test123',
          addr: 'bitcoincash:qr2zqrnqdulfmeqs2qe9c5p605lrwe90v5v735s2jl',
          qty: 0.1
        }
        uut.validateFlags(flags)

        assert.fail('Unexpected code path')
      } catch (err) {
        assert.include(
          err.message,
          'You must specify a token ID with the -t flag.',
          'Expected error message.'
        )
      }
    })
  })

  describe('#run', () => {
    it('prints one JSON object with the transaction and token explorer link', async () => {
      // Mock dependencies
      sandbox.stub(uut, 'sendTokens').resolves('fake-txid')
      uut.walletUtil = { instanceWallet: async () => ({}) }
      const out = captureStream()
      const err = captureStream()
      uut.stdout = out.stream
      uut.stderr = err.stream

      const code = await uut.run({
        name: 'test123',
        qty: 0.01,
        addr: 'bitcoincash:qto',
        tokenId: 'token-id',
        json: true
      })

      assert.equal(code, 0)
      assert.equal(err.text(), '')
      const parsed = JSON.parse(out.text())
      assert.equal(parsed.txid, 'fake-txid')
      assert.equal(parsed.explorerUrl, 'https://token.fullstack.cash/transactions/?txid=fake-txid')
    })

    it('prints the human TXID lines', async () => {
      sandbox.stub(uut, 'sendTokens').resolves('fake-txid')
      uut.walletUtil = { instanceWallet: async () => ({}) }
      const out = captureStream()
      uut.stdout = out.stream

      const code = await uut.run({ name: 'test123', qty: 0.01, addr: 'bitcoincash:qto', tokenId: 'token-id' })

      assert.equal(code, 0)
      assert.include(out.text(), 'TXID: fake-txid')
    })

    it('reports a missing flag as a usage error (exit 2)', async () => {
      const out = captureStream()
      const err = captureStream()
      uut.stdout = out.stream
      uut.stderr = err.stream

      const code = await uut.run({ json: true })

      assert.equal(code, 2)
      assert.equal(out.text(), '')
      assert.deepEqual(JSON.parse(err.text()), {
        error: 'You must specify a wallet name with the -n flag.'
      })
    })

    it('reports a missing token as a runtime error (exit 1)', async () => {
      uut.walletUtil = { instanceWallet: async () => ({}) }
      sandbox.stub(uut, 'sendTokens').rejects(new Error('no matching token'))
      const out = captureStream()
      const err = captureStream()
      uut.stdout = out.stream
      uut.stderr = err.stream

      const code = await uut.run({ name: 'test123', qty: 1, addr: 'bitcoincash:qto', tokenId: 'token-id', json: true })

      assert.equal(code, 1)
      assert.equal(out.text(), '')
      assert.deepEqual(JSON.parse(err.text()), { error: 'no matching token' })
    })
  })
})
