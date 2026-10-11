/*
  Unit tests for the wallet-create command.

  The command now adopts the shared output contract: human output unchanged,
  --json prints one public-metadata object, a missing flag exits 2, and a
  runtime failure exits 1.
*/

// Global npm libraries
import { assert } from 'chai'
import sinon from 'sinon'
import { promises as fs } from 'fs'

// Local libraries
import WalletCreate from '../../../src/commands/wallet-create.js'
import BchWalletMock from '../../mocks/msw-mock.js'
import { UsageError } from '../../../src/lib/reporter.js'
import { captureStream } from '../../support/capture.js'

const __dirname = import.meta.dirname
const filename = `${__dirname.toString()}/../../../.wallets/test123.json`

function makeCommand ({ stdout, stderr } = {}) {
  return new WalletCreate({
    BchWallet: BchWalletMock,
    walletUtil: { saveWallet: async () => true },
    stdout: stdout?.stream,
    stderr: stderr?.stream
  })
}

describe('#wallet-create', () => {
  let uut
  let sandbox

  beforeEach(async () => {
    sandbox = sinon.createSandbox()

    uut = new WalletCreate()
  })

  afterEach(() => {
    sandbox.restore()
  })

  describe('#createWallet()', () => {
    it('should exit with error status if called without a filename.', async () => {
      try {
        await uut.createWallet(undefined, undefined)

        assert.fail('Unexpected result')
      } catch (err) {
        assert.equal(
          err.message,
          'filename required.',
          'Should throw expected error.'
        )
      }
    })

    it('should reject a non-string filename.', async () => {
      try {
        await uut.createWallet(123)

        assert.fail('Unexpected result')
      } catch (err) {
        assert.equal(err.message, 'filename required.')
      }
    })

    it('should disable wallet auto-update while creating a wallet', async () => {
      let capturedConfig
      class FakeWallet {
        constructor (mnemonic, advancedConfig) {
          capturedConfig = advancedConfig
          this.walletInfoPromise = Promise.resolve()
          this.walletInfo = { mnemonic: 'test' }
        }
      }
      uut.BchWallet = FakeWallet
      sandbox.stub(uut.walletUtil, 'saveWallet').resolves(true)

      await uut.createWallet(filename, 'desc')

      assert.deepEqual(capturedConfig, { noUpdate: true })
    })

    it('should create a mainnet wallet file with the given name', async () => {
      // Mock dependencies
      uut.BchWallet = BchWalletMock

      const walletData = await uut.createWallet(filename)
      // console.log(`walletData: ${JSON.stringify(walletData, null, 2)}`)

      assert.property(walletData, 'mnemonic')
      assert.property(walletData, 'privateKey')
      assert.property(walletData, 'publicKey')
      assert.property(walletData, 'address')
      assert.property(walletData, 'cashAddress')
      assert.property(walletData, 'slpAddress')
      assert.property(walletData, 'legacyAddress')
      assert.property(walletData, 'hdPath')
      assert.property(walletData, 'description')

      // Clean up.
      await fs.rm(filename)
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

  describe('#run()', () => {
    it('prints one JSON object with the wallet public metadata and no mnemonic', async () => {
      const out = captureStream()
      const err = captureStream()
      const command = makeCommand({ stdout: out, stderr: err })

      const code = await command.run({ name: 'agent', description: 'first agent wallet', json: true })

      assert.equal(code, 0)
      const parsed = JSON.parse(out.text())
      assert.equal(parsed.name, 'agent')
      assert.equal(parsed.description, 'first agent wallet')
      assert.notProperty(parsed, 'mnemonic')
      assert.notProperty(parsed, 'privateKey')
      assert.equal(err.text(), '')
    })

    it('prints the human creation line in human mode', async () => {
      const out = captureStream()
      const command = makeCommand({ stdout: out })

      const code = await command.run({ name: 'agent', description: 'first' })

      assert.equal(code, 0)
      assert.include(out.text(), 'wallet-create executed with name agent and description first')
      assert.notInclude(out.text(), 'mnemonic')
    })

    it('reports a missing name as a usage error (exit 2)', async () => {
      const out = captureStream()
      const err = captureStream()
      const command = makeCommand({ stdout: out, stderr: err })

      const code = await command.run({ json: true })

      assert.equal(code, 2)
      assert.equal(out.text(), '')
      assert.deepEqual(JSON.parse(err.text()), {
        error: 'You must specify a wallet name with the -n flag.'
      })
    })

    it('reports a runtime failure as a runtime error (exit 1)', async () => {
      const out = captureStream()
      const err = captureStream()
      const command = makeCommand({ stdout: out, stderr: err })
      command.createWallet = async () => { throw new Error('wallet backend unavailable') }

      const code = await command.run({ name: 'agent', json: true })

      assert.equal(code, 1)
      assert.equal(out.text(), '')
      assert.deepEqual(JSON.parse(err.text()), { error: 'wallet backend unavailable' })
    })
  })
})
