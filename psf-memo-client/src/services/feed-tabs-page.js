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
    const page = this._pageFor(this.mode)
    const data = await page.load({ limit: this.pageSize, offset: this.offset })

    this.posts = data.posts || []
    this.pagination = data.pagination || null
    this.emptyBecauseNoFollows = this._isEmptyFollowing()
  }

  _pageFor (mode) {
    return mode === FOLLOWING_MODE ? this.followingPage : this.recentPage
  }

  // The not-following-anyone message belongs only to an empty Following tab
  // when the viewer follows no one; the Recent tab never shows it.
  _isEmptyFollowing () {
    return this.mode === FOLLOWING_MODE && this.posts.length === 0 && !this.hasFollows
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

// mutate4javascript-manifest-begin
// {"version":1,"tested_at":"2026-09-20T17:31:02.596Z","module_hash":"df20b58c9b7744a421ffa2e1b457fd1416fb44e11e8e969647bebc96bde7c3bc","functions":[{"id":"func/FeedTabsPage.constructor","name":"FeedTabsPage.constructor","line":21,"end_line":34,"hash":"5383666103ae9a7a9bd4618280a48f5ffdbb8dd3b3f731ceb0d102f1f8487d6b"},{"id":"func/FeedTabsPage.getMyAddress","name":"FeedTabsPage.getMyAddress","line":36,"end_line":38,"hash":"3e5d4ac4df379300933a772020528b4ecf4ed83c7386a066f5c270df81adcddd"},{"id":"func/FeedTabsPage.open","name":"FeedTabsPage.open","line":42,"end_line":58,"hash":"23ed42e89c0fe89af20d936fd0175d9728a2a671379970ef862ad90941fdd374"},{"id":"func/FeedTabsPage.selectTab","name":"FeedTabsPage.selectTab","line":63,"end_line":74,"hash":"99ff87aedeb0019b22459e950e2a99df2648477e6ef3053921a487b636b95f86"},{"id":"func/FeedTabsPage._loadMode","name":"FeedTabsPage._loadMode","line":77,"end_line":84,"hash":"99d59c57f03b3ebb6cc8e1dd4aab8df019a34712bee72cc742d208b6b6a8b8c3"},{"id":"func/FeedTabsPage._pageFor","name":"FeedTabsPage._pageFor","line":86,"end_line":88,"hash":"2ecf46b5da42fb117b0fd4a2fcf7621a6609d99c8f2d7220a41a22c15000ede7"},{"id":"func/FeedTabsPage._isEmptyFollowing","name":"FeedTabsPage._isEmptyFollowing","line":92,"end_line":94,"hash":"baef393ae6c886f86edb26a15ddb582d16ee862df42b730ef94378c2c19df991"},{"id":"func/FeedTabsPage._normalizeTab","name":"FeedTabsPage._normalizeTab","line":96,"end_line":101,"hash":"3f9e921fd03e8a121d2c9d7db84ca96f8ab348098e5510d461b19e3d9d120f98"},{"id":"func/FeedTabsPage.isRecent","name":"FeedTabsPage.isRecent","line":103,"end_line":105,"hash":"dd7b7035d81fb710da80bef4db78e68620b9a6dbea652c1d2d7f9b2bbb1bf812"},{"id":"func/FeedTabsPage.isFollowing","name":"FeedTabsPage.isFollowing","line":107,"end_line":109,"hash":"2e05c1dad4d206852fb5d84784a2926b3beec11bcd3a1115798c79db70db6ec4"},{"id":"func/FeedTabsPage.canLoadMore","name":"FeedTabsPage.canLoadMore","line":111,"end_line":113,"hash":"634983bcc6bbe560daad8326db0dd4bf31d5cb9e45c40112565351dceaf8e5d5"},{"id":"func/FeedTabsPage.nextPage","name":"FeedTabsPage.nextPage","line":115,"end_line":124,"hash":"c4f4db842625b89422158164ed4ad1a67971e592ca3e8e7109790b3e09a1746e"},{"id":"func/FeedTabsPage.previousPage","name":"FeedTabsPage.previousPage","line":126,"end_line":136,"hash":"d0ac6bcd201e128a16b1404116b665c3edeb0849b8ae8de1014892d1410638da"},{"id":"func/FeedTabsPage.getPost","name":"FeedTabsPage.getPost","line":138,"end_line":140,"hash":"1a6ae1a02b0f79b5b62a2b2324a5f1edbd743bec004fe73cfef7970bead56885"},{"id":"func/FeedTabsPage.getState","name":"FeedTabsPage.getState","line":142,"end_line":150,"hash":"84595f8c1f3f00e0e410c96fe1084801d1469a606378a8b15d5a3b6ca03f1bc9"}]}
// mutate4javascript-manifest-end
