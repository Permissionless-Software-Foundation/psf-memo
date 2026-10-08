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
// the txid and its block-explorer link. A wallet or node rejection during the
// broadcast is reported as `Failed to broadcast: <wallet error>` so the caller
// exits 1 with the wallet's real message preserved; an error raised before the
// broadcast (for example a UTXO refresh failure) keeps its own message.
export async function broadcastMemo ({ wallet, prefix, fields, bchOutput = [] }) {
  await wallet.initialize()
  attachMultiPushOpReturn(wallet)

  const normalized = fields.map(toPushBuffer)
  const msg = normalized.length === 1 ? normalized[0] : normalized

  let txid
  try {
    txid = await wallet.sendOpReturn(msg, prefix, bchOutput)
  } catch (err) {
    throw new Error(`Failed to broadcast: ${err.message}`, { cause: err })
  }

  return { txid, explorerUrl: `${MEMO_EXPLORER_URL}${txid}` }
}

// mutate4javascript-manifest-begin
// {"version":1,"tested_at":"2026-10-07T00:45:23.941Z","module_hash":"2eb445b44d8dc7bb895f2bd9526957ae9a34da2e0b0a07d3f9e6ad87ed4d851e","functions":[{"id":"func/toPushBuffer","name":"toPushBuffer","line":14,"end_line":17,"hash":"ec0606e351c64915144dd2fb8aa009aa7ec0bf41771c5af127f4dba425e3ed5d"},{"id":"func/buildMemoPushes","name":"buildMemoPushes","line":20,"end_line":22,"hash":"79fbed7398c94ed530e6a6f5ff3151e8e979a1ead4e0b7facb33088ddcdc73f9"},{"id":"func/broadcastMultiPush","name":"broadcastMultiPush","line":28,"end_line":54,"hash":"b137c6e3a09e25d6c2884bb85084ce2ca1b8d86ee75e12e9aa20dcceffc8bd45"},{"id":"func/attachMultiPushOpReturn","name":"attachMultiPushOpReturn","line":59,"end_line":75,"hash":"b4a8cf169067f0ae032758055b1eb9367272376b0790bd080746453af70fd0e3"},{"id":"func/broadcastMemo","name":"broadcastMemo","line":79,"end_line":88,"hash":"39faa71a9b0e4ce90ee125eb6cd5cd57841a5cfbedaa7737a31497aed9d05f78"}]}
// mutate4javascript-manifest-end
