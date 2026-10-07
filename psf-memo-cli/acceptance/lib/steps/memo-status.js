/*
  Gherkin step handlers for the Memo Status feature.

  The scenario world serves the indexer status through the same fake fetch used
  by the other Memo DB step handlers, and each scenario runs the real
  memo-status command in JSON mode so its reported sync heights can be asserted
  from the captured stdout.
*/

// Local libraries
import MemoStatus from '../../../src/commands/memo-status.js'
import { runReadCommand, assertNotFound, assertReadCommandError } from '../read-command.js'
import { assertEqual, resolveParam } from '../step-support.js'

const memoStatusHandlers = [
  {
    name: 'service serves the indexer status',
    pattern: /^the Memo DB service serves the indexer status (.+) (.+) (.+)$/,
    run (m, example, world) {
      world.status = {
        startBlockHeight: Number.parseInt(resolveParam(m[1], example), 10),
        syncedBlockHeight: Number.parseInt(resolveParam(m[2], example), 10),
        chainBlockHeight: Number.parseInt(resolveParam(m[3], example), 10)
      }
    }
  },
  {
    name: 'service has no indexer status',
    pattern: /^the Memo DB service has no indexer status$/,
    run (m, example, world) {
      world.status = null
    }
  },
  {
    name: 'service fails the status request',
    pattern: /^the Memo DB service fails the status request$/,
    run (m, example, world) {
      world.unreachable = true
    }
  },
  {
    name: 'memo-status command runs',
    pattern: /^the memo-status command runs$/,
    async run (m, example, world) {
      await runReadCommand(world, MemoStatus, 'status', {})
    }
  },
  {
    name: 'command reported the sync heights',
    pattern: /^the command reported start block height (.+), synced block height (.+), and chain block height (.+)$/,
    run (m, example, world) {
      const status = world.statusJson?.status
      if (!status) {
        throw new Error('Expected a reported indexer status')
      }
      assertEqual(status.startBlockHeight, Number.parseInt(resolveParam(m[1], example), 10), 'start block height')
      assertEqual(status.syncedBlockHeight, Number.parseInt(resolveParam(m[2], example), 10), 'synced block height')
      assertEqual(status.chainBlockHeight, Number.parseInt(resolveParam(m[3], example), 10), 'chain block height')
    }
  },
  {
    name: 'memo-status command reported not found',
    pattern: /^the memo-status command reported not found$/,
    run (m, example, world) {
      assertNotFound(world, 'status', 'memo-status')
    }
  },
  {
    name: 'memo-status command reported an error',
    pattern: /^the memo-status command reported an error$/,
    run (m, example, world) {
      assertReadCommandError(world, 'status', 'memo-status')
    }
  }
]

export { memoStatusHandlers }
