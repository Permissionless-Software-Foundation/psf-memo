/*
  Unit tests for the wallet-sweep command.
*/

// Global npm libraries
import { assert } from 'chai'
import sinon from 'sinon'
import { promises as fs } from 'fs'

// Local libraries
import WalletCreate from '../../../src/commands/wallet-create.js'
import WalletUtil from '../../../src/lib/wallet-util.js'
import WalletSweep from '../../../src/commands/wallet-sweep.js'
import { captureStream } from '../../support/capture.js'

const walletCreate = new WalletCreate()
const walletUtil = new WalletUtil()

const __dirname = import.meta.dirname
const filename = `${__dirname.toString()}/../../../.wallets/test123.json`

describe('#wallet-sweep', () => {
  let uut
  let sandbox

  before(async () => {
    await walletCreate.createWallet(filename)
  })

  beforeEach(async () => {
    sandbox = sinon.createSandbox()

    uut = new WalletSweep()
  })

  afterEach(() => {
    sandbox.restore()
  })

  after(async () => {
    await fs.rm(filename)
  })

  describe('#sweepWif', () => {
    it('should sweep funds from a private key', async () => {
      // Instantiate the minimal-slp-wallet
      uut.bchWallet = await walletUtil.instanceWallet('test123')

      // Mock dependencies
      class MockSweepLib {
        populateObjectFromNetwork () {}
        async sweepTo () {}
      }
      uut.BchTokenSweep = MockSweepLib
      sandbox.stub(uut.bchWallet.ar, 'sendTx').resolves('fake-txid')

      const flags = {
        wif: 'Kzq8EEyjkXGzDmBbWxHWY8bxayxXawVDmrnmgq7JQmhRgMCrorfj',
        name: 'test123'
      }

      const result = await uut.sweepWif(flags)

      assert.equal(result, 'fake-txid')
    })

    it('should catch, report, and throw errors', async () => {
      try {
        await uut.sweepWif()

        assert.fail('Unexpected code path')
      } catch (err) {
        assert.include(err.message, 'read properties')
      }
    })
  })

  describe('#validateFlags()', () => {
    it('validateFlags() should return true if all arguments are supplied.', () => {
      const flags = {
        name: 'test123',
        wif: 'Kzq8EEyjkXGzDmBbWxHWY8bxayxXawVDmrnmgq7JQmhRgMCrorfj'
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

    it('validateFlags() should throw error if wif is not supplied.', () => {
      try {
        const flags = {
          name: 'test123'
        }
        uut.validateFlags(flags)

        assert.fail('Unexpected code path')
      } catch (err) {
        assert.include(
          err.message,
          'You must specify a private key to sweep with the -w flag.',
          'Expected error message.'
        )
      }
    })
  })

  describe('#run', () => {
    it('prints one JSON object with the sweep transaction', async () => {
      // Mock dependencies
      sandbox.stub(uut, 'sweepWif').resolves('fake-txid')
      uut.walletUtil = { instanceWallet: async () => ({}) }
      const out = captureStream()
      const err = captureStream()
      uut.stdout = out.stream
      uut.stderr = err.stream

      const code = await uut.run({
        name: 'test123',
        wif: 'Kzq8EEyjkXGzDmBbWxHWY8bxayxXawVDmrnmgq7JQmhRgMCrorfj',
        json: true
      })

      assert.equal(code, 0)
      assert.equal(err.text(), '')
      const parsed = JSON.parse(out.text())
      assert.equal(parsed.txid, 'fake-txid')
      assert.equal(parsed.explorerUrl, 'https://bch.loping.net/tx/fake-txid')
    })

    it('prints the human sweep lines', async () => {
      sandbox.stub(uut, 'sweepWif').resolves('fake-txid')
      uut.walletUtil = { instanceWallet: async () => ({}) }
      const out = captureStream()
      uut.stdout = out.stream

      const code = await uut.run({ name: 'test123', wif: 'wif' })

      assert.equal(code, 0)
      assert.include(out.text(), 'BCH successfully swept from the private key')
      assert.include(out.text(), 'TXID: fake-txid')
    })

    it('reports a missing wallet source as a usage error (exit 2)', async () => {
      const out = captureStream()
      const err = captureStream()
      uut.stdout = out.stream
      uut.stderr = err.stream

      const code = await uut.run({ json: true })

      assert.equal(code, 2)
      assert.deepEqual(JSON.parse(err.text()), {
        error: 'You must specify a wallet name with the -n flag.'
      })
    })

    it('reports a sweep failure as a runtime error (exit 1)', async () => {
      sandbox.stub(uut, 'sweepWif').rejects(new Error('sweep failed'))
      uut.walletUtil = { instanceWallet: async () => ({}) }
      const out = captureStream()
      const err = captureStream()
      uut.stdout = out.stream
      uut.stderr = err.stream

      const code = await uut.run({ name: 'test123', wif: 'wif', json: true })

      assert.equal(code, 1)
      assert.deepEqual(JSON.parse(err.text()), { error: 'sweep failed' })
    })

    it('should not echo the swept private key in its output', async () => {
      const wif = 'Kzq8EEyjkXGzDmBbWxHWY8bxayxXawVDmrnmgq7JQmhRgMCrorfj'
      const txid = 'abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789'

      // Bypass the network wallet by injecting a fake wallet and sweep result.
      uut.walletUtil = {
        instanceWallet: async () => ({
          walletInfo: { cashAddress: 'bitcoincash:qwallet', privateKey: 'wallet-private-key' }
        })
      }
      sandbox.stub(uut, 'sweepWif').resolves(txid)
      const out = captureStream()
      uut.stdout = out.stream

      await uut.run({ name: 'test123', wif })

      assert.notInclude(out.text(), wif)
      assert.include(out.text(), txid)
    })
  })
})
