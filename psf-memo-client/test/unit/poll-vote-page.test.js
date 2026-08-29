/*
  Unit tests for the Poll Vote Page controller.
*/

'use strict'

const test = require('node:test')
const assert = require('node:assert/strict')
const PollVotePage = require('../../src/services/poll-vote-page')
const MemoPollVote = require('../../src/services/memo-poll-vote')

const POLL_TXID = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'

function makeWallet () {
  return {
    walletInfo: { cashAddress: 'bitcoincash:qtest' },
    broadcasts: [],
    async getUtxos () { return [] },
    async sendOpReturn (msg, prefix) {
      this.broadcasts.push({ msg, prefix })
      return 'aa'.repeat(32)
    }
  }
}

test('submit casts a vote', async () => {
  const wallet = makeWallet()
  const memoPollVote = new MemoPollVote({ wallet, pollTxid: POLL_TXID })
  const page = new PollVotePage({ memoPollVote })

  page.setInput('yes')
  const result = await page.submit()

  assert.equal(result.ok, true)
  assert.equal(wallet.broadcasts.length, 1)
})

test('submit records a validation error for an empty comment', async () => {
  const wallet = makeWallet()
  const memoPollVote = new MemoPollVote({ wallet, pollTxid: POLL_TXID })
  const page = new PollVotePage({ memoPollVote })

  page.setInput('')
  const result = await page.submit()

  assert.equal(result.ok, false)
  assert.equal(page.submitError, 'poll_vote_validation')
  assert.equal(wallet.broadcasts.length, 0)
})

test('remainingCount counts down from the comment limit', () => {
  const memoPollVote = new MemoPollVote({ pollTxid: POLL_TXID })
  const page = new PollVotePage({ memoPollVote })

  page.setInput('')
  assert.equal(page.remainingCount(), MemoPollVote.MAX_COMMENT_BYTES)
  page.setInput('yes')
  assert.equal(page.remainingCount(), MemoPollVote.MAX_COMMENT_BYTES - 3)
})

test('starts with the in-flight flag cleared', () => {
  const memoPollVote = new MemoPollVote({ pollTxid: POLL_TXID })
  const page = new PollVotePage({ memoPollVote })

  assert.equal(page.voting, false)
})
