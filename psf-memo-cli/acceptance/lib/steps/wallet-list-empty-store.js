/*
  Gherkin step handlers for the CLI Wallet List Empty Store feature (F5).

  These scenarios run the real wallet-list command with an injected wallet
  store adapter and captured streams, pinning a clean "No wallets found."
  result with no shell error on stderr -- including when the wallet directory
  has never been created. The exit-code, stdout/stderr, and JSON-object
  assertions are shared with the output-contract steps.
*/

// Local libraries
import WalletList from '../../../src/commands/wallet-list.js'
import { captureStream } from '../../../test/support/capture.js'

// Reset the output-contract fields and install the store adapter for a
// wallet-list scenario.
function initWalletListWorld (world, readdir) {
  world.walletListReaddir = readdir
  world.exitCode = null
  world.stdoutText = ''
  world.stderrText = ''
}

// Run the real wallet-list command against the scenario's store and capture its
// output.
async function runWalletList (world, json) {
  const out = captureStream()
  const err = captureStream()

  const command = new WalletList({
    readdir: world.walletListReaddir,
    stdout: out.stream,
    stderr: err.stream
  })

  world.exitCode = await command.run({ json })
  process.exitCode = 0

  world.stdoutText = out.text()
  world.stderrText = err.text()
}

const walletListEmptyStoreHandlers = [
  {
    name: 'a wallet store with no wallets',
    pattern: /^a wallet store with no wallets$/,
    run (m, example, world) {
      initWalletListWorld(world, async () => [])
    }
  },
  {
    name: 'the wallet store directory does not exist',
    pattern: /^the wallet store directory does not exist$/,
    run (m, example, world) {
      initWalletListWorld(world, async () => {
        throw Object.assign(new Error('ENOENT: no such file or directory'), { code: 'ENOENT' })
      })
    }
  },
  {
    name: 'wallet-list runs in human mode',
    pattern: /^wallet-list runs in human mode$/,
    async run (m, example, world) {
      await runWalletList(world, false)
    }
  },
  {
    name: 'wallet-list runs in JSON mode',
    pattern: /^wallet-list runs in JSON mode$/,
    async run (m, example, world) {
      await runWalletList(world, true)
    }
  },
  {
    name: 'the JSON output lists no wallets',
    pattern: /^the JSON output lists no wallets$/,
    run (m, example, world) {
      const parsed = JSON.parse(world.stdoutText)
      if (!Array.isArray(parsed.wallets) || parsed.wallets.length !== 0) {
        throw new Error(`Expected no wallets, got "${world.stdoutText}"`)
      }
    }
  }
]

export { walletListEmptyStoreHandlers }
