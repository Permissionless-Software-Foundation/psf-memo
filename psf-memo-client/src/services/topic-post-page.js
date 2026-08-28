/*
  Topic Post Page behavior: compose and broadcast a Memo topic message, with
  a byte counter that counts down from the combined topic limit.

  This is the testable controller behind the topic message composer on the
  React "Topic Feed" page. It wraps the Memo topic-post behavior
  (src/services/memo-topic-post.js) and adds page-level concerns: holding the
  current input, computing the remaining byte count, surfacing
  validation/length errors, and refreshing the topic feed after a successful
  post.

  The memoTopicPost and navigate concerns are injected so this module stays
  free of UI/network concerns; environmentally unsuitable I/O lives behind
  those small adapter boundaries.
*/

const PageController = require('./page-controller')
const MemoTopicPost = require('./memo-topic-post')

class TopicPostPage extends PageController {
  constructor (deps = {}) {
    super(deps)
    this.memoTopicPost = deps.memoTopicPost || null
    this.postingTopic = false
    this.validationCodes = ['topic_post_validation', 'topic_post_length']
  }

  // Bytes remaining for the message given the topic name.
  remainingCount () {
    if (!this.memoTopicPost) {
      throw new Error('Topic post page requires a memo topic post handler.')
    }
    return this.memoTopicPost.remainingBytes(this.input)
  }

  // Set the in-flight flag.
  _setBusy (value) {
    this.postingTopic = value
  }

  // Run the memo topic post action for the current input.
  async _perform (input) {
    if (!this.memoTopicPost) {
      throw new Error('Topic post page requires a memo topic post handler.')
    }
    return this.memoTopicPost.post(input)
  }
}

TopicPostPage.MAX_TOPIC_MESSAGE_BYTES = MemoTopicPost.MAX_TOPIC_MESSAGE_BYTES

module.exports = TopicPostPage
