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
