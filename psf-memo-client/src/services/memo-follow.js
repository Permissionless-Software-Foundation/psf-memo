/*
  Memo follow/unfollow behavior: compose, validate, and broadcast a Memo
  follow (0x6d06) or unfollow (0x6d07) action.

  A follow transaction carries the followee's 20-byte hash160. The cash
  address is converted with the wallet's embedded bch-js Address.toHash160()
  so no separate cashaddr dependency is needed.

  The wallet and an injected profile store are used so this module stays
  testable and free of UI/network concerns; environmentally unsuitable I/O
  lives behind those small adapter boundaries.

  Constants
    MEMO_FOLLOW_PREFIX   : hex prefix for the Memo "follow" action (0x6d06)
    MEMO_UNFOLLOW_PREFIX : hex prefix for the Memo "unfollow" action (0x6d07)
    PK_HASH_LENGTH       : size of the followee hash160 in bytes (20)
*/

const MemoStateAction = require('./memo-state-action')

const MEMO_FOLLOW_PREFIX = '6d06'
const MEMO_UNFOLLOW_PREFIX = '6d07'

// Compose the static config for this Memo state action.
function followConfig () {
  return {
    prefix: MEMO_FOLLOW_PREFIX,
    walletRequiredMsg: 'Memo follow requires a wallet.',
    lengthMessage: 'Follow address is invalid.',
    emptyMessage: 'Follow address is required.',
    lengthCode: 'follow_validation',
    validationCode: 'follow_validation',
    reflectMethod: 'setFollowState'
  }
}

class MemoFollow extends MemoStateAction {
  static config = followConfig()

  // Broadcast a Memo follow for the given followee address.
  async follow (followeeAddr) {
    return this._setState(followeeAddr, MEMO_FOLLOW_PREFIX, true)
  }

  // Broadcast a Memo unfollow for the given followee address.
  async unfollow (followeeAddr) {
    return this._setState(followeeAddr, MEMO_UNFOLLOW_PREFIX, false)
  }
}

MemoFollow.MEMO_FOLLOW_PREFIX = MEMO_FOLLOW_PREFIX
MemoFollow.MEMO_UNFOLLOW_PREFIX = MEMO_UNFOLLOW_PREFIX
MemoFollow.PK_HASH_LENGTH = MemoStateAction.PK_HASH_LENGTH

module.exports = MemoFollow

// mutate4javascript-manifest-begin
// {"version":1,"tested_at":"2026-09-04T18:27:18.336Z","module_hash":"cc36dc8387a54f50e91393bcb10382515e66a0cfc74fb4f51412fac4df580136","functions":[{"id":"func/followConfig","name":"followConfig","line":25,"end_line":35,"hash":"6843e108f72a95c18267d1ecea29fdfbdb0814ce4b5e3672f22df612e6ecaccd"},{"id":"func/MemoFollow.follow","name":"MemoFollow.follow","line":41,"end_line":43,"hash":"82635824a8e221e587b74b22fea454d2f661e599d8c9b9d0d7ec7c14e214cbd7"},{"id":"func/MemoFollow.unfollow","name":"MemoFollow.unfollow","line":46,"end_line":48,"hash":"fa99fa77d68a875092f5aad8323dca42de06dff49af469c6d7db94f7033399b5"}]}
// mutate4javascript-manifest-end
