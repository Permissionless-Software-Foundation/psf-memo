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

// mutate4javascript-manifest-begin
// {"version":1,"tested_at":"2026-08-28T04:22:49.741Z","module_hash":"9799b30443df95c47881bcc6a74bf9024e65741f94938af1c92dd5fa0180005f","functions":[{"id":"func/logProcessError","name":"logProcessError","line":7,"end_line":13,"hash":"78f39be271917cad97072ed5e2d1f531a30a37bc9c10169516e0457951c438f4"},{"id":"func/utf8FromPush","name":"utf8FromPush","line":15,"end_line":17,"hash":"356fc665a6389e392ec83522210dd95b2af6be341d00dc5edc0bbabfbd511d9e"},{"id":"func/stripLeadingEmptyPushes","name":"stripLeadingEmptyPushes","line":22,"end_line":28,"hash":"be7c401e07e4ef3670428afe7211860038c69da17abcd03508ea5cb640b46163"},{"id":"func/normalizeTwoPushMemoDatas","name":"normalizeTwoPushMemoDatas","line":34,"end_line":46,"hash":"61d050380c2cef7eed8870a66e347f1d01c56246d733d95d692b436cfb4a20ed"},{"id":"func/txHashFromPush","name":"txHashFromPush","line":48,"end_line":55,"hash":"704934308365cf0fbbb72aa437faf5db20a69bd57a16ba37b19c905ddc922ea9"},{"id":"func/followKey","name":"followKey","line":57,"end_line":59,"hash":"e1c5cfdd78afd3945e18e4af06e443efb306c27b07e3b3534c918ef000da9696"},{"id":"func/roomKey","name":"roomKey","line":61,"end_line":63,"hash":"d4f146c7a938bb6b30b13f071609a3ac4e96a26f116e321b804c16114884cd15"},{"id":"func/postHeightKey","name":"postHeightKey","line":65,"end_line":68,"hash":"25bdb7995aeb2823d0f808812251c3fd8c163089ea32b4f39ddf55520e03cbb1"},{"id":"func/addrPostHeightKey","name":"addrPostHeightKey","line":70,"end_line":73,"hash":"b9b6b08e4c5892905dc6577ad22dd48c13598ca205b1b8c13d7cc9622962879f"},{"id":"func/postLikeKey","name":"postLikeKey","line":75,"end_line":77,"hash":"627ce4b3ca6a9d28fbaa50bc1f51973509e7d8b52eda9208343dac1d936d7f51"},{"id":"func/postChildKey","name":"postChildKey","line":79,"end_line":81,"hash":"4d30329db33e34b0461bd1ba70b078fbef285a338f17f7e4d1166ca5bd107893"}]}
// mutate4javascript-manifest-end
