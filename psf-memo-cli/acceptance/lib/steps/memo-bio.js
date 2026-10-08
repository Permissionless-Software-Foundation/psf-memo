/*
  Gherkin step handlers for the Memo Bio feature.

  The shared write-command steps (wallet source, recording wallet, txid +
  explorer reporting, usage/error, no-broadcast) live in ./broadcast-command.js;
  this module adds the 0x6d05-specific bio steps and the command runner. Each
  scenario runs the real memo-bio command in JSON mode through the real wallet
  resolver and broadcast scaffolding, so the action, the byte limit, and the
  error contract are exercised without a network or a real key.
*/

// Local libraries
import MemoBio from '../../../src/commands/memo-bio.js'
import { resolveParam } from '../step-support.js'
import { initCommandWorld, runCommandInWorld } from './broadcast-command.js'

const memoBioHandlers = [
  {
    name: 'a Memo bio command',
    pattern: /^a Memo bio command$/,
    run (m, example, world) {
      initCommandWorld(world, { txid: 'memo-bio-txid' })
      world.bio = undefined
    }
  },
  {
    name: 'the bio',
    pattern: /^the bio is "(.*)"$/,
    run (m, example, world) {
      world.bio = resolveParam(m[1], example)
    }
  },
  {
    name: 'the bio of multibyte characters',
    pattern: /^the bio is (.+) multibyte characters long$/,
    run (m, example, world) {
      const length = Number.parseInt(resolveParam(m[1], example), 10)
      // U+00E9 is one UTF-16 code unit but two UTF-8 bytes.
      world.bio = 'é'.repeat(length)
    }
  },
  {
    name: 'no bio',
    pattern: /^no bio is given$/,
    run (m, example, world) {
      world.bio = undefined
    }
  },
  {
    name: 'memo-bio command runs',
    pattern: /^the memo-bio command runs$/,
    async run (m, example, world) {
      await runCommandInWorld(world, MemoBio, {
        memo: world.bio,
        ...world.commandSource
      })
    }
  }
]

export { memoBioHandlers }
