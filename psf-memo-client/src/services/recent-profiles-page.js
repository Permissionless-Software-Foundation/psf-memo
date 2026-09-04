/*
  Recent Profiles Page behavior: load and display the most recent Memo profiles.

  This is the testable controller behind the React "Recent Profiles" page. It
  wraps the MemoDb client and exposes the loaded profiles and pagination so the
  view can render them.
*/

const RECENT_PROFILES_PATH = '/profile/recent'

class RecentProfilesPage {
  constructor (deps = {}) {
    this.memoDb = deps.memoDb || null
    this.profiles = []
    this.pagination = null
  }

  async load ({ limit = 50, offset = 0 } = {}) {
    if (!this.memoDb) {
      throw new Error('Recent profiles page requires a memo db client.')
    }

    const data = await this.memoDb.getRecentProfiles({ limit, offset })
    this.profiles = data.profiles || []
    this.pagination = data.pagination || null

    return { profiles: this.profiles, pagination: this.pagination }
  }

  canLoadMore () {
    return this.pagination?.hasMore ?? false
  }

  getProfile (addr) {
    return this.profiles.find((profile) => profile.addr === addr) || null
  }
}

RecentProfilesPage.RECENT_PROFILES_PATH = RECENT_PROFILES_PATH

module.exports = RecentProfilesPage
