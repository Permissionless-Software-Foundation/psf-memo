/*
  Gherkin step handlers for the CLI JSON Output feature (AF2).

  These scenarios run the real wallet, send, and signing commands with injected
  fakes and captured streams, proving every command supports --json with a
  single JSON object, exit 2 for usage errors, exit 1 for runtime errors, and
  unchanged human output.
*/

// Local libraries
import WalletCreate from '../../../src/commands/wallet-create.js'
import WalletList from '../../../src/commands/wallet-list.js'
import WalletAddrs from '../../../src/commands/wallet-addrs.js'
import WalletBalance from '../../../src/commands/wallet-balance.js'
import WalletSweep from '../../../src/commands/wallet-sweep.js'
import SendBch from '../../../src/commands/send-bch.js'
import SendTokens from '../../../src/commands/send-tokens.js'
import MsgSign from '../../../src/commands/msg-sign.js'
import MsgVerify from '../../../src/commands/msg-verify.js'
import { captureStream } from '../../../test/support/capture.js'
import { assertEqual, resolveParam, resolveTemplate } from '../step-support.js'

const SECRET_MNEMONIC =
  'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about'
const SECRET_WIF = 'L1fqtLVmksSdUZPcMgpUGMkBmMYGjJQe8dbqhkD8s16eBKCYTYpH'

// A fake wallet that carries public addresses and secret key material, so a
// leaking command would expose the secrets.
function agentWalletInfo (addresses = {}) {
  return {
    cashAddress: addresses.cashAddress || 'bitcoincash:qagent',
    slpAddress: addresses.slpAddress || 'simpleledger:qagent',
    legacyAddress: addresses.legacyAddress || '1Agent',
    mnemonic: SECRET_MNEMONIC,
    privateKey: SECRET_WIF
  }
}

// A minimal wallet stand-in whose secret-material methods are configurable.
export function fakeAgentWallet (world) {
  return {
    walletInfo: world.agentWalletInfo,
    utxos: {
      utxoStore: {
        bchUtxos: [{ value: world.bchBalanceSats }],
        slpUtxos: {
          type1: { tokens: world.bchTokens || [], mintBatons: [] },
          group: { tokens: [], mintBatons: [] },
          nft: { tokens: [] }
        }
      }
    },
    bchjs: {
      BitcoinCash: {
        toBitcoinCash: (sats) => sats / 1e8,
        toSatoshi: (bch) => Math.round(bch * 1e8),
        signMessageWithPrivKey: () => world.signature
      }
    },
    async initialize () { return true },
    async getBalance () { return world.bchBalance },
    async send () {
      if (world.runtimeError) throw new Error(world.runtimeError)
      return world.bchTxid
    },
    async sendTokens () {
      if (world.runtimeError) throw new Error(world.runtimeError)
      return world.tokenTxid
    }
  }
}

// Initialize the scenario world for a CLI JSON Output scenario.
function initCliWorld (world, command) {
  world.cliCommand = command
  world.cliFlags = {}
  world.agentWalletInfo = agentWalletInfo()
  world.walletStore = []
  world.bchBalanceSats = 0
  world.bchBalance = 0
  world.bchTokens = []
  world.bchTxid = 'tx'
  world.tokenTxid = 'tx'
  world.tokenId = 'token-id'
  world.sweepTxid = 'tx'
  world.sweepWif = 'wif'
  world.signature = 'SIGNATURE'
  world.verifyResult = true
  world.runtimeError = null
  world.cliJson = null
  world.exitCode = null
  world.stdoutText = ''
  world.stderrText = ''
}

