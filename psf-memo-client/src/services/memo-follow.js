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

const MemoAction = require('./memo-action')

const MEMO_FOLLOW_PREFIX = '6d06'
const MEMO_UNFOLLOW_PREFIX = '6d07'
const PK_HASH_LENGTH = 20

class MemoFollow extends MemoAction {
  static config = {
    prefix: MEMO_FOLLOW_PREFIX,
    walletRequiredMsg: 'Memo follow requires a wallet.',
    lengthMessage: 'Follow address is invalid.',
    emptyMessage: 'Follow address is required.',
    lengthCode: 'follow_validation',
    validationCode: 'follow_validation'
  }

  constructor (deps = {}) {
    super(deps)
    this.profiles = deps.profiles
  }

  // Validate a candidate cash address. Returns { ok: true } or throws a typed
  // validation error.
  validate (addr) {
    if (typeof addr !== 'string' || addr.trim().length === 0) {
      const err = new Error(this.emptyMessage)
      err.code = this.validationCode
      throw err
    }

    try {
      this._toHash160(addr)
      return { ok: true }
    } catch (err) {
      const validationErr = new Error(`Invalid cash address: ${addr}`)
      validationErr.code = this.validationCode
      throw validationErr
    }
  }

  // Broadcast a Memo follow for the given followee address.
  async follow (followeeAddr) {
    return this._broadcastAction(followeeAddr, MEMO_FOLLOW_PREFIX, true)
  }

  // Broadcast a Memo unfollow for the given followee address.
  async unfollow (followeeAddr) {
    return this._broadcastAction(followeeAddr, MEMO_UNFOLLOW_PREFIX, false)
  }

  // Internal: validate, broadcast, and reflect a follow/unfollow action.
  async _broadcastAction (followeeAddr, prefix, isFollow) {
    if (!this.wallet) {
      throw new Error(this.walletRequiredMsg)
    }
    this._ensureBchjs()

    this.validate(followeeAddr)

    await this.wallet.getUtxos()

    const hash160 = this._toHash160(followeeAddr)
    const raw = Buffer.from(hash160, 'hex')

    const txid = await this.wallet.sendOpReturn(raw, prefix)

    this.reflect(txid, followeeAddr, isFollow)

    return txid
  }

  // Convert a cash address to its 20-byte hash160 hex string using the wallet's
  // embedded bch-js.
  _toHash160 (addr) {
    return this.wallet.bchjs.Address.toHash160(addr)
  }

  _ensureBchjs () {
    if (!this.wallet.bchjs || typeof this.wallet.bchjs.Address.toHash160 !== 'function') {
      throw new Error('Wallet does not expose bch-js Address.toHash160.')
    }
  }

  // Record the new follow state on the injected profile store when it exposes
  // the follow methods.
  reflect (txid, followeeAddr, isFollow) {
    if (this.profiles && typeof this.profiles.setFollowState === 'function') {
      const myAddr = this.wallet?.walletInfo?.cashAddress
      this.profiles.setFollowState(myAddr, followeeAddr, isFollow)
    }
  }
}

MemoFollow.MEMO_FOLLOW_PREFIX = MEMO_FOLLOW_PREFIX
MemoFollow.MEMO_UNFOLLOW_PREFIX = MEMO_UNFOLLOW_PREFIX
MemoFollow.PK_HASH_LENGTH = PK_HASH_LENGTH

module.exports = MemoFollow
