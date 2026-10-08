/*
  Unit tests for the pure memo-post helper.

  The 0x6d02 post limit is 217 characters -- UTF-16 code units, not bytes.
  These pin the flag validation, the limit math (including multibyte text), and
  the human-readable summary.
*/

// Global npm libraries
import { assert } from 'chai'

// Local libraries
import {
  parseMemoPostFlags,
  formatMemoPostMessage,
  MEMO_POST_PREFIX,
  MAX_MEMO_CHARS
} from '../../../src/lib/memo-post.js'
import { captureUsageError } from '../../support/usage-error.js'

describe('#memo-post helpers', () => {
  it('accepts a memo within the 217-character limit', () => {
    assert.deepEqual(parseMemoPostFlags({ memo: 'hello memo' }), { memo: 'hello memo' })

    const atLimit = 'a'.repeat(MAX_MEMO_CHARS)
    assert.deepEqual(parseMemoPostFlags({ memo: atLimit }), { memo: atLimit })
  })

  it('counts characters, not bytes, so 217 two-byte characters are accepted', () => {
    const memo = 'é'.repeat(MAX_MEMO_CHARS)

    assert.equal(Buffer.byteLength(memo, 'utf8'), MAX_MEMO_CHARS * 2)
    assert.deepEqual(parseMemoPostFlags({ memo }), { memo })
  })

  it('rejects a memo longer than the limit', () => {
    const tooLong = captureUsageError(() =>
      parseMemoPostFlags({ memo: 'a'.repeat(MAX_MEMO_CHARS + 1) })
    )
    assert.equal(tooLong.message, `Memo is too long. Maximum is ${MAX_MEMO_CHARS} characters.`)

    const tooManyChars = captureUsageError(() =>
      parseMemoPostFlags({ memo: 'é'.repeat(MAX_MEMO_CHARS + 1) })
    )
    assert.equal(tooManyChars.message, `Memo is too long. Maximum is ${MAX_MEMO_CHARS} characters.`)
  })

  it('rejects a missing memo', () => {
    const absent = captureUsageError(() => parseMemoPostFlags({}))
    assert.equal(absent.message, 'You must specify memo text with the -m flag.')

    const undefinedMemo = captureUsageError(() =>
      parseMemoPostFlags({ memo: undefined })
    )
    assert.equal(undefinedMemo.message, 'You must specify memo text with the -m flag.')
  })

  it('rejects an empty memo', () => {
    const empty = captureUsageError(() => parseMemoPostFlags({ memo: '' }))
    assert.equal(empty.message, 'Memo must not be empty.')
  })

  it('exposes the 0x6d02 post prefix', () => {
    assert.equal(MEMO_POST_PREFIX, '6d02')
  })

  it('renders the txid and explorer link', () => {
    const message = formatMemoPostMessage({
      txid: 'abc123',
      explorerUrl: 'https://bch.loping.net/tx/abc123'
    })

    assert.include(message, 'abc123')
    assert.include(message, 'https://bch.loping.net/tx/abc123')
  })
})
