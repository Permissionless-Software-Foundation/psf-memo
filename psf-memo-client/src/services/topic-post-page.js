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

// mutate4javascript-manifest-begin
// {"version":1,"tested_at":"2026-08-28T18:20:31.541Z","module_hash":"34b7d1b6936611010fd664764742b2d395db9b9c23699dc7ae0e938230d74847","functions":[{"id":"func/TopicPostPage.constructor","name":"TopicPostPage.constructor","line":21,"end_line":26,"hash":"a93d04b51599074b2e2aa3c85dda465e77fec20b43c73c76c3e153e98bdc1366"},{"id":"func/TopicPostPage.remainingCount","name":"TopicPostPage.remainingCount","line":29,"end_line":34,"hash":"e289a1a02748206cfb0967677fcff1ab92f2ceede8c6727d9b203538298e92e2"},{"id":"func/TopicPostPage._setBusy","name":"TopicPostPage._setBusy","line":37,"end_line":39,"hash":"4cc342945de59ccc4284e845c45fbd4c78508638c30fda621892d5554da2c985"},{"id":"func/TopicPostPage._perform","name":"TopicPostPage._perform","line":42,"end_line":47,"hash":"5900159e55ddb681034e06db3ec42e2e00d80cf99148f2bc99e15c766794fd7a"}]}
// mutate4javascript-manifest-end
