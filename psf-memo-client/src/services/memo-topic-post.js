/*
  Memo topic message behavior: compose, validate, and broadcast a Memo
  topic message (0x6d0c).

  A topic message transaction carries the Memo topic-message protocol prefix
  followed by the topic name and message bytes. The combined topic name plus
  message must not exceed MAX_TOPIC_MESSAGE_BYTES.

  The wallet and an injected feed store are used so this module stays
  testable and free of UI/network concerns; environmentally unsuitable I/O
  lives behind those small adapter boundaries.

  Constants
    MEMO_TOPIC_MESSAGE_PREFIX : hex prefix for the Memo topic message action (0x6d0c)
    MAX_TOPIC_MESSAGE_BYTES   : maximum combined topic + message bytes (214)
*/

const MemoAction = require('./memo-action')
const { byteLength } = require('./utf8')

const MEMO_TOPIC_MESSAGE_PREFIX = '6d0c'
const MAX_TOPIC_MESSAGE_BYTES = 214

class MemoTopicPost extends MemoAction {
  static config = {
    prefix: MEMO_TOPIC_MESSAGE_PREFIX,
    walletRequiredMsg: 'Memo topic post requires a wallet.',
    lengthMessage: `Topic message is too long. Maximum is ${MAX_TOPIC_MESSAGE_BYTES} bytes.`,
    emptyMessage: 'Topic message must not be empty.',
    lengthCode: 'topic_post_length',
    validationCode: 'topic_post_validation'
  }

  constructor (deps = {}) {
    super(deps)
    this.room = deps.room || ''
    this.feed = deps.feed || null
  }

  // A topic message is over-length when the topic name plus the message
  // exceed the combined byte budget.
  isTooLong (message) {
    return byteLength(this.room) + byteLength(message) > MAX_TOPIC_MESSAGE_BYTES
  }

  remainingBytes (message) {
    return MAX_TOPIC_MESSAGE_BYTES - byteLength(this.room) - byteLength(message)
  }

  // Compose and broadcast a Memo topic message for the given message.
  async post (message) {
    const check = this.validate(message)
    this._throwIfInvalid(check)

    if (!this.wallet) {
      throw new Error(this.walletRequiredMsg)
    }

    await this.wallet.getUtxos()

    const payload = this.room + message
    const txid = await this.wallet.sendOpReturn(payload, this.prefix)

    this.reflect(txid, message)

    return txid
  }

  // Record the new topic post on the injected feed when one is present.
  reflect (txid, message) {
    if (this.feed && typeof this.feed.addPost === 'function') {
      this.feed.addPost({
        txid,
        address: this.wallet.walletInfo.cashAddress,
        text: message,
        room: this.room
      })
    }
  }
}

MemoTopicPost.MEMO_TOPIC_MESSAGE_PREFIX = MEMO_TOPIC_MESSAGE_PREFIX
MemoTopicPost.MAX_TOPIC_MESSAGE_BYTES = MAX_TOPIC_MESSAGE_BYTES

module.exports = MemoTopicPost
