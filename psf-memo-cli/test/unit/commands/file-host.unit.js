/*
  Unit tests for the file-host command.

  These drive the real command against an injected hosting API, wallet factory,
  and clock so the upload -> pay -> poll pipeline, the already-hosted
  short-circuit, the usage/runtime/payment errors, and the output contract are
  pinned without a network, wallet, or real sleep.
*/

// Global npm libraries
import { assert } from 'chai'

// Local libraries
import FileHost from '../../../src/commands/file-host.js'
import HostingApi from '../../../src/lib/hosting-api.js'
import { UsageError } from '../../../src/lib/reporter.js'
import { captureStream } from '../../support/capture.js'

const NO_WALLET = 'You must specify a wallet name with the -n flag or a WIF with the --wif flag.'
const BOTH_WALLETS = 'Specify either a wallet name (-n) or a WIF (--wif), not both.'
const CONFIG = { hostingApiUrl: 'http://localhost:5050' }

// Build a fake HostingApi class whose upload resolves the supplied result and
// whose checkPayment returns the queued responses in order.
function fakeHostingApi ({ upload, checks = [] } = {}) {
  const calls = { opts: null, upload: null, checkPayment: [] }
  class FakeHostingApi {
    constructor (opts) {
      calls.opts = opts
    }

    async upload (args) {
      calls.upload = args
      if (upload?.error) throw upload.error
      return upload?.result
    }

    async checkPayment (args) {
      calls.checkPayment.push(args)
      const next = checks.shift()
      if (next?.error) throw next.error
      return next?.result
    }
  }
  return { FakeHostingApi, calls }
}

// Build a wallet factory that resolves a wallet recording every send.
function fakeWalletUtil ({ txid = 'tx-1', cashAddress = 'bitcoincash:qpayer' } = {}) {
  const wallet = {
    walletInfo: { cashAddress },
    initialized: 0,
    payments: [],
    async initialize () {
      this.initialized++
    },
    async send (outputs) {
      this.payments.push(...outputs)
      return txid
    }
  }
  return {
    wallet,
    instanceWallet: async () => wallet,
    instanceWalletFromWif: async () => wallet
  }
}

function makeCommand (fake, {
  walletUtil = fakeWalletUtil(),
  readFile,
  send,
  sleep,
  paymentCheckAttempts = 10,
  paymentCheckDelayMs = 3000
} = {}) {
  const out = captureStream()
  const err = captureStream()
  const command = new FileHost({
    HostingApiClass: fake.FakeHostingApi,
    config: CONFIG,
    readFile: readFile || (() => Buffer.from('file bytes')),
    walletUtil,
    send,
    sleep,
    paymentCheckAttempts,
    paymentCheckDelayMs,
    stdout: out.stream,
    stderr: err.stream
  })
  return { command, out, err, walletUtil }
}

