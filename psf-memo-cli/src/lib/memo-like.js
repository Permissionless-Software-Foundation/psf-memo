/*
  Pure helper for the memo-like write command.

  The 0x6d04 like carries the liked post txid (32-byte little-endian wire order)
  and an optional tip paid to the post author. This module owns the prefix, the
  tip limits (600-sat dust floor, 1-BCH maximum), the flag validation, the
  spendable-balance math, and the human-readable summary; the command is a thin
  wiring layer over the shared wallet resolver, broadcast scaffolding, and
  reporter.
*/

// Local libraries
import { UsageError } from './reporter.js'
import { parseTxidFlag } from './txid-flag.js'
import { txidToWireBytes } from './wire-encoding.js'

// The 0x6d04 "like" action prefix.
export const MEMO_LIKE_PREFIX = '6d04'

// A wallet needs at least this many spendable sats to broadcast a like.
export const DUST_LIMIT_SATS = 3000

// The smallest non-dust tip output, and the sanity maximum for a single tip.
export const DUST_TIP_SATS = 600
export const MAX_TIP_SATS = 100000000

// Parse and validate the optional tip, returning its satoshi value (0 when no
// tip is given). A non-integer, negative, sub-dust, or over-maximum tip is a
// usage error.
function parseTip (value) {
  if (value === undefined || value === null || value === '') return 0

  const tipSats = Number(value)
  if (!Number.isInteger(tipSats) || tipSats < 0) {
    throw new UsageError('Tip must be a valid number of satoshis.')
  }

  if (tipSats > 0 && tipSats < DUST_TIP_SATS) {
    throw new UsageError(`Tip is below the dust limit of ${DUST_TIP_SATS} sats.`)
  }

  if (tipSats > MAX_TIP_SATS) {
    throw new UsageError(`Tip exceeds the maximum of ${MAX_TIP_SATS} sats.`)
  }

  return tipSats
}

// Validate the required post txid and the optional tip. The post txid is
// decoded to its 32-byte little-endian wire form here, so a malformed txid is a
// usage error (exit 2) reported before any broadcast. Returns the fields the
// command broadcasts: the wire-form post bytes, the tip in sats, and the author
// address.
export function parseLikeFlags (flags = {}) {
  const { txid: post } = parseTxidFlag(flags)

  let postBytes
  try {
    postBytes = txidToWireBytes(post)
  } catch (err) {
    throw new UsageError(err.message)
  }

  const tipSats = parseTip(flags.tip)
  const author = flags.author || ''

  if (tipSats > 0 && author === '') {
    throw new UsageError('Tip requires an author address.')
  }

  return { postBytes, tipSats, author }
}

// Sum the wallet's spendable BCH UTXOs. Accepts both the minimal-slp-wallet
// utxoStore shape and a plain array of UTXOs, tolerating the common value field
// names used by different adapters.
export function spendableSats (wallet) {
  const utxos = Array.isArray(wallet?.utxos)
    ? wallet.utxos
    : (wallet?.utxos?.utxoStore?.bchUtxos || [])

  return utxos.reduce((sum, utxo) => sum + (utxo.value ?? utxo.satoshis ?? utxo.amount ?? 0), 0)
}

// Render the human-readable success summary: the txid and its explorer link.
export function formatLikeMessage ({ txid, explorerUrl } = {}) {
  return `Posted like: ${txid}\nView this transaction on a block explorer:\n${explorerUrl}`
}

// mutate4javascript-manifest-begin
// {"version":1,"functions":[],"tested_at":null,"module_hash":null}
// mutate4javascript-manifest-end
