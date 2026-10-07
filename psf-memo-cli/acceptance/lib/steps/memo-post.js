/*
  Gherkin step handlers for the Memo Post feature.

  The shared write-command steps (wallet source, recording wallet, txid +
  explorer reporting, no-broadcast) live in ./broadcast-command.js; this module
  adds the 0x6d02-specific memo text steps and the command runner. Each scenario
  runs the real memo-post command in JSON mode through the real wallet resolver
  and broadcast scaffolding, so the action, the character limit, and the
  error contract are exercised without a network or a real key.
*/

// Local libraries
import MemoPost from '../../../src/commands/memo-post.js'
import { assertEqual, resolveParam } from '../step-support.js'
import { initCommandWorld, runCommandInWorld } from './broadcast-command.js'

const memoPostHandlers = [
  {
    name: 'a Memo post command',
    pattern: /^a Memo post command$/,
    run (m, example, world) {
      initCommandWorld(world, { txid: 'memo-post-txid' })
      world.memoText = undefined
    }
  },
  {
    name: 'the memo text',
    pattern: /^the memo text is "(.*)"$/,
    run (m, example, world) {
      world.memoText = resolveParam(m[1], example)
    }
  },
  {
    name: 'the memo text of multibyte characters',
    pattern: /^the memo text is (.+) multibyte characters long$/,
    run (m, example, world) {
      const length = Number.parseInt(resolveParam(m[1], example), 10)
      // U+00E9 is one UTF-16 code unit but two UTF-8 bytes.
      world.memoText = 'é'.repeat(length)
    }
  },
  {
    name: 'the memo text of characters',
    pattern: /^the memo text is (.+) characters long$/,
    run (m, example, world) {
      const length = Number.parseInt(resolveParam(m[1], example), 10)
      world.memoText = 'a'.repeat(length)
    }
  },
  {
    name: 'no memo text',
    pattern: /^no memo text is given$/,
    run (m, example, world) {
      world.memoText = undefined
    }
  },
  {
    name: 'memo-post command runs',
    pattern: /^the memo-post command runs$/,
    async run (m, example, world) {
      await runCommandInWorld(world, MemoPost, {
        memo: world.memoText,
        ...world.commandSource
      })
    }
  },
  {
    name: 'broadcast push 2 has bytes',
    pattern: /^broadcast push 2 has (.+) bytes$/,
    run (m, example, world) {
      const bytes = world.broadcast?.pushes?.[1]?.length
      assertEqual(bytes, Number.parseInt(resolveParam(m[1], example), 10), 'push 2 byte length')
    }
  }
]

export { memoPostHandlers }