// Build the command named on the world with capture streams and fake deps.
function buildCommand (world, stdout, stderr) {
  const walletUtil = {
    instanceWallet: async () => {
      if (world.runtimeError && ['wallet-balance', 'msg-sign'].includes(world.cliCommand)) {
        throw new Error(world.runtimeError)
      }
      return fakeAgentWallet(world)
    },
    instanceWalletFromWif: async () => fakeAgentWallet(world)
  }

  const deps = { stdout, stderr }

  switch (world.cliCommand) {
    case 'wallet-create': {
      class FakeWallet {
        constructor () {
          this.walletInfoPromise = Promise.resolve()
          this.walletInfo = world.agentWalletInfo
        }
      }
      return new WalletCreate({
        BchWallet: FakeWallet,
        walletUtil: { saveWallet: async () => true },
        ...deps
      })
    }
    case 'wallet-list': {
      const command = new WalletList(deps)
      command.parseWallets = async () => world.walletStore
      return command
    }
    case 'wallet-addrs':
      return new WalletAddrs({
        readFile: async () => JSON.stringify({ wallet: world.agentWalletInfo }),
        ...deps
      })
    case 'wallet-balance':
      return new WalletBalance({ walletUtil, ...deps })
    case 'wallet-sweep': {
      const command = new WalletSweep({ walletUtil, ...deps })
      command.sweepWif = async () => {
        if (world.runtimeError) throw new Error(world.runtimeError)
        return world.sweepTxid
      }
      return command
    }
    case 'send-bch': {
      const command = new SendBch({ walletUtil, ...deps })
      command.sendBch = async () => {
        if (world.runtimeError) throw new Error(world.runtimeError)
        return world.bchTxid
      }
      return command
    }
    case 'send-tokens': {
      const command = new SendTokens({ walletUtil, ...deps })
      // Provide a matching token balance unless the scenario forces a failure.
      command.getTokenBalances = () => (
        world.runtimeError
          ? []
          : [{ tokenId: world.tokenId, ticker: 'TKN', qty: 42.5 }]
      )
      command.sendTokens = async () => {
        if (world.runtimeError) throw new Error(world.runtimeError)
        return world.tokenTxid
      }
      return command
    }
    case 'msg-sign':
      return new MsgSign({ walletUtil, ...deps })
    case 'msg-verify': {
      const walletClass = class {
        constructor () {
          this.walletInfoPromise = Promise.resolve()
          this.bchjs = {
            BitcoinCash: {
              verifyMessage: () => {
                if (world.runtimeError) throw new Error(world.runtimeError)
                return world.verifyResult
              }
            }
          }
        }
      }
      return new MsgVerify({ BchWallet: walletClass, ...deps })
    }
    default:
      throw new Error(`Unknown CLI command: ${world.cliCommand}`)
  }
}

// Run the selected command in the given output mode with captured streams.
async function runCliCommand (world, json) {
  const out = captureStream()
  const err = captureStream()
  const command = buildCommand(world, out.stream, err.stream)

  world.exitCode = await command.run({ ...world.cliFlags, json })
  process.exitCode = 0

  world.stdoutText = out.text()
  world.stderrText = err.text()
  world.cliJson = null
  try {
    world.cliJson = JSON.parse(world.stdoutText)
  } catch (err2) {
    world.cliJson = null
  }
}

// Build a step handler that asserts a top-level JSON field equals a value.
function jsonFieldHandler ({ name, pattern, field }) {
  return {
    name,
    pattern,
    run (m, example, world) {
      assertEqual(world.cliJson?.[field], resolveParam(m[1], example), `JSON ${field}`, { quote: true })
    }
  }
}

