/*
  Profile Page behavior: load and display a single address's Memo posts,
  follow state, and follow/unfollow controls.

  This is the testable controller behind the React "Profile" page.  It wraps
  the MemoDb client, targets a specific address, exposes the loaded posts,
  and coordinates follow state with an injected MemoFollow action.

  The memoDb, address, viewer address, and memoFollow concerns are injected so
  this module stays free of UI/network concerns; environmentally unsuitable
  I/O lives behind those small adapter boundaries.
*/

const { BLOCK_EXPLORER_TX_BASE, blockExplorerTxUrl } = require('./block-explorer')

const PROFILE_PATH_PREFIX = '/profile'
const MUTE_SUCCESS_MESSAGE = 'Your mute was broadcast to the Bitcoin Cash network.'
const UNMUTE_SUCCESS_MESSAGE = 'Your unmute was broadcast to the Bitcoin Cash network.'

class ProfilePage {
  constructor (deps = {}) {
    this.memoDb = deps.memoDb || null
    this.addr = deps.addr || null
    this.myAddr = deps.myAddr || null
    this.memoFollow = deps.memoFollow || null
    this.memoMute = deps.memoMute || null
    this.posts = []
    this.pagination = null
    this.followState = null
    this.muteState = null
    this.showMuteResultModal = false
    this.lastMuteResult = null
  }

  async load ({ limit = 50, offset = 0 } = {}) {
    this._assertReady()

    const data = await this.memoDb.getPostsByAddr(this.addr, { limit, offset })
    this.posts = data.posts || []
    this.pagination = data.pagination || null
    this.followState = await this._loadState('getFollowState')
    this.muteState = await this._loadState('getMuteState')

    return {
      posts: this.posts,
      pagination: this.pagination,
      followState: this.followState,
      muteState: this.muteState,
      isOwnProfile: this.isOwnProfile()
    }
  }

  // Throw unless the injected dependencies and target address are present.
  _assertReady () {
    if (!this.memoDb) {
      throw new Error('Profile page requires a memo db client.')
    }
    if (!this.addr) {
      throw new Error('Profile page requires an address.')
    }
  }

  // Fetch a viewer state for the target address, or false when there is no
  // viewer or the profile is the viewer's own.
  async _loadState (method) {
    if (this.myAddr && !this.isOwnProfile()) {
      return this.memoDb[method](this.myAddr, this.addr)
    }
    return false
  }

  isOwnProfile () {
    return Boolean(this.myAddr) && this.myAddr === this.addr
  }

  canFollow () {
    return Boolean(this.myAddr) && !this.isOwnProfile()
  }

  isFollowing () {
    return this.followState === true
  }

  async follow () {
    return this._setFollowState('follow', true)
  }

  async unfollow () {
    return this._setFollowState('unfollow', false)
  }

  // Delegate follow/unfollow to the injected handler and reflect the new state.
  async _setFollowState (method, nextState) {
    return this._setState(this.memoFollow, 'follow', 'followState', method, nextState)
  }

  canMute () {
    return Boolean(this.myAddr) && !this.isOwnProfile()
  }

  isMuting () {
    return this.muteState === true
  }

  async mute () {
    return this._broadcastMute('mute', true)
  }

  async unmute () {
    return this._broadcastMute('unmute', false)
  }

  // Delegate mute/unmute to the injected handler and reflect the new state.
  async _setMuteState (method, nextState) {
    return this._setState(this.memoMute, 'mute', 'muteState', method, nextState)
  }

  // Broadcast a mute/unmute and record the result for the profile page's
  // result modal. A missing handler is a programming error and still throws;
  // a broadcast failure is recorded so the page can show a failure modal and
  // leave the button state unchanged.
  async _broadcastMute (method, nextState) {
    if (!this.memoMute) {
      throw new Error('Profile page requires a memo mute handler.')
    }
    this.lastMuteResult = null
    try {
      const { txid } = await this._setMuteState(method, nextState)
      this.lastMuteResult = { ok: true, action: method, txid }
    } catch (err) {
      this.lastMuteResult = { ok: false, action: method, message: err.message || String(err) }
    }
    this.showMuteResultModal = true
    return this.lastMuteResult
  }

