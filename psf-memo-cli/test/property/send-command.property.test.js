/*
  Property tests for the shared broadcast-and-report send pipeline.

  send-bch and send-tokens both run through runSendCommand. Unit tests pin the
  fixed flows; these properties exercise broad inputs to confirm:

    - success: the command's validateFlags runs, the wallet is resolved by
      name, the send result becomes the TXID and explorer URL, and the command
      is wired to the resolved wallet, exiting 0.
    - usage: a UsageError exits 2 before any wallet is resolved.
    - runtime: a send failure exits 1 with the error on stderr.
*/

import { test, beforeEach, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import { seededRandom } from './harness.js'
import { runSendCommand } from '../../src/lib/send-command.js'
import { UsageError } from '../../src/lib/reporter.js'
import { captureStream } from '../support/capture.js'

const rng = seededRandom(20261016)

// The command assigns process.exitCode; restore it so a usage/failure path in
// one property does not leak an exit code into the runner.
let originalExitCode
beforeEach(() => { originalExitCode = process.exitCode })
afterEach(() => { process.exitCode = originalExitCode })

function randomText (maxLength) {
  const length = 1 + Math.floor(rng() * maxLength)
  let text = ''
  for (let i = 0; i < length; i++) text += 'abcdefghijklmnopqrstuvwxyz0123456789'[Math.floor(rng() * 36)]
  return text
}

test('runSendCommand resolves the wallet, sends, and reports the explorer URL', async () => {
  for (let i = 0; i < 300; i++) {
    const name = `wallet-${randomText(8)}`
    const txid = `tx-${randomText(12)}`
    const explorerUrl = `https://explorer.test/${i}?tx=`
    const flags = { name, json: true }
    const calls = { validate: 0, instance: null, send: null }
    const wallet = { marker: i }
    const out = captureStream()
    const err = captureStream()
    const command = {
      validateFlags (seen) {
        calls.validate++
        assert.equal(seen, flags)
        return true
      },
      walletUtil: {
        instanceWallet: async (requested) => {
          calls.instance = requested
          return wallet
        }
      },
      stdout: out.stream,
      stderr: err.stream
    }
    const send = async (seen) => {
      calls.send = seen
      return txid
    }

    const code = await runSendCommand({ command, flags, send, explorerUrl })

    assert.equal(code, 0)
    assert.equal(calls.validate, 1)
    assert.equal(calls.instance, name)
    assert.equal(calls.send, flags)
    assert.equal(command.bchWallet, wallet)

    const parsed = JSON.parse(out.text())
    assert.equal(parsed.txid, txid)
    assert.equal(parsed.explorerUrl, `${explorerUrl}${txid}`)
    assert.equal(err.text(), '')
  }
})

test('runSendCommand maps a usage failure to exit 2 without resolving a wallet', async () => {
  for (let i = 0; i < 100; i++) {
    const message = `bad flag ${i}`
    const calls = { instance: null }
    const out = captureStream()
    const err = captureStream()
    const command = {
      validateFlags () {
        throw new UsageError(message)
      },
      walletUtil: {
        instanceWallet: async (requested) => {
          calls.instance = requested
          return {}
        }
      },
      stdout: out.stream,
      stderr: err.stream
    }

    const code = await runSendCommand({ command, flags: { json: true }, send: async () => 'x', explorerUrl: 'u' })

    assert.equal(code, 2)
    assert.equal(calls.instance, null)
    assert.equal(out.text(), '')
    assert.equal(JSON.parse(err.text()).error, message)
  }
})

test('runSendCommand maps a send failure to exit 1', async () => {
  for (let i = 0; i < 100; i++) {
    const message = `send failed ${i}`
    const out = captureStream()
    const err = captureStream()
    const command = {
      validateFlags () {},
      walletUtil: { instanceWallet: async () => ({}) },
      stdout: out.stream,
      stderr: err.stream
    }

    const code = await runSendCommand({
      command,
      flags: { json: true },
      explorerUrl: 'u',
      send: async () => {
        throw new Error(message)
      }
    })

    assert.equal(code, 1)
    assert.equal(out.text(), '')
    assert.equal(JSON.parse(err.text()).error, message)
  }
})
