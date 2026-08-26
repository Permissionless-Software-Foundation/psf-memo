/*
  Memo like/tip behavior: compose, validate, and broadcast a Memo "like"
  action with an optional tip.

  A Memo like is an OP_RETURN Bitcoin Cash transaction carrying the Memo like
  protocol prefix (0x6d04) followed by the liked post transaction hash (32
  bytes). When the user adds a tip, an additional P2PKH output sending the tip
  amount to the post author's address is included in the same transaction.

  Broadcasting is done through a wallet that exposes the minimal-slp-wallet
  adapter surface (walletInfo, getUtxos(), sendOpReturn(msg, prefix, bchOutput)).

  The wallet and feed are injected so this module stays testable and free of
  network/UI concerns; environmentally unsuitable I/O lives behind those small
  adapter boundaries.

  Constants
    MEMO_LIKE_PREFIX  : hex prefix for the Memo "like" action (0x6d04)
    DUST_LIMIT_SATS   : minimum wallet balance required to broadcast a like (3000 sats)
    DUST_TIP_SATS     : smallest non-dust tip output (600 sats)
    MAX_TIP_SATS      : sanity maximum for a single tip (100000000 sats = 1 BCH)
    PARENT_TXID_BYTES : liked post txid size in bytes (32)
*/

const MemoAction = require('./memo-action')
const { hexToBytes } = require('./hex')

const MEMO_LIKE_PREFIX = '6d04'
const DUST_LIMIT_SATS = 3000
const DUST_TIP_SATS = 600
const MAX_TIP_SATS = 100000000
const PARENT_TXID_BYTES = 32

class MemoLike extends MemoAction {
  static config = {
    prefix: MEMO_LIKE_PREFIX,
    walletRequiredMsg: 'Memo like requires a wallet.',
    lengthMessage: 'Post txid must be a 64-character hex string.',
    emptyMessage: 'Post txid must be a 64-character hex string.',
    lengthCode: 'like_validation',
    validationCode: 'like_validation'
  }

  constructor (deps = {}) {
    super(deps)
    this.feed = deps.feed
    this.dustLimit = deps.dustLimit || DUST_LIMIT_SATS
    this.dustTipSats = deps.dustTipSats || DUST_TIP_SATS
    this.maxTip = deps.maxTip || MAX_TIP_SATS
  }

  // Validate a candidate post txid.
  // Returns { ok: true } or throws a typed validation error.
  validate (postTxid) {
    try {
      hexToBytes(postTxid, PARENT_TXID_BYTES, 'Post txid')
      return { ok: true }
    } catch (err) {
      const validationErr = new Error(err.message)
      validationErr.code = this.validationCode
      throw validationErr
    }
  }

  // Validate an optional tip amount against the dust limit, hard maximum, and
  // the wallet's spendable balance.
  validateTip (tipSats, spendableSats) {
    this._validateTipAmount(tipSats)

    if (tipSats > spendableSats) {
      const err = new Error('Tip exceeds the spendable balance.')
      err.code = 'like_balance'
      throw err
    }

    return { ok: true }
  }

  // Validate the tip amount's integer-ness, dust floor, and hard maximum.
  _validateTipAmount (tipSats) {
    if (!Number.isInteger(tipSats) || tipSats < 0) {
      const err = new Error('Tip must be a valid number of satoshis.')
      err.code = 'like_validation'
      throw err
    }

    if (tipSats > 0 && tipSats < this.dustTipSats) {
      const err = new Error(`Tip is below the dust limit of ${this.dustTipSats} sats.`)
      err.code = 'like_dust'
      throw err
    }

    if (tipSats > this.maxTip) {
      const err = new Error(`Tip exceeds the maximum of ${this.maxTip} sats.`)
      err.code = 'like_maximum'
      throw err
    }
  }

  // Sum the wallet's spendable UTXOs. Tolerates the common value field names
  // used by different wallet adapters.
  getSpendableSats () {
    if (!this.wallet) return 0
    // minimal-slp-wallet exposes wallet.utxos as a UtxoStore object whose
    // spendable BCH outputs live under utxoStore.bchUtxos, while the test and
    // acceptance wallets use a plain array. Accept both shapes.
    const utxos = Array.isArray(this.wallet.utxos)
      ? this.wallet.utxos
      : (this.wallet.utxos?.utxoStore?.bchUtxos || [])
    return utxos.reduce((sum, u) => {
      const value = u.value ?? u.satoshis ?? u.amount ?? 0
      return sum + value
    }, 0)
  }

  // Compose and broadcast a Memo like for the given post txid.
  // tipSats is optional (defaults to 0). authorAddress is required when
  // tipSats is greater than 0.
  // Resolves with the transaction id, or rejects with a typed error.
  async like (postTxid, tipSats = 0, authorAddress = '') {
    this.validate(postTxid)

    if (!this.wallet) {
      throw new Error(this.walletRequiredMsg)
    }

    await this.wallet.getUtxos()

    const spendable = this.getSpendableSats()
    if (spendable < this.dustLimit) {
      const err = new Error('add BCH to your wallet before liking a post.')
      err.code = 'like_empty_balance'
      throw err
    }

    this.validateTip(tipSats, spendable)
    this._requireTipAddress(tipSats, authorAddress)

    const raw = hexToBytes(postTxid, PARENT_TXID_BYTES, 'Post txid')
    const bchOutput = this._buildTipOutput(tipSats, authorAddress)

    const txid = await this.wallet.sendOpReturn(raw, this.prefix, bchOutput)

    this.reflect(txid, postTxid, tipSats)

    return txid
  }

