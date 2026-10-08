/*
  Gherkin step handlers for the Memo Muted feature.

  The scenario world resolves a fake muter wallet and serves each muter's muted
  list through the same fake fetch used by the Memo DB client handlers. Each
  scenario runs the real memo-muted command in JSON mode so the requested muter
  address, the reported mutee addresses, and the usage/error outcomes can be
  asserted from the captured stdout.
*/

// Local libraries
import MemoMuted from '../../../src/commands/memo-muted.js'
import { runReadCommand, installWalletFactory, setWalletAddress, assertUsageError, assertReadCommandError } from '../read-command.js'
import { assertReportedAddresses } from './read-result.js'
import { assertEqual, resolveParam } from '../step-support.js'

// The muted lists the fake service serves, keyed by muter address.
const MUTED_BY_MUTER = {
  addrA: ['addrB', 'addrC'],
  addrD: ['addrE']
}

async function runMuted (world, flags) {
  await runReadCommand(
    world,
    MemoMuted,
    'muted',
    { ...world.mutedSource, ...flags },
    { walletUtil: world.walletUtil }
  )
}

const memoMutedHandlers = [
  {
    name: 'a Memo muted command',
    pattern: /^a Memo muted command$/,
    run (m, example, world) {
      installWalletFactory(world, 'muted')
    }
  },
  {
    name: 'service serves the muted list',
    pattern: /^the Memo DB service serves the muted list$/,
    run (m, example, world) {
      world.mutedByMuter = Object.fromEntries(
        Object.entries(MUTED_BY_MUTER).map(([muter, muted]) => [muter, [...muted]])
      )
    }
  },
  {
    name: 'muted list is empty',
    pattern: /^the muted list is empty$/,
    run (m, example, world) {
      world.mutedByMuter = {}
    }
  },
  {
    name: 'muted request fails',
    pattern: /^the muted request fails$/,
    run (m, example, world) {
      world.unreachable = true
    }
  },
  {
    name: 'the muted wallet has an address',
    pattern: /^the muted wallet has the address "(.+)"$/,
    run (m, example, world) {
      setWalletAddress(world, 'muted', 'muted-wallet', resolveParam(m[1], example))
    }
  },
  {
    name: 'memo-muted command runs',
    pattern: /^the memo-muted command runs$/,
    async run (m, example, world) {
      await runMuted(world, {})
    }
  },
  {
    name: 'service received a muted request',
    pattern: /^the service received a muted request for "(.+)"$/,
    run (m, example, world) {
      assertEqual(world.lastRequest?.pathname, `/mute/muted/${resolveParam(m[1], example)}`, 'request path')
    }
  },
  {
    name: 'command reported the muted addresses',
    pattern: /^the command reported the muted addresses "(.+)"$/,
    run (m, example, world) {
      assertReportedAddresses(world.readJson?.muted, resolveParam(m[1], example), 'muted addresses')
    }
  },
  {
    name: 'command reported no muted addresses',
    pattern: /^the command reported 0 muted addresses$/,
    run (m, example, world) {
      assertEqual((world.readJson?.muted || []).length, 0, 'muted count')
    }
  },
  {
    name: 'memo-muted command reported the usage error',
    pattern: /^the memo-muted command reported the usage error "(.+)"$/,
    run (m, example, world) {
      assertUsageError(world, 'muted', 'memo-muted', resolveParam(m[1], example))
    }
  },
  {
    name: 'memo-muted command reported an error',
    pattern: /^the memo-muted command reported an error$/,
    run (m, example, world) {
      assertReadCommandError(world, 'muted', 'memo-muted')
    }
  }
]

export { memoMutedHandlers }
