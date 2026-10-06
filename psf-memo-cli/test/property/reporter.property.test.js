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
  EXIT_SUCCESS,
  EXIT_FAILURE,
  EXIT_USAGE
} from '../../src/lib/reporter.js'

const rng = seededRandom(20261008)

function randomText () {
  const length = Math.floor(rng() * 40)
  let text = ''
  for (let i = 0; i < length; i++) {
    text += String.fromCharCode(97 + Math.floor(rng() * 26))
  }
  return text
}

function capture () {
  let text = ''
  return {
    stream: { write: (chunk) => { text += chunk } },
    text: () => text
  }
}

test('JSON results round-trip the message and exit 0', () => {
  for (let i = 0; i < 200; i++) {
    const message = randomText()
    const out = capture()
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
    const err = capture()
    const reporter = new Reporter({ json: true, stderr: err.stream })

    const code = usage
      ? reporter.usage(new UsageError(message))
      : reporter.fail(new Error(message))

    assert.equal(code, usage ? EXIT_USAGE : EXIT_FAILURE)
    assert.equal(JSON.parse(err.text()).error, message)
  }
})
