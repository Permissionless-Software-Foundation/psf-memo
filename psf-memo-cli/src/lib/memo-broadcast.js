/*
  Shared Memo broadcast scaffolding for memo-* write commands.

  Takes an ordered list of protocol fields, broadcasts them through the wallet,
  and returns the transaction id plus a block-explorer link. A single field is
  sent as one payload push. Multiple fields are expanded into one push per
  field, because minimal-slp-wallet's sendOpReturn hardcodes [prefix, msg] and
  would otherwise flatten a multi-field action.
*/

export const MEMO_EXPLORER_URL = 'https://bch.loping.net/tx/'

// Normalize one field (a UTF-8 string or a byte array) to a Buffer.
export function toPushBuffer (field) {
  if (typeof field === 'string') return Buffer.from(field, 'utf8')
  return Buffer.from(field)
}

// Build the ordered OP_RETURN pushes: the action prefix, then each field.
export function buildMemoPushes (prefix, fields) {
  return [Buffer.from(prefix, 'hex'), ...fields.map(toPushBuffer)]
}

// Broadcast fields as separate OP_RETURN pushes using the wallet's own
// transaction builder. Minimal-slp-wallet's createTransaction composes
// [OP_RETURN, prefix, msg] and calls Script.encode2, so swap in the multi-push
// script for that one synchronous call, then restore it.
async function broadcastMultiPush (wallet, fields, prefix, bchOutput = []) {
  const opReturn = wallet.opReturn
  await wallet.walletInfoPromise

  const bchjs = opReturn.bchjs
  const originalEncode2 = bchjs.Script.encode2
  const pushes = buildMemoPushes(prefix, fields)

  bchjs.Script.encode2 = function (script) {
    bchjs.Script.encode2 = originalEncode2
    return originalEncode2.call(this, [script[0], ...pushes])
  }

  try {
    const { hex } = await opReturn.createTransaction(
      wallet.walletInfo,
      wallet.utxos.utxoStore.bchUtxos,
      '',
      prefix,
      bchOutput,
      wallet.fee
    )
    return await opReturn.ar.sendTx(hex)
  } finally {
    bchjs.Script.encode2 = originalEncode2
  }
}

// Wrap a wallet's sendOpReturn so an array first argument broadcasts each field
// as its own push. Single-field calls, and wallets without OP_RETURN support,
// are left unchanged.
export function attachMultiPushOpReturn (wallet) {
  if (!wallet || wallet.__multiPushAttached) return wallet
  if (!wallet.opReturn || typeof wallet.opReturn.createTransaction !== 'function') {
    return wallet
  }

  const original = wallet.sendOpReturn.bind(wallet)
  wallet.sendOpReturn = function (msgOrFields, prefix, bchOutput = []) {
    if (Array.isArray(msgOrFields)) {
      return broadcastMultiPush(wallet, msgOrFields, prefix, bchOutput)
    }
    return original(msgOrFields, prefix, bchOutput)
  }
  wallet.__multiPushAttached = true

  return wallet
}

// Refresh the wallet's UTXOs and broadcast an ordered list of fields. Returns
// the txid and its block-explorer link.
export async function broadcastMemo ({ wallet, prefix, fields, bchOutput = [] }) {
  await wallet.initialize()
  attachMultiPushOpReturn(wallet)

  const normalized = fields.map(toPushBuffer)
  const msg = normalized.length === 1 ? normalized[0] : normalized
  const txid = await wallet.sendOpReturn(msg, prefix, bchOutput)

  return { txid, explorerUrl: `${MEMO_EXPLORER_URL}${txid}` }
}
