/*
  Gherkin step handlers for the Memo Get Post feature.

  The scenario world serves the posts store through the same fake fetch used by
  the other Memo DB step handlers, and each scenario runs the real
  memo-get-post command in JSON mode so its reported stored fields can be
  asserted from the captured stdout.
*/

// Local libraries
import MemoGetPost from '../../../src/commands/memo-get-post.js'
import { runReadCommand } from '../read-command.js'
import { assertEqual, resolveParam } from '../step-support.js'

// The posts store: the key txid is not part of the stored body, matching the
// psf-memo-db /level/post/:txid response.
const POST_STORE = {
  'post-abc': { addr: 'bitcoincash:qaddr-a', text: 'hello memo', blockHeight: 600001, seen: 1000 },
  'post-def': { addr: 'bitcoincash:qaddr-b', text: 'second post', blockHeight: 600050, seen: 2000 }
}

// Parse the captured stderr as one JSON error object.
function parseStderrError (world) {
  try {
    return JSON.parse(world.getPostStderr)
  } catch (err) {
    throw new Error(`Expected a JSON error on stderr, got "${world.getPostStderr}"`)
  }
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
      assertEqual(world.getPostExitCode, 2, 'memo-get-post exit code')
      assertEqual(parseStderrError(world).error, resolveParam(m[1], example), 'usage error', { quote: true })
    }
  },
  {
    name: 'command reported the post fields',
    pattern: /^the command reported the post "(.+)" with text "(.+)" and address "(.+)"$/,
    run (m, example, world) {
      const post = world.getPostJson?.post
      if (!post) {
        throw new Error('Expected a reported post')
      }
      assertEqual(post.txid, resolveParam(m[1], example), 'post txid', { quote: true })
      assertEqual(post.text, resolveParam(m[2], example), 'post text', { quote: true })
      assertEqual(post.addr, resolveParam(m[3], example), 'post address', { quote: true })
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
      assertEqual(world.getPostExitCode, 1, 'memo-get-post exit code')
      const error = parseStderrError(world).error || ''
      if (!error.toLowerCase().includes('not found')) {
        throw new Error(`Expected a not-found error, got "${error}"`)
      }
    }
  },
  {
    name: 'memo-get-post command reported an error',
    pattern: /^the memo-get-post command reported an error$/,
    run (m, example, world) {
      assertEqual(world.getPostExitCode, 1, 'memo-get-post exit code')
      if (!parseStderrError(world).error) {
        throw new Error(`Expected an error message on stderr, got "${world.getPostStderr}"`)
      }
    }
  }
]

export { memoGetPostHandlers }
