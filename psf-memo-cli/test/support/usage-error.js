/*
  Shared assertions for flag-validation tests.

  Every pure flag parser reports invalid input as a UsageError, so the capture
  helper and the shared --limit/--offset checks live here instead of being
  repeated in each feature's unit test.
*/

// Global npm libraries
import { assert } from 'chai'

// Local libraries
import { UsageError } from '../../src/lib/reporter.js'

// Run fn and return the UsageError it throws, failing when it does not throw.
export function captureUsageError (fn) {
  try {
    fn()
  } catch (err) {
    assert.instanceOf(err, UsageError)
    return err
  }
  throw new Error('Expected a UsageError')
}

// Assert the shared non-negative-integer validation rejects a negative limit
// and a non-numeric offset with the documented messages.
export function assertPageFlagViolations (parseFlags, baseFlags = {}) {
  const limit = captureUsageError(() => parseFlags({ ...baseFlags, limit: '-1' }))
  assert.equal(limit.message, '--limit must be a non-negative integer.')

  const offset = captureUsageError(() => parseFlags({ ...baseFlags, offset: 'abc' }))
  assert.equal(offset.message, '--offset must be a non-negative integer.')
}
