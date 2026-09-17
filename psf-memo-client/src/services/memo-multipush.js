/*
  Multi-push OP_RETURN adapter for Memo actions that carry several fields.

  Memo multi-field actions (reply, topic message, add-poll-option, poll-vote,
  and create-poll) must encode each protocol field as its own OP_RETURN script
  push: OP_RETURN <prefix> <field> <field> ... . minimal-slp-wallet's
  sendOpReturn(msg, prefix, bchOutput) pushes its msg as a single push, so this
  adapter wraps a wallet's sendOpReturn: an array first argument is broadcast as
  separate pushes, while every existing single-field call is delegated to the
  original wallet method unchanged.

  The adapter reuses the wallet's own OP_RETURN transaction builder for fee
  selection, change, signing, and broadcast. Only the OP_RETURN script it
  composes is expanded. The pure push-normalization helpers are unit tested;
  the wallet wiring is the small environmentally unsuitable boundary.
*/

// Import the browser-compatible Buffer implementation. `Buffer` is a Node
// global, but the CRA production bundle does not polyfill Node globals and the
// wallet script does not define window.Buffer, so a bare global would throw in
// the browser. The npm buffer package is the same implementation the bundled
// bitcoincashjs-lib uses, so its Buffer.isBuffer accepts these pushes.
const { Buffer } = require('buffer')

// Normalize one push value (a UTF-8 string or byte array) to a Buffer.
function toPushBuffer (value) {
  if (typeof value === 'string') return Buffer.from(value, 'utf8')
  return Buffer.from(value)
}

// Build the ordered OP_RETURN pushes: the action prefix bytes first, then each
// field as its own push.
function buildPushes (prefix, fields) {
  return [Buffer.from(prefix, 'hex'), ...fields.map(toPushBuffer)]
}

// Broadcast fields as separate OP_RETURN pushes using the wallet's own
// transaction builder. The wallet must expose minimal-slp-wallet's
// opReturn.createTransaction and opReturn.ar.sendTx.
async function broadcastMultiPush (wallet, fields, prefix, bchOutput = []) {
  const opReturn = wallet.opReturn
  if (!opReturn || typeof opReturn.createTransaction !== 'function') {
    throw new Error('Wallet does not support multi-push OP_RETURN broadcasts.')
  }

  await wallet.walletInfoPromise

  const bchjs = opReturn.bchjs
  const originalEncode2 = bchjs.Script.encode2
  const pushes = buildPushes(prefix, fields)

  // createTransaction composes [OP_RETURN, prefix, msg] and calls encode2
  // synchronously before any await. Swap in the multi-push script for that one
  // call, then restore immediately so concurrent wallet work is unaffected.
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

// Wrap a wallet's sendOpReturn so an array first argument broadcasts each
// element as its own OP_RETURN push. Single-field calls delegate unchanged.
function attachMultiPushOpReturn (wallet) {
  if (!wallet || wallet.__multiPushAttached) return wallet
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

module.exports = {
  toPushBuffer,
  buildPushes,
  broadcastMultiPush,
  attachMultiPushOpReturn
}

// mutate4javascript-manifest-begin
// {"version":1,"tested_at":"2026-09-17T04:08:42.622Z","module_hash":"9bce63e69187b0a42ba210437ea14a32fdd7f53ccfd905264375bba997a3a4c3","functions":[{"id":"func/toPushBuffer","name":"toPushBuffer","line":26,"end_line":29,"hash":"0ff6744e881d65ce60d6456df450f5f0f26a39492d387b2b33aefec8c12e2e81"},{"id":"func/buildPushes","name":"buildPushes","line":33,"end_line":35,"hash":"46961294949a914dbab5064b1b2fcf5c3ba59c2e438b2a986275d3dfed40ea71"},{"id":"func/broadcastMultiPush","name":"broadcastMultiPush","line":40,"end_line":73,"hash":"ee5022606ea152763159d7fd9753c3849b723c5a8ab1cd1cb399feb4248479d6"},{"id":"func/attachMultiPushOpReturn","name":"attachMultiPushOpReturn","line":77,"end_line":88,"hash":"ef81a1526f376fc1ad500d72dafdd684d78ad8052202e938a39654bb182e8eeb"}]}
// mutate4javascript-manifest-end
