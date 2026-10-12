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
export async function withWalletBanner ({ json = false, stderr, log } = {}, fn) {
  const original = console.log
  console.log = createWalletLog({ json, stderr, log: log || original })

  try {
    return await fn()
  } finally {
    console.log = original
  }
}
