/*
  Keep the minimal-slp-wallet initialization banner off stdout.

  minimal-slp-wallet logs its router-initialization banner with console.log
  while a wallet is constructed:

    Initializing minimal-slp-wallet routers with this interface: rest-api

  That call bypasses the reporter, so the banner lands on process stdout ahead
  of the command result and breaks the one-JSON-object stdout contract. This
  module filters exactly that banner line and leaves every other console.log
  call alone: JSON mode discards the banner so stdout stays one JSON object and
  stderr stays one JSON error on failure; human mode routes the banner to the
  reporter's stderr so it stays observable without polluting the readable stdout
  result.

  `runCommand` applies the filter for the duration of the command, which is the
  window in which the wallet library constructs its routers.
*/

export const WALLET_BANNER_PREFIX = 'Initializing minimal-slp-wallet routers'

// True when a console.log argument is the wallet library's initialization
// banner.
export function isWalletBanner (text) {
  return typeof text === 'string' && text.startsWith(WALLET_BANNER_PREFIX)
}

// Build a console.log replacement that routes the wallet banner and passes
// every other line through to `log`.
export function createWalletLog ({
  json = false,
  stderr = process.stderr,
  log = console.log
} = {}) {
  return (...args) => {
    if (isWalletBanner(args[0])) {
      if (!json) stderr.write(`${args.join(' ')}\n`)
      return
    }

    log(...args)
  }
}

// Run `fn` with console.log filtered for the wallet banner, restoring the
// original console.log afterward even when `fn` throws.
export async function withWalletBanner ({ json = false, stderr } = {}, fn) {
  const original = console.log
  console.log = createWalletLog({ json, stderr, log: original })

  try {
    return await fn()
  } finally {
    console.log = original
  }
}

// mutate4javascript-manifest-begin
// {"version":1,"tested_at":"2026-10-12T23:46:44.111Z","module_hash":"06f53ef8c86881e9979a096a08b5c2a37149c7a9e017ca157c269d8a4f87afbe","functions":[{"id":"func/isWalletBanner","name":"isWalletBanner","line":25,"end_line":27,"hash":"02ef935baaef9af9b370537078f2ebf559bb2aae8d0b59e67c3d4e89e807c9d9"},{"id":"func/createWalletLog","name":"createWalletLog","line":31,"end_line":44,"hash":"67a9fd5fdd351a73db415a1f7c1cb96af12083acbfb3af9ab03c031aca77c3c7"},{"id":"func/withWalletBanner","name":"withWalletBanner","line":48,"end_line":57,"hash":"790664b0b01dbb71bf1a3013f1ac3e58d1d91361a654b1830672161f9f2a8b49"}]}
// mutate4javascript-manifest-end
