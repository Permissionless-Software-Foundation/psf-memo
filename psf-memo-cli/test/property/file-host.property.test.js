/*
  Property tests for the file-host renderer and payment poll loop.

  Unit tests pin fixed shapes. These properties exercise broad input ranges to
  confirm:

    - rendering: a paid result emits the CID, links, and transaction exactly
      once in order, with one Gateway URL line per reported gateway; an
      already-hosted result emits exactly the two links.
    - pollPayment: a response paid at attempt k is returned after exactly k
      sleeps; a never-paid poll sleeps attempts-1 times and then throws.
*/

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { seededRandom } from './harness.js'
import { formatFileHostMessage, pollPayment } from '../../src/lib/file-host.js'

const rng = seededRandom(20261012)

const CHARS = 'abcdefghijklmnopqrstuvwxyz0123456789-_.:/'

function randomText (maxLength) {
  const length = 1 + Math.floor(rng() * maxLength)
  let text = ''
  for (let i = 0; i < length; i++) text += CHARS[Math.floor(rng() * CHARS.length)]
  return text
}

function countLine (lines, line) {
  return lines.filter((candidate) => candidate === line).length
}

test('a paid result emits each field exactly once in order', () => {
  for (let i = 0; i < 500; i++) {
    const gatewayUrls = Array.from(
      { length: Math.floor(rng() * 4) },
      () => `https://gw-${randomText(8)}/ipfs/${randomText(12)}`
    )
    const result = {
      cid: `bafy-${randomText(20)}`,
      downloadUrl: `http://host/download/${randomText(10)}`,
      viewUrl: `http://host/view/${randomText(10)}`,
      txid: `tx-${randomText(20)}`
    }
    if (rng() < 0.7) result.gatewayUrls = gatewayUrls

    const lines = formatFileHostMessage(result).split('\n')

    assert.equal(countLine(lines, `CID: ${result.cid}`), 1)
    assert.equal(countLine(lines, `Download URL: ${result.downloadUrl}`), 1)
    assert.equal(countLine(lines, `View URL: ${result.viewUrl}`), 1)
    assert.equal(countLine(lines, `Transaction: ${result.txid}`), 1)

    const expectedGateways = result.gatewayUrls || []
    assert.equal(lines.filter((l) => l.startsWith('Gateway URL: ')).length, expectedGateways.length)
    for (const url of expectedGateways) {
      assert.equal(countLine(lines, `Gateway URL: ${url}`), 1)
    }

    // CID < Download < View < every gateway < Transaction.
    const cidIndex = lines.indexOf(`CID: ${result.cid}`)
    const downloadIndex = lines.indexOf(`Download URL: ${result.downloadUrl}`)
    const viewIndex = lines.indexOf(`View URL: ${result.viewUrl}`)
    const txIndex = lines.indexOf(`Transaction: ${result.txid}`)
    assert.ok(cidIndex < downloadIndex && downloadIndex < viewIndex && viewIndex < txIndex)

    const gatewayIndexes = expectedGateways.map((url) => lines.indexOf(`Gateway URL: ${url}`))
    for (const index of gatewayIndexes) {
      assert.ok(index > viewIndex && index < txIndex, 'gateways must sit between view and transaction')
    }
    assert.deepEqual(gatewayIndexes, [...gatewayIndexes].sort((a, b) => a - b))
  }
})

test('an already-hosted result emits exactly the two links', () => {
  for (let i = 0; i < 300; i++) {
    const result = {
      alreadyHosted: true,
      downloadUrl: `http://host/download/${randomText(12)}`,
      viewUrl: `http://host/view/${randomText(12)}`
    }

    const message = formatFileHostMessage(result)

    assert.equal(message, `Download URL: ${result.downloadUrl}\nView URL: ${result.viewUrl}`)
    assert.ok(!message.includes('CID: '))
    assert.ok(!message.includes('Transaction: '))
  }
})

test('pollPayment returns a response paid at attempt k after exactly k sleeps', async () => {
  for (let i = 0; i < 300; i++) {
    const attempts = 1 + Math.floor(rng() * 10)
    const paidAt = Math.floor(rng() * attempts)
    const delayMs = Math.floor(rng() * 10000)
    const sleeps = []
    let calls = 0

    const result = await pollPayment({
      checkPayment: async () => {
        const index = calls++
        return index === paidAt ? { status: 'paid', cid: `cid-${index}` } : { status: 'unpaid' }
      },
      paymentAddress: `bitcoincash:q${randomText(16)}`,
      attempts,
      delayMs,
      sleep: async (ms) => { sleeps.push(ms) }
    })

    assert.equal(result.cid, `cid-${paidAt}`)
    assert.equal(calls, paidAt + 1)
    assert.deepEqual(sleeps, Array(paidAt).fill(delayMs))
  }
})

test('pollPayment sleeps attempts-1 times then throws when never paid', async () => {
  for (let i = 0; i < 200; i++) {
    const attempts = 1 + Math.floor(rng() * 10)
    const delayMs = Math.floor(rng() * 10000)
    const sleeps = []
    let calls = 0
    let err

    try {
      await pollPayment({
        checkPayment: async () => { calls++; return { status: 'unpaid' } },
        paymentAddress: `bitcoincash:q${randomText(16)}`,
        attempts,
        delayMs,
        sleep: async (ms) => { sleeps.push(ms) }
      })
    } catch (e) {
      err = e
    }

    assert.equal(err?.message, 'Payment not confirmed.')
    assert.equal(calls, attempts)
    assert.deepEqual(sleeps, Array(Math.max(attempts - 1, 0)).fill(delayMs))
  }
})
