/*
  Shared unit tests for the memo-text flag parsers.

  memo-name, memo-bio, and memo-avatar build their parser from
  memoTextFlagParser, so the missing / empty / inclusive-limit contract is
  asserted once here for each command's parser, source flag, limit, and
  messages.
*/

// Global npm libraries
import { assert } from 'chai'

// Local libraries
import { captureUsageError } from './usage-error.js'

// Register the shared validation tests for one memo-text command helper.
export function defineMemoTextFlagTests ({
  flag = 'memo',
  label,
  parse,
  field,
  atLimit,
  overLimit,
  missingMessage,
  tooLongMessage
}) {
  const flagsWith = (value) => ({ [flag]: value })

  it('resolves a valid value', () => {
    assert.deepEqual(parse(flagsWith('hello')), { [field]: 'hello' })
  })

  it('accepts a value exactly at the inclusive limit', () => {
    assert.deepEqual(parse(flagsWith(atLimit)), { [field]: atLimit })
  })

  it('rejects a value over the limit with the documented message', () => {
    const err = captureUsageError(() => parse(flagsWith(overLimit)))
    assert.equal(err.message, tooLongMessage)
  })

  it('requires the text flag', () => {
    const err = captureUsageError(() => parse({}))
    assert.equal(err.message, missingMessage)
  })

  it('rejects an empty value', () => {
    const err = captureUsageError(() => parse(flagsWith('')))
    assert.equal(err.message, `${label} must not be empty.`)
  })
}
