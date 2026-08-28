/*
  Poll Vote Page behavior: compose and broadcast a Memo poll-vote action, with
  a byte counter that counts down from the comment limit.

  This is the testable controller behind the React poll vote composer. It wraps
  the Memo poll-vote behavior (src/services/memo-poll-vote.js).

  The memoPollVote and navigate concerns are injected so this module stays
  free of UI/network concerns; environmentally unsuitable I/O lives behind
  those small adapter boundaries.
*/

const PageController = require('./page-controller')
const MemoPollVote = require('./memo-poll-vote')

class PollVotePage extends PageController {
  constructor (deps = {}) {
    super(deps)
    this.memoPollVote = deps.memoPollVote || null
    this.voting = false
    this.validationCodes = ['poll_vote_validation', 'poll_vote_length']
  }

  // Bytes remaining for the vote comment.
  remainingCount () {
    if (!this.memoPollVote) {
      throw new Error('Poll vote page requires a memo poll vote handler.')
    }
    return MemoPollVote.MAX_COMMENT_BYTES - this._commentBytes()
  }

  _commentBytes () {
    return new TextEncoder().encode(this.input).length
  }

  // Set the in-flight flag.
  _setBusy (value) {
    this.voting = value
  }

  // Run the memo poll vote action for the current input.
  async _perform (input) {
    if (!this.memoPollVote) {
      throw new Error('Poll vote page requires a memo poll vote handler.')
    }
    return this.memoPollVote.vote(input)
  }
}

PollVotePage.MAX_COMMENT_BYTES = MemoPollVote.MAX_COMMENT_BYTES

module.exports = PollVotePage
