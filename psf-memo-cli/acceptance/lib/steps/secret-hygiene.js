/*
  Gherkin step handlers for the Secret Hygiene feature (X3).

  These scenarios prove that no command prints key material. The wallet-sweep
  and wallet-list scenarios run the real commands with a recording console; the
  wallet-relative scenario runs the real memo-following command in JSON mode
  with a fake wallet that carries a mnemonic and a WIF, so any leaked wallet
  fields would appear in the captured output.
*/

// Global npm libraries
import { promises as fs } from 'node:fs'
import path from 'node:path'

// Local libraries
import WalletSweep from '../../../src/commands/wallet-sweep.js'
import WalletList from '../../../src/commands/wallet-list.js'
import MemoFollowing from '../../../src/commands/memo-following.js'
import { captureStream } from '../../../test/support/capture.js'
import { resolveTemplate } from '../step-support.js'

const WALLETS_DIR = path.resolve(import.meta.dirname, '..', '..', '..', '.wallets')

// A wallet stand-in that carries the key material a real resolved wallet
// holds, so a leaking command would expose it.
const SECRET_MNEMONIC =
  'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about'

function walletWithSecrets (cashAddress, wif) {
  return {
    walletInfo: {
      cashAddress,
      mnemonic: SECRET_MNEMONIC,
      privateKey: wif
    }
  }
}

// Replace console.log/console.error with a recording sink for the duration of
// the asynchronous command, then restore them and return everything printed.
async function captureConsole (fn) {
  const chunks = []
  const original = { log: console.log, error: console.error }
  console.log = (...args) => chunks.push(args.join(' '))
  console.error = (...args) => chunks.push(args.join(' '))
  try {
    await fn()
  } finally {
    console.log = original.log
    console.error = original.error
  }
  return chunks.join('\n')
}

// Run the real wallet-sweep command with a fake wallet and a stubbed sweep, so
// only the command's own output path is exercised.
async function runWalletSweep (world) {
  const sweep = new WalletSweep()
  sweep.walletUtil = {
    instanceWallet: async () => walletWithSecrets('bitcoincash:qwallet', 'wallet-private-key')
  }
  sweep.sweepWif = async () => world.sweepTxid

  world.sweepOutput = await captureConsole(() =>
    sweep.run({ name: 'wallet1', wif: world.sweepWif })
  )
}

// Run the real memo-following command in JSON mode against a fake wallet and a
// fake Memo DB client, capturing the command's stdout.
async function runWalletRelativeJson (world) {
  const stdout = captureStream()
  const stderr = captureStream()

  class FakeMemoDb {
    async getFollowing () {
      return { following: ['bitcoincash:qfollowee'] }
    }
  }

  const command = new MemoFollowing({
    walletUtil: {
      instanceWallet: async () => walletWithSecrets('bitcoincash:qwallet', world.secretWif),
      instanceWalletFromWif: async () => walletWithSecrets('bitcoincash:qwallet', world.secretWif)
    },
    MemoDbClass: FakeMemoDb,
    stdout: stdout.stream,
    stderr: stderr.stream
  })

  await command.run({ wif: world.secretWif, json: true })
  process.exitCode = 0
  world.jsonResult = stdout.text()
}

// Write a wallet file for wallet-list to discover, then run the real command
// and remove the file.
async function runWalletList (world) {
  await fs.mkdir(WALLETS_DIR, { recursive: true })
  await fs.writeFile(
    world.walletListFile,
    JSON.stringify({
      wallet: { mnemonic: world.walletMnemonic, description: 'hygiene test wallet' }
    })
  )

  try {
    const list = new WalletList()
    world.walletListOutput = await captureConsole(() => list.run())
  } finally {
    await fs.rm(world.walletListFile, { force: true })
  }
}

const secretHygieneHandlers = [
  {
    name: 'a wallet sweep reports a transaction id',
    pattern: /^a wallet sweep of the WIF "(.+)" reports the transaction id "(.+)"$/,
    run (m, example, world) {
      world.sweepWif = resolveTemplate(m[1], example)
      world.sweepTxid = resolveTemplate(m[2], example)
      world.sweepOutput = ''
    }
  },
  {
    name: 'the wallet-sweep command runs',
    pattern: /^the wallet-sweep command runs$/,
    async run (m, example, world) {
      await runWalletSweep(world)
    }
  },
  {
    name: 'the wallet-sweep output does not contain',
    pattern: /^the wallet-sweep output does not contain "(.+)"$/,
    run (m, example, world) {
      const secret = resolveTemplate(m[1], example)
      if (world.sweepOutput.includes(secret)) {
        throw new Error(`Expected wallet-sweep output not to contain "${secret}", got "${world.sweepOutput}"`)
      }
    }
  },
  {
    name: 'the wallet-sweep output contains the transaction id',
    pattern: /^the wallet-sweep output contains the transaction id "(.+)"$/,
    run (m, example, world) {
      const txid = resolveTemplate(m[1], example)
      if (!world.sweepOutput.includes(txid)) {
        throw new Error(`Expected wallet-sweep output to contain "${txid}", got "${world.sweepOutput}"`)
      }
    }
  },
  {
    name: 'a wallet-relative memo command resolves the WIF',
    pattern: /^a wallet-relative memo command resolves the WIF "(.+)"$/,
    run (m, example, world) {
      world.secretWif = resolveTemplate(m[1], example)
      world.jsonResult = ''
    }
  },
  {
    name: 'the wallet-relative command runs in JSON mode',
    pattern: /^the wallet-relative command runs in JSON mode$/,
    async run (m, example, world) {
      await runWalletRelativeJson(world)
    }
  },
  {
    name: 'the JSON result does not contain',
    pattern: /^the JSON result does not contain "(.+)"$/,
    run (m, example, world) {
      const secret = resolveTemplate(m[1], example)
      if (world.jsonResult.includes(secret)) {
        throw new Error(`Expected JSON result not to contain "${secret}", got "${world.jsonResult}"`)
      }
    }
  },
  {
    name: 'a wallet store holding a wallet with a mnemonic',
    pattern: /^a wallet store holding a wallet named "(.+)" with the mnemonic "(.+)"$/,
    run (m, example, world) {
      world.walletName = resolveTemplate(m[1], example)
      world.walletMnemonic = resolveTemplate(m[2], example)
      world.walletListFile = path.join(WALLETS_DIR, `${world.walletName}.json`)
      world.walletListOutput = ''
    }
  },
  {
    name: 'the wallet-list command runs',
    pattern: /^the wallet-list command runs$/,
    async run (m, example, world) {
      await runWalletList(world)
    }
  },
  {
    name: 'the wallet-list output does not contain',
    pattern: /^the wallet-list output does not contain "(.+)"$/,
    run (m, example, world) {
      const secret = resolveTemplate(m[1], example)
      if (world.walletListOutput.includes(secret)) {
        throw new Error(`Expected wallet-list output not to contain "${secret}", got "${world.walletListOutput}"`)
      }
    }
  },
  {
    name: 'the wallet-list output contains',
    pattern: /^the wallet-list output contains "(.+)"$/,
    run (m, example, world) {
      const expected = resolveTemplate(m[1], example)
      if (!world.walletListOutput.includes(expected)) {
        throw new Error(`Expected wallet-list output to contain "${expected}", got "${world.walletListOutput}"`)
      }
    }
  }
]

export { secretHygieneHandlers }