  // The broadcast success message for the visible mute result, or ''.
  getMuteBroadcastMessage () {
    if (!this.lastMuteResult || !this.lastMuteResult.ok) return ''
    return this.lastMuteResult.action === 'unmute' ? UNMUTE_SUCCESS_MESSAGE : MUTE_SUCCESS_MESSAGE
  }

  // The broadcast error message for the visible mute result, or ''.
  getMuteResultError () {
    if (!this.lastMuteResult || this.lastMuteResult.ok) return ''
    return this.lastMuteResult.message || ''
  }

  // Block explorer URL for a mute/unmute transaction.
  explorerUrl (txid) {
    return ProfilePage.explorerUrl(txid)
  }

  // Dismiss the mute result. This closes the modal without navigating.
  dismissMuteResult () {
    this.showMuteResultModal = false
    return this
  }

  // Delegate a follow/mute action to the injected handler and reflect the new
  // state on the matching field.
  async _setState (handler, label, stateField, method, nextState) {
    if (!handler) {
      throw new Error(`Profile page requires a memo ${label} handler.`)
    }
    const txid = await handler[method](this.addr)
    this[stateField] = nextState
    return { ok: true, txid }
  }

  getPost (txid) {
    return this.posts.find((post) => post.txid === txid) || null
  }

  canLoadMore () {
    return this.pagination?.hasMore ?? false
  }
}

ProfilePage.PROFILE_PATH_PREFIX = PROFILE_PATH_PREFIX
ProfilePage.EXPLORER_TX_BASE = BLOCK_EXPLORER_TX_BASE
ProfilePage.MUTE_SUCCESS_MESSAGE = MUTE_SUCCESS_MESSAGE
ProfilePage.UNMUTE_SUCCESS_MESSAGE = UNMUTE_SUCCESS_MESSAGE
ProfilePage.explorerUrl = blockExplorerTxUrl

module.exports = ProfilePage

