/*
  Gherkin step handlers for the Memo Reply feature.

  The shared write-command steps (wallet source, recording wallet, txid +
  explorer reporting, no-broadcast) live in ./broadcast-command.js; this module
  adds the 0x6d03-specific parent-txid and reply-text steps and the command
  runner. Each scenario runs the real memo-reply command in JSON mode through
  the real wallet resolver and multi-push broadcast scaffolding, so the action,
  the byte limit, and the error contract are exercised without a network or a
  real key.
*/

// Local libraries
import MemoReply from '../../../src/commands/memo-reply.js'
import { assertUsageError, parseStderrError } from '../read-command.js'
import { assertEqual, resolveParam } from '../step-support.js'
import { initCommandWorld, runCommandInWorld } from './broadcast-command.js'

const memoReplyHandlers = [
  {
    name: 'a Memo reply command',
    pattern: /^a Memo reply command$/,
    run (m, example, world) {
      initCommandWorld(world, { txid: 'memo-reply-txid' })
      world.replyTxid = undefined
      world.replyText = undefined
    }
  },
  {
    name: 'the parent post txid',
    pattern: /^the parent post txid is "(.+)"$/,
    run (m, example, world) {
      world.replyTxid = resolveParam(m[1], example)
    }
  },
  {
    name: 'no parent txid',
    pattern: /^no parent txid is given$/,
    run (m, example, world) {
      world.replyTxid = undefined
    }
  },
  {
    name: 'the reply text',
    pattern: /^the reply text is "(.*)"$/,
    run (m, example, world) {
      world.replyText = resolveParam(m[1], example)
    }
  },
  {
    name: 'the reply text of multibyte characters',
    pattern: /^the reply text is (.+) multibyte characters long$/,
    run (m, example, world) {
      const length = Number.parseInt(resolveParam(m[1], example), 10)
      // U+00E9 is one UTF-16 code unit but two UTF-8 bytes.
      world.replyText = 'é'.repeat(length)
    }
  },
  {
    name: 'the reply text of characters',
    pattern: /^the reply text is (.+) characters long$/,
    run (m, example, world) {
      const length = Number.parseInt(resolveParam(m[1], example), 10)
      world.replyText = 'a'.repeat(length)
    }
  },
  {
    name: 'no reply text',
    pattern: /^no reply text is given$/,
    run (m, example, world) {
      world.replyText = undefined
    }
  },
  {
    name: 'memo-reply command runs',
    pattern: /^the memo-reply command runs$/,
    async run (m, example, world) {
      await runCommandInWorld(world, MemoReply, {
        txid: world.replyTxid,
        memo: world.replyText,
        ...world.commandSource
      })
    }
  },
  {
    name: 'broadcast push 3 has bytes',
    pattern: /^broadcast push 3 has (.+) bytes$/,
    run (m, example, world) {
      const bytes = world.broadcast?.pushes?.[2]?.length
      assertEqual(bytes, Number.parseInt(resolveParam(m[1], example), 10), 'push 3 byte length')
    }
  },
  {
    name: 'memo-reply command reported the usage error',
    pattern: /^the memo-reply command reported the usage error "(.+)"$/,
    run (m, example, world) {
      assertUsageError(world, 'result', 'memo-reply', resolveParam(m[1], example))
    }
  },
  {
    name: 'memo-reply command reported the error',
    pattern: /^the memo-reply command reported the error "(.+)"$/,
    run (m, example, world) {
      assertEqual(world.resultExitCode, 1, 'memo-reply exit code')
      assertEqual(parseStderrError(world, 'result').error, resolveParam(m[1], example), 'error', { quote: true })
    }
  }
]

export { memoReplyHandlers }
