/*
  Test helper: a stub MemoDb for the recent profiles tests.

  getRecentProfiles returns the given profiles; getFollowState resolves the
  viewer's follow state from a `follower:followee` keyed map, defaulting false.
  Shared by the recent-profiles-follow unit and property tests.
*/

'use strict'

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

module.exports = { makeRecentProfilesMemoDb }
