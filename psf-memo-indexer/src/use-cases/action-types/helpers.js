/*
  Shared helpers for Memo action handlers.
*/

import { isMemoPrefix } from '../../lib/memo-codes.js'

export async function logProcessError (adapters, txid, error, blockHeight) {
  try {
    await adapters.processErrorDb.create(txid, { error, ts: Date.now(), blockHeight })
  } catch (err) {
    console.error('Failed to log process error:', err.message)
  }
}

export function utf8FromPush (buf) {
  return buf.toString('utf8')
}

/**
 * Drop leading empty pushes (btcd txscript.PushedData compatibility).
 */
export function stripLeadingEmptyPushes (pushDatas) {
  let datas = pushDatas
  while (datas.length > 1 && datas[0] && datas[0].length === 0) {
    datas = datas.slice(1)
  }
  return datas
}

/**
 * Normalize Memo actions that use prefix + payload as two script pushes.
 * Some wallets encode both in a single push (0x6dXX + data); split for handlers.
 */
export function normalizeTwoPushMemoDatas (pushDatas) {
  const datas = stripLeadingEmptyPushes(pushDatas)

  if (datas.length === 2) {
    return datas
  }

  if (datas.length === 1 && isMemoPrefix(datas[0]) && datas[0].length > 2) {
    return [datas[0].subarray(0, 2), datas[0].subarray(2)]
  }

  return datas
}

export function txHashFromPush (buf) {
  if (!buf || buf.length !== 32) return null

  return Buffer
    .from(buf)
    .reverse()
    .toString('hex')
}

export function followKey (followerAddr, followeeAddr) {
  return `${followerAddr}:${followeeAddr}`
}

export function roomKey (roomName, txid) {
  return `${roomName}:${txid}`
}

// The topicRecency store is keyed with an inverted height so a plain iterator
// yields rooms ordered by most recent post height and, within a height, by
// room name ascending.
export function topicRecencyKey (blockHeight, roomName) {
  const inverted = 999999999999 - (blockHeight ?? 0)
  return `${String(inverted).padStart(12, '0')}:${roomName}`
}

// True for the LevelDB not-found error, its in-memory equivalent, and the
// 404 surfaced by the psf-memo-db entity routes.
export function isNotFound (err) {
  return Boolean(err && (err.notFound || err.code === 'LEVEL_NOT_FOUND' || err.response?.status === 404))
}

// Read a record, or null when it does not exist. Rethrows real errors.
export async function getIfPresent (db, key) {
  try {
    return await db.get(key)
  } catch (err) {
    if (isNotFound(err)) return null
    throw err
  }
}

export function postHeightKey (blockHeight, txid) {
  const padded = String(blockHeight).padStart(12, '0')
  return `${padded}:${txid}`
}

export function addrPostHeightKey (addr, blockHeight, txid) {
  const padded = String(blockHeight).padStart(12, '0')
  return `${addr}:${padded}:${txid}`
}

export function postLikeKey (postTxid, likeTxid) {
  return `${postTxid}:${likeTxid}`
}

export function postChildKey (parentTxid, childTxid) {
  return `${parentTxid}:${childTxid}`
}

// followeeHeights is a followee-keyed, height-ordered notification read index:
// `${followeePkHash}:${paddedBlockHeight}:${followerAddr}`. The read side
// range-scans one followee's suffix to find its newest follow per follower.
export function followeeHeightKey (followeePkHash, blockHeight, followerAddr) {
  const padded = String(blockHeight ?? 0).padStart(12, '0')
  return `${followeePkHash}:${padded}:${followerAddr}`
}

// mutate4javascript-manifest-begin
// {"version":1,"tested_at":"2026-09-18T17:35:13.410Z","module_hash":"33f6514ca7fe1a07bafea6553f5441ef7a2b91b3c3039f666395e4ff6d00bad1","functions":[{"id":"func/logProcessError","name":"logProcessError","line":7,"end_line":13,"hash":"78f39be271917cad97072ed5e2d1f531a30a37bc9c10169516e0457951c438f4"},{"id":"func/utf8FromPush","name":"utf8FromPush","line":15,"end_line":17,"hash":"356fc665a6389e392ec83522210dd95b2af6be341d00dc5edc0bbabfbd511d9e"},{"id":"func/stripLeadingEmptyPushes","name":"stripLeadingEmptyPushes","line":22,"end_line":28,"hash":"be7c401e07e4ef3670428afe7211860038c69da17abcd03508ea5cb640b46163"},{"id":"func/normalizeTwoPushMemoDatas","name":"normalizeTwoPushMemoDatas","line":34,"end_line":46,"hash":"61d050380c2cef7eed8870a66e347f1d01c56246d733d95d692b436cfb4a20ed"},{"id":"func/txHashFromPush","name":"txHashFromPush","line":48,"end_line":55,"hash":"704934308365cf0fbbb72aa437faf5db20a69bd57a16ba37b19c905ddc922ea9"},{"id":"func/followKey","name":"followKey","line":57,"end_line":59,"hash":"e1c5cfdd78afd3945e18e4af06e443efb306c27b07e3b3534c918ef000da9696"},{"id":"func/roomKey","name":"roomKey","line":61,"end_line":63,"hash":"d4f146c7a938bb6b30b13f071609a3ac4e96a26f116e321b804c16114884cd15"},{"id":"func/topicRecencyKey","name":"topicRecencyKey","line":68,"end_line":71,"hash":"ce7146b8dfca80309058c1512818fe2edc9f1b3658cbe1e06aabf78f65136b90"},{"id":"func/isNotFound","name":"isNotFound","line":75,"end_line":77,"hash":"662978032673c9bac6d64c519899ebfed72e477ea39b9fde19039ffa01de183d"},{"id":"func/getIfPresent","name":"getIfPresent","line":80,"end_line":87,"hash":"b012b3ef1d48f45a65fcbd4ff9574443cc98d2c2f7d12a504af74fc3e0d3f5af"},{"id":"func/postHeightKey","name":"postHeightKey","line":89,"end_line":92,"hash":"25bdb7995aeb2823d0f808812251c3fd8c163089ea32b4f39ddf55520e03cbb1"},{"id":"func/addrPostHeightKey","name":"addrPostHeightKey","line":94,"end_line":97,"hash":"b9b6b08e4c5892905dc6577ad22dd48c13598ca205b1b8c13d7cc9622962879f"},{"id":"func/postLikeKey","name":"postLikeKey","line":99,"end_line":101,"hash":"627ce4b3ca6a9d28fbaa50bc1f51973509e7d8b52eda9208343dac1d936d7f51"},{"id":"func/postChildKey","name":"postChildKey","line":103,"end_line":105,"hash":"4d30329db33e34b0461bd1ba70b078fbef285a338f17f7e4d1166ca5bd107893"},{"id":"func/followeeHeightKey","name":"followeeHeightKey","line":110,"end_line":113,"hash":"4aed46fb7c51f31751c3407ee8e1dcf44b41e799447d3c66382920ed63285ef0"}]}
// mutate4javascript-manifest-end