  // Record the new like on the injected feed when one is present.
  reflect (txid, postTxid, tipSats) {
    this._notifyFeed(txid, postTxid, tipSats)
    this._incrementPostCount(postTxid)
  }

  // Require an author address whenever a tip is present.
  _requireTipAddress (tipSats, authorAddress) {
    if (tipSats <= 0) return
    if (typeof authorAddress === 'string' && authorAddress.length > 0) return
    const err = new Error('Tip requires an author address.')
    err.code = 'like_validation'
    throw err
  }

  // Build the optional BCH tip output for the transaction.
  _buildTipOutput (tipSats, authorAddress) {
    return tipSats > 0
      ? [{ address: authorAddress, amountSat: tipSats }]
      : []
  }

  // Notify the feed store of the new like when it exposes addLike.
  _notifyFeed (txid, postTxid, tipSats) {
    if (this.feed && typeof this.feed.addLike === 'function') {
      this.feed.addLike({
        txid,
        postTxid,
        address: this.wallet.walletInfo.cashAddress,
        tipSats
      })
    }
  }

  // Increment the liked post's counter on the feed store when it is present.
  _incrementPostCount (postTxid) {
    if (!this.feed || !Array.isArray(this.feed.posts)) return
    const post = this.feed.posts.find((p) => p.txid === postTxid)
    if (post) {
      post.likeCount = (post.likeCount || 0) + 1
    }
  }
}

MemoLike.MEMO_LIKE_PREFIX = MEMO_LIKE_PREFIX
MemoLike.DUST_LIMIT_SATS = DUST_LIMIT_SATS
MemoLike.DUST_TIP_SATS = DUST_TIP_SATS
MemoLike.MAX_TIP_SATS = MAX_TIP_SATS

module.exports = MemoLike

// mutate4javascript-manifest-begin
// {"version":1,"tested_at":"2026-08-26T13:36:49.209Z","module_hash":"f27440db63274125b6b03bafd66222b31966670d8956b865e0bf2c695aacb54b","functions":[{"id":"func/MemoLike.constructor","name":"MemoLike.constructor","line":42,"end_line":47,"hash":"6ebbf231548843e23238988fde00cca861fd89513abba00febba964f3ef32365"},{"id":"func/MemoLike.validate","name":"MemoLike.validate","line":51,"end_line":60,"hash":"d9267f14ac52c7aa3afc07333b621c5faa751efa217bf02ae7695bb640827d44"},{"id":"func/MemoLike.validateTip","name":"MemoLike.validateTip","line":64,"end_line":74,"hash":"504b41cfa8db9754d31b0698550f9fe791d005c5b44bd30ec380202f1df11d6f"},{"id":"func/MemoLike._validateTipAmount","name":"MemoLike._validateTipAmount","line":77,"end_line":95,"hash":"98483bcf6212c2e0a2400d4da1b667b9f1c017a06ee6e4f282ccdf71cb8e397a"},{"id":"func/MemoLike.getSpendableSats","name":"MemoLike.getSpendableSats","line":99,"end_line":106,"hash":"7790154b7489758e6254cc7be00802fde237a33e0bb1440a2da33d303a2bdbe7"},{"id":"func/MemoLike.like","name":"MemoLike.like","line":112,"end_line":139,"hash":"5a748442d77446643448f1835b5e546569524af642af6be7c338e33ca4901051"},{"id":"func/MemoLike.reflect","name":"MemoLike.reflect","line":142,"end_line":145,"hash":"b159b912ba5b88468e5bfb7458385edc932850fe43948f3028e8ed9fea7269e9"},{"id":"func/MemoLike._requireTipAddress","name":"MemoLike._requireTipAddress","line":148,"end_line":154,"hash":"3b838a583b14112523e2cbe856a63896b1045a1ad91dac500e38693332b7c890"},{"id":"func/MemoLike._buildTipOutput","name":"MemoLike._buildTipOutput","line":157,"end_line":161,"hash":"e2a602c0afa9730dee67497869c4d18ed75708f6503d68fb1f0c0ba596826b5a"},{"id":"func/MemoLike._notifyFeed","name":"MemoLike._notifyFeed","line":164,"end_line":173,"hash":"bfc0e888ee106e21ee73146e92ebd3e4ce41d2ed8595a1539f823dc6c8f31d06"},{"id":"func/MemoLike._incrementPostCount","name":"MemoLike._incrementPostCount","line":176,"end_line":182,"hash":"61ae383f836b64a7aeabaf0d04e50ac9a24b87f726d5d6afac5f5585cdc6031c"}]}
// mutate4javascript-manifest-end
