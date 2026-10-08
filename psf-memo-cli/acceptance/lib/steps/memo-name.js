/*
  Gherkin step handlers for the Memo Name feature.

  The shared write-command steps (wallet source, recording wallet, txid +
  explorer reporting, usage/error, no-broadcast) live in ./broadcast-command.js;
  this module adds the 0x6d01-specific name steps and the command runner. Each
  scenario runs the real memo-name command in JSON mode through the real wallet
  resolver and broadcast scaffolding, so the action, the byte limit, and the
  error contract are exercised without a network or a real key.
*/

// Local libraries
import MemoName from '../../../src/commands/memo-name.js'
import { resolveParam } from '../step-support.js'
import { initCommandWorld, runCommandInWorld } from './broadcast-command.js'

const memoNameHandlers = [
  {
    name: 'a Memo name command',
    pattern: /^a Memo name command$/,
    run (m, example, world) {
      initCommandWorld(world, { txid: 'memo-name-txid' })
      world.name = undefined
    }
  },
  {
    name: 'the name',
    pattern: /^the name is "(.*)"$/,
    run (m, example, world) {
      world.name = resolveParam(m[1], example)
    }
  },
  {
    name: 'the name of multibyte characters',
    pattern: /^the name is (.+) multibyte characters long$/,
    run (m, example, world) {
      const length = Number.parseInt(resolveParam(m[1], example), 10)
      // U+00E9 is one UTF-16 code unit but two UTF-8 bytes.
      world.name = 'é'.repeat(length)
    }
  },
  {
    name: 'no name',
    pattern: /^no name is given$/,
    run (m, example, world) {
      world.name = undefined
    }
  },
  {
    name: 'memo-name command runs',
    pattern: /^the memo-name command runs$/,
    async run (m, example, world) {
      await runCommandInWorld(world, MemoName, {
        memo: world.name,
        ...world.commandSource
      })
    }
  }
]

export { memoNameHandlers }
