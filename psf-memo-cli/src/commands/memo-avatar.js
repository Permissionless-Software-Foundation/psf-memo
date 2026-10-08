/*
  memo-avatar: broadcast a 0x6d0a Memo set-profile-picture action.

  It resolves the signing wallet (-n <wallet> or --wif <wif>), validates the
  avatar URL from the -u flag against the 0x6d0a protocol limit of 217 UTF-8
  bytes (not characters), broadcasts the single-field Memo action [6d0a, url]
  through the shared broadcast scaffolding, and reports the transaction id plus
  its bch.loping.net explorer link. A missing or invalid flag is a usage error
  (exit 2) with no broadcast; a rejected broadcast surfaces the wallet's real
  error (exit 1).
*/

// Local libraries
import {
  parseMemoAvatarFlags,
  formatMemoAvatarMessage,
  MEMO_AVATAR_PREFIX
} from '../lib/memo-avatar.js'
import { defineFieldWriteCommand } from '../lib/write-command.js'

const MemoAvatar = defineFieldWriteCommand({
  parse: parseMemoAvatarFlags,
  format: formatMemoAvatarMessage,
  prefix: MEMO_AVATAR_PREFIX,
  field: 'url'
})

export default MemoAvatar
