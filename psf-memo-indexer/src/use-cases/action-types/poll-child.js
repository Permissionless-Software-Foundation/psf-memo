/*
  Shared record creation for Memo actions that reference a parent poll by
  txid and carry a single UTF-8 value (an add-poll-option or a poll-vote).

  Both payloads have the same shape: exactly three pushes, a 32-byte poll
  txid, and a non-empty value. Each handler stores the parsed record on its
  own store, differing only in the store, the value field name, and the error
  label used in process-error messages.
*/

import { utf8FromPush, logProcessError, txHashFromPush } from './helpers.js'
import { TX_HASH_LENGTH } from '../../lib/memo-codes.js'

// Validate a poll-txid child action payload and store the resulting record.
// Returns true when stored, false when an error was logged.
//
// `ctx`     - the handler context (adapters, txid, signerAddr, decoded, seen,
//             blockHeight)
// `db`      - the poll option or poll vote store
// `valueField` - record field holding the parsed UTF-8 value
// `label`      - action label used in process-error messages
// `emptyMessage` - process-error message for an empty value
export async function storePollChildRecord ({
  ctx,
  db,
  valueField,
  label,
  emptyMessage
}) {
  const { adapters, txid, signerAddr, decoded, seen, blockHeight } = ctx
  const { pushDatas } = decoded

  if (pushDatas.length !== 3) {
    await logProcessError(adapters, txid, `invalid ${label} push data count ${pushDatas.length}`, blockHeight)
    return false
  }

  if (pushDatas[1].length !== TX_HASH_LENGTH) {
    await logProcessError(adapters, txid, `${label} poll tx hash wrong size`, blockHeight)
    return false
  }

  const pollTxid = txHashFromPush(pushDatas[1])
  const value = utf8FromPush(pushDatas[2])

  if (!value.length) {
    await logProcessError(adapters, txid, emptyMessage, blockHeight)
    return false
  }

  await db.create(txid, {
    addr: signerAddr,
    pollTxid,
    [valueField]: value,
    seen,
    blockHeight
  })

  return true
}

// mutate4javascript-manifest-begin
// {"version":1,"tested_at":"2026-08-28T23:32:27.654Z","module_hash":"20bba06dde1c1b346b14d0ad321452309c266524993e59db802294075e2c9338","functions":[{"id":"func/storePollChildRecord","name":"storePollChildRecord","line":23,"end_line":60,"hash":"b703abce31773d096540029d909d6f04d50b6b5f846184a5cff3099452e279ff"}]}
// mutate4javascript-manifest-end
