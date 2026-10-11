/*
  Property tests for the shared hosted-result renderer.

  file-check and file-host both render the CID, download/view links, and one
  gateway line per reported gateway through this helper. Unit tests pin fixed
  shapes; this property confirms the exact ordered array for broad inputs.
*/

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { seededRandom } from './harness.js'
import { hostedResultLines } from '../../src/lib/hosted-result.js'

const rng = seededRandom(20261015)

const CHARS = 'abcdefghijklmnopqrstuvwxyz0123456789-_.:/'

function randomText (maxLength) {
  const length = 1 + Math.floor(rng() * maxLength)
  let text = ''
  for (let i = 0; i < length; i++) text += CHARS[Math.floor(rng() * CHARS.length)]
  return text
}

test('hostedResultLines emits the CID and links then one line per gateway', () => {
  for (let i = 0; i < 500; i++) {
    const result = {
      cid: `bafy-${randomText(20)}`,
      downloadUrl: `http://host/download/${randomText(10)}`,
      viewUrl: `http://host/view/${randomText(10)}`
    }
    if (rng() < 0.7) {
      result.gatewayUrls = Array.from(
        { length: Math.floor(rng() * 5) },
        () => `https://gw-${randomText(8)}/ipfs/${randomText(12)}`
      )
    }

    const gateways = result.gatewayUrls || []

    assert.deepEqual(hostedResultLines(result), [
      `CID: ${result.cid}`,
      `Download URL: ${result.downloadUrl}`,
      `View URL: ${result.viewUrl}`,
      ...gateways.map((url) => `Gateway URL: ${url}`)
    ])
  }
})
