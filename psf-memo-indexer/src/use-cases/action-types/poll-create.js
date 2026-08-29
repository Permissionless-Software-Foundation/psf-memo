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

  const { ok, payload, error } = buildCreatePollPayload(pushDatas)
  if (!ok) {
    return { ok: false, error }
  }

  return {
    ok: true,
    pollType: payload[0],
    optionCount: payload[1],
    question: utf8FromPush(payload.subarray(2))
  }
}

// Resolve the poll payload buffer the create-poll action encodes, which Memo
// wallets may write as either a single combined push (prefix + poll_type +
// option_count + question) or as separate pushes. Returns
// { ok: false, error } on malformed input, or { ok: true, payload }.
function buildCreatePollPayload (pushDatas) {
  if (pushDatas.length === 2) {
    // Combined push: prefix(2) + poll_type(1) + option_count(1) + question.
    const combined = pushDatas[1]
    if (combined.length < 2) {
      return { ok: false, error: 'create-poll payload too short' }
    }
    return { ok: true, payload: combined }
  }

  // Separate pushes for poll_type, option_count, and question.
  if (pushDatas.length !== 4) {
    return { ok: false, error: `invalid create-poll push data count ${pushDatas.length}` }
  }

  const typeBuf = pushDatas[1]
  const countBuf = pushDatas[2]
  const questionBuf = pushDatas[3]
  return { ok: true, payload: Buffer.concat([typeBuf, countBuf, questionBuf]) }
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

// mutate4javascript-manifest-begin
// {"version":1,"tested_at":"2026-08-28T23:33:08.576Z","module_hash":"a81b3c5b31a18d2f9af2063deb06c66c7dbc3198e401969dceb096228c7da095","functions":[{"id":"func/createIfMissing","name":"createIfMissing","line":4,"end_line":10,"hash":"d59cefaf87075a2bc41538961b609387e35393d4fbf02ecfc0633026bbfdca42"},{"id":"func/normalizePollCreateDatas","name":"normalizePollCreateDatas","line":17,"end_line":33,"hash":"6684a343c21f34d45ae584c50d95b18b4258d8b5a37f2eba84fff4270028ade1"},{"id":"func/buildCreatePollPayload","name":"buildCreatePollPayload","line":39,"end_line":58,"hash":"5ab749a5515defd5900429d8273781deee98bde27f45824c27982f0f872ae6e8"},{"id":"func/handleCreatePoll","name":"handleCreatePoll","line":60,"end_line":92,"hash":"2de305b58270638fd3cd9f46e1f2bd6decaba4c731b05ce640512e0885173f0c"}]}
// mutate4javascript-manifest-end
