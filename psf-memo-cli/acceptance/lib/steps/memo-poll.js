/*
  Gherkin step handlers for the Memo Poll feature.

  The scenario world serves the polls store through the same fake fetch used by
  the other Memo DB step handlers, and each scenario runs the real memo-poll
  command in JSON mode so its reported question, options, and votes can be
  asserted from the captured stdout.
*/

// Local libraries
import MemoPoll from '../../../src/commands/memo-poll.js'
import { runReadCommand, assertUsageError, assertNotFound, assertReadCommandError } from '../read-command.js'
import { findReportedItem } from './read-result.js'
import { assertEqual, resolveParam } from '../step-support.js'

// The polls store, matching the psf-memo-db /polls/:txid response shape (the
// service adds the request txid to the stored poll body).
const POLLS = {
  'poll-a': {
    addr: 'bitcoincash:qasker',
    pollType: 1,
    optionCount: 2,
    question: 'which is better?',
    seen: 10,
    blockHeight: 600010,
    options: [
      { option: 'yes', addr: 'bitcoincash:qyes', pollTxid: 'poll-a', seen: 11, blockHeight: 600011 },
      { option: 'no', addr: 'bitcoincash:qno', pollTxid: 'poll-a', seen: 12, blockHeight: 600012 }
    ],
    votes: [
      { comment: 'yes', addr: 'bitcoincash:qvoter1', pollTxid: 'poll-a', seen: 13, blockHeight: 600013 },
      { comment: 'no', addr: 'bitcoincash:qvoter2', pollTxid: 'poll-a', seen: 14, blockHeight: 600014 }
    ]
  },
  'poll-b': {
    addr: 'bitcoincash:qasker2',
    pollType: 1,
    optionCount: 0,
    question: 'tea or coffee?',
    seen: 20,
    blockHeight: 600020,
    options: [],
    votes: []
  }
}

// Build a step handler that finds a reported poll item by the first capture
// and asserts its `field` against the second capture.
function reportedItemHandler ({ name, pattern, items, matchField, field, label }) {
  return {
    name,
    pattern,
    run (m, example, world) {
      const item = findReportedItem(items(world), matchField, resolveParam(m[1], example), label)

      assertEqual(item[field], resolveParam(m[2], example), label, { quote: true })
    }
  }
}

const memoPollHandlers = [
  {
    name: 'service serves the polls',
    pattern: /^the Memo DB service serves the polls$/,
    run (m, example, world) {
      world.pollStore = Object.fromEntries(
        Object.entries(POLLS).map(([txid, poll]) => [txid, { ...poll }])
      )
    }
  },
  {
    name: 'service has no poll',
    pattern: /^the Memo DB service has no poll for "(.+)"$/,
    run (m, example, world) {
      delete world.pollStore[resolveParam(m[1], example)]
    }
  },
  {
    name: 'service fails the poll request',
    pattern: /^the Memo DB service fails the poll request$/,
    run (m, example, world) {
      world.unreachable = true
    }
  },
  {
    name: 'memo-poll command runs without a txid',
    pattern: /^the memo-poll command runs without a txid$/,
    async run (m, example, world) {
      await runReadCommand(world, MemoPoll, 'poll', {})
    }
  },
  {
    name: 'memo-poll command runs for a txid',
    pattern: /^the memo-poll command runs for "(.+)"$/,
    async run (m, example, world) {
      await runReadCommand(world, MemoPoll, 'poll', { txid: resolveParam(m[1], example) })
    }
  },
  {
    name: 'service received a poll request',
    pattern: /^the service received a poll request for "(.+)"$/,
    run (m, example, world) {
      assertEqual(world.lastRequest?.pathname, `/polls/${resolveParam(m[1], example)}`, 'request path')
    }
  },
  {
    name: 'command reported the poll question',
    pattern: /^the command reported the poll question "(.+)"$/,
    run (m, example, world) {
      assertEqual(world.readJson?.poll?.question, resolveParam(m[1], example), 'poll question', { quote: true })
    }
  },
  reportedItemHandler({
    name: 'command reported an option and its author',
    pattern: /^the command reported the option "(.+)" from "(.+)"$/,
    items: (world) => world.readJson?.poll?.options,
    matchField: 'option',
    field: 'addr',
    label: 'a reported option'
  }),
  reportedItemHandler({
    name: 'command reported a vote and its comment',
    pattern: /^the command reported the vote from "(.+)" with comment "(.+)"$/,
    items: (world) => world.readJson?.poll?.votes,
    matchField: 'addr',
    field: 'comment',
    label: 'a reported vote'
  }),
  {
    name: 'memo-poll command reported the usage error',
    pattern: /^the memo-poll command reported the usage error "(.+)"$/,
    run (m, example, world) {
      assertUsageError(world, 'poll', 'memo-poll', resolveParam(m[1], example))
    }
  },
  {
    name: 'memo-poll command reported not found',
    pattern: /^the memo-poll command reported not found$/,
    run (m, example, world) {
      assertNotFound(world, 'poll', 'memo-poll')
    }
  },
  {
    name: 'memo-poll command reported an error',
    pattern: /^the memo-poll command reported an error$/,
    run (m, example, world) {
      assertReadCommandError(world, 'poll', 'memo-poll')
    }
  }
]

export { memoPollHandlers }
