/*
  Property tests for the memo-avatar flag validation.

  The 0x6d0a limit counts UTF-8 bytes, not characters; the value comes from the
  -u flag, so the shared byte-limit property runs with that source flag.
*/

import { registerMemoTextByteLimitTests } from './memo-text-flag-property.js'
import { parseMemoAvatarFlags, MAX_AVATAR_BYTES } from '../../src/lib/memo-avatar.js'

registerMemoTextByteLimitTests({
  name: 'avatar',
  parse: parseMemoAvatarFlags,
  field: 'url',
  limit: MAX_AVATAR_BYTES,
  flag: 'url',
  missingHint: '-u flag',
  seed: 20261108
})
