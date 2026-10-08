/*
  New Topic Page behavior: compose and broadcast the first message of a new
  Memo topic, then land on that topic's feed.

  This is the testable controller behind the React "New Topic" page. Creating a
  topic is the same on-chain action as posting to a topic, so the page reuses
  the Memo topic-message behavior (src/services/memo-topic-post.js, prefix
  0x6d0c) with the room derived from the typed topic name. The name is
  normalized by trimming whitespace, stripping a leading '#', and lowercasing.

  The wallet, feed, and navigate concerns are injected so this module stays free
  of UI/network concerns; environmentally unsuitable I/O lives behind those
  small adapter boundaries.
*/

const PageController = require('./page-controller')
const MemoTopicPost = require('./memo-topic-post')
const TopicFeedPage = require('./topic-feed-page')
const { byteLength } = require('./utf8')

const NEW_TOPIC_PATH = '/topics/new'
const TOPIC_NAME_VALIDATION_CODE = 'topic_name_validation'

class NewTopicPage extends PageController {
  constructor (deps = {}) {
    super(deps)
    this.wallet = deps.wallet || null
    this.feed = deps.feed || null
    this.memoTopicPostFactory = deps.memoTopicPostFactory ||
      ((room) => new MemoTopicPost({ wallet: this.wallet, room, feed: this.feed }))
    this.topicName = ''
    this.firstMessage = ''
    this.normalizedRoom = ''
    this.broadcasting = false
    this.successPath = null
    this.validationCodes = [
      TOPIC_NAME_VALIDATION_CODE,
      MemoTopicPost.config.validationCode,
      MemoTopicPost.config.lengthCode
    ]
  }

  // Set the typed topic name.
  setTopicName (text) {
    this.topicName = typeof text === 'string' ? text : ''
    return this
  }

  // Set the typed first message.
  setFirstMessage (text) {
    this.firstMessage = typeof text === 'string' ? text : ''
    return this
  }

  // Normalize a typed topic name into its room: trim, strip a leading '#', and
  // lowercase so "#Cash", " cash", and "Cash" all address the same room.
  normalizeRoom (name = this.topicName) {
    return String(name).trim().replace(/^#+/, '').toLowerCase()
  }

  // Bytes remaining before the combined room + first message limit is reached.
  remainingCount () {
    return MemoTopicPost.MAX_TOPIC_MESSAGE_BYTES - byteLength(this.normalizeRoom()) - byteLength(this.firstMessage)
  }

  // The page always offers both fields.
  hasTopicNameField () {
    return true
  }

  hasFirstMessageField () {
    return true
  }

  // Set the in-flight flag.
  _setBusy (value) {
    this.broadcasting = value
  }

  // A new topic needs a non-empty room once the typed name is normalized.
  _validateRoom (room) {
    if (!room) {
      const err = new Error('Topic name must not be empty.')
      err.code = TOPIC_NAME_VALIDATION_CODE
      throw err
    }
  }

  // Validate the room, broadcast its first message, and navigate to the new
  // topic's feed on success.
  async submit () {
    this._setBusy(true)
    this.submitError = null
    this.broadcastError = null

    const room = this.normalizeRoom()
    this.normalizedRoom = room

    try {
      this._validateRoom(room)
      const action = this.memoTopicPostFactory(room)
      const txid = await action.post(this.firstMessage)
      this.successPath = TopicFeedPage.topicFeedPath(room)
      this.navigate(this.successPath)
      this._setBusy(false)
      return { ok: true, txid, room }
    } catch (err) {
      return this._handleSubmitFailure(err)
    }
  }
}

NewTopicPage.NEW_TOPIC_PATH = NEW_TOPIC_PATH
NewTopicPage.TOPIC_NAME_VALIDATION_CODE = TOPIC_NAME_VALIDATION_CODE
NewTopicPage.MAX_TOPIC_MESSAGE_BYTES = MemoTopicPost.MAX_TOPIC_MESSAGE_BYTES

module.exports = NewTopicPage
