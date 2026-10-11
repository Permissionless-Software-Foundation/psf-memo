/*
  Unit tests for msg-verify command.
*/

// Global npm libraries
import { assert } from 'chai'
import sinon from 'sinon'
// import { promises as fs } from 'fs'
import BchWallet from 'minimal-slp-wallet'

// Local libraries
import MsgVerify from '../../../src/commands/msg-verify.js'
import { captureStream } from '../../support/capture.js'

describe('#msg-sign', () => {
  let uut
  let sandbox

  before(async () => {
    // await walletCreate.createWallet(filename)
  })

  beforeEach(async () => {
    sandbox = sinon.createSandbox()

    uut = new MsgVerify()
  })

  afterEach(() => {
    sandbox.restore()
  })

  after(async () => {
    // await fs.rm(filename)
  })

  describe('#verify', () => {
    it('should verify a signature', async () => {
      // Initialize the wallet library.
      const bchWallet = new BchWallet()
      await bchWallet.walletInfoPromise
      uut.bchWallet = bchWallet

      const flags = {
        addr: 'bitcoincash:qr2zqrnqdulfmeqs2qe9c5p605lrwe90v5v735s2jl',
        sig: 'IOdfv+TQNCNIEJ4uvcUJmX9ZCEbkNNv9ad+TLO/JJxzeWDhqx42iBXMPEnthldl9wGx/Fwdjwp1w9532mSXzENM=',
        msg: 'This is a test message'
      }

      const result = await uut.verify(flags)

      assert.equal(result, true)
    })

    it('should catch, report, and throw errors', async () => {
      try {
        // Initialize the wallet library.
        const bchWallet = new BchWallet()
        await bchWallet.walletInfoPromise
        uut.bchWallet = bchWallet

        await uut.verify({})

        assert.fail('Unexpected code path')
      } catch (err) {
        assert.include(err.message, 'Unsupported address format')
      }
    })
  })

  describe('#validateFlags()', () => {
    it('validateFlags() should return true if all arguments are supplied.', () => {
      const flags = {
        addr: 'bitcoincash:qr2zqrnqdulfmeqs2qe9c5p605lrwe90v5v735s2jl',
        sig: 'IOdfv+TQNCNIEJ4uvcUJmX9ZCEbkNNv9ad+TLO/JJxzeWDhqx42iBXMPEnthldl9wGx/Fwdjwp1w9532mSXzENM=',
        msg: 'This is a test message'
      }

      assert.equal(uut.validateFlags(flags), true, 'return true')
    })

    it('validateFlags() should throw error if addr is not supplied.', () => {
      try {
        uut.validateFlags({})

        assert.fail('Unexpected code path')
      } catch (err) {
        assert.include(
          err.message,
          'You must specify an address with the -a flag.',
          'Expected error message.'
        )
      }
    })

    it('validateFlags() should throw error if msg is not supplied.', () => {
      try {
        const flags = {
          addr: 'bitcoincash:qr2zqrnqdulfmeqs2qe9c5p605lrwe90v5v735s2jl'
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

    it('validateFlags() should throw error if sig is not supplied.', () => {
      try {
        const flags = {
          addr: 'bitcoincash:qr2zqrnqdulfmeqs2qe9c5p605lrwe90v5v735s2jl',
          msg: 'This is a test message'
        }
        uut.validateFlags(flags)

        assert.fail('Unexpected code path')
      } catch (err) {
        assert.include(
          err.message,
          'You must specify a signature with the -s flag.',
          'Expected error message.'
        )
      }
    })
  })

  describe('#run', () => {
    // A wallet class whose verifyMessage returns the supplied result.
    const verifyWallet = (result) => class {
      constructor () {
        this.walletInfoPromise = Promise.resolve()
        this.bchjs = { BitcoinCash: { verifyMessage: () => result } }
      }
    }

    it('prints one JSON object with a true verification result', async () => {
      const out = captureStream()
      const err = captureStream()
      const command = new MsgVerify({ BchWallet: verifyWallet(true), stdout: out.stream, stderr: err.stream })

      const code = await command.run({
        addr: 'bitcoincash:qagent',
        sig: 'SIG',
        msg: 'hello memo',
        json: true
      })

      assert.equal(code, 0)
      assert.equal(err.text(), '')
      assert.deepEqual(JSON.parse(out.text()).valid, true)
    })

    it('prints one JSON object with a false verification result', async () => {
      const out = captureStream()
      const command = new MsgVerify({ BchWallet: verifyWallet(false), stdout: out.stream })

      const code = await command.run({ addr: 'bitcoincash:qagent', sig: 'SIG', msg: 'hello memo', json: true })

      assert.equal(code, 0)
      assert.equal(JSON.parse(out.text()).valid, false)
    })

    it('prints the human verification lines', async () => {
      const out = captureStream()
      const command = new MsgVerify({ BchWallet: verifyWallet(true), stdout: out.stream })

      const code = await command.run({ addr: 'bitcoincash:qagent', sig: 'SIG', msg: 'hello memo' })

      assert.equal(code, 0)
      assert.include(out.text(), 'Message: hello memo')
      assert.include(out.text(), 'Signature: SIG')
      assert.include(out.text(), 'address bitcoincash:qagent: true')
    })

    it('reports a missing address as a usage error (exit 2)', async () => {
      const out = captureStream()
      const err = captureStream()
      const command = new MsgVerify({ BchWallet: verifyWallet(true), stdout: out.stream, stderr: err.stream })

      const code = await command.run({ json: true })

      assert.equal(code, 2)
      assert.equal(out.text(), '')
      assert.deepEqual(JSON.parse(err.text()), {
        error: 'You must specify an address with the -a flag.'
      })
    })

    it('reports a verification failure as a runtime error (exit 1)', async () => {
      class FailingWallet {
        constructor () {
          this.walletInfoPromise = Promise.resolve()
          this.bchjs = { BitcoinCash: { verifyMessage: () => { throw new Error('Unsupported address format') } } }
        }
      }
      const out = captureStream()
      const err = captureStream()
      const command = new MsgVerify({ BchWallet: FailingWallet, stdout: out.stream, stderr: err.stream })

      const code = await command.run({ addr: 'bad', sig: 'SIG', msg: 'hello', json: true })

      assert.equal(code, 1)
      assert.deepEqual(JSON.parse(err.text()), { error: 'Unsupported address format' })
    })
  })
})
