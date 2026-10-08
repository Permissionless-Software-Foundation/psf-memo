/*
  Gherkin step handlers for the Memo Avatar feature.

  The shared write-command steps (wallet source, recording wallet, txid +
  explorer reporting, usage/error, no-broadcast) live in ./broadcast-command.js;
  this module adds the 0x6d0a-specific avatar URL steps and the command runner.
  Each scenario runs the real memo-avatar command in JSON mode through the real
  wallet resolver and broadcast scaffolding, so the action, the byte limit, and
  the error contract are exercised without a network or a real key.
*/

// Local libraries
import MemoAvatar from '../../../src/commands/memo-avatar.js'
import { resolveParam } from '../step-support.js'
import { initCommandWorld, runCommandInWorld } from './broadcast-command.js'

const memoAvatarHandlers = [
  {
    name: 'a Memo avatar command',
    pattern: /^a Memo avatar command$/,
    run (m, example, world) {
      initCommandWorld(world, { txid: 'memo-avatar-txid' })
      world.url = undefined
    }
  },
  {
    name: 'the avatar URL',
    pattern: /^the avatar URL is "(.*)"$/,
    run (m, example, world) {
      world.url = resolveParam(m[1], example)
    }
  },
  {
    name: 'the avatar URL of multibyte characters',
    pattern: /^the avatar URL is (.+) multibyte characters long$/,
    run (m, example, world) {
      const length = Number.parseInt(resolveParam(m[1], example), 10)
      // U+00E9 is one UTF-16 code unit but two UTF-8 bytes.
      world.url = 'é'.repeat(length)
    }
  },
  {
    name: 'no avatar URL',
    pattern: /^no avatar URL is given$/,
    run (m, example, world) {
      world.url = undefined
    }
  },
  {
    name: 'memo-avatar command runs',
    pattern: /^the memo-avatar command runs$/,
    async run (m, example, world) {
      await runCommandInWorld(world, MemoAvatar, {
        url: world.url,
        ...world.commandSource
      })
    }
  }
]

export { memoAvatarHandlers }
