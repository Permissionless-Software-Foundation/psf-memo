/*
  Property tests for the file-upload renderer and command.

  Unit tests pin the fixed renderings. These properties exercise broad input
  ranges to confirm:

    - shape: a quote emits each reported field exactly once, includes the
      optional file metadata, billed-size note, and expiry only when the API
      reports them, and keeps the fields in their documented order.
    - alreadyHosted: the two links are rendered verbatim and no payment or
      price line leaks through.
    - command: only the base name is uploaded and success exits 0; a missing
      -f flag always exits 2 without an upload; an API rejection always exits 1.
*/

import { test, beforeEach, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import path from 'node:path'
import { seededRandom } from './harness.js'
import { formatFileUploadMessage } from '../../src/lib/file-upload.js'
import FileUpload from '../../src/commands/file-upload.js'
import { captureStream } from '../support/capture.js'

const rng = seededRandom(20261011)

// The command assigns process.exitCode; restore it so a success/usage path in
// one property does not leak an exit code into the runner.
let originalExitCode
beforeEach(() => { originalExitCode = process.exitCode })
afterEach(() => { process.exitCode = originalExitCode })

const NAME_CHARS = 'abcdefghijklmnopqrstuvwxyz0123456789-_'
const ADDRESS_CHARS = 'abcdefghijklmnopqrstuvwxyz0123456789:'

function randomText (alphabet, maxLength) {
  const length = 1 + Math.floor(rng() * maxLength)
  let text = ''
  for (let i = 0; i < length; i++) text += alphabet[Math.floor(rng() * alphabet.length)]
  return text
}

// A quote result with each optional field randomly present or absent. When the
// billed size is present it either equals the size or rounds it up, so both
// branches of the billed-size rule are exercised.
function randomQuote () {
  const quote = {
    priceSats: Math.floor(rng() * 1e8),
    paymentAddress: `bitcoincash:q${randomText(ADDRESS_CHARS, 20)}`
  }

  if (rng() < 0.8) quote.filename = `${randomText(NAME_CHARS, 12)}.bin`
  if (rng() < 0.8) quote.sizeBytes = Math.floor(rng() * 1e7)
  if (rng() < 0.8) {
    quote.billedBytes = quote.sizeBytes !== undefined && rng() < 0.5
      ? quote.sizeBytes
      : Math.floor(rng() * 1e7)
  }
  if (rng() < 0.6) {
    const day = String(1 + Math.floor(rng() * 28)).padStart(2, '0')
    quote.quoteExpiresAt = `2026-10-${day}T00:00:00.000Z`
  }

  return quote
}

function countLine (lines, line) {
  return lines.filter((candidate) => candidate === line).length
}

test('a quote emits each reported field exactly once in order', () => {
  // The labelled lines in the order the renderer must emit them.
  const order = ['File name: ', 'Size: ', 'Billed size: ', 'Price: ', 'Payment address: ', 'Quote expires: ']

  for (let i = 0; i < 500; i++) {
    const quote = randomQuote()
    const lines = formatFileUploadMessage(quote).split('\n')

    assert.equal(countLine(lines, `Price: ${quote.priceSats} satoshis`), 1)
    assert.equal(countLine(lines, `Payment address: ${quote.paymentAddress}`), 1)

    const hasName = quote.filename !== undefined
    const hasSize = quote.sizeBytes !== undefined
    const hasBilled = quote.billedBytes !== undefined && quote.billedBytes !== quote.sizeBytes
    const hasExpiry = Boolean(quote.quoteExpiresAt)

    assert.equal(lines.filter((l) => l.startsWith('File name: ')).length, hasName ? 1 : 0)
    assert.equal(lines.filter((l) => l.startsWith('Size: ')).length, hasSize ? 1 : 0)
    assert.equal(lines.filter((l) => l.startsWith('Billed size: ')).length, hasBilled ? 1 : 0)
    assert.equal(lines.filter((l) => l.startsWith('Quote expires: ')).length, hasExpiry ? 1 : 0)

    if (hasName) assert.ok(lines.includes(`File name: ${quote.filename}`))
    if (hasSize) assert.ok(lines.includes(`Size: ${quote.sizeBytes} bytes`))
    if (hasBilled) assert.ok(lines.includes(`Billed size: ${quote.billedBytes} bytes`))
    if (hasExpiry) assert.ok(lines.includes(`Quote expires: ${quote.quoteExpiresAt}`))

    // Present lines keep their relative order; no two labels may swap.
    let last = -1
    for (const prefix of order) {
      const index = lines.findIndex((line) => line.startsWith(prefix))
      if (index === -1) continue
      assert.ok(index > last, `line "${prefix}" is out of order in:\n${lines.join('\n')}`)
      last = index
    }
  }
})

test('already-hosted results render exactly the two links', () => {
  for (let i = 0; i < 300; i++) {
    const result = {
      alreadyHosted: true,
      downloadUrl: `http://host/${randomText(NAME_CHARS, 16)}`,
      viewUrl: `http://host/view/${randomText(NAME_CHARS, 16)}`
    }

    const message = formatFileUploadMessage(result)

    assert.equal(message, `Download URL: ${result.downloadUrl}\nView URL: ${result.viewUrl}`)
    assert.ok(!message.includes('Price: '))
    assert.ok(!message.includes('Payment address'))
  }
})

test('the command uploads only the base name and exits 0', async () => {
  for (let i = 0; i < 200; i++) {
    const file = `${randomText(NAME_CHARS, 6)}/${randomText(NAME_CHARS, 6)}/${randomText(NAME_CHARS, 8)}.bin`
    const quote = randomQuote()
    const calls = { upload: null }

    class FakeHostingApi {
      async upload (args) {
        calls.upload = args
        return quote
      }
    }

    const out = captureStream()
    const err = captureStream()
    const command = new FileUpload({
      HostingApiClass: FakeHostingApi,
      config: {},
      readFile: () => Buffer.from('file bytes'),
      stdout: out.stream,
      stderr: err.stream
    })

    const code = await command.run({ file, json: true })
    const parsed = JSON.parse(out.text())

    assert.equal(code, 0)
    assert.equal(calls.upload.filename, path.basename(file))
    assert.equal(parsed.message, formatFileUploadMessage(quote))
    for (const [key, value] of Object.entries(quote)) {
      assert.deepEqual(parsed[key], value)
    }
    assert.equal(err.text(), '')
  }
})

test('a missing -f flag always exits 2 without uploading', async () => {
  for (let i = 0; i < 100; i++) {
    const calls = { upload: null }

    class FakeHostingApi {
      async upload (args) {
        calls.upload = args
        return {}
      }
    }

    const err = captureStream()
    const command = new FileUpload({
      HostingApiClass: FakeHostingApi,
      config: {},
      readFile: () => Buffer.from('file bytes'),
      stdout: captureStream().stream,
      stderr: err.stream
    })

    const code = await command.run({ json: rng() < 0.5 })

    assert.equal(code, 2)
    assert.equal(calls.upload, null)
    assert.ok(err.text().includes('You must specify a file with the -f flag.'))
  }
})

test('an API rejection always exits 1', async () => {
  for (let i = 0; i < 100; i++) {
    const message = randomText(NAME_CHARS, 40)

    class FakeHostingApi {
      async upload () {
        throw new Error(message)
      }
    }

    const err = captureStream()
    const command = new FileUpload({
      HostingApiClass: FakeHostingApi,
      config: {},
      readFile: () => Buffer.from('file bytes'),
      stdout: captureStream().stream,
      stderr: err.stream
    })

    const code = await command.run({ file: 'photo.bin', json: true })

    assert.equal(code, 1)
    assert.equal(JSON.parse(err.text()).error, message)
  }
})
