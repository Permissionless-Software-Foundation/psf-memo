/*
  Unit tests for the wallet-addrs command
*/

// Global npm libraries
import { assert } from 'chai'
import sinon from 'sinon'
import { promises as fs } from 'fs'

// Local libraries
import WalletCreate from '../../../src/commands/wallet-create.js'
import WalletAddrs from '../../../src/commands/wallet-addrs.js'
import { captureStream } from '../../support/capture.js'
const walletCreate = new WalletCreate()

const __dirname = import.meta.dirname
const filename = `${__dirname.toString()}/../../../.wallets/test123.json`

describe('#wallet-addrs', () => {
  let uut
  let sandbox

  before(async () => {
    await walletCreate.createWallet(filename)
  })

  beforeEach(async () => {
    sandbox = sinon.createSandbox()

    uut = new WalletAddrs()
  })

  afterEach(() => {
    sandbox.restore()
  })

  after(async () => {
    await fs.rm(filename)
  })

  describe('#getAddrs', () => {
    it('should return wallet addresses', async () => {
      const result = await uut.getAddrs(filename)
      console.log('result: ', result)

      assert.property(result, 'cashAddress')
      assert.property(result, 'slpAddress')
      assert.property(result, 'legacyAddress')
    })

    it('should throw an error if wallet not found', async () => {
      try {
        await uut.getAddrs('wrong path')

        assert.fail('Unexpected code path')
      } catch (err) {
        assert.include(err.message, 'no such file')
      }
    })
  })

  describe('#validateFlags()', () => {
    it('validateFlags() should return true if name is supplied.', () => {
      assert.equal(uut.validateFlags({ name: 'test' }), true, 'return true')
    })

    it('validateFlags() should throw error if name is not supplied.', () => {
      try {
        uut.validateFlags({})
      } catch (err) {
        assert.include(
          err.message,
          'You must specify a wallet name with the -n flag',
          'Expected error message.'
        )
      }
    })
  })

  describe('#run', () => {
    it('prints one JSON object with the wallet addresses', async () => {
      const out = captureStream()
      const err = captureStream()
      const command = new WalletAddrs({ stdout: out.stream, stderr: err.stream })

      const code = await command.run({ name: 'test123', json: true })

      assert.equal(code, 0)
      assert.equal(err.text(), '')
      const parsed = JSON.parse(out.text())
      assert.property(parsed, 'cashAddress')
      assert.property(parsed, 'slpAddress')
      assert.property(parsed, 'legacyAddress')
    })

    it('prints the human address lines in human mode', async () => {
      const out = captureStream()
      const command = new WalletAddrs({ stdout: out.stream })

      const code = await command.run({ name: 'test123' })

      assert.equal(code, 0)
      assert.include(out.text(), 'Cash Address: bitcoincash:')
      assert.include(out.text(), 'SLP Address: simpleledger:')
      assert.include(out.text(), 'Legacy Address: ')
    })

    it('reports a missing name as a usage error (exit 2)', async () => {
      const out = captureStream()
      const err = captureStream()
      const command = new WalletAddrs({ stdout: out.stream, stderr: err.stream })

      const code = await command.run({ json: true })

      assert.equal(code, 2)
      assert.equal(out.text(), '')
      assert.deepEqual(JSON.parse(err.text()), {
        error: 'You must specify a wallet name with the -n flag.'
      })
    })
  })
})
