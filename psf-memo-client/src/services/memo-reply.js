/*
  Memo reply behavior: compose, validate, and broadcast a Memo "reply" message.

  A Memo reply is an OP_RETURN Bitcoin Cash transaction carrying the Memo reply
  protocol prefix (0x6d03) followed by the parent transaction hash (32 bytes)
  and the reply message text. Broadcasting is done through a wallet that
  exposes the minimal-slp-wallet adapter surface (walletInfo, getUtxos(),
  sendOpReturn()).

  The wallet and thread are injected so this module stays testable and free of
  network/UI concerns; environmentally unsuitable I/O lives behind those small
  adapter boundaries.

  Constants
    MEMO_REPLY_PREFIX : hex prefix for the Memo "reply" action (0x6d03)
    MAX_REPLY_BYTES   : maximum allowed reply text length (184 bytes)
*/

const MemoAction = require('./memo-action')
const { byteLength } = require('./utf8')
const { hexToBytes } = require('./hex')

const MEMO_REPLY_PREFIX = '6d03'
const MAX_REPLY_BYTES = 184
const PARENT_TXID_BYTES = 32

class MemoReply extends MemoAction {
  static config = {
    prefix: MEMO_REPLY_PREFIX,
    walletRequiredMsg: 'Memo reply requires a wallet.',
    lengthMessage: `Reply is too long. Maximum is ${MAX_REPLY_BYTES} bytes.`,
    emptyMessage: 'Reply must not be empty.',
    lengthCode: 'reply_length',
    validationCode: 'reply_validation'
  }

  constructor (deps = {}) {
    super(deps)
    this.thread = deps.thread
  }

  // A reply is over-length when its UTF-8 byte count exceeds the limit.
  isTooLong (message) {
    return byteLength(message) > MAX_REPLY_BYTES
  }

  // Compose and broadcast a Memo reply for the given message and parent txid.
  // Resolves with the transaction id, or rejects with a typed error.
  async reply (message, parentTxid) {
    const check = this.validate(message)
    this._throwIfInvalid(check)

    if (!this.wallet) {
      throw new Error(this.walletRequiredMsg)
    }

    // Refresh the wallet's spendable UTXO store so the broadcast has inputs.
    await this.wallet.getUtxos()

    // Build the raw payload: parent txid bytes followed by UTF-8 message bytes.
    const raw = buildReplyPayload(parentTxid, message)
    const txid = await this.wallet.sendOpReturn(raw, this.prefix)

    // Reflect the result on the injected thread once broadcast succeeds.
    this.reflect(txid, message, parentTxid)

    return txid
  }

  // Record the new reply on the injected thread store when one is present.
  reflect (txid, message, parentTxid) {
    if (this.thread && typeof this.thread.addReply === 'function') {
      this.thread.addReply({
        txid,
        address: this.wallet.walletInfo.cashAddress,
        text: message,
        parentTxid
      })
    }
  }
}

// Build the raw OP_RETURN message payload for a reply.
// The protocol wire format is: <parent txid 32 bytes><reply text UTF-8 bytes>.
function buildReplyPayload (parentTxid, message) {
  const parentBytes = hexToBytes(parentTxid, PARENT_TXID_BYTES, 'Parent txid')
  const textBytes = new TextEncoder().encode(message)
  const raw = new Uint8Array(parentBytes.length + textBytes.length)
  raw.set(parentBytes, 0)
  raw.set(textBytes, parentBytes.length)
  return raw
}

MemoReply.MEMO_REPLY_PREFIX = MEMO_REPLY_PREFIX
MemoReply.MAX_REPLY_BYTES = MAX_REPLY_BYTES

module.exports = MemoReply

// mutate4javascript-manifest-begin
// {"version":1,"tested_at":"2026-08-26T12:18:17.625Z","module_hash":"3eb068f9f90f27c5d7acf2bb5a6c517d1085bcb379123ca2d7134d4fb48a092b","functions":[{"id":"func/MemoReply.constructor","name":"MemoReply.constructor","line":36,"end_line":39,"hash":"23091c1b8f7847199bab3b54d8d81e9d8432c6da96138d72ac03fcf9426d542c"},{"id":"func/MemoReply.isTooLong","name":"MemoReply.isTooLong","line":42,"end_line":44,"hash":"2e867501d184010313ba9b27a6bb1e446df8f093514ee231b90ce77699ecbaf2"},{"id":"func/MemoReply.reply","name":"MemoReply.reply","line":48,"end_line":67,"hash":"2d7b425e350b640caf6ca821146065e9c21fe56f1e8a9d8b1f6cab5504a523c1"},{"id":"func/MemoReply.reflect","name":"MemoReply.reflect","line":70,"end_line":79,"hash":"344e1bf304a4dfd475b02824b7ddbf555da0f3ec89f73b4f6009cf0bf097fb02"},{"id":"func/buildReplyPayload","name":"buildReplyPayload","line":84,"end_line":91,"hash":"ef9ee77938593f1dbf2d168c20ea4f8dee0300f64f0fdb4f06a4ba647bb782d5"},{"id":"func/hexToBytes","name":"hexToBytes","line":94,"end_line":107,"hash":"29b401020452eabcb1b54634029d8015758b77b536be3d1ed508e9d560ac93b1"}]}
// mutate4javascript-manifest-end
