/*
  Property tests for the memo-bio flag validation.

  The 0x6d05 limit counts UTF-8 bytes, not characters; the shared byte-limit
  property lives in test/property/memo-text-flag-property.js.
*/

import { registerMemoTextByteLimitTests } from './memo-text-flag-property.js'
import { parseMemoBioFlags, MAX_BIO_BYTES } from '../../src/lib/memo-bio.js'

registerMemoTextByteLimitTests({
  name: 'bio',
  parse: parseMemoBioFlags,
  field: 'bio',
  limit: MAX_BIO_BYTES,
  seed: 20261107
})
