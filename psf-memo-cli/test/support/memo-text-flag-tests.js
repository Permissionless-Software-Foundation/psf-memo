/*
  Shared unit tests for the memo-text -m flag parsers.

  memo-name and memo-bio both build their parser from memoTextFlagParser, so the
  missing / empty / inclusive-limit contract is asserted once here for each
  command's parser, limit, and messages.
*/

// Global npm libraries
import { assert } from 'chai'

// Local libraries
import { captureUsageError } from './usage-error.js'

// Register the shared -m validation tests for one memo-text command helper.
export function defineMemoTextFlagTests ({
  label,
  parse,
  field,
  atLimit,
  overLimit,
  missingMessage,
  tooLongMessage
}) {
  it('resolves a valid value', () => {
    assert.deepEqual(parse({ memo: 'hello' }), { [field]: 'hello' })
  })

  it('accepts a value exactly at the inclusive limit', () => {
    assert.deepEqual(parse({ memo: atLimit }), { [field]: atLimit })
  })

  it('rejects a value over the limit with the documented message', () => {
    const err = captureUsageError(() => parse({ memo: overLimit }))
    assert.equal(err.message, tooLongMessage)
  })

  it('requires the -m text', () => {
    const err = captureUsageError(() => parse({}))
    assert.equal(err.message, missingMessage)
  })

  it('rejects an empty value', () => {
    const err = captureUsageError(() => parse({ memo: '' }))
    assert.equal(err.message, `${label} must not be empty.`)
  })
}
