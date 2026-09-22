/*
  Test helpers for the recent profiles tests.

  `makeRecentProfilesMemoDb` is a stub MemoDb: getRecentProfiles returns the
  given profiles, getFollowState resolves the viewer's follow state from a
  `follower:followee` keyed map (defaulting false).
  `randomRecentProfileAddr` draws an address-like string from the caller's
  seeded rng.
  `makeRecordingFollow` is a memo follow handler that records every broadcast
  so a test can count them; it either succeeds or throws.
  Shared by the recent-profiles-follow unit and property tests.
*/

'use strict'

const { randomString } = require('./random')

const RECENT_PROFILE_ADDR_CHARS = Array.from('abcdefghijklmnopqrstuvwxyz0123456789:')
const RECORDING_FOLLOW_TXID = 'ab'.repeat(32)

function makeRecentProfilesMemoDb (profiles = [], followState = {}) {
  return {
    async getRecentProfiles () {
      return { profiles, pagination: { total: profiles.length } }
    },
    async getFollowState (followerAddr, followeeAddr) {
      return followState[`${followerAddr}:${followeeAddr}`] || false
    }
  }
}

function randomRecentProfileAddr (rng) {
  return randomString(rng, RECENT_PROFILE_ADDR_CHARS, 8, 48)
}

function makeRecordingFollow ({ txid = RECORDING_FOLLOW_TXID, fail = false } = {}) {
  const calls = []
  const record = (method) => async (addr) => {
    calls.push({ method, addr })
    if (fail) throw new Error('Insufficient balance')
    return txid
  }
  return { calls, follow: record('follow'), unfollow: record('unfollow') }
}

module.exports = {
  RECENT_PROFILE_ADDR_CHARS,
  makeRecentProfilesMemoDb,
  randomRecentProfileAddr,
  makeRecordingFollow
}
