/*
  Unit tests for the pure memo-reply helper.

  The 0x6d03 reply limit is 184 UTF-8 bytes, not characters, after the 32-byte
  parent txid. These pin the parent-txid validation (presence and little-endian
  wire encoding), the byte limit, the reply-text validation, and the summary.
*/

// Global npm libraries
import { assert } from 'chai'

// Local libraries
import {
  parseReplyFlags,
  formatReplyMessage,
  MEMO_REPLY_PREFIX,
  MAX_REPLY_BYTES
} from '../../../src/lib/memo-reply.js'
import { captureUsageError } from '../../support/usage-error.js'

// A 64-char hex txid whose big-endian bytes are 0x01 followed by 31 zero bytes,
// so its little-endian wire form is 31 zero bytes followed by 0x01.
const PARENT = `01${'00'.repeat(31)}`
const PARENT_WIRE = `${'00'.repeat(31)}01`

describe('#memo-reply helpers', () => {
  it('accepts a valid parent txid and reply text', () => {
    const parsed = parseReplyFlags({ txid: PARENT, memo: 'hello reply' })

    assert.equal(parsed.text, 'hello reply')
    assert.equal(parsed.parentBytes.toString('hex'), PARENT_WIRE)
  })

  it('accepts a reply of exactly 184 bytes', () => {
    const text = 'é'.repeat(MAX_REPLY_BYTES / 2)

    assert.equal(Buffer.byteLength(text, 'utf8'), MAX_REPLY_BYTES)
    assert.equal(parseReplyFlags({ txid: PARENT, memo: text }).text, text)
  })

  it('counts bytes, not characters, when rejecting an over-long reply', () => {
    const tooLong = captureUsageError(() =>
      parseReplyFlags({ txid: PARENT, memo: 'é'.repeat(MAX_REPLY_BYTES / 2 + 1) })
    )
    assert.equal(tooLong.message, `Reply is too long. Maximum is ${MAX_REPLY_BYTES} bytes.`)
  })

  it('rejects a missing reply', () => {
    const missing = captureUsageError(() => parseReplyFlags({ txid: PARENT }))
    assert.equal(missing.message, 'You must specify reply text with the -m flag.')
  })

  it('rejects an empty reply', () => {
    const empty = captureUsageError(() => parseReplyFlags({ txid: PARENT, memo: '' }))
    assert.equal(empty.message, 'Reply must not be empty.')
  })

  it('rejects a missing parent txid', () => {
    const missing = captureUsageError(() => parseReplyFlags({ memo: 'hello' }))
    assert.equal(missing.message, 'You must specify a post txid with the -t flag.')
  })

  it('rejects a malformed parent txid as a usage error', () => {
    const short = captureUsageError(() =>
      parseReplyFlags({ txid: '1234', memo: 'hello' })
    )
    assert.equal(short.message, 'Txid must be a 64-character hex string.')

    const nonHex = captureUsageError(() =>
      parseReplyFlags({ txid: 'z'.repeat(64), memo: 'hello' })
    )
    assert.equal(nonHex.message, 'Txid must be a valid hex string.')
  })

  it('exposes the 0x6d03 reply prefix', () => {
    assert.equal(MEMO_REPLY_PREFIX, '6d03')
  })

  it('renders the txid and explorer link', () => {
    const message = formatReplyMessage({
      txid: 'abc123',
      explorerUrl: 'https://bch.loping.net/tx/abc123'
    })

    assert.include(message, 'abc123')
    assert.include(message, 'https://bch.loping.net/tx/abc123')
  })
})
