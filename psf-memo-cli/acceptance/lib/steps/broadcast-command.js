/*
  Shared Gherkin step handlers for the memo-* broadcast write commands.

  Every write command resolves the same shared wallet source, broadcasts through
  the same recording wallet, and reports the same transaction id plus explorer
  link. These handlers use a common world shape so each feature module only adds
  its command-specific setup, limit, and error steps.

  Common world fields:
    commandWallets   saved wallets the fake factory can look up
    commandSource    the { name } | { wif } wallet source for the current run
    walletUtil       the injected wallet factory
    broadcast        the last recorded { prefix, pushes, bchOutput }
    broadcastCount   how many times the wallet broadcast
    broadcastTxid    the txid the wallet returns
    broadcastError   the error the wallet throws, if any
    resultExitCode   the command's exit code (0/1/2)
    resultStdout     captured stdout
    resultStderr     captured stderr
    resultJson       parsed stdout, or null
*/

// Local libraries
import { captureStream } from '../../../test/support/capture.js'
import { createRecordingWallet } from '../wallet-support.js'
import {
  assertEqual,
  resolveParam,
  resolveUrlTemplate
} from '../step-support.js'

function lookupWallet (world, key, kind) {
  if (!(key in world.commandWallets)) {
    throw new Error(`Unknown ${kind} ${key}`)
  }
  return world.commandWallets[key]
}

// Initialize the shared write-command world. `txid` seeds the transaction id the
// fake wallet returns before a scenario overrides it.
export function initCommandWorld (world, { txid } = {}) {
  world.commandWallets = {}
  world.commandSource = {}
  world.walletUtil = {
    instanceWallet: (name) => lookupWallet(world, name, 'wallet'),
    instanceWalletFromWif: (wif) => lookupWallet(world, wif, 'wif')
  }
  world.broadcast = null
  world.broadcastCount = 0
  world.broadcastTxid = txid
  world.broadcastError = null
  world.resultExitCode = null
  world.resultStdout = ''
  world.resultStderr = ''
  world.resultJson = null
}

// Run the command class in JSON mode with the world's wallet factory and the
// supplied flags, capturing the exit code, streams, and parsed stdout.
export async function runCommandInWorld (world, CommandClass, flags = {}) {
  const stdout = captureStream()
  const stderr = captureStream()
  const command = new CommandClass({
    walletUtil: world.walletUtil,
    stdout: stdout.stream,
    stderr: stderr.stream
  })

  world.resultExitCode = await command.run({ json: true, ...flags })
  process.exitCode = 0

  world.resultStdout = stdout.text()
  world.resultStderr = stderr.text()
  world.resultJson = null
  try {
    world.resultJson = JSON.parse(world.resultStdout)
  } catch (err) {
    world.resultJson = null
  }
}

const broadcastCommandHandlers = [
  {
    name: 'a signing wallet that records broadcasts',
    pattern: /^a signing wallet that records broadcasts$/,
    run (m, example, world) {
      world.commandWallets['command-wallet'] =
        createRecordingWallet(world, { cashAddress: 'bitcoincash:qcommand' })
      world.commandSource = { name: 'command-wallet' }
    }
  },
  {
    name: 'no signing wallet is selected',
    pattern: /^no signing wallet is selected$/,
    run (m, example, world) {
      world.commandSource = {}
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
    name: 'command reported the transaction id',
    pattern: /^the command reported the transaction id "(.+)"$/,
    run (m, example, world) {
      assertEqual(world.resultJson?.txid, resolveParam(m[1], example), 'txid', { quote: true })
    }
  },
  {
    name: 'command reported the explorer link',
    pattern: /^the command reported the explorer link "(.+)"$/,
    run (m, example, world) {
      assertEqual(world.resultJson?.explorerUrl, resolveUrlTemplate(m[1], example), 'explorer link')
    }
  },
  {
    name: 'the wallet did not broadcast',
    pattern: /^the wallet did not broadcast$/,
    run (m, example, world) {
      assertEqual(world.broadcastCount, 0, 'broadcast count')
    }
  }
]

export { broadcastCommandHandlers }
