/*
  Unit tests for msg-sign function
*/

// Global npm libraries
import { assert } from 'chai'
import sinon from 'sinon'
import { promises as fs } from 'fs'

// Local libraries
import WalletCreate from '../../../src/commands/wallet-create.js'
import MsgSign from '../../../src/commands/msg-sign.js'
import WalletUtil from '../../../src/lib/wallet-util.js'
import { captureStream } from '../../support/capture.js'

const walletUtil = new WalletUtil()
const walletCreate = new WalletCreate()

const __dirname = import.meta.dirname
const filename = `${__dirname.toString()}/../../../.wallets/test123.json`

describe('#msg-sign', () => {
  let uut
  let sandbox

  before(async () => {
    await walletCreate.createWallet(filename)
  })

  beforeEach(async () => {
    sandbox = sinon.createSandbox()

    uut = new MsgSign()
  })

  afterEach(() => {
    sandbox.restore()
  })

  after(async () => {
    await fs.rm(filename)
  })

  describe('#sign', () => {
    it('should sign a message', async () => {
      // Instantiate the minimal-slp-wallet
      uut.bchWallet = await walletUtil.instanceWallet('test123')

      const flags = {
        msg: 'test message'
      }

      const result = await uut.sign(flags)

      assert.include(result.msg, 'test message')
    })

    it('should catch, report, and throw errors', async () => {
      try {
        await uut.sign()

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
        msg: 'test message'
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

    it('validateFlags() should throw error if msg is not supplied', () => {
      try {
        const flags = {
          name: 'test123'
        }
        uut.validateFlags(flags)

        assert.fail('Unexpected code path')
      } catch (err) {
        assert.include(
          err.message,
          'You must specify a message to sign with the -m flag.',
          'Expected error message.'
        )
      }
    })
  })

  describe('#run', () => {
    const signingWallet = () => ({
      walletInfo: { cashAddress: 'bitcoincash:qagent', privateKey: 'wif' },
      bchjs: { BitcoinCash: { signMessageWithPrivKey: () => 'SIGNATURE' } }
    })

    it('prints one JSON object with the address, message, and signature', async () => {
      uut.walletUtil = { instanceWallet: async () => signingWallet() }
      const out = captureStream()
      const err = captureStream()
      uut.stdout = out.stream
      uut.stderr = err.stream

      const code = await uut.run({ name: 'agent', msg: 'hello memo', json: true })

      assert.equal(code, 0)
      assert.equal(err.text(), '')
      const parsed = JSON.parse(out.text())
      assert.equal(parsed.cashAddress, 'bitcoincash:qagent')
      assert.equal(parsed.message, 'hello memo')
      assert.equal(parsed.signature, 'SIGNATURE')
    })

    it('prints the human signing lines', async () => {
      uut.walletUtil = { instanceWallet: async () => signingWallet() }
      const out = captureStream()
      uut.stdout = out.stream

      const code = await uut.run({ name: 'agent', msg: 'hello memo' })

      assert.equal(code, 0)
      assert.include(out.text(), 'Signed message with key associated with this address:  bitcoincash:qagent')
      assert.include(out.text(), 'Input message: hello memo')
      assert.include(out.text(), 'Signature:')
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

    it('reports a signing failure as a runtime error (exit 1)', async () => {
      uut.walletUtil = { instanceWallet: async () => { throw new Error('signing failed') } }
      const out = captureStream()
      const err = captureStream()
      uut.stdout = out.stream
      uut.stderr = err.stream

      const code = await uut.run({ name: 'agent', msg: 'hello memo', json: true })

      assert.equal(code, 1)
      assert.equal(out.text(), '')
      assert.deepEqual(JSON.parse(err.text()), { error: 'signing failed' })
    })
  })
})
