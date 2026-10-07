/*
  Gherkin step handlers for the Wallet Source feature.

  The scenario world supplies a wallet factory that maps saved-wallet names and
  WIFs to addresses, so the real resolver is exercised without touching a real
  wallet or the network.
*/

// Local libraries
import { resolveWalletSource } from '../../../src/lib/wallet-source.js'
import { UsageError } from '../../../src/lib/reporter.js'
import { resolveParam } from '../step-support.js'

// Resolve a source, recording either the result or the thrown error.
async function resolveSource (world, source) {
  world.resolution = null
  world.resolutionError = null
  try {
    world.resolution = await resolveWalletSource(source, {
      walletUtil: world.walletUtil
    })
  } catch (err) {
    world.resolutionError = err
  }
}

const walletSourceHandlers = [
  {
    name: 'a wallet factory',
    pattern: /^a wallet factory$/,
    run (m, example, world) {
      world.savedWallets = {}
      world.wifs = {}
      world.source = null
      world.resolution = null
      world.resolutionError = null
      world.walletUtil = {
        async instanceWallet (name) {
          if (!(name in world.savedWallets)) {
            throw new Error(`Unknown wallet ${name}`)
          }
          return { walletInfo: { cashAddress: world.savedWallets[name] } }
        },
        async instanceWalletFromWif (wif) {
          if (!(wif in world.wifs)) {
            throw new Error(`Unknown wif ${wif}`)
          }
          return { walletInfo: { cashAddress: world.wifs[wif] } }
        }
      }
    }
  },
  {
    name: 'saved wallet has an address',
    pattern: /^the saved wallet "(.+)" has the address "(.+)"$/,
    run (m, example, world) {
      world.savedWallets[resolveParam(m[1], example)] = resolveParam(m[2], example)
    }
  },
  {
    name: 'WIF corresponds to an address',
    pattern: /^the WIF "(.+)" corresponds to the address "(.+)"$/,
    run (m, example, world) {
      world.wifs[resolveParam(m[1], example)] = resolveParam(m[2], example)
    }
  },
  {
    name: 'resolve from a wallet name',
    pattern: /^the wallet source is resolved from the name "(.+)"$/,
    async run (m, example, world) {
      await resolveSource(world, { name: resolveParam(m[1], example) })
    }
  },
  {
    name: 'resolve from a WIF',
    pattern: /^the wallet source is resolved from the WIF "(.+)"$/,
    async run (m, example, world) {
      await resolveSource(world, { wif: resolveParam(m[1], example) })
    }
  },
  {
    name: 'no wallet source',
    pattern: /^no wallet source is given$/,
    run (m, example, world) {
      world.source = {}
    }
  },
  {
    name: 'both wallet sources',
    pattern: /^both a wallet name and a WIF are given$/,
    run (m, example, world) {
      world.source = { name: 'wallet1', wif: 'wif-one' }
    }
  },
  {
    name: 'the wallet source is resolved',
    pattern: /^the wallet source is resolved$/,
    async run (m, example, world) {
      await resolveSource(world, world.source || {})
    }
  },
  {
    name: 'resolved address',
    pattern: /^the resolved address is "(.+)"$/,
    run (m, example, world) {
      const expected = resolveParam(m[1], example)
      const actual = world.resolution?.address
      if (actual !== expected) {
        throw new Error(`Expected address ${expected}, got ${actual}`)
      }
    }
  },
  {
    name: 'resolution reports a usage error',
    pattern: /^the resolution reports a usage error$/,
    run (m, example, world) {
      if (!(world.resolutionError instanceof UsageError)) {
        throw new Error('Expected the resolution to report a usage error')
      }
    }
  }
]

export { walletSourceHandlers }
