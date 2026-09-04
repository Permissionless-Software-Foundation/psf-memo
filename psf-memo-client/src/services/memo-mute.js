/*
  Memo mute/unmute behavior: compose, validate, and broadcast a Memo
  mute (0x6d16) or unmute (0x6d17) action.

  A mute transaction carries the mutee's 20-byte hash160. The cash
  address is converted with the wallet's embedded bch-js Address.toHash160()
  so no separate cashaddr dependency is needed.

  The wallet and an injected profile store are used so this module stays
  testable and free of UI/network concerns; environmentally unsuitable I/O
  lives behind those small adapter boundaries.

  Constants
    MEMO_MUTE_PREFIX   : hex prefix for the Memo "mute" action (0x6d16)
    MEMO_UNMUTE_PREFIX : hex prefix for the Memo "unmute" action (0x6d17)
    PK_HASH_LENGTH     : size of the mutee hash160 in bytes (20)
*/

const MemoStateAction = require('./memo-state-action')

const MEMO_MUTE_PREFIX = '6d16'
const MEMO_UNMUTE_PREFIX = '6d17'

// Compose the static config for this Memo state action.
function muteConfig () {
  return {
    prefix: MEMO_MUTE_PREFIX,
    walletRequiredMsg: 'Memo mute requires a wallet.',
    lengthMessage: 'Mute address is invalid.',
    emptyMessage: 'Mute address is required.',
    lengthCode: 'mute_validation',
    validationCode: 'mute_validation',
    reflectMethod: 'setMuteState'
  }
}

class MemoMute extends MemoStateAction {
  static config = muteConfig()

  // Broadcast a Memo mute for the given mutee address.
  async mute (muteeAddr) {
    return this._setState(muteeAddr, MEMO_MUTE_PREFIX, true)
  }

  // Broadcast a Memo unmute for the given mutee address.
  async unmute (muteeAddr) {
    return this._setState(muteeAddr, MEMO_UNMUTE_PREFIX, false)
  }
}

MemoMute.MEMO_MUTE_PREFIX = MEMO_MUTE_PREFIX
MemoMute.MEMO_UNMUTE_PREFIX = MEMO_UNMUTE_PREFIX
MemoMute.PK_HASH_LENGTH = MemoStateAction.PK_HASH_LENGTH

module.exports = MemoMute

// mutate4javascript-manifest-begin
// {"version":1,"tested_at":"2026-09-04T18:22:55.701Z","module_hash":"05cb4f14173db9584533e58f931d775a2505d844f53bd29724935c3de083c40b","functions":[{"id":"func/muteConfig","name":"muteConfig","line":25,"end_line":35,"hash":"f05b5b03c441735322cdb433417ae5351626ed4c7d1db0a94cbf350f6818a605"},{"id":"func/MemoMute.mute","name":"MemoMute.mute","line":41,"end_line":43,"hash":"ad4c0ae3933e732017a59814bc6b9f6e7d263669f59440f1010209403ce0066f"},{"id":"func/MemoMute.unmute","name":"MemoMute.unmute","line":46,"end_line":48,"hash":"758b2676537ce5861f94ca9efff5b98a946bd82c023964e4d0c40f90d0a1261a"}]}
// mutate4javascript-manifest-end
