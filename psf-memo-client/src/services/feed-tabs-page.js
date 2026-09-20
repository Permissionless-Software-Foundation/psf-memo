/*
  Merged posts feed page behavior: one paginated posts page with a row of two
  mode buttons, "Recent" and "Following".

  On first open the page asks the MemoDb client which accounts the viewer
  follows. If the viewer follows at least one account it selects the Following
  tab, otherwise the Recent tab. Changing tabs resets the feed to its first
  page. Loading is delegated to the existing recent and following page
  controllers so this module stays a thin, testable coordinator free of UI or
  network concerns.
*/

const RecentFeedPage = require('./recent-feed-page')
const FollowingFeedPage = require('./following-feed-page')

const RECENT_MODE = 'recent'
const FOLLOWING_MODE = 'following'
const TABS = ['Recent', 'Following']

class FeedTabsPage {
  constructor (deps = {}) {
    this.memoDb = deps.memoDb || null
    this.wallet = deps.wallet || null
    this.recentPage = deps.recentPage || new RecentFeedPage({ memoDb: this.memoDb, wallet: this.wallet })
    this.followingPage = deps.followingPage || new FollowingFeedPage({ memoDb: this.memoDb, wallet: this.wallet })
    this.tabs = [...TABS]
    this.mode = null
    this.pageSize = 50
    this.offset = 0
    this.posts = []
    this.pagination = null
    this.hasFollows = false
    this.emptyBecauseNoFollows = false
  }

  getMyAddress () {
    return this.wallet?.walletInfo?.cashAddress || null
  }

  // Open the merged page: choose the default tab from the viewer's follow
  // state, then load its first (or requested) page.
  async open ({ limit = 50, offset = 0 } = {}) {
    if (!this.memoDb) {
      throw new Error('Feed tabs page requires a memo db client.')
    }

    this.pageSize = limit
    this.offset = offset

    const myAddr = this.getMyAddress()
    const followees = myAddr ? await this.memoDb.getFollowing(myAddr) : []
    this.hasFollows = Array.isArray(followees) && followees.length > 0
    this.mode = this.hasFollows ? FOLLOWING_MODE : RECENT_MODE

    await this._loadMode()

    return this.getState()
  }

  // Switch to a tab by its label ("Recent"/"Following") or internal mode.
  // Changing tabs resets the feed to its first page. Selecting the tab that is
  // already active is a no-op.
  async selectTab (tab) {
    const mode = this._normalizeTab(tab)
    if (mode === this.mode) {
      return this.getState()
    }

    this.mode = mode
    this.offset = 0
    await this._loadMode()

    return this.getState()
  }

  // Load the current tab at the current offset through its page controller.
  async _loadMode () {
    if (this.mode === FOLLOWING_MODE) {
      const data = await this.followingPage.load({ limit: this.pageSize, offset: this.offset })
      this.posts = data.posts || []
      this.pagination = data.pagination || null
      this.emptyBecauseNoFollows = this.posts.length === 0 && !this.hasFollows
      return
    }

    const data = await this.recentPage.load({ limit: this.pageSize, offset: this.offset })
    this.posts = data.posts || []
    this.pagination = data.pagination || null
    this.emptyBecauseNoFollows = false
  }

  _normalizeTab (tab) {
    const value = String(tab).toLowerCase()
    if (value === 'recent') return RECENT_MODE
    if (value === 'following') return FOLLOWING_MODE
    throw new Error(`Unknown feed tab: ${tab}`)
  }

  isRecent () {
    return this.mode === RECENT_MODE
  }

  isFollowing () {
    return this.mode === FOLLOWING_MODE
  }

  getActiveTabLabel () {
    return this.mode === FOLLOWING_MODE ? 'Following' : 'Recent'
  }

  canLoadMore () {
    return this.pagination?.hasMore ?? false
  }

  async nextPage () {
    if (!this.canLoadMore()) {
      return this.getState()
    }

    this.offset += this.pageSize
    await this._loadMode()

    return this.getState()
  }

  async previousPage () {
    const target = Math.max(0, this.offset - this.pageSize)
    if (target === this.offset) {
      return this.getState()
    }

    this.offset = target
    await this._loadMode()

    return this.getState()
  }

  getPost (txid) {
    return this.posts.find((post) => post.txid === txid) || null
  }

  getState () {
    return {
      mode: this.mode,
      offset: this.offset,
      posts: this.posts,
      pagination: this.pagination,
      emptyBecauseNoFollows: this.emptyBecauseNoFollows
    }
  }
}

FeedTabsPage.TABS = TABS
FeedTabsPage.RECENT_MODE = RECENT_MODE
FeedTabsPage.FOLLOWING_MODE = FOLLOWING_MODE

module.exports = FeedTabsPage
