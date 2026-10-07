/*
  Gherkin step handlers for the Memo Post feature.

  The scenario world supplies a wallet factory that maps a saved-wallet name to
  a wallet which records the OP_RETURN pushes it receives. Each scenario runs
  the real memo-post command in JSON mode through the real wallet resolver and
  broadcast scaffolding, so the 0x6d02 action, the character limit, the usage
  errors, and the broadcast-error contract are exercised without a network or a
  real key.
*/

// Local libraries
import MemoPost from '../../../src/commands/memo-post.js'
import { captureStream } from '../../../test/support/capture.js'
import { assertUsageError, parseStderrError } from '../read-command.js'
import { assertEqual, resolveParam, resolveUrlTemplate } from '../step-support.js'
import { createRecordingWallet } from '../wallet-support.js'

function lookupMemoWallet (world, key, kind) {
  if (!(key in world.memoWallets)) {
    throw new Error(`Unknown ${kind} ${key}`)
  }
  return world.memoWallets[key]
}

const memoPostHandlers = [
  {
    name: 'a Memo post command',
    pattern: /^a Memo post command$/,
    run (m, example, world) {
      world.memoWallets = {}
      world.memoSource = {}
      world.memoText = undefined
      world.walletUtil = {
        instanceWallet: (name) => lookupMemoWallet(world, name, 'wallet'),
        instanceWalletFromWif: (wif) => lookupMemoWallet(world, wif, 'wif')
      }
      world.broadcast = null
      world.broadcastCount = 0
      world.broadcastTxid = 'memo-post-txid'
      world.broadcastError = null
      world.postExitCode = null
      world.postStdout = ''
      world.postStderr = ''
      world.postJson = null
    }
  },
  {
    name: 'a signing wallet that records broadcasts',
    pattern: /^a signing wallet that records broadcasts$/,
    run (m, example, world) {
      world.memoWallets['memo-wallet'] =
        createRecordingWallet(world, { cashAddress: 'bitcoincash:qmemo-post' })
      world.memoSource = { name: 'memo-wallet' }
    }
  },
  {
    name: 'no signing wallet is selected',
    pattern: /^no signing wallet is selected$/,
    run (m, example, world) {
      world.memoSource = {}
    }
  },
  {
    name: 'signing wallet returns a txid',
    pattern: /^the signing wallet returns the transaction id "(.+)"$/,
    run (m, example, world) {
      world.broadcastTxid = resolveParam(m[1], example)
    }
  },
  {
    name: 'signing wallet rejects the broadcast',
    pattern: /^the signing wallet rejects the broadcast with the error "(.+)"$/,
    run (m, example, world) {
      world.broadcastError = resolveParam(m[1], example)
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
      const stdout = captureStream()
      const stderr = captureStream()
      const command = new MemoPost({
        walletUtil: world.walletUtil,
        stdout: stdout.stream,
        stderr: stderr.stream
      })

      world.postExitCode = await command.run({
        json: true,
        memo: world.memoText,
        ...world.memoSource
      })
      process.exitCode = 0

      world.postStdout = stdout.text()
      world.postStderr = stderr.text()
      world.postJson = null
      try {
        world.postJson = JSON.parse(world.postStdout)
      } catch (err) {
        world.postJson = null
      }
    }
  },
  {
    name: 'broadcast push 2 has bytes',
    pattern: /^broadcast push 2 has (.+) bytes$/,
    run (m, example, world) {
      const bytes = world.broadcast?.pushes?.[1]?.length
      assertEqual(bytes, Number.parseInt(resolveParam(m[1], example), 10), 'push 2 byte length')
    }
  },
  {
    name: 'command reported the transaction id',
    pattern: /^the command reported the transaction id "(.+)"$/,
    run (m, example, world) {
      assertEqual(world.postJson?.txid, resolveParam(m[1], example), 'txid', { quote: true })
    }
  },
  {
    name: 'command reported the explorer link',
    pattern: /^the command reported the explorer link "(.+)"$/,
    run (m, example, world) {
      assertEqual(world.postJson?.explorerUrl, resolveUrlTemplate(m[1], example), 'explorer link')
    }
  },
  {
    name: 'the wallet did not broadcast',
    pattern: /^the wallet did not broadcast$/,
    run (m, example, world) {
      assertEqual(world.broadcastCount, 0, 'broadcast count')
    }
  },
  {
    name: 'memo-post command reported the usage error',
    pattern: /^the memo-post command reported the usage error "(.+)"$/,
    run (m, example, world) {
      assertUsageError(world, 'post', 'memo-post', resolveParam(m[1], example))
    }
  },
  {
    name: 'memo-post command reported the error',
    pattern: /^the memo-post command reported the error "(.+)"$/,
    run (m, example, world) {
      assertEqual(world.postExitCode, 1, 'memo-post exit code')
      assertEqual(parseStderrError(world, 'post').error, resolveParam(m[1], example), 'error', { quote: true })
    }
  }
]

export { memoPostHandlers }
