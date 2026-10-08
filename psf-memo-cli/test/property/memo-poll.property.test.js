/*
  Property tests for the memo-poll read-command helpers and wiring.

  These exercise broad input ranges to confirm:

    - the summary renders the question, then every option in order, then every
      vote in order.
    - JSON mode reports the poll verbatim.
    - a missing -t txid is a UsageError and a txid with no poll is a not-found
      failure, neither of which reports a result.
*/

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { seededRandom } from './harness.js'
import MemoPoll from '../../src/commands/memo-poll.js'
import { captureStream } from '../support/capture.js'
import { formatPollMessage } from '../../src/lib/memo-poll.js'

const rng = seededRandom(20261105)

function randomPoll (index) {
  const optionCount = Math.floor(rng() * 5)
  const voteCount = Math.floor(rng() * 5)
  const options = []
  const votes = []
  for (let i = 0; i < optionCount; i++) {
    options.push({ option: `opt-${index}-${i}`, addr: `bitcoincash:qopt-${index}-${i}` })
  }
  for (let i = 0; i < voteCount; i++) {
    votes.push({ addr: `bitcoincash:qvote-${index}-${i}`, comment: `comment-${index}-${i}` })
  }
  return {
    txid: `poll-${index}`,
    question: `question-${index}?`,
    options,
    votes
  }
}

test('formatPollMessage lists the question, options, then votes in order', () => {
  for (let i = 0; i < 300; i++) {
    const poll = randomPoll(i)

    const expected = [
      `question: ${poll.question}`,
      ...poll.options.map((option) => `option ${option.option} from ${option.addr}`),
      ...poll.votes.map((vote) => `vote from ${vote.addr}: ${vote.comment}`)
    ].join('\n')

    assert.equal(formatPollMessage(poll), expected)
  }
})

test('memo-poll JSON mode reports the poll verbatim', async () => {
  const originalExitCode = process.exitCode

  try {
    for (let i = 0; i < 120; i++) {
      const poll = randomPoll(i)

      class FakeMemoDb {
        async getPoll () {
          return poll
        }
      }

      const out = captureStream()
      const command = new MemoPoll({
        MemoDbClass: FakeMemoDb,
        envUrl: null,
        stdout: out.stream,
        stderr: captureStream().stream
      })

      const code = await command.run({ json: true, txid: poll.txid })

      assert.equal(code, 0)
      assert.deepEqual(JSON.parse(out.text()), {
        message: formatPollMessage(poll),
        poll
      })
    }
  } finally {
    process.exitCode = originalExitCode
  }
})

test('memo-poll rejects a missing txid and reports a missing poll', async () => {
  const originalExitCode = process.exitCode

  try {
    for (let i = 0; i < 60; i++) {
      const txid = `poll-${i}`
      let requested = null

      class FakeMemoDb {
        async getPoll (requestedTxid) {
          requested = requestedTxid
          return null
        }
      }

      const usageErr = captureStream()
      const usage = new MemoPoll({
        MemoDbClass: FakeMemoDb,
        envUrl: null,
        stdout: captureStream().stream,
        stderr: usageErr.stream
      })
      assert.equal(await usage.run({ json: true }), 2)
      assert.ok(JSON.parse(usageErr.text()).error.includes('-t flag'))
      assert.equal(requested, null)

      const missingErr = captureStream()
      const missing = new MemoPoll({
        MemoDbClass: FakeMemoDb,
        envUrl: null,
        stdout: captureStream().stream,
        stderr: missingErr.stream
      })
      assert.equal(await missing.run({ json: true, txid }), 1)
      assert.ok(JSON.parse(missingErr.text()).error.toLowerCase().includes('not found'))
      assert.equal(requested, txid)
    }
  } finally {
    process.exitCode = originalExitCode
  }
})
