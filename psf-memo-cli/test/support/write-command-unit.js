/*
  Shared unit-test helpers for the memo-* write commands.

  Each write-command unit test drives the real command class against injected
  wallet and broadcast fakes. This module owns the fake wallet factory, the
  recording broadcast fake, and the shared usage-error assertion so each
  command's test file keeps only its command-specific action and field
  assertions. Kept under test/support so it stays a helper, not a test.
*/

// Global npm libraries
import { assert } from 'chai'

// Local libraries
import { captureStream } from './capture.js'
import { UsageError } from '../../src/lib/reporter.js'

const TXID = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef'
const EXPLORER = `https://bch.loping.net/tx/${TXID}`

// A minimal wallet stand-in holding a cash address. `initialize` refreshes
// UTXOs for commands that read the spendable balance.
export function fakeWallet (address = 'bitcoincash:qwallet') {
  const wallet = {
    walletInfo: { cashAddress: address },
    initialized: false,
    async initialize () {
      wallet.initialized = true
    }
  }
  return wallet
}

// A wallet factory that returns one wallet regardless of the requested name/WIF.
export function walletUtilFor (wallet = fakeWallet()) {
  return {
    instanceWallet: async () => wallet,
    instanceWalletFromWif: async () => wallet
  }
}

// Build a command of `CommandClass` whose broadcast records its call and
// resolves the default result, or throws the supplied error.
export function makeCommand (CommandClass, { broadcast } = {}) {
  const out = captureStream()
  const err = captureStream()
  const calls = []
  const command = new CommandClass({
    walletUtil: walletUtilFor(),
    broadcast:
      broadcast ||
      (async (args) => {
        calls.push(args)
        return { txid: TXID, explorerUrl: EXPLORER }
      }),
    stdout: out.stream,
    stderr: err.stream
  })
  return { command, out, err, calls }
}

// Run a command with the given flags in JSON mode and assert a usage error
// (exit 2) that never reaches the broadcaster.
export async function assertUsageError (CommandClass, flags, expected) {
  const { command, err, calls } = makeCommand(CommandClass)

  const code = await command.run({ json: true, ...flags })

  assert.equal(code, 2)
  assert.deepEqual(JSON.parse(err.text()), { error: expected })
  assert.equal(calls.length, 0)
}

// Assert a command surfaces a thrown broadcast error as exit 1 with the error
// echoed on stderr and nothing on stdout. `makeCmd` receives the broadcast
// override and returns { command, out, err, ... }.
export async function assertBroadcastErrorSurfaces (makeCmd, flags) {
  const { command, out, err } = makeCmd({
    broadcast: async () => {
      throw new Error('insufficient funds')
    }
  })

  const code = await command.run({ json: true, ...flags })

  assert.equal(code, 1)
  assert.equal(out.text(), '')
  assert.deepEqual(JSON.parse(err.text()), { error: 'insufficient funds' })
}

// Assert a successful human-mode run prints the txid and explorer link as text,
// not JSON.
export async function assertHumanMode (makeCmd, flags) {
  const { command, out } = makeCmd()

  const code = await command.run(flags)

  assert.equal(code, 0)
  assert.include(out.text(), TXID)
  assert.include(out.text(), EXPLORER)
  assert.throws(() => JSON.parse(out.text()))
}

// Assert a command accepts its happy-path flags and rejects empty flags as a
// usage error before any broadcast.
export function assertValidatesFlags (CommandClass, validFlags) {
  const command = new CommandClass({ walletUtil: walletUtilFor() })

  assert.equal(command.validateFlags(validFlags), true)
  assert.throws(() => command.validateFlags({}), UsageError)
}

export { TXID, EXPLORER }
