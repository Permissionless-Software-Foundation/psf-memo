/*
  Property tests for the file-status renderer and command.

  Unit tests pin fixed shapes. These properties exercise broad input ranges to
  confirm:

    - rendering: every file emits its CID and status exactly once, the hosting
      window is the value or "not paid", the optional name/size lines appear
      exactly when reported, and there is one Pin line per pin, all in order.
    - command: the requested CID is the one looked up, success exits 0 and
      round-trips the file through JSON, a missing -c flag exits 2 without a
      lookup, and an API error exits 1.
*/

import { test, beforeEach, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import { seededRandom } from './harness.js'
import { formatFileStatusMessage } from '../../src/lib/file-status.js'
import FileStatus from '../../src/commands/file-status.js'
import { captureStream } from '../support/capture.js'

const rng = seededRandom(20261013)

const CHARS = 'abcdefghijklmnopqrstuvwxyz0123456789-_.'
const STATUSES = ['staged', 'pinned', 'failed']

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

// A file record with each optional field randomly present or absent.
function randomFile () {
  const file = {
    cid: `bafy-${randomText(20)}`,
    status: STATUSES[Math.floor(rng() * STATUSES.length)]
  }

  if (rng() < 0.85) file.filename = `${randomText(12)}.bin`
  if (rng() < 0.85) file.sizeBytes = Math.floor(rng() * 1e8)

  if (rng() < 0.6) {
    const day = String(1 + Math.floor(rng() * 28)).padStart(2, '0')
    file.hostedUntil = `2027-10-${day}T00:00:00.000Z`
  } else if (rng() < 0.5) {
    file.hostedUntil = null
  }

  file.pins = Array.from({ length: Math.floor(rng() * 4) }, () => ({
    provider: `prov-${randomText(8)}`,
    status: STATUSES[Math.floor(rng() * STATUSES.length)]
  }))

  return file
}

function countLine (lines, line) {
  return lines.filter((candidate) => candidate === line).length
}

test('a file status emits each field exactly once in order', () => {
  const order = ['CID: ', 'File name: ', 'Size: ', 'Status: ', 'Hosting window: ']

  for (let i = 0; i < 500; i++) {
    const file = randomFile()
    const lines = formatFileStatusMessage(file).split('\n')

    assert.equal(countLine(lines, `CID: ${file.cid}`), 1)
    assert.equal(countLine(lines, `Status: ${file.status}`), 1)
    assert.equal(countLine(lines, `Hosting window: ${file.hostedUntil || 'not paid'}`), 1)
    assert.equal(lines.filter((l) => l.startsWith('File name: ')).length, file.filename !== undefined ? 1 : 0)
    assert.equal(lines.filter((l) => l.startsWith('Size: ')).length, file.sizeBytes !== undefined ? 1 : 0)
    assert.equal(lines.filter((l) => l.startsWith('Pin: ')).length, file.pins.length)

    for (const pin of file.pins) {
      assert.equal(countLine(lines, `Pin: ${pin.provider} ${pin.status}`), 1)
    }

    let last = -1
    for (const prefix of order) {
      const index = lines.findIndex((line) => line.startsWith(prefix))
      if (index === -1) continue
      assert.ok(index > last, `line "${prefix}" is out of order in:\n${lines.join('\n')}`)
      last = index
    }

    const windowIndex = lines.indexOf(`Hosting window: ${file.hostedUntil || 'not paid'}`)
    const pinIndexes = file.pins.map((pin) => lines.indexOf(`Pin: ${pin.provider} ${pin.status}`))
    for (const index of pinIndexes) assert.ok(index > windowIndex)
    assert.deepEqual(pinIndexes, [...pinIndexes].sort((a, b) => a - b))
  }
})

test('the command looks up the requested CID and exits 0', async () => {
  for (let i = 0; i < 200; i++) {
    const file = randomFile()
    const cid = `bafy-${randomText(16)}`
    const calls = { cid: null }

    class FakeHostingApi {
      async getStatus (args) {
        calls.cid = args.cid
        return file
      }
    }

    const out = captureStream()
    const err = captureStream()
    const command = new FileStatus({
      HostingApiClass: FakeHostingApi,
      config: {},
      stdout: out.stream,
      stderr: err.stream
    })

    const code = await command.run({ cid, json: true })
    const parsed = JSON.parse(out.text())

    assert.equal(code, 0)
    assert.equal(calls.cid, cid)
    assert.equal(parsed.message, formatFileStatusMessage(file))
    for (const [key, value] of Object.entries(file)) {
      assert.deepEqual(parsed[key], value)
    }
    assert.equal(err.text(), '')
  }
})

test('a missing -c flag always exits 2 without a lookup', async () => {
  for (let i = 0; i < 100; i++) {
    const calls = { cid: null }

    class FakeHostingApi {
      async getStatus (args) {
        calls.cid = args.cid
        return {}
      }
    }

    const err = captureStream()
    const command = new FileStatus({
      HostingApiClass: FakeHostingApi,
      config: {},
      stdout: captureStream().stream,
      stderr: err.stream
    })

    const code = await command.run({ json: rng() < 0.5 })

    assert.equal(code, 2)
    assert.equal(calls.cid, null)
    assert.ok(err.text().includes('You must specify a CID with the -c flag.'))
  }
})

test('an API error always exits 1', async () => {
  for (let i = 0; i < 100; i++) {
    const message = randomText(40)

    class FakeHostingApi {
      async getStatus () {
        throw new Error(message)
      }
    }

    const err = captureStream()
    const command = new FileStatus({
      HostingApiClass: FakeHostingApi,
      config: {},
      stdout: captureStream().stream,
      stderr: err.stream
    })

    const code = await command.run({ cid: 'bafy-missing', json: true })

    assert.equal(code, 1)
    assert.equal(JSON.parse(err.text()).error, message)
  }
})
