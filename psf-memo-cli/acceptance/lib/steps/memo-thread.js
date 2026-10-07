/*
  Gherkin step handlers for the Memo Thread feature.

  The scenario world serves a three-reply thread (one nested) through the same
  fake fetch used by the other Memo DB step handlers, and each scenario runs
  the real memo-thread command in JSON mode so its reported tree can be
  asserted from the captured stdout.
*/

// Local libraries
import MemoThread from '../../../src/commands/memo-thread.js'
import { runReadCommand, assertUsageError, assertNotFound, assertReadCommandError } from '../read-command.js'
import { assertEqual, resolveParam } from '../step-support.js'

// The thread fixture: the root has three direct replies oldest-first, and the
// second reply has one nested reply. Counts match the feature examples.
function makeThread () {
  return {
    txid: 'thread-root',
    addr: 'bitcoincash:qroot',
    text: 'the root post',
    seen: 10,
    blockHeight: 600010,
    replyCount: 3,
    likeCount: 2,
    replies: [
      {
        txid: 'thread-reply-1',
        addr: 'bitcoincash:qreply1',
        text: 'first reply',
        seen: 11,
        blockHeight: 600011,
        replyCount: 0,
        likeCount: 1,
        replies: []
      },
      {
        txid: 'thread-reply-2',
        addr: 'bitcoincash:qreply2',
        text: 'second reply',
        seen: 12,
        blockHeight: 600012,
        replyCount: 1,
        likeCount: 0,
        replies: [
          {
            txid: 'thread-reply-2-a',
            addr: 'bitcoincash:qreply2a',
            text: 'nested reply',
            seen: 13,
            blockHeight: 600013,
            replyCount: 0,
            likeCount: 3,
            replies: []
          }
        ]
      },
      {
        txid: 'thread-reply-3',
        addr: 'bitcoincash:qreply3',
        text: 'third reply',
        seen: 14,
        blockHeight: 600014,
        replyCount: 0,
        likeCount: 2,
        replies: []
      }
    ]
  }
}

// Find a node anywhere in the thread tree.
function findPost (node, txid) {
  if (!node) return null
  if (node.txid === txid) return node
  for (const reply of node.replies || []) {
    const found = findPost(reply, txid)
    if (found) return found
  }
  return null
}

const memoThreadHandlers = [
  {
    name: 'service serves the thread',
    pattern: /^the Memo DB service serves the thread for "(.+)"$/,
    run (m, example, world) {
      world.threads[resolveParam(m[1], example)] = makeThread()
    }
  },
  {
    name: 'service has no thread',
    pattern: /^the Memo DB service has no thread for "(.+)"$/,
    run (m, example, world) {
      delete world.threads[resolveParam(m[1], example)]
    }
  },
  {
    name: 'service fails the thread request',
    pattern: /^the Memo DB service fails the thread request$/,
    run (m, example, world) {
      world.unreachable = true
    }
  },
  {
    name: 'memo-thread command runs without a txid',
    pattern: /^the memo-thread command runs without a txid$/,
    async run (m, example, world) {
      await runReadCommand(world, MemoThread, 'thread', {})
    }
  },
  {
    name: 'memo-thread command runs for a txid',
    pattern: /^the memo-thread command runs for "(.+)"$/,
    async run (m, example, world) {
      await runReadCommand(world, MemoThread, 'thread', { txid: resolveParam(m[1], example) })
    }
  },
  {
    name: 'command reported the usage error',
    pattern: /^the memo-thread command reported the usage error "(.+)"$/,
    run (m, example, world) {
      assertUsageError(world, 'thread', 'memo-thread', resolveParam(m[1], example))
    }
  },
  {
    name: 'command reported the root post',
    pattern: /^the command reported the root post "(.+)" with like count (.+) and reply count (.+)$/,
    run (m, example, world) {
      const root = world.threadJson?.post
      if (!root) {
        throw new Error('Expected a reported root post')
      }
      assertEqual(root.txid, resolveParam(m[1], example), 'root txid', { quote: true })
      assertEqual(root.likeCount, Number.parseInt(resolveParam(m[2], example), 10), 'root like count')
      assertEqual(root.replyCount, Number.parseInt(resolveParam(m[3], example), 10), 'root reply count')
    }
  },
  {
    name: 'command reported the reply order',
    pattern: /^the command reported the reply order "(.+)"$/,
    run (m, example, world) {
      const order = (world.threadJson?.post?.replies || []).map((reply) => reply.txid).join(', ')
      assertEqual(order, resolveParam(m[1], example), 'reply order', { quote: true })
    }
  },
  {
    name: 'command reported a direct reply like count',
    pattern: /^the command reported the reply "(.+)" with like count (.+)$/,
    run (m, example, world) {
      const txid = resolveParam(m[1], example)
      const reply = (world.threadJson?.post?.replies || []).find((r) => r.txid === txid)
      if (!reply) {
        throw new Error(`Expected a direct reply with txid ${txid}`)
      }
      assertEqual(reply.likeCount, Number.parseInt(resolveParam(m[2], example), 10), 'reply like count')
    }
  },
  {
    name: 'command reported a nested reply',
    pattern: /^the command reported the reply "(.+)" with a nested reply "(.+)"$/,
    run (m, example, world) {
      const parentTxid = resolveParam(m[1], example)
      const childTxid = resolveParam(m[2], example)
      const parent = (world.threadJson?.post?.replies || []).find((r) => r.txid === parentTxid)
      if (!parent) {
        throw new Error(`Expected a direct reply with txid ${parentTxid}`)
      }
      const nested = (parent.replies || []).some((r) => r.txid === childTxid)
      if (!nested) {
        throw new Error(`Expected reply ${parentTxid} to nest ${childTxid}`)
      }
    }
  },
  {
    name: 'command reported a nested reply like count',
    pattern: /^the command reported the nested reply "(.+)" with like count (.+)$/,
    run (m, example, world) {
      const nested = findPost(world.threadJson?.post, resolveParam(m[1], example))
      if (!nested) {
        throw new Error(`Expected a nested reply with txid ${resolveParam(m[1], example)}`)
      }
      assertEqual(nested.likeCount, Number.parseInt(resolveParam(m[2], example), 10), 'nested like count')
    }
  },
  {
    name: 'memo-thread command reported not found',
    pattern: /^the memo-thread command reported not found$/,
    run (m, example, world) {
      assertNotFound(world, 'thread', 'memo-thread')
    }
  },
  {
    name: 'memo-thread command reported an error',
    pattern: /^the memo-thread command reported an error$/,
    run (m, example, world) {
      assertReadCommandError(world, 'thread', 'memo-thread')
    }
  }
]

export { memoThreadHandlers }
