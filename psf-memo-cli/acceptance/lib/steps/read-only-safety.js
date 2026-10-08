/*
  Gherkin step handlers for the Read-Only Safety feature (X4).

  A recording wallet resolver proves which read commands touch the wallet
  boundary. The viewer-independent reads (memo-feed, memo-status, memo-profile)
  run with no wallet available and never call the resolver; the wallet-relative
  read (memo-notifications) resolves exactly the wallet it is given, and a
  missing wallet is a runtime error rather than a silent empty result.
*/

// Local libraries
import MemoNotifications from '../../../src/commands/memo-notifications.js'
import { runReadCommand } from '../read-command.js'
import { assertEqual, resolveParam } from '../step-support.js'

// Install a resolver on the world that records every call and serves only the
// wallets registered by later steps. An unknown name is an error, standing in
// for a missing wallet file.
function installRecordingWalletResolver (world) {
  world.wallets = {}
  world.walletResolverCalls = 0
  world.walletUtil = {
    instanceWallet: async (name) => {
      world.walletResolverCalls++
      if (!(name in world.wallets)) {
        throw new Error(`Unknown wallet ${name}`)
      }
      return world.wallets[name]
    },
    instanceWalletFromWif: async (wif) => {
      world.walletResolverCalls++
      if (!(wif in world.wallets)) {
        throw new Error(`Unknown wif ${wif}`)
      }
      return world.wallets[wif]
    }
  }
}

const readOnlySafetyHandlers = [
  {
    name: 'a recording wallet resolver',
    pattern: /^a recording wallet resolver$/,
    run (m, example, world) {
      installRecordingWalletResolver(world)
    }
  },
  {
    name: 'no wallet is available',
    pattern: /^no wallet is available$/,
    run (m, example, world) {
      world.wallets = {}
    }
  },
  {
    name: 'the wallet has the address',
    pattern: /^the wallet "(.+)" has the address "(.+)"$/,
    run (m, example, world) {
      world.wallets[resolveParam(m[1], example)] = {
        walletInfo: { cashAddress: resolveParam(m[2], example) }
      }
    }
  },
  {
    name: 'memo-notifications command runs for a wallet',
    pattern: /^the memo-notifications command runs for wallet "(.+)"$/,
    async run (m, example, world) {
      await runReadCommand(
        world,
        MemoNotifications,
        'notifications',
        { name: resolveParam(m[1], example) },
        { walletUtil: world.walletUtil }
      )
    }
  },
  {
    name: 'the wallet resolver was not used',
    pattern: /^the wallet resolver was not used$/,
    run (m, example, world) {
      assertEqual(world.walletResolverCalls, 0, 'wallet resolver calls')
    }
  },
  {
    name: 'the wallet resolver was used once',
    pattern: /^the wallet resolver was used once$/,
    run (m, example, world) {
      assertEqual(world.walletResolverCalls, 1, 'wallet resolver calls')
    }
  }
]

export { readOnlySafetyHandlers }
