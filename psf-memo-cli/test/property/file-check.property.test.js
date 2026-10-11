/*
  Property tests for the file-check renderer and command.

  Unit tests pin fixed shapes. These properties exercise broad input ranges to
  confirm:

    - rendering: a paid result emits its CID and links exactly once with one
      Gateway URL line per gateway and no unpaid fields; an unpaid result emits
      the received/required/expiry lines and no CID; any other status is a
      single Status line.
    - command: the requested address is the one looked up, success exits 0 and
      round-trips the result through JSON, a missing -a flag exits 2 without a
      look-up, and an API error exits 1.
*/

import { test, beforeEach, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import { seededRandom } from './harness.js'
import { formatFileCheckMessage } from '../../src/lib/file-check.js'
import FileCheck from '../../src/commands/file-check.js'
import { captureStream } from '../support/capture.js'

const rng = seededRandom(20261014)

const CHARS = 'abcdefghijklmnopqrstuvwxyz0123456789-_.:/'
const OTHER_STATUSES = ['expired', 'unknown', 'cancelled']

// The command assigns process.exitCode; restore it so a usage/failure path in
// one property does not leak an exit code into the runner.
let originalExitCode
beforeEach(() => { originalExitCode = process.exitCode })
afterEach(() => { process.exitCode = originalExitCode })

function randomText (maxLength) {
  const length = 1 + Math.floor(rng() * maxLength)
  let text = ''
  for (let i = 0; i < length; i++) text += CHARS[Math.floor(rng() * CHARS.length)]
  return text
}

function randomPaid () {
  const result = {
    status: 'paid',
    cid: `bafy-${randomText(20)}`,
    downloadUrl: `http://host/download/${randomText(10)}`,
    viewUrl: `http://host/view/${randomText(10)}`
  }

  if (rng() < 0.7) {
    result.gatewayUrls = Array.from(
      { length: Math.floor(rng() * 4) },
      () => `https://gw-${randomText(8)}/ipfs/${randomText(12)}`
    )
  }

  return result
}

function randomUnpaid () {
  return {
    status: 'unpaid',
    receivedSats: Math.floor(rng() * 1e8),
    requiredSats: Math.floor(rng() * 1e8),
    quoteExpiresAt: `2026-10-${String(1 + Math.floor(rng() * 28)).padStart(2, '0')}T00:00:00.000Z`
  }
}

function countLine (lines, line) {
  return lines.filter((candidate) => candidate === line).length
}

test('a paid result emits its links exactly once and no unpaid fields', () => {
  for (let i = 0; i < 500; i++) {
    const result = randomPaid()
    const lines = formatFileCheckMessage(result).split('\n')

    assert.equal(countLine(lines, `CID: ${result.cid}`), 1)
    assert.equal(countLine(lines, `Download URL: ${result.downloadUrl}`), 1)
    assert.equal(countLine(lines, `View URL: ${result.viewUrl}`), 1)

    const gateways = result.gatewayUrls || []
    assert.equal(lines.filter((l) => l.startsWith('Gateway URL: ')).length, gateways.length)
    for (const url of gateways) assert.equal(countLine(lines, `Gateway URL: ${url}`), 1)

    assert.ok(!lines.some((l) => l.startsWith('Received: ')))
    assert.ok(!lines.some((l) => l.startsWith('Required: ')))
    assert.ok(!lines.some((l) => l.startsWith('Quote expires: ')))

    // CID < Download < View < every gateway.
    const cidIndex = lines.indexOf(`CID: ${result.cid}`)
    const downloadIndex = lines.indexOf(`Download URL: ${result.downloadUrl}`)
    const viewIndex = lines.indexOf(`View URL: ${result.viewUrl}`)
    assert.ok(cidIndex < downloadIndex && downloadIndex < viewIndex)
    for (const url of gateways) assert.ok(lines.indexOf(`Gateway URL: ${url}`) > viewIndex)
  }
})

test('an unpaid result emits the amounts and expiry and no CID', () => {
  for (let i = 0; i < 300; i++) {
    const result = randomUnpaid()
    const lines = formatFileCheckMessage(result).split('\n')

    assert.deepEqual(lines, [
      'Status: unpaid',
      `Received: ${result.receivedSats} satoshis`,
      `Required: ${result.requiredSats} satoshis`,
      `Quote expires: ${result.quoteExpiresAt}`
    ])
    assert.ok(!lines.some((l) => l.startsWith('CID: ')))
  }
})

test('any other status renders a single Status line', () => {
  for (let i = 0; i < 200; i++) {
    const status = OTHER_STATUSES[Math.floor(rng() * OTHER_STATUSES.length)]

    assert.equal(formatFileCheckMessage({ status }), `Status: ${status}`)
  }
})

test('the command looks up the requested address and exits 0', async () => {
  for (let i = 0; i < 200; i++) {
    const result = rng() < 0.5 ? randomPaid() : randomUnpaid()
    const address = `bitcoincash:q${randomText(24)}`
    const calls = { paymentAddress: null }

    class FakeHostingApi {
      async checkPayment (args) {
        calls.paymentAddress = args.paymentAddress
        return result
      }
    }

    const out = captureStream()
    const err = captureStream()
    const command = new FileCheck({
      HostingApiClass: FakeHostingApi,
      config: {},
      stdout: out.stream,
      stderr: err.stream
    })

    const code = await command.run({ address, json: true })
    const parsed = JSON.parse(out.text())

    assert.equal(code, 0)
    assert.equal(calls.paymentAddress, address)
    assert.equal(parsed.message, formatFileCheckMessage(result))
    for (const [key, value] of Object.entries(result)) {
      assert.deepEqual(parsed[key], value)
    }
    assert.equal(err.text(), '')
  }
})

test('a missing -a flag always exits 2 without a look-up', async () => {
  for (let i = 0; i < 100; i++) {
    const calls = { paymentAddress: null }

    class FakeHostingApi {
      async checkPayment (args) {
        calls.paymentAddress = args.paymentAddress
        return {}
      }
    }

    const err = captureStream()
    const command = new FileCheck({
      HostingApiClass: FakeHostingApi,
      config: {},
      stdout: captureStream().stream,
      stderr: err.stream
    })

    const code = await command.run({ json: rng() < 0.5 })

    assert.equal(code, 2)
    assert.equal(calls.paymentAddress, null)
    assert.ok(err.text().includes('You must specify a payment address with the -a flag.'))
  }
})

test('an API error always exits 1', async () => {
  for (let i = 0; i < 100; i++) {
    const message = randomText(40)

    class FakeHostingApi {
      async checkPayment () {
        throw new Error(message)
      }
    }

    const err = captureStream()
    const command = new FileCheck({
      HostingApiClass: FakeHostingApi,
      config: {},
      stdout: captureStream().stream,
      stderr: err.stream
    })

    const code = await command.run({ address: 'bitcoincash:qcheck', json: true })

    assert.equal(code, 1)
    assert.equal(JSON.parse(err.text()).error, message)
  }
})
