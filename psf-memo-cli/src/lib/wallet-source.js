/*
  Resolve the signing wallet for a memo-* write command.

  Exactly one source is required: a saved wallet name (-n) or a WIF (--wif).
  Resolution returns the wallet instance and its cash address. WIF-to-address
  derivation is delegated to minimal-slp-wallet through WalletUtil.
*/

// Local libraries
import { UsageError } from './reporter.js'
import WalletUtil from './wallet-util.js'

const NO_SOURCE =
  'You must specify a wallet name with the -n flag or a WIF with the --wif flag.'
const BOTH_SOURCES =
  'Specify either a wallet name (-n) or a WIF (--wif), not both.'

// Resolve { name, wif } into { wallet, address }, rejecting zero or two sources.
export async function resolveWalletSource (
  { name, wif } = {},
  { walletUtil = new WalletUtil() } = {}
) {
  if (name && wif) {
    throw new UsageError(BOTH_SOURCES)
  }

  if (!name && !wif) {
    throw new UsageError(NO_SOURCE)
  }

  const wallet = name
    ? await walletUtil.instanceWallet(name)
    : await walletUtil.instanceWalletFromWif(wif)

  return { wallet, address: wallet.walletInfo.cashAddress }
}

// mutate4javascript-manifest-begin
// {"version":1,"tested_at":"2026-10-07T00:45:00.408Z","module_hash":"30c91fbd4492013df98aab192fed9eb87836f54cb7548422456a9f6d47c5c054","functions":[{"id":"func/resolveWalletSource","name":"resolveWalletSource","line":19,"end_line":36,"hash":"f66007f5bca8dc26f592d51c1916139124627f8c77bb53f7f4e3b916e17ebc0f"}]}
// mutate4javascript-manifest-end
