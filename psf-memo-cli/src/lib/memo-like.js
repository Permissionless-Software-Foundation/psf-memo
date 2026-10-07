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
import { parseTxidBytesFlag } from './txid-flag.js'

// The 0x6d04 "like" action prefix.
export const MEMO_LIKE_PREFIX = '6d04'

// A wallet needs at least this many spendable sats to broadcast a like.
export const DUST_LIMIT_SATS = 3000

// The smallest non-dust tip output, and the sanity maximum for a single tip.
export const DUST_TIP_SATS = 600
export const MAX_TIP_SATS = 100000000

// Parse the optional tip to a non-negative integer, returning 0 when no tip is
// given. A non-integer or negative tip is a usage error.
function parseTip (value) {
  if (value === undefined || value === null || value === '') return 0

  const tipSats = Number(value)
  if (!Number.isInteger(tipSats) || tipSats < 0) {
    throw new UsageError('Tip must be a valid number of satoshis.')
  }

  return tipSats
}

// Enforce the tip window: zero (no tip) or the dust floor up to the maximum.
function assertTipInRange (tipSats) {
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
  const postBytes = parseTxidBytesFlag(flags)

  const tipSats = assertTipInRange(parseTip(flags.tip))
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
// {"version":1,"tested_at":"2026-10-07T18:51:03.632Z","module_hash":"e976ac56c19953f490461d9d141210a814e45adb93ddc47efadaac89d4d32e14","functions":[{"id":"func/parseTip","name":"parseTip","line":28,"end_line":37,"hash":"5269f08cb261d44ea158c39018796eed244a2c8309668db48b923cf31a660d19"},{"id":"func/assertTipInRange","name":"assertTipInRange","line":40,"end_line":50,"hash":"84474ed7bdcbdc47a53d6deccc3be0f699eabd8efed996522de8974421808176"},{"id":"func/parseLikeFlags","name":"parseLikeFlags","line":57,"end_line":68,"hash":"8a88b4ca09acd391fa173be2edafd43c2a2f361e564f7c634b5c7a88df134a1d"},{"id":"func/spendableSats","name":"spendableSats","line":73,"end_line":79,"hash":"26e374ceb94bd2614dd35c4d021db062c10e2d9dad4d1ac88f0b16a14dac48e4"},{"id":"func/formatLikeMessage","name":"formatLikeMessage","line":82,"end_line":84,"hash":"12d0d2fa0e4b80a877b8b4688df8d9198e2c9924607d90353c9a38d6901c0363"}]}
// mutate4javascript-manifest-end
