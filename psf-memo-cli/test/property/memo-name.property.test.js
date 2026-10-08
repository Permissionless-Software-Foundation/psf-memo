/*
  Property tests for the memo-name flag validation.

  The 0x6d01 limit counts UTF-8 bytes, not characters; the shared byte-limit
  property lives in test/property/memo-text-flag-property.js.
*/

import { registerMemoTextByteLimitTests } from './memo-text-flag-property.js'
import { parseMemoNameFlags, MAX_NAME_BYTES } from '../../src/lib/memo-name.js'

registerMemoTextByteLimitTests({
  name: 'name',
  parse: parseMemoNameFlags,
  field: 'name',
  limit: MAX_NAME_BYTES,
  seed: 20261106
})
