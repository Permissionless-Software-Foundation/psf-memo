/*
  Property tests for the shared output and exit-code reporter.

  Unit tests pin the fixed shapes. These properties exercise broad input
  ranges to confirm:

    - round-trip: any message survives the JSON result/error encoding intact.
    - exit codes: success is always 0, a runtime failure always 1, and a usage
      failure always 2.
*/

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { seededRandom } from './harness.js'
import {
  Reporter,
  UsageError,
  runCommand,
  EXIT_SUCCESS,
  EXIT_FAILURE,
  EXIT_USAGE
} from '../../src/lib/reporter.js'
import { captureStream } from '../support/capture.js'

const rng = seededRandom(20261008)

// A mix of letters, digits, whitespace, and JSON-significant characters so the
// round-trip properties exercise the encoder, not only a plain alphabet.
const TEXT_CHARS = 'abcXYZ019 \t\n"\\/{}[]:é中'

function randomText () {
  const length = Math.floor(rng() * 40)
  let text = ''
  for (let i = 0; i < length; i++) {
    text += TEXT_CHARS[Math.floor(rng() * TEXT_CHARS.length)]
  }
  return text
}

test('JSON results round-trip the message and exit 0', () => {
  for (let i = 0; i < 200; i++) {
    const message = randomText()
    const out = captureStream()
    const reporter = new Reporter({ json: true, stdout: out.stream })

    const code = reporter.result(message, { index: i })
    const parsed = JSON.parse(out.text())

    assert.equal(code, EXIT_SUCCESS)
    assert.equal(parsed.message, message)
    assert.equal(parsed.index, i)
  }
})

test('JSON errors round-trip the message with the matching exit code', () => {
  for (let i = 0; i < 200; i++) {
    const message = randomText()
    const usage = rng() < 0.5
    const err = captureStream()
    const reporter = new Reporter({ json: true, stderr: err.stream })

    const code = usage
      ? reporter.usage(new UsageError(message))
      : reporter.fail(new Error(message))

    assert.equal(code, usage ? EXIT_USAGE : EXIT_FAILURE)
    assert.equal(JSON.parse(err.text()).error, message)
  }
})

test('runCommand maps every outcome to its exit code and channel', async () => {
  for (let i = 0; i < 300; i++) {
    const message = randomText()
    const kind = Math.floor(rng() * 3)
    const out = captureStream()
    const err = captureStream()

    const code = await runCommand(async () => {
      if (kind === 0) return { message }
      if (kind === 1) throw new Error(message)
      throw new UsageError(message)
    }, { json: false, stdout: out.stream, stderr: err.stream })

    const expected = kind === 0 ? EXIT_SUCCESS : kind === 1 ? EXIT_FAILURE : EXIT_USAGE
    assert.equal(code, expected)

    if (kind === 0) {
      assert.equal(out.text(), `${message}\n`)
      assert.equal(err.text(), '')
    } else {
      assert.equal(err.text(), `${message}\n`)
      assert.equal(out.text(), '')
    }
  }
})
