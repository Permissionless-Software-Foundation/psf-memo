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

// mutate4javascript-manifest-begin
// {"version":1,"tested_at":"2026-08-27T17:51:36.253Z","module_hash":"fc0d7db2a5f7872ae0d9228a19c7314b4f46f7574c53b2a168a62b986c43a31e","functions":[{"id":"func/MemoFollow.constructor","name":"MemoFollow.constructor","line":35,"end_line":38,"hash":"9407b43605444074011b1da595c9d53356352c72b0d847e00365d79ad705663a"},{"id":"func/MemoFollow.validate","name":"MemoFollow.validate","line":42,"end_line":57,"hash":"4154af442c36324ba147dff352c55610397fb430c9b62fbbe44728ab0e379179"},{"id":"func/MemoFollow.follow","name":"MemoFollow.follow","line":60,"end_line":62,"hash":"e24f69ef420d1ef625c2d03eae6014c824fdb35438a87e379fdc41747bbd321d"},{"id":"func/MemoFollow.unfollow","name":"MemoFollow.unfollow","line":65,"end_line":67,"hash":"48e93e85645bbcd767467afb807625b4adf6d6076f02fc841c91f58147bb44c7"},{"id":"func/MemoFollow._broadcastAction","name":"MemoFollow._broadcastAction","line":70,"end_line":88,"hash":"3720e2b6d78265383728bd7c5fcafeb018fad9c17a8bede12a6d4ffc3415cd3a"},{"id":"func/MemoFollow._toHash160","name":"MemoFollow._toHash160","line":92,"end_line":94,"hash":"3ed2ba4853b718a8316345c9f988ed3bed3ef647de3fd9761ee3c9e0bee86070"},{"id":"func/MemoFollow._ensureBchjs","name":"MemoFollow._ensureBchjs","line":96,"end_line":100,"hash":"92828d9038c9a4d367e80edd7f129291e434d57aae80b332081a66af9896a5d6"},{"id":"func/MemoFollow.reflect","name":"MemoFollow.reflect","line":104,"end_line":109,"hash":"af3f0ead1a9f51724e3c252122b3bf13c5323a3b9da244dee87a34815a90c94c"}]}
// mutate4javascript-manifest-end