describe('#file-host command', () => {
  let originalExitCode

  beforeEach(() => {
    originalExitCode = process.exitCode
  })

  afterEach(() => {
    process.exitCode = originalExitCode
  })

  it('uploads, pays the quote, polls to paid, and prints the hosted result', async () => {
    const fake = fakeHostingApi({
      upload: { result: { priceSats: 2000, paymentAddress: 'bitcoincash:qinvoice' } },
      checks: [
        { result: { status: 'unpaid' } },
        {
          result: {
            status: 'paid',
            cid: 'bafy-paid',
            downloadUrl: 'http://localhost:5050/download/bafy-paid',
            viewUrl: 'http://localhost:5050/view/bafy-paid/photo.jpg',
            gatewayUrls: ['https://ipfs.io/ipfs/bafy-paid/photo.jpg']
          }
        }
      ]
    })
    const walletUtil = fakeWalletUtil({ txid: 'tx-paid' })
    const sleeps = []
    const { command, out, err } = makeCommand(fake, {
      walletUtil,
      sleep: async (ms) => { sleeps.push(ms) }
    })

    const code = await command.run({ file: './photo.jpg', name: 'payer' })

    assert.equal(code, 0)
    assert.equal(err.text(), '')
    assert.equal(fake.calls.upload.filename, 'photo.jpg')
    assert.deepEqual(walletUtil.wallet.payments, [
      { address: 'bitcoincash:qinvoice', amountSat: 2000 }
    ])
    assert.equal(fake.calls.checkPayment.length, 2)
    assert.deepEqual(sleeps, [3000])

    const printed = out.text()
    assert.include(printed, 'CID: bafy-paid')
    assert.include(printed, 'Download URL: http://localhost:5050/download/bafy-paid')
    assert.include(printed, 'View URL: http://localhost:5050/view/bafy-paid/photo.jpg')
    assert.include(printed, 'Gateway URL: https://ipfs.io/ipfs/bafy-paid/photo.jpg')
    assert.include(printed, 'Transaction: tx-paid')
  })

  it('short-circuits an already-hosted upload without paying', async () => {
    const fake = fakeHostingApi({
      upload: {
        result: {
          alreadyHosted: true,
          downloadUrl: 'http://localhost:5050/download/bafy-already',
          viewUrl: 'http://localhost:5050/view/bafy-already/photo.jpg'
        }
      }
    })
    const walletUtil = fakeWalletUtil()
    const { command, out } = makeCommand(fake, { walletUtil })

    const code = await command.run({ file: './photo.jpg', name: 'payer' })

    assert.equal(code, 0)
    assert.deepEqual(walletUtil.wallet.payments, [])
    assert.equal(fake.calls.checkPayment.length, 0)
    assert.include(out.text(), 'Download URL: http://localhost:5050/download/bafy-already')
    assert.include(out.text(), 'View URL: http://localhost:5050/view/bafy-already/photo.jpg')
    assert.notInclude(out.text(), 'CID')
  })

  it('rejects a missing -f flag as a usage error (exit 2) before uploading', async () => {
    const fake = fakeHostingApi({ upload: { result: {} } })
    const { command, err } = makeCommand(fake)

    const code = await command.run({ name: 'payer', json: true })

    assert.equal(code, 2)
    assert.deepEqual(JSON.parse(err.text()), { error: 'You must specify a file with the -f flag.' })
    assert.equal(fake.calls.upload, null)
  })

  it('rejects a missing wallet source as a usage error (exit 2) before uploading', async () => {
    const fake = fakeHostingApi({ upload: { result: {} } })
    const { command, err } = makeCommand(fake)

    const code = await command.run({ file: './photo.jpg', json: true })

    assert.equal(code, 2)
    assert.deepEqual(JSON.parse(err.text()), { error: NO_WALLET })
    assert.equal(fake.calls.upload, null)
  })

  it('rejects both wallet sources as a usage error (exit 2)', async () => {
    const fake = fakeHostingApi({ upload: { result: {} } })
    const { command, err } = makeCommand(fake)

    const code = await command.run({ file: './photo.jpg', name: 'payer', wif: 'wif', json: true })

    assert.equal(code, 2)
    assert.deepEqual(JSON.parse(err.text()), { error: BOTH_WALLETS })
    assert.equal(fake.calls.upload, null)
  })

  it('reports an unreadable local file (exit 1) without uploading', async () => {
    const fake = fakeHostingApi({ upload: { result: {} } })
    const { command, err } = makeCommand(fake, {
      readFile: () => { throw new Error('ENOENT') }
    })

    const code = await command.run({ file: './absent.bin', name: 'payer', json: true })

    assert.equal(code, 1)
    assert.include(JSON.parse(err.text()).error, 'Cannot read file')
    assert.equal(fake.calls.upload, null)
  })

  it('reports an upload rejection (exit 1) without paying', async () => {
    const fake = fakeHostingApi({ upload: { error: new Error('File is too large') } })
    const walletUtil = fakeWalletUtil()
    const { command, err } = makeCommand(fake, { walletUtil })

    const code = await command.run({ file: './photo.jpg', name: 'payer', json: true })

    assert.equal(code, 1)
    assert.equal(JSON.parse(err.text()).error, 'File is too large')
    assert.deepEqual(walletUtil.wallet.payments, [])
  })

  it('fails with Payment not confirmed after the polling attempts', async () => {
    const fake = fakeHostingApi({
      upload: { result: { priceSats: 62500, paymentAddress: 'bitcoincash:qinvoice' } },
      checks: [
        { result: { status: 'unpaid' } },
        { result: { status: 'unpaid' } },
        { result: { status: 'unpaid' } }
      ]
    })
    const walletUtil = fakeWalletUtil()
    const { command, err } = makeCommand(fake, {
      walletUtil,
      paymentCheckAttempts: 3,
      sleep: async () => {}
    })

    const code = await command.run({ file: './photo.jpg', name: 'payer', json: true })

    assert.equal(code, 1)
    assert.equal(JSON.parse(err.text()).error, 'Payment not confirmed.')
    assert.equal(fake.calls.checkPayment.length, 3)
    assert.deepEqual(walletUtil.wallet.payments, [
      { address: 'bitcoincash:qinvoice', amountSat: 62500 }
    ])
  })

  it('prints one JSON object with the hosted result fields in --json mode', async () => {
    const fake = fakeHostingApi({
      upload: { result: { priceSats: 2000, paymentAddress: 'bitcoincash:qinvoice' } },
      checks: [
        {
          result: {
            status: 'paid',
            cid: 'bafy-paid',
            downloadUrl: 'http://localhost:5050/download/bafy-paid',
            viewUrl: 'http://localhost:5050/view/bafy-paid/photo.jpg'
          }
        }
      ]
    })
    const { command, out } = makeCommand(fake)

    const code = await command.run({ file: './photo.jpg', name: 'payer', json: true })

    assert.equal(code, 0)
    assert.equal(out.text().trim().split('\n').length, 1)

    const parsed = JSON.parse(out.text())
    assert.equal(parsed.cid, 'bafy-paid')
    assert.equal(parsed.downloadUrl, 'http://localhost:5050/download/bafy-paid')
    assert.equal(parsed.txid, 'tx-1')
  })

  it('resolves a WIF wallet source', async () => {
    const fake = fakeHostingApi({
      upload: { result: { priceSats: 2000, paymentAddress: 'bitcoincash:qinvoice' } },
      checks: [{ result: { status: 'paid', cid: 'bafy', downloadUrl: 'd', viewUrl: 'v' } }]
    })
    const walletUtil = fakeWalletUtil({ txid: 'tx-wif' })
    const { command } = makeCommand(fake, { walletUtil })

    await command.run({ file: './photo.jpg', wif: 'wif-key', json: true })

    assert.deepEqual(walletUtil.wallet.payments, [
      { address: 'bitcoincash:qinvoice', amountSat: 2000 }
    ])
  })

  it('builds a default HostingApi from the config', () => {
    const command = new FileHost({ config: CONFIG })

    assert.instanceOf(command.hostingApi, HostingApi)
  })

  it('throws a UsageError with the documented message from validateFlags', () => {
    const command = new FileHost({ HostingApiClass: fakeHostingApi().FakeHostingApi })

    assert.throws(() => command.validateFlags({}), UsageError, 'You must specify a file with the -f flag.')
    assert.throws(() => command.validateFlags({ file: 'f' }), UsageError, NO_WALLET)
  })
})
