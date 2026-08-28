import { utf8FromPush, logProcessError, postHeightKey, addrPostHeightKey } from './helpers.js'

// Create a record only when it does not already exist (idempotent writes).
async function createIfMissing (db, key, value) {
  try {
    await db.get(key)
  } catch (err) {
    await db.create(key, value)
  }
}

// Normalize the create-poll push datas. Memo wallets may encode the action as
// either separate pushes ([prefix, poll_type, option_count, question]) or as
// a single combined push (prefix + poll_type + option_count + question).
// Returns { ok: false, error } on malformed input, or { ok: true, pollType,
// optionCount, question }.
function normalizePollCreateDatas (pushDatas) {
  if (!pushDatas || pushDatas.length < 2) {
    return { ok: false, error: `invalid create-poll push data count ${pushDatas?.length || 0}` }
  }

  let payload
  if (pushDatas.length === 2) {
    // Combined push: prefix(2) + poll_type(1) + option_count(1) + question.
    const combined = pushDatas[1]
    if (combined.length < 2) {
      return { ok: false, error: 'create-poll payload too short' }
    }
    payload = combined
  } else {
    // Separate pushes for poll_type, option_count, and question.
    if (pushDatas.length !== 4) {
      return { ok: false, error: `invalid create-poll push data count ${pushDatas.length}` }
    }
    const typeBuf = pushDatas[1]
    const countBuf = pushDatas[2]
    const questionBuf = pushDatas[3]
    payload = Buffer.concat([typeBuf, countBuf, questionBuf])
  }

  const pollType = payload[0]
  const optionCount = payload[1]
  const question = utf8FromPush(payload.subarray(2))

  return { ok: true, pollType, optionCount, question }
}

export async function handleCreatePoll (ctx) {
  const { adapters, txid, signerAddr, decoded, seen, blockHeight } = ctx

  const normalized = normalizePollCreateDatas(decoded.pushDatas)
  if (!normalized.ok) {
    await logProcessError(adapters, txid, normalized.error, blockHeight)
    return
  }

  const { pollType, optionCount, question } = normalized

  if (!question.length) {
    await logProcessError(adapters, txid, 'empty poll question', blockHeight)
    return
  }

  const pollData = {
    addr: signerAddr,
    pollType,
    optionCount,
    question,
    seen,
    blockHeight
  }

  await createIfMissing(adapters.pollDb, txid, pollData)

  const heightKey = postHeightKey(blockHeight, txid)
  await createIfMissing(adapters.postHeightDb, heightKey, { txid, blockHeight })

  const addrHeightKey = addrPostHeightKey(signerAddr, blockHeight, txid)
  await createIfMissing(adapters.addrPostHeightDb, addrHeightKey, { txid, addr: signerAddr, blockHeight })
}

export { normalizePollCreateDatas }
