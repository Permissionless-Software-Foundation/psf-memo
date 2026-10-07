/*
  Gherkin step handlers for the Memo Like feature.

  The shared write-command steps (wallet source, spendable balance, recording
  wallet, txid + explorer reporting, no-broadcast) live in ./broadcast-command.js;
  this module adds the 0x6d04-specific post txid, tip, and tip-output steps and
  the command runner. Each scenario runs the real memo-like command in JSON mode
  through the real wallet resolver and broadcast scaffolding, so the action, the
  tip rules, the balance checks, and the error contract are exercised without a
  network or a real key.
*/

// Local libraries
import MemoLike from '../../../src/commands/memo-like.js'
import { assertEqual, resolveParam } from '../step-support.js'
import { initCommandWorld, runCommandInWorld } from './broadcast-command.js'

const memoLikeHandlers = [
  {
    name: 'a Memo like command',
    pattern: /^a Memo like command$/,
    run (m, example, world) {
      initCommandWorld(world, { txid: 'memo-like-txid' })
      world.likePost = undefined
      world.likeTip = undefined
      world.likeAuthor = ''
    }
  },
  {
    name: 'the liked post txid',
    pattern: /^the liked post txid is "(.+)"$/,
    run (m, example, world) {
      world.likePost = resolveParam(m[1], example)
    }
  },
  {
    name: 'no liked post txid',
    pattern: /^no liked post txid is given$/,
    run (m, example, world) {
      world.likePost = undefined
    }
  },
  {
    name: 'the tip to an author',
    pattern: /^the tip is "(.+)" satoshis to the author "(.+)"$/,
    run (m, example, world) {
      world.likeTip = resolveParam(m[1], example)
      world.likeAuthor = resolveParam(m[2], example)
    }
  },
  {
    name: 'the tip',
    pattern: /^the tip is "(.+)" satoshis$/,
    run (m, example, world) {
      world.likeTip = resolveParam(m[1], example)
    }
  },
  {
    name: 'no author address',
    pattern: /^no author address is given$/,
    run (m, example, world) {
      world.likeAuthor = ''
    }
  },
  {
    name: 'memo-like command runs',
    pattern: /^the memo-like command runs$/,
    async run (m, example, world) {
      await runCommandInWorld(world, MemoLike, {
        txid: world.likePost,
        tip: world.likeTip,
        author: world.likeAuthor,
        ...world.commandSource
      })
    }
  },
  {
    name: 'the broadcast has no BCH tip output',
    pattern: /^the broadcast has no BCH tip output$/,
    run (m, example, world) {
      assertEqual(world.broadcast?.bchOutput?.length || 0, 0, 'BCH tip output count')
    }
  },
  {
    name: 'the broadcast pays the author',
    pattern: /^the broadcast pays (.+) satoshis to the author "(.+)"$/,
    run (m, example, world) {
      const output = world.broadcast?.bchOutput?.[0]
      assertEqual(output?.amountSat, Number.parseInt(resolveParam(m[1], example), 10), 'tip amount')
      assertEqual(output?.address, resolveParam(m[2], example), 'tip address', { quote: true })
    }
  }
]

export { memoLikeHandlers }
