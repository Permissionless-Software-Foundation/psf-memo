/*
  Gherkin step handlers for the Memo Identity feature.

  The scenario world supplies a wallet factory (mapping a saved-wallet name to
  a fake wallet with BCH/SLP UTXOs) and serves the address's name, profile
  text, and avatar through the same fake fetch used by the other Memo DB step
  handlers. Each scenario runs the real memo-identity command in JSON mode so
  its reported identity can be asserted from the captured stdout.
*/

// Local libraries
import MemoIdentity from '../../../src/commands/memo-identity.js'
import { runReadCommand, installWalletFactory, assertUsageError, assertReadCommandError } from '../read-command.js'
import { assertEqual, resolveParam } from '../step-support.js'

// Build a fake wallet with the given cash address and UTXOs.
function makeFakeWallet (address, { bchSats = 0, tokenUtxos = [] } = {}) {
  return {
    walletInfo: { cashAddress: address },
    utxos: {
      utxoStore: {
        bchUtxos: [{ value: bchSats }],
        slpUtxos: {
          type1: { tokens: tokenUtxos },
          group: { tokens: [] },
          nft: { tokens: [] }
        }
      }
    },
    async initialize () {
      return true
    }
  }
}

// Parse "TKN:100,TKN:50" into SLP token UTXOs. The ticker doubles as the
// tokenId, since the fixture groups token ids by ticker.
function parseTokenUtxos (spec) {
  if (!spec) return []

  return spec.split(',').map((entry) => {
    const [ticker, qty] = entry.split(':')
    const name = ticker.trim()

    return { ticker: name, tokenId: name, qtyStr: qty.trim() }
  })
}

// Register the scenario's wallet under one saved name and select it as the
// command's wallet source.
function registerWallet (world, address, walletOptions) {
  world.identityWallets['identity-wallet'] = makeFakeWallet(address, walletOptions)
  world.identitySource = { name: 'identity-wallet' }
}

const memoIdentityHandlers = [
  {
    name: 'a Memo identity command',
    pattern: /^a Memo identity command$/,
    run (m, example, world) {
      installWalletFactory(world, 'identity')
    }
  },
  {
    name: 'a wallet with BCH UTXOs',
    pattern: /^a wallet with the address "(.+)" and BCH UTXOs totaling (.+) satoshis$/,
    run (m, example, world) {
      registerWallet(world, resolveParam(m[1], example), {
        bchSats: Number.parseInt(resolveParam(m[2], example), 10)
      })
    }
  },
  {
    name: 'a wallet with token UTXOs',
    pattern: /^a wallet with the address "(.+)" and token UTXOs "(.+)"$/,
    run (m, example, world) {
      registerWallet(world, resolveParam(m[1], example), {
        tokenUtxos: parseTokenUtxos(resolveParam(m[2], example))
      })
    }
  },
  {
    name: 'a wallet with an address',
    pattern: /^a wallet with the address "(.+)"$/,
    run (m, example, world) {
      registerWallet(world, resolveParam(m[1], example), {})
    }
  },
  {
    name: 'service serves the identity profile',
    pattern: /^the Memo DB service serves name "(.+)", profile text "(.+)", and avatar "(.+)" for "(.+)"$/,
    run (m, example, world) {
      const addr = resolveParam(m[4], example)
      world.nameStore[addr] = { addr, name: resolveParam(m[1], example) }
      world.profileStore[addr] = { addr, text: resolveParam(m[2], example) }
      world.profilePicStore[addr] = { addr, url: resolveParam(m[3], example) }
    }
  },
  {
    name: 'service has no identity profile',
    pattern: /^the Memo DB service has no name, profile text, or avatar for "(.+)"$/,
    run (m, example, world) {
      const addr = resolveParam(m[1], example)
      world.nameStore[addr] = null
      world.profileStore[addr] = null
      world.profilePicStore[addr] = null
    }
  },
  {
    name: 'service fails the identity profile request',
    pattern: /^the Memo DB service fails the identity profile request$/,
    run (m, example, world) {
      world.unreachable = true
    }
  },
  {
    name: 'memo-identity command runs',
    pattern: /^the memo-identity command runs$/,
    async run (m, example, world) {
      await runReadCommand(
        world,
        MemoIdentity,
        'identity',
        { ...world.identitySource },
        { walletUtil: world.walletUtil }
      )
    }
  },
  {
    name: 'command reported the address',
    pattern: /^the command reported the address "(.+)"$/,
    run (m, example, world) {
      assertEqual(world.identityJson?.address, resolveParam(m[1], example), 'address', { quote: true })
    }
  },
  {
    name: 'command reported the BCH balance',
    pattern: /^the command reported the BCH balance (.+)$/,
    run (m, example, world) {
      assertEqual(world.identityJson?.bchBalance, Number.parseFloat(resolveParam(m[1], example)), 'BCH balance')
    }
  },
  {
    name: 'command reported the token balances',
    pattern: /^the command reported the token balances "(.+)"$/,
    run (m, example, world) {
      const actual = (world.identityJson?.tokens || [])
        .map((token) => `${token.ticker}:${token.qty}`)
        .join(', ')
      assertEqual(actual, resolveParam(m[1], example), 'token balances', { quote: true })
    }
  },
  {
    name: 'command reported the identity profile',
    pattern: /^the command reported the identity name "(.+)", bio "(.+)", and avatar "(.+)"$/,
    run (m, example, world) {
      assertEqual(world.identityJson?.name, resolveParam(m[1], example), 'name', { quote: true })
      assertEqual(world.identityJson?.bio, resolveParam(m[2], example), 'bio', { quote: true })
      assertEqual(world.identityJson?.avatar, resolveParam(m[3], example), 'avatar', { quote: true })
    }
  },
  {
    name: 'command reported unset profile fields',
    pattern: /^the command reported unset profile fields$/,
    run (m, example, world) {
      assertEqual(world.identityJson?.name, '', 'name')
      assertEqual(world.identityJson?.bio, '', 'bio')
      assertEqual(world.identityJson?.avatar, '', 'avatar')
    }
  },
  {
    name: 'memo-identity command reported the usage error',
    pattern: /^the memo-identity command reported the usage error "(.+)"$/,
    run (m, example, world) {
      assertUsageError(world, 'identity', 'memo-identity', resolveParam(m[1], example))
    }
  },
  {
    name: 'memo-identity command reported an error',
    pattern: /^the memo-identity command reported an error$/,
    run (m, example, world) {
      assertReadCommandError(world, 'identity', 'memo-identity')
    }
  }
]

export { memoIdentityHandlers }
