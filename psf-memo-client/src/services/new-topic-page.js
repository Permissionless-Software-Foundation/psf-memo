/*
  New Topic Page behavior: compose and broadcast the first message of a new
  Memo topic, then land on that topic's feed.

  This is the testable controller behind the React "New Topic" page. Creating a
  topic is the same on-chain action as posting to a topic, so the page reuses
  the Memo topic-message behavior (src/services/memo-topic-post.js, prefix
  0x6d0c) with the room derived from the typed topic name. The name is
  normalized by trimming whitespace, removing a leading run of '#' and
  whitespace, and lowercasing.

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

  // Normalize a typed topic name into its room: trim surrounding whitespace,
  // remove a leading run of '#' and whitespace, and lowercase so "# bitcoin",
  // "##BCH", and "Cash" all address the same room.
  normalizeRoom (name = this.topicName) {
    return String(name).trim().replace(/^[#\s]+/, '').toLowerCase()
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

  // Run the topic-message action for the current first message. The shared
  // PageController.submit owns the in-flight flag, error classification, and
  // navigation; this records the normalized room and the success path.
  async _perform () {
    const room = this.normalizeRoom()
    this.normalizedRoom = room
    this._validateRoom(room)
    const action = this.memoTopicPostFactory(room)
    const txid = await action.post(this.firstMessage)
    this.successPath = TopicFeedPage.topicFeedPath(room)
    return txid
  }

  // Submit the new topic and, on success, include the normalized room in the
  // result so callers do not have to re-read the page state.
  async submit () {
    const result = await super.submit()
    if (result.ok) result.room = this.normalizedRoom
    return result
  }
}

NewTopicPage.NEW_TOPIC_PATH = NEW_TOPIC_PATH
NewTopicPage.TOPIC_NAME_VALIDATION_CODE = TOPIC_NAME_VALIDATION_CODE
NewTopicPage.MAX_TOPIC_MESSAGE_BYTES = MemoTopicPost.MAX_TOPIC_MESSAGE_BYTES

module.exports = NewTopicPage

// mutate4javascript-manifest-begin
// {"version":1,"tested_at":"2026-10-08T17:32:19.319Z","module_hash":"8d5002542a417d3db71a6fa249426ddfc886861c859985477ad3cc399ded0a28","functions":[{"id":"func/NewTopicPage.constructor","name":"NewTopicPage.constructor","line":25,"end_line":41,"hash":"82a915bcbd055919591699561c5b23cb94d3c552ecfec0b47ea09732ab1fc076"},{"id":"func/NewTopicPage.setTopicName","name":"NewTopicPage.setTopicName","line":44,"end_line":47,"hash":"c9852ffdfb88ef4830be668fda7472544a3bc189cb64e2b1019743067a6e4597"},{"id":"func/NewTopicPage.setFirstMessage","name":"NewTopicPage.setFirstMessage","line":50,"end_line":53,"hash":"4334f27b2c34c0a511e6098fe26972dfd5e2095ff1d5a230673e2613b83586cd"},{"id":"func/NewTopicPage.normalizeRoom","name":"NewTopicPage.normalizeRoom","line":57,"end_line":59,"hash":"5b529afd5f6ba07d60d58bbc32b21fff0bd8eacbf1c7280a1b2b620c7ba54a11"},{"id":"func/NewTopicPage.remainingCount","name":"NewTopicPage.remainingCount","line":62,"end_line":64,"hash":"e1c62aa713a4c59076039ef0e89dac1a58257cd85e363d0c430a10455445620b"},{"id":"func/NewTopicPage.hasTopicNameField","name":"NewTopicPage.hasTopicNameField","line":67,"end_line":69,"hash":"22f164a7ac96cf409c9575fec5d80f1edc6b6a56dc41004f39e6dab1354ad91b"},{"id":"func/NewTopicPage.hasFirstMessageField","name":"NewTopicPage.hasFirstMessageField","line":71,"end_line":73,"hash":"8e79e46b7f3c2a85329228066c9a1fd8ecff89126606ebc36384d58c3d918660"},{"id":"func/NewTopicPage._setBusy","name":"NewTopicPage._setBusy","line":76,"end_line":78,"hash":"65a1b9fb30398df09f5c3b01c7106f52f735d37398d49137e65482daf8c3ffa8"},{"id":"func/NewTopicPage._validateRoom","name":"NewTopicPage._validateRoom","line":81,"end_line":87,"hash":"15faac75c1a5590c7dfc568699b9f59ac069ff1c7844a8b182b2b21595f7ea27"},{"id":"func/NewTopicPage._perform","name":"NewTopicPage._perform","line":92,"end_line":100,"hash":"2da0a76c9a448715e31b7a29322da4ebf17b0f81d7b60070e7cbb12353bebdfd"},{"id":"func/NewTopicPage.submit","name":"NewTopicPage.submit","line":104,"end_line":108,"hash":"d64e764b76dec3a6e87dbba21f6cab682632874f203d495ea9285ecf2bd5e0b8"}]}
// mutate4javascript-manifest-end
