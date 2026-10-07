/*
  Gherkin step handlers for the Memo Get Post feature.

  The scenario world serves the posts store through the same fake fetch used by
  the other Memo DB step handlers, and each scenario runs the real
  memo-get-post command in JSON mode so its reported stored fields can be
  asserted from the captured stdout.
*/

// Local libraries
import MemoGetPost from '../../../src/commands/memo-get-post.js'
import { runReadCommand, assertUsageError, assertNotFound, assertReadCommandError, assertReportedPost } from '../read-command.js'
import { assertEqual, resolveParam } from '../step-support.js'

// The posts store: the key txid is not part of the stored body, matching the
// psf-memo-db /level/post/:txid response.
const POST_STORE = {
  'post-abc': { addr: 'bitcoincash:qaddr-a', text: 'hello memo', blockHeight: 600001, seen: 1000 },
  'post-def': { addr: 'bitcoincash:qaddr-b', text: 'second post', blockHeight: 600050, seen: 2000 }
}

const memoGetPostHandlers = [
  {
    name: 'service serves the posts store',
    pattern: /^the Memo DB service serves the posts store$/,
    run (m, example, world) {
      world.postStore = Object.fromEntries(
        Object.entries(POST_STORE).map(([txid, post]) => [txid, { ...post }])
      )
    }
  },
  {
    name: 'service has no post',
    pattern: /^the Memo DB service has no post for "(.+)"$/,
    run (m, example, world) {
      delete world.postStore[resolveParam(m[1], example)]
    }
  },
  {
    name: 'service fails the post request',
    pattern: /^the Memo DB service fails the post request$/,
    run (m, example, world) {
      world.unreachable = true
    }
  },
  {
    name: 'memo-get-post command runs without a txid',
    pattern: /^the memo-get-post command runs without a txid$/,
    async run (m, example, world) {
      await runReadCommand(world, MemoGetPost, 'getPost', {})
    }
  },
  {
    name: 'memo-get-post command runs for a txid',
    pattern: /^the memo-get-post command runs for "(.+)"$/,
    async run (m, example, world) {
      await runReadCommand(world, MemoGetPost, 'getPost', { txid: resolveParam(m[1], example) })
    }
  },
  {
    name: 'command reported the usage error',
    pattern: /^the memo-get-post command reported the usage error "(.+)"$/,
    run (m, example, world) {
      assertUsageError(world, 'getPost', 'memo-get-post', resolveParam(m[1], example))
    }
  },
  {
    name: 'command reported the post fields',
    pattern: /^the command reported the post "(.+)" with text "(.+)" and address "(.+)"$/,
    run (m, example, world) {
      assertReportedPost(world, 'getPost', 'a reported post', {
        txid: resolveParam(m[1], example),
        text: resolveParam(m[2], example),
        addr: resolveParam(m[3], example)
      })
    }
  },
  {
    name: 'command reported block height and seen',
    pattern: /^the command reported block height (.+) and seen (.+) for the post$/,
    run (m, example, world) {
      const post = world.getPostJson?.post
      if (!post) {
        throw new Error('Expected a reported post')
      }
      assertEqual(post.blockHeight, Number.parseInt(resolveParam(m[1], example), 10), 'post block height')
      assertEqual(post.seen, Number.parseInt(resolveParam(m[2], example), 10), 'post seen')
    }
  },
  {
    name: 'memo-get-post command reported not found',
    pattern: /^the memo-get-post command reported not found$/,
    run (m, example, world) {
      assertNotFound(world, 'getPost', 'memo-get-post')
    }
  },
  {
    name: 'memo-get-post command reported an error',
    pattern: /^the memo-get-post command reported an error$/,
    run (m, example, world) {
      assertReadCommandError(world, 'getPost', 'memo-get-post')
    }
  }
]

export { memoGetPostHandlers }
