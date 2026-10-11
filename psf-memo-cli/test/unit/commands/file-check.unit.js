/*
  Unit tests for the file-check read command.

  These drive the real command against an injected HostingApi class so the
  required -a address, the paid/unpaid/expired reporting, the API error, and
  the JSON contract are pinned without a network.
*/

// Global npm libraries
import { assert } from 'chai'

// Local libraries
import FileCheck from '../../../src/commands/file-check.js'
import HostingApi from '../../../src/lib/hosting-api.js'
import { captureStream } from '../../support/capture.js'

const USAGE_MESSAGE = 'You must specify a payment address with the -a flag.'
const CONFIG = { hostingApiUrl: 'http://localhost:5050' }

// Build a fake HostingApi class whose checkPayment resolves `result` or rejects
// `error`, recording its options and the requested payment address.
function fakeHostingApi ({ result, error } = {}) {
  const calls = { opts: null, paymentAddress: null }
  class FakeHostingApi {
    constructor (opts) {
      calls.opts = opts
    }

    async checkPayment ({ paymentAddress }) {
      calls.paymentAddress = paymentAddress
      if (error) throw error
      return result
    }
  }
  return { FakeHostingApi, calls }
}

function makeCommand (fake, { config = CONFIG } = {}) {
  const out = captureStream()
  const err = captureStream()
  const command = new FileCheck({
    HostingApiClass: fake.FakeHostingApi,
    config,
    stdout: out.stream,
    stderr: err.stream
  })
  return { command, out, err }
}

const PAID = {
  status: 'paid',
  cid: 'bafy-paid',
  downloadUrl: 'http://localhost:5050/download/bafy-paid',
  viewUrl: 'http://localhost:5050/view/bafy-paid/photo.jpg',
  gatewayUrls: ['https://ipfs.io/ipfs/bafy-paid/photo.jpg']
}

describe('#file-check command', () => {
  let originalExitCode

  beforeEach(() => {
    originalExitCode = process.exitCode
  })

  afterEach(() => {
    process.exitCode = originalExitCode
  })

  it('checks the address and prints the paid CID and links, returning 0', async () => {
    const fake = fakeHostingApi({ result: PAID })
    const { command, out, err } = makeCommand(fake)

    const code = await command.run({ address: 'bitcoincash:qcheck' })

    assert.equal(code, 0)
    assert.equal(err.text(), '')
    assert.equal(fake.calls.paymentAddress, 'bitcoincash:qcheck')

    const printed = out.text()
    assert.include(printed, 'CID: bafy-paid')
    assert.include(printed, 'Download URL: http://localhost:5050/download/bafy-paid')
    assert.include(printed, 'View URL: http://localhost:5050/view/bafy-paid/photo.jpg')
    assert.include(printed, 'Gateway URL: https://ipfs.io/ipfs/bafy-paid/photo.jpg')
  })

  it('prints the unpaid amounts and quote expiry', async () => {
    const fake = fakeHostingApi({
      result: {
        status: 'unpaid',
        receivedSats: 0,
        requiredSats: 2000,
        quoteExpiresAt: '2026-10-10T00:00:00.000Z'
      }
    })
    const { command, out } = makeCommand(fake)

    const code = await command.run({ address: 'bitcoincash:qcheck' })

    assert.equal(code, 0)
    assert.include(out.text(), 'Received: 0 satoshis')
    assert.include(out.text(), 'Required: 2000 satoshis')
    assert.include(out.text(), 'Quote expires: 2026-10-10T00:00:00.000Z')
  })

  it('prints the expired status', async () => {
    const fake = fakeHostingApi({ result: { status: 'expired' } })
    const { command, out } = makeCommand(fake)

    const code = await command.run({ address: 'bitcoincash:qcheck' })

    assert.equal(code, 0)
    assert.include(out.text(), 'Status: expired')
  })

  it('rejects a missing -a address as a usage error (exit 2) before checking', async () => {
    const fake = fakeHostingApi({ result: PAID })
    const { command, err } = makeCommand(fake)

    const code = await command.run({ json: true })

    assert.equal(code, 2)
    assert.deepEqual(JSON.parse(err.text()), { error: USAGE_MESSAGE })
    assert.equal(fake.calls.paymentAddress, null)
  })

  it('reports an API error on stderr with exit 1', async () => {
    const fake = fakeHostingApi({ error: new Error('Invoice not found') })
    const { command, err } = makeCommand(fake)

    const code = await command.run({ address: 'bitcoincash:qcheck', json: true })

    assert.equal(code, 1)
    assert.equal(JSON.parse(err.text()).error, 'Invoice not found')
  })

  it('prints one JSON object with the status fields in --json mode', async () => {
    const fake = fakeHostingApi({ result: PAID })
    const { command, out } = makeCommand(fake)

    const code = await command.run({ address: 'bitcoincash:qcheck', json: true })

    assert.equal(code, 0)
    assert.equal(out.text().trim().split('\n').length, 1)

    const parsed = JSON.parse(out.text())
    assert.equal(parsed.status, 'paid')
    assert.equal(parsed.cid, 'bafy-paid')
    assert.equal(parsed.downloadUrl, 'http://localhost:5050/download/bafy-paid')
  })

  it('builds a default HostingApi from the config', () => {
    const command = new FileCheck({ config: CONFIG })

    assert.instanceOf(command.hostingApi, HostingApi)
  })

  it('passes the config through to the injected HostingApi', () => {
    const fake = fakeHostingApi({ result: PAID })
    makeCommand(fake)

    assert.equal(fake.calls.opts.config, CONFIG)
  })

  it('reads the address flag without a network call', () => {
    const command = new FileCheck({ HostingApiClass: fakeHostingApi().FakeHostingApi })

    assert.deepEqual(command.validateFlags({ address: 'bitcoincash:qcheck' }), { address: 'bitcoincash:qcheck' })
  })
})
