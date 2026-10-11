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
  validateWalletSource({ name, wif })

  const wallet = name
    ? await walletUtil.instanceWallet(name)
    : await walletUtil.instanceWalletFromWif(wif)

  return { wallet, address: wallet.walletInfo.cashAddress }
}

// Validate that exactly one wallet source is present, throwing the shared
// usage error for zero or two sources. Split from resolution so a command can
// reject a bad source before doing any work.
export function validateWalletSource ({ name, wif } = {}) {
  if (name && wif) {
    throw new UsageError(BOTH_SOURCES)
  }

  if (!name && !wif) {
    throw new UsageError(NO_SOURCE)
  }

  return true
}

// mutate4javascript-manifest-begin
// {"version":1,"tested_at":"2026-10-11T17:18:37.543Z","module_hash":"e7fb9102585291836694f162ee01042aecceb20b48fb157598a3f133eff14a75","functions":[{"id":"func/resolveWalletSource","name":"resolveWalletSource","line":19,"end_line":30,"hash":"49771e54098898c9328b26d21c0ceb94879c78ca0df7e0ea753518cbd99c951e"},{"id":"func/validateWalletSource","name":"validateWalletSource","line":35,"end_line":45,"hash":"ee4994002845da7baf167a2cffb5028ba79ab844379f446484028d72c6802bf2"}]}
// mutate4javascript-manifest-end
