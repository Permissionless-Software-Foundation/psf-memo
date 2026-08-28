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

// mutate4javascript-manifest-begin
// {"version":1,"tested_at":"2026-08-28T18:19:01.010Z","module_hash":"f6fd04a72273df34505b97c8f790bba83a2d379d8325267f7904e3826749c686","functions":[{"id":"func/MemoTopicFollow.constructor","name":"MemoTopicFollow.constructor","line":21,"end_line":24,"hash":"dd4ee8221c4d849937d901f6383138aefe615763747cc6dab059db9291843b72"},{"id":"func/MemoTopicFollow.validate","name":"MemoTopicFollow.validate","line":26,"end_line":32,"hash":"e8392594d65c9a31e79a52afcdf92a0ddf111296cf24fa108b16d236405c61d4"},{"id":"func/MemoTopicFollow.follow","name":"MemoTopicFollow.follow","line":34,"end_line":36,"hash":"3a066e2f12efb2ec54f642e11d1eefd4e55d733589fe8266d9de8b3c6651265f"},{"id":"func/MemoTopicFollow.unfollow","name":"MemoTopicFollow.unfollow","line":38,"end_line":40,"hash":"cc714d188e5ba49eee63e0dda84a4ebc205af4ee783c346b647f5ac6645d90a2"},{"id":"func/MemoTopicFollow._broadcastAction","name":"MemoTopicFollow._broadcastAction","line":42,"end_line":56,"hash":"d191f210d5505f9bbb29c74fd02afe91f037a6e9c13a9514a4203a40cd28ff5f"},{"id":"func/MemoTopicFollow.reflect","name":"MemoTopicFollow.reflect","line":58,"end_line":63,"hash":"8f8ef1f3a088f66698f261e25e9b76243355bb02ec50334a37c799e3348b99ba"}]}
// mutate4javascript-manifest-end
