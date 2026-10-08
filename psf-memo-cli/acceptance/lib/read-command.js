/*
  Shared runner and assertions for read-command Gherkin steps.

  Runs a read command class in JSON mode against the scenario world's fake
  service and records its exit code, streams, and parsed JSON on the world
  under the given field prefix (e.g. "feed" or "thread"). Resetting
  process.exitCode keeps the generated acceptance process from being left with
  a failing code. The error helpers read the same prefixed fields so every read
  feature asserts failures the same way.
*/

// Local libraries
import { captureStream } from '../../test/support/capture.js'
import { assertEqual } from './step-support.js'

export async function runReadCommand (world, CommandClass, prefix, flags = {}, options = {}) {
  const stdout = captureStream()
  const stderr = captureStream()
  const command = new CommandClass({
    fetchImpl: world.fetch,
    envUrl: null,
    ...options,
    stdout: stdout.stream,
    stderr: stderr.stream
  })

  world[`${prefix}ExitCode`] = await command.run({ json: true, ...flags })
  process.exitCode = 0

  world[`${prefix}Stdout`] = stdout.text()
  world[`${prefix}Stderr`] = stderr.text()
  world[`${prefix}Json`] = null
  try {
    world[`${prefix}Json`] = JSON.parse(world[`${prefix}Stdout`])
  } catch (err) {
    world[`${prefix}Json`] = null
  }
  // A generic alias for shared result assertions that do not know the prefix.
  world.readJson = world[`${prefix}Json`]
}

// Install a scenario wallet factory on `world` for a read command that needs a
// signing wallet. Wallets are stored under `<prefix>Wallets` and resolved by the
// name or WIF the flags request; the scenario sets `<prefix>Source` to select
// one.
export function installWalletFactory (world, prefix) {
  const wallets = {}
  world[`${prefix}Wallets`] = wallets
  world[`${prefix}Source`] = {}

  const lookup = (key, kind) => {
    if (!(key in wallets)) {
      throw new Error(`Unknown ${kind} ${key}`)
    }
    return wallets[key]
  }

  world.walletUtil = {
    instanceWallet: (name) => lookup(name, 'wallet'),
    instanceWalletFromWif: (wif) => lookup(wif, 'wif')
  }
}

// Record a named wallet's cash address and select it as the prefix's source.
// Pairs with installWalletFactory so a scenario can drive wallet resolution.
export function setWalletAddress (world, prefix, name, address) {
  world[`${prefix}Wallets`][name] = { walletInfo: { cashAddress: address } }
  world[`${prefix}Source`] = { name }
}

// Parse the JSON error a read command wrote to stderr.
export function parseStderrError (world, prefix) {
  const stderr = world[`${prefix}Stderr`]
  try {
    return JSON.parse(stderr)
  } catch (err) {
    throw new Error(`Expected a JSON error on stderr, got "${stderr}"`)
  }
}

// Assert a read command reported a stored post with the given txid, text, and
// address. `label` names the expected outcome in the missing-post message.
export function assertReportedPost (world, prefix, label, { txid, text, addr }) {
  const post = world[`${prefix}Json`]?.post
  if (!post) {
    throw new Error(`Expected ${label}`)
  }
  assertEqual(post.txid, txid, 'post txid', { quote: true })
  assertEqual(post.text, text, 'post text', { quote: true })
  assertEqual(post.addr, addr, 'post address', { quote: true })
}

// Assert a read command exited 2 with the given usage error message.
export function assertUsageError (world, prefix, name, expected) {
  assertEqual(world[`${prefix}ExitCode`], 2, `${name} exit code`)
  assertEqual(parseStderrError(world, prefix).error, expected, 'usage error', { quote: true })
}

// Assert a read command exited 1 with a "not found" error.
export function assertNotFound (world, prefix, name) {
  assertEqual(world[`${prefix}ExitCode`], 1, `${name} exit code`)
  const error = parseStderrError(world, prefix).error || ''
  if (!error.toLowerCase().includes('not found')) {
    throw new Error(`Expected a not-found error, got "${error}"`)
  }
}

// Assert a read command exited 1 with some error message.
export function assertReadCommandError (world, prefix, name) {
  assertEqual(world[`${prefix}ExitCode`], 1, `${name} exit code`)
  if (!parseStderrError(world, prefix).error) {
    throw new Error(`Expected an error message on stderr, got "${world[`${prefix}Stderr`]}"`)
  }
}
