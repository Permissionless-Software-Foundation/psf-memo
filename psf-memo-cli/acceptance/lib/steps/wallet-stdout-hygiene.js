/*
  Gherkin step handlers for the CLI Wallet Stdout Hygiene feature (F3).

  These scenarios model the wallet library's construction banner: the world's
  command logs the banner with console.log (which is process stdout in a real
  run), then runs through the real reporter. The suite asserts the banner never
  reaches stdout: JSON mode suppresses it, human mode routes it to stderr. The
  command-boundary run handlers and the single-object assertions are shared with
  the output-contract steps.
*/

// Local libraries
import { WALLET_BANNER_PREFIX } from '../../../src/lib/wallet-banner.js'

// The exact banner minimal-slp-wallet logs while it constructs its routers.
const WALLET_BANNER = `${WALLET_BANNER_PREFIX} with this interface: rest-api`

// The failure the scenario's wallet library reports.
const WALLET_LIBRARY_ERROR = 'wallet library initialization failed'

// Reset the output-contract fields for a wallet-backed command that will
// succeed with the readable result message below.
function initWalletCliWorld (world) {
  world.json = false
  world.outcome = { type: 'result', message: 'wallet ready' }
  world.walletLibraryError = WALLET_LIBRARY_ERROR
  world.exitCode = null
  world.stdoutText = ''
  world.stderrText = ''
}

// Parse the captured stderr as one JSON object, or fail with a clear message.
function parseSingleJsonObject (text, label) {
  const trimmed = text.trim()
  if (trimmed === '' || trimmed.split('\n').length !== 1) {
    throw new Error(`Expected ${label} to be a single JSON object, got "${text}"`)
  }

  let parsed
  try {
    parsed = JSON.parse(trimmed)
  } catch (err) {
    throw new Error(`Expected ${label} to be JSON, got "${text}"`)
  }

  if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error(`Expected ${label} to be a JSON object, got "${text}"`)
  }

  return parsed
}

const walletStdoutHygieneHandlers = [
  {
    name: 'a wallet-backed CLI command',
    pattern: /^a wallet-backed CLI command$/,
    run (m, example, world) {
      initWalletCliWorld(world)
    }
  },
  {
    name: 'the wallet library logs its initialization banner',
    pattern: /^the wallet library logs its initialization banner$/,
    run (m, example, world) {
      // The library logs the banner during construction, before the command
      // produces any result. Wrap the command so the banner is emitted from
      // inside the reporter's command boundary.
      const construct = world.command
      world.command = async () => {
        console.log(WALLET_BANNER)
        return construct()
      }
    }
  },
  {
    name: 'the wallet library fails',
    pattern: /^the wallet library fails$/,
    run (m, example, world) {
      world.outcome = { type: 'error', message: world.walletLibraryError }
    }
  },
  {
    name: 'stdout contains the result message',
    pattern: /^stdout contains the result message$/,
    run (m, example, world) {
      if (!world.stdoutText.includes(world.outcome.message)) {
        throw new Error(`Expected stdout to contain "${world.outcome.message}", got "${world.stdoutText}"`)
      }
    }
  },
  {
    name: 'stdout does not contain the wallet banner',
    pattern: /^stdout does not contain the wallet library initialization banner$/,
    run (m, example, world) {
      if (world.stdoutText.includes(WALLET_BANNER)) {
        throw new Error(`Expected stdout not to contain the wallet library banner, got "${world.stdoutText}"`)
      }
    }
  },
  {
    name: 'stderr contains the wallet banner',
    pattern: /^stderr contains the wallet library initialization banner$/,
    run (m, example, world) {
      if (!world.stderrText.includes(WALLET_BANNER)) {
        throw new Error(`Expected stderr to contain the wallet library banner, got "${world.stderrText}"`)
      }
    }
  },
  {
    name: 'JSON error has the wallet library error message',
    pattern: /^the JSON error has the wallet library error message$/,
    run (m, example, world) {
      const parsed = parseSingleJsonObject(world.stderrText, 'stderr')
      if (parsed.error !== world.walletLibraryError) {
        throw new Error(`Expected JSON error "${world.walletLibraryError}", got "${parsed.error}"`)
      }
    }
  }
]

export { walletStdoutHygieneHandlers }
