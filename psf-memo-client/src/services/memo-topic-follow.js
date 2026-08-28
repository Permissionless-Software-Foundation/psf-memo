/*
  Memo topic follow/unfollow behavior: compose, validate, and broadcast a
  Memo topic follow (0x6d0d) or unfollow (0x6d0e) action.

  A topic follow transaction carries the topic name as plain UTF-8 text. No
  cashaddr conversion is needed.

  The wallet and an injected profile store are used so this module stays
  testable and free of UI/network concerns; environmentally unsuitable I/O
  lives behind those small adapter boundaries.

  Constants
    MEMO_TOPIC_FOLLOW_PREFIX   : hex prefix for the Memo "topic follow" action (0x6d0d)
    MEMO_TOPIC_UNFOLLOW_PREFIX : hex prefix for the Memo "topic unfollow" action (0x6d0e)
*/

const MEMO_TOPIC_FOLLOW_PREFIX = '6d0d'
const MEMO_TOPIC_UNFOLLOW_PREFIX = '6d0e'

class MemoTopicFollow {
  constructor (deps = {}) {
    this.wallet = deps.wallet
    this.profiles = deps.profiles
  }

  validate (room) {
    if (typeof room !== 'string' || room.trim().length === 0) {
      const err = new Error('Topic name is required.')
      err.code = 'topic_follow_validation'
      throw err
    }
  }

  async follow (room) {
    return this._broadcastAction(room, MEMO_TOPIC_FOLLOW_PREFIX, true)
  }

  async unfollow (room) {
    return this._broadcastAction(room, MEMO_TOPIC_UNFOLLOW_PREFIX, false)
  }

  async _broadcastAction (room, prefix, isFollowing) {
    if (!this.wallet) {
      throw new Error('Memo topic follow requires a wallet.')
    }

    this.validate(room)

    await this.wallet.getUtxos()

    const txid = await this.wallet.sendOpReturn(room, prefix)

    this.reflect(txid, room, isFollowing)

    return txid
  }

  reflect (txid, room, isFollowing) {
    if (this.profiles && typeof this.profiles.setTopicFollowState === 'function') {
      const myAddr = this.wallet?.walletInfo?.cashAddress
      this.profiles.setTopicFollowState(myAddr, room, isFollowing)
    }
  }
}

MemoTopicFollow.MEMO_TOPIC_FOLLOW_PREFIX = MEMO_TOPIC_FOLLOW_PREFIX
MemoTopicFollow.MEMO_TOPIC_UNFOLLOW_PREFIX = MEMO_TOPIC_UNFOLLOW_PREFIX

module.exports = MemoTopicFollow
