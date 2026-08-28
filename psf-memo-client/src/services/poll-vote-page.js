/*
  Poll Vote Page behavior: compose and broadcast a Memo poll-vote action, with
  a byte counter that counts down from the comment limit.

  This is the testable controller behind the React poll vote composer. It
  wraps the Memo poll-vote behavior (src/services/memo-poll-vote.js) through
  the shared PollActionPage base.

  The memoPollVote and navigate concerns are injected so this module stays
  free of UI/network concerns; environmentally unsuitable I/O lives behind
  those small adapter boundaries.
*/

const PollActionPage = require('./poll-action-page')
const MemoPollVote = require('./memo-poll-vote')

class PollVotePage extends PollActionPage {
  static config = {
    handlerKey: 'memoPollVote',
    busyKey: 'voting',
    actionMethod: 'vote',
    requiresMsg: 'Poll vote page requires a memo poll vote handler.',
    maxBytes: MemoPollVote.MAX_COMMENT_BYTES,
    validationCodes: ['poll_vote_validation', 'poll_vote_length']
  }
}

PollVotePage.MAX_COMMENT_BYTES = MemoPollVote.MAX_COMMENT_BYTES

module.exports = PollVotePage
