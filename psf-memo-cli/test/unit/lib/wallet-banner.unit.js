/*
  Unit tests for the wallet library banner filter and its runCommand wiring.

  minimal-slp-wallet logs its router-initialization banner with console.log
  while a wallet is constructed. That bypasses the reporter, so the banner lands
  on process stdout ahead of the command result and breaks the one-JSON-object
  stdout contract. These tests pin the pure filter and the command boundary that
  keeps the banner off stdout: discarded in JSON mode and routed to stderr in
  human mode.
*/

// Global npm libraries
import { assert } from 'chai'

// Local libraries
import { runCommand } from '../../../src/lib/reporter.js'
import { captureStream } from '../../support/capture.js'
import {
  WALLET_BANNER_PREFIX,
  isWalletBanner,
  createWalletLog,
  withWalletBanner
} from '../../../src/lib/wallet-banner.js'

const BANNER = `${WALLET_BANNER_PREFIX}: rest-api`

describe('#wallet-banner', () => {
  describe('isWalletBanner', () => {
    it('recognizes the wallet library initialization banner', () => {
      assert.isTrue(isWalletBanner(BANNER))
    })

    it('does not match unrelated output', () => {
      assert.isFalse(isWalletBanner('some other log'))
      assert.isFalse(isWalletBanner(''))
      assert.isFalse(isWalletBanner(undefined))
      assert.isFalse(isWalletBanner(42))
    })
  })

  describe('createWalletLog', () => {
    it('discards the banner in JSON mode and passes other lines through', () => {
      const stderr = captureStream()
      const logged = []
      const log = createWalletLog({
        json: true,
        stderr: stderr.stream,
        log: (...args) => logged.push(args.join(' '))
      })

      log(BANNER)
      log('keep me')

      assert.equal(stderr.text(), '')
      assert.deepEqual(logged, ['keep me'])
    })

    it('routes the banner to stderr in human mode', () => {
      const stderr = captureStream()
      const logged = []
      const log = createWalletLog({
        json: false,
        stderr: stderr.stream,
        log: (...args) => logged.push(args.join(' '))
      })

      log(BANNER)
      log('keep me')

      assert.equal(stderr.text(), `${BANNER}\n`)
      assert.deepEqual(logged, ['keep me'])
    })
  })

  describe('withWalletBanner', () => {
    it('restores console.log after the wrapped call', async () => {
      const original = console.log

      await withWalletBanner({ json: true }, async () => true)

      assert.equal(console.log, original)
    })

    it('restores console.log when the wrapped call throws', async () => {
      const original = console.log

      try {
        await withWalletBanner({ json: true }, async () => {
          throw new Error('boom')
        })
        assert.fail('Unexpected code path')
      } catch (err) {
        assert.equal(err.message, 'boom')
      }

      assert.equal(console.log, original)
    })
  })
})

// Run a command with console.log redirected to the injected stdout sink, the
// way the wallet library writes to the real process stdout, then report the
// captured stdout/stderr. This makes the stdout pollution observable in a test.
async function runWithConsoleOnStdout (command, json) {
  const stdout = captureStream()
  const stderr = captureStream()
  const original = console.log
  console.log = (...args) => stdout.stream.write(`${args.join(' ')}\n`)
  try {
    const code = await runCommand(command, { json, stdout: stdout.stream, stderr: stderr.stream })
    return { code, stdout: stdout.text(), stderr: stderr.text() }
  } finally {
    console.log = original
  }
}

describe('#runCommand wallet banner hygiene', () => {
  it('JSON mode keeps stdout to one JSON object when the wallet logs a banner', async () => {
    const { code, stdout, stderr } = await runWithConsoleOnStdout(async () => {
      console.log(BANNER)
      return { message: 'ok', data: { a: 1 } }
    }, true)

    assert.equal(code, 0)
    assert.deepEqual(JSON.parse(stdout), { message: 'ok', a: 1 })
    assert.equal(stderr, '')
  })

  it('human mode keeps the readable result on stdout and the banner on stderr', async () => {
    const { stdout, stderr } = await runWithConsoleOnStdout(async () => {
      console.log(BANNER)
      return { message: 'ok' }
    }, false)

    assert.equal(stdout, 'ok\n')
    assert.isFalse(stdout.includes(BANNER))
    assert.equal(stderr, `${BANNER}\n`)
  })

  it('a wallet library failure in JSON mode reports one JSON error on stderr', async () => {
    const { code, stdout, stderr } = await runWithConsoleOnStdout(async () => {
      console.log(BANNER)
      throw new Error('wallet exploded')
    }, true)

    assert.equal(code, 1)
    assert.equal(stdout, '')
    assert.deepEqual(JSON.parse(stderr), { error: 'wallet exploded' })
  })
})
