/*
  Property tests for the wallet library banner filter and its reporter wiring.

  Unit tests pin the fixed shapes. These properties exercise broad input ranges
  to confirm:

    - isWalletBanner: matches exactly the strings that start with the banner
      prefix, and rejects every other value, including non-strings.
    - createWalletLog: conserves every non-banner line in order, forwards no
      banner to the log sink, and diverts banners only to stderr in human mode.
    - withWalletBanner: restores console.log after success and after failure.
    - runCommand: keeps stdout to one readable line or one JSON object while the
      wallet library logs its construction banner.
*/

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { seededRandom, randomText } from './harness.js'
import {
  WALLET_BANNER_PREFIX,
  isWalletBanner,
  createWalletLog,
  withWalletBanner
} from '../../src/lib/wallet-banner.js'
import { runCommand, EXIT_SUCCESS } from '../../src/lib/reporter.js'
import { captureStream } from '../support/capture.js'

const rng = seededRandom(20261012)

// A mix of letters, digits, whitespace, and JSON-significant characters so the
// properties exercise real text, not only a plain alphabet.
const TEXT_CHARS = 'abcXYZ019 \t"\\/{}[]:é中'

// The exact shape minimal-slp-wallet logs while it constructs its routers.
const BANNER = `${WALLET_BANNER_PREFIX} with this interface: rest-api`

function randomMessage () {
  return randomText(rng, TEXT_CHARS, 30)
}

test('isWalletBanner matches exactly the banner prefix', () => {
  for (let i = 0; i < 500; i++) {
    const suffix = randomMessage()
    assert.equal(isWalletBanner(`${WALLET_BANNER_PREFIX}${suffix}`), true)
    assert.equal(isWalletBanner(suffix), suffix.startsWith(WALLET_BANNER_PREFIX))
  }

  for (const value of [undefined, null, 42, {}, [], () => {}]) {
    assert.equal(isWalletBanner(value), false)
  }
})

test('createWalletLog conserves non-banner lines and only diverts banners', () => {
  for (let i = 0; i < 300; i++) {
    const count = Math.floor(rng() * 20)
    const items = []
    for (let j = 0; j < count; j++) {
      items.push(rng() < 0.5 ? `${WALLET_BANNER_PREFIX} ${randomMessage()}` : randomMessage())
    }

    const json = rng() < 0.5
    const stderr = captureStream()
    const logged = []
    const log = createWalletLog({
      json,
      stderr: stderr.stream,
      log: (message) => logged.push(message)
    })
    items.forEach((item) => log(item))

    const banners = items.filter(isWalletBanner)
    const passthrough = items.filter((item) => !isWalletBanner(item))
    assert.deepEqual(logged, passthrough)
    assert.equal(stderr.text(), json ? '' : banners.map((b) => `${b}\n`).join(''))
  }
})

test('withWalletBanner always restores console.log', async () => {
  for (let i = 0; i < 200; i++) {
    const original = console.log
    const json = rng() < 0.5
    const shouldThrow = rng() < 0.5
    const stderr = captureStream()

    try {
      await withWalletBanner({ json, stderr: stderr.stream }, async () => {
        console.log(`${WALLET_BANNER_PREFIX}: probe`)
        if (shouldThrow) throw new Error('boom')
        return 'ok'
      })
    } catch (err) {
      assert.equal(err.message, 'boom')
    }

    assert.equal(console.log, original)
  }
})

test('runCommand keeps stdout to one object while the wallet banner is logged', async () => {
  for (let i = 0; i < 200; i++) {
    const message = randomMessage()
    const json = rng() < 0.5
    const stdout = captureStream()
    const stderr = captureStream()
    const original = console.log
    console.log = (...args) => stdout.stream.write(`${args.join(' ')}\n`)

    let code
    try {
      code = await runCommand(async () => {
        console.log(BANNER)
        return { message, data: { index: i } }
      }, { json, stdout: stdout.stream, stderr: stderr.stream })
    } finally {
      console.log = original
    }

    assert.equal(code, EXIT_SUCCESS)
    if (json) {
      const parsed = JSON.parse(stdout.text())
      assert.equal(parsed.message, message)
      assert.equal(parsed.index, i)
      assert.equal(stderr.text(), '')
    } else {
      assert.equal(stdout.text(), `${message}\n`)
      assert.equal(stderr.text(), `${BANNER}\n`)
    }
  }
})