// mutate4javascript-manifest-begin
// {"version":1,"tested_at":"2026-09-18T22:22:14.032Z","module_hash":"8075c302b80534f696083176fa519c9cc18069d492800b1317bb89e780d802e4","functions":[{"id":"func/ProfilePage.constructor","name":"ProfilePage.constructor","line":21,"end_line":33,"hash":"5511421482230254af17c6ebf7335207b3908ffa5c93bf086441de4cf64cc25e"},{"id":"func/ProfilePage.load","name":"ProfilePage.load","line":35,"end_line":51,"hash":"d38c4bec56cac83f0df4975852d915bb6bffc4c566cbcca3a933f31b340b6125"},{"id":"func/ProfilePage._assertReady","name":"ProfilePage._assertReady","line":54,"end_line":61,"hash":"e575f98fa1b492b4c11ae5275459d9f9996df4c566b84c7cae91413c72a02f38"},{"id":"func/ProfilePage._loadState","name":"ProfilePage._loadState","line":65,"end_line":70,"hash":"ab0376720ac75e6fd66d437fbb47a53176d76f681cb13b8794249f2a586549e8"},{"id":"func/ProfilePage.isOwnProfile","name":"ProfilePage.isOwnProfile","line":72,"end_line":74,"hash":"4d149bfe7b183b5d38d496c0a8126d22bd9a919e684f375d66e2c8c1348dd773"},{"id":"func/ProfilePage.canFollow","name":"ProfilePage.canFollow","line":76,"end_line":78,"hash":"0bc2c0c17991d8f1a1d18fba29c901e42633b7cf2c2c8b5747a49e5832d7001d"},{"id":"func/ProfilePage.isFollowing","name":"ProfilePage.isFollowing","line":80,"end_line":82,"hash":"9fc0470db7ffea2da96d2dbbdceff55562e1f7e84377fbb0e8b60d53cc723b40"},{"id":"func/ProfilePage.follow","name":"ProfilePage.follow","line":84,"end_line":86,"hash":"7674b789a9d3c48e0f7a6e553613bac99b2f38449fcdd17faa3c6d7cd2773bdd"},{"id":"func/ProfilePage.unfollow","name":"ProfilePage.unfollow","line":88,"end_line":90,"hash":"69d278b09da1f284be6adacb7264f9c06ac71c42f8e8f1baf9e34d5b24a891fb"},{"id":"func/ProfilePage._setFollowState","name":"ProfilePage._setFollowState","line":93,"end_line":95,"hash":"6cd937862bd6bf18d63fe767724b02ca23d1dc54f71ede23b84b9bde2930200b"},{"id":"func/ProfilePage.canMute","name":"ProfilePage.canMute","line":97,"end_line":99,"hash":"0076ea0e688df292dbe6bcde370aa32937cf7dad674e2168c3395d41b63850af"},{"id":"func/ProfilePage.isMuting","name":"ProfilePage.isMuting","line":101,"end_line":103,"hash":"c4fe9ea0501b7349da39321afd074e7ae48c2c1f2e0d1cfafafbf57f8a05c754"},{"id":"func/ProfilePage.mute","name":"ProfilePage.mute","line":105,"end_line":107,"hash":"41f8d8b0c2a63f714875c814edb6c1951f6137ecc191b947f6db2f059c093a93"},{"id":"func/ProfilePage.unmute","name":"ProfilePage.unmute","line":109,"end_line":111,"hash":"95cb63140dbd4a47f8f75a61815c1f0d2e9a8be082af7fe2d06bdaa944b50af9"},{"id":"func/ProfilePage._setMuteState","name":"ProfilePage._setMuteState","line":114,"end_line":116,"hash":"721536335442a539a8ec7700d9db79abd18cfc24ed451fcd29e198f531d0896f"},{"id":"func/ProfilePage._broadcastMute","name":"ProfilePage._broadcastMute","line":122,"end_line":135,"hash":"1054dec2514498c3ccf41dc8c8f8a7c4749107070c4da337ebf8679d9e166e44"},{"id":"func/ProfilePage.getMuteBroadcastMessage","name":"ProfilePage.getMuteBroadcastMessage","line":138,"end_line":141,"hash":"a25c681fc8c0020e3a134dc752d3235319511d4e294ce9d52dab789cbeb1e167"},{"id":"func/ProfilePage.getMuteResultError","name":"ProfilePage.getMuteResultError","line":144,"end_line":147,"hash":"1b6a67a29baa70af8f715de65804dcdab62b23cb3d1d2b80b85255ec09d3c548"},{"id":"func/ProfilePage.explorerUrl","name":"ProfilePage.explorerUrl","line":150,"end_line":152,"hash":"5285656344fdfedeb2abc4eed4fad4d33b2d867c373326c3859c07ff25f84d51"},{"id":"func/ProfilePage.dismissMuteResult","name":"ProfilePage.dismissMuteResult","line":155,"end_line":158,"hash":"2adc077720973bf7309aef0a2c783200313de0928c5e558a8f8c4551c3bb1828"},{"id":"func/ProfilePage._setState","name":"ProfilePage._setState","line":162,"end_line":169,"hash":"0d8a66f50e222dfaee040344c810f63f74a8765343713133e8c872436b2e8c19"},{"id":"func/ProfilePage.getPost","name":"ProfilePage.getPost","line":171,"end_line":173,"hash":"1a6ae1a02b0f79b5b62a2b2324a5f1edbd743bec004fe73cfef7970bead56885"},{"id":"func/ProfilePage.canLoadMore","name":"ProfilePage.canLoadMore","line":175,"end_line":177,"hash":"634983bcc6bbe560daad8326db0dd4bf31d5cb9e45c40112565351dceaf8e5d5"}]}
// mutate4javascript-manifest-end
