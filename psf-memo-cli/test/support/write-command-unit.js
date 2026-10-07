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

const TXID = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef'
const EXPLORER = `https://bch.loping.net/tx/${TXID}`

// A minimal wallet stand-in holding a cash address.
export function fakeWallet (address = 'bitcoincash:qwallet') {
  return { walletInfo: { cashAddress: address } }
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

export { TXID, EXPLORER }