const cliJsonOutputHandlers = [
  {
    name: 'a CLI command',
    pattern: /^the CLI command "(\w[\w-]*)"$/,
    run (m, example, world) {
      initCliWorld(world, m[1])
    }
  },
  {
    name: 'a wallet is created',
    pattern: /^a wallet named "(.+)" is created with description "(.+)"$/,
    run (m, example, world) {
      world.cliFlags = {
        name: resolveParam(m[1], example),
        description: resolveParam(m[2], example)
      }
    }
  },
  {
    name: 'a wallet store holding a wallet',
    pattern: /^a wallet store holding the wallet "([^"]+)" described as "([^"]+)"$/,
    run (m, example, world) {
      world.walletStore = [[resolveParam(m[1], example), resolveParam(m[2], example)]]
    }
  },
  {
    name: 'the wallet has addresses',
    pattern: /^the wallet "(.+)" has cash address "([^"]+)", SLP address "([^"]+)", and legacy address "([^"]+)"$/,
    run (m, example, world) {
      world.agentWalletInfo = agentWalletInfo({
        cashAddress: resolveParam(m[2], example),
        slpAddress: resolveParam(m[3], example),
        legacyAddress: resolveParam(m[4], example)
      })
      world.cliFlags = { name: resolveParam(m[1], example) }
    }
  },
  {
    name: 'the wallet holds BCH and a token',
    pattern: /^the wallet "(.+)" holds (.+) satoshis and the token "([^"]+)" with quantity "(.+)"$/,
    run (m, example, world) {
      world.agentWalletInfo = agentWalletInfo()
      world.cliFlags = { name: resolveParam(m[1], example) }
      world.bchBalanceSats = Number.parseInt(resolveParam(m[2], example), 10)
      world.bchBalance = world.bchBalanceSats / 1e8
      world.bchTokens = [{ tokenId: 'tkn', ticker: resolveParam(m[3], example), qtyStr: resolveParam(m[4], example) }]
    }
  },
  {
    name: 'the wallet-sweep command sweeps a WIF',
    pattern: /^the wallet-sweep command sweeps the WIF "(.+)" to the transaction "(.+)"$/,
    run (m, example, world) {
      world.cliFlags = { name: 'agent', wif: resolveTemplate(m[1], example) }
      world.sweepTxid = resolveTemplate(m[2], example)
    }
  },
  {
    name: 'the send-bch command broadcasts a transaction',
    pattern: /^the send-bch command broadcasts the transaction "(.+)"$/,
    run (m, example, world) {
      world.cliFlags = { name: 'agent', addr: 'bitcoincash:qto', qty: 0.1 }
      world.bchTxid = resolveTemplate(m[1], example)
    }
  },
  {
    name: 'the send-tokens command broadcasts a transaction',
    pattern: /^the send-tokens command broadcasts the transaction "(.+)"$/,
    run (m, example, world) {
      world.cliFlags = { name: 'agent', addr: 'bitcoincash:qto', qty: 0.1, tokenId: world.tokenId }
      world.tokenTxid = resolveTemplate(m[1], example)
    }
  },
  {
    name: 'the msg-sign command signs a message',
    pattern: /^the msg-sign command signs the message "(.+)" with the signature "(.+)"$/,
    run (m, example, world) {
      world.cliFlags = { name: 'agent', msg: resolveParam(m[1], example) }
      world.signature = resolveParam(m[2], example)
    }
  },
  {
    name: 'the msg-verify command verifies a signature',
    pattern: /^the msg-verify command verifies the signature as (.+)$/,
    run (m, example, world) {
      world.cliFlags = { addr: 'bitcoincash:qagent', msg: 'hello memo', sig: 'SIG' }
      world.verifyResult = resolveParam(m[1], example) === 'true'
    }
  },
  {
    name: 'the CLI command without its required flags',
    pattern: /^the CLI command "(.+)" without its required flags$/,
    run (m, example, world) {
      initCliWorld(world, resolveParam(m[1], example))
    }
  },
  {
    name: 'the CLI command whose work fails',
    pattern: /^the CLI command "(.+)" whose work fails with "(.+)"$/,
    run (m, example, world) {
      initCliWorld(world, resolveParam(m[1], example))
      world.runtimeError = resolveTemplate(m[2], example)
      // Provide the required flags so the failure is a runtime one.
      world.cliFlags = {
        name: 'agent',
        wif: 'wif',
        addr: 'bitcoincash:qto',
        qty: 0.1,
        tokenId: world.tokenId,
        msg: 'hello memo',
        sig: 'SIG'
      }
    }
  },
  {
    name: 'the CLI command runs in JSON mode',
    pattern: /^the CLI command runs in JSON mode$/,
    async run (m, example, world) {
      await runCliCommand(world, true)
    }
  },
  {
    name: 'the CLI command runs in human mode',
    pattern: /^the CLI command runs in human mode$/,
    async run (m, example, world) {
      await runCliCommand(world, false)
    }
  },
  jsonFieldHandler({ name: 'JSON output has the wallet name', pattern: /^the JSON output has the wallet name "(.+)"$/, field: 'name' }),
  jsonFieldHandler({ name: 'JSON output has the wallet description', pattern: /^the JSON output has the wallet description "(.+)"$/, field: 'description' }),
  jsonFieldHandler({ name: 'JSON output has the cash address', pattern: /^the JSON output has the cash address "(.+)"$/, field: 'cashAddress' }),
  jsonFieldHandler({ name: 'JSON output has the SLP address', pattern: /^the JSON output has the SLP address "(.+)"$/, field: 'slpAddress' }),
  jsonFieldHandler({ name: 'JSON output has the legacy address', pattern: /^the JSON output has the legacy address "(.+)"$/, field: 'legacyAddress' }),
  jsonFieldHandler({ name: 'JSON output has the transaction', pattern: /^the JSON output has the transaction "(.+)"$/, field: 'txid' }),
  jsonFieldHandler({ name: 'JSON output has the explorer link', pattern: /^the JSON output has the explorer link "(.+)"$/, field: 'explorerUrl' }),
  jsonFieldHandler({ name: 'JSON output has the signature', pattern: /^the JSON output has the signature "(.+)"$/, field: 'signature' }),
  {
    name: 'JSON output does not have a field',
    pattern: /^the JSON output does not have the field "(.+)"$/,
    run (m, example, world) {
      const field = resolveParam(m[1], example)
      if (world.cliJson && field in world.cliJson) {
        throw new Error(`Expected JSON not to have the field "${field}", got "${world.stdoutText}"`)
      }
    }
  },
  {
    name: 'JSON output lists a wallet',
    pattern: /^the JSON output lists the wallet "([^"]+)" described as "([^"]+)"$/,
    run (m, example, world) {
      const name = resolveParam(m[1], example)
      const wallet = (world.cliJson?.wallets || []).find((entry) => entry.name === name)
      if (!wallet) {
        throw new Error(`Expected a listed wallet "${name}", got "${world.stdoutText}"`)
      }
      assertEqual(wallet.description, resolveParam(m[2], example), 'wallet description', { quote: true })
    }
  },
  {
    name: 'JSON output has the BCH balance',
    pattern: /^the JSON output has the BCH balance (.+)$/,
    run (m, example, world) {
      assertEqual(world.cliJson?.bchBalance, Number(resolveParam(m[1], example)), 'BCH balance')
    }
  },
  {
    name: 'JSON output has a token and quantity',
    pattern: /^the JSON output has the token "([^"]+)" with quantity (.+)$/,
    run (m, example, world) {
      const ticker = resolveParam(m[1], example)
      const token = (world.cliJson?.tokens || []).find((entry) => entry.ticker === ticker)
      if (!token) {
        throw new Error(`Expected a reported token "${ticker}", got "${world.stdoutText}"`)
      }
      assertEqual(token.qty, Number(resolveParam(m[2], example)), 'token quantity')
    }
  },
  {
    name: 'JSON output has the verification result',
    pattern: /^the JSON output has the verification result (.+)$/,
    run (m, example, world) {
      assertEqual(world.cliJson?.valid, resolveParam(m[1], example) === 'true', 'verification result')
    }
  },
  {
    name: 'JSON output does not contain',
    pattern: /^the JSON output does not contain "(.+)"$/,
    run (m, example, world) {
      const secret = resolveTemplate(m[1], example)
      if (world.stdoutText.includes(secret)) {
        throw new Error(`Expected JSON output not to contain "${secret}", got "${world.stdoutText}"`)
      }
    }
  }
]

export { cliJsonOutputHandlers }
