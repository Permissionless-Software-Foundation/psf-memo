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
const { broadcastSuccessMessage, broadcastErrorMessage } = require('./broadcast-result')
const { buildTokenIcons } = require('./profile-token-icons')

const PROFILE_PATH_PREFIX = '/profile'
const MUTE_SUCCESS_MESSAGE = 'Your mute was broadcast to the Bitcoin Cash network.'
const UNMUTE_SUCCESS_MESSAGE = 'Your unmute was broadcast to the Bitcoin Cash network.'
const ADDRESS_COPY_CONFIRMATION_MS = 1500

class ProfilePage {
  constructor (deps = {}) {
    this.memoDb = deps.memoDb || null
    this.addr = deps.addr || null
    this.myAddr = deps.myAddr || null
    this.memoFollow = deps.memoFollow || null
    this.memoMute = deps.memoMute || null
    this.tokenSource = deps.tokenSource || null
    this.posts = []
    this.tokenIcons = []
    this.pagination = null
    this.followState = null
    this.muteState = null
    this.showMuteResultModal = false
    this.lastMuteResult = null
    this.copyToClipboard = deps.copyToClipboard || null
    this.onAddressCopyChange = deps.onAddressCopyChange || null
    this.setTimer = deps.setTimer || ((fn, ms) => setTimeout(fn, ms))
    this.clearTimer = deps.clearTimer || ((id) => clearTimeout(id))
    this.addressCopied = false
    this.addressCopyTimer = null
  }

  async load ({ limit = 50, offset = 0 } = {}) {
    this._assertReady()

    const data = await this.memoDb.getPostsByAddr(this.addr, { limit, offset })
    this.posts = data.posts || []
    this.pagination = data.pagination || null
    this.followState = await this._loadState('getFollowState')
    this.muteState = await this._loadState('getMuteState')
    await this.loadTokenIcons()

    return {
      posts: this.posts,
      pagination: this.pagination,
      followState: this.followState,
      muteState: this.muteState,
      tokenIcons: this.tokenIcons,
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

  // Load the SLP token icons for the profile address through the injected
  // token source. A missing source or a token lookup failure is silent: the
  // page simply shows no token icons.
  async loadTokenIcons () {
    this.tokenIcons = []
    if (!this.tokenSource || typeof this.tokenSource.listTokens !== 'function' || !this.addr) {
      return this.tokenIcons
    }

    try {
      const tokens = await this.tokenSource.listTokens(this.addr)
      const enriched = await this._withMutableData(tokens)
      this.tokenIcons = buildTokenIcons(enriched)
    } catch (err) {
      this.tokenIcons = []
    }

    return this.tokenIcons
  }

  getTokenIcons () {
    return this.tokenIcons
  }

  // Fill in each token's mutable data when the token list did not already
  // carry it. Prefer minimal-slp-wallet's getTokenData2, which returns the
  // resolved token media (mutableData.tokenIcon / fullSizedUrl); fall back to
  // getTokenData for wallets that only expose that. A single token's metadata
  // failure only costs that token its image; it does not hide the other icons.
  async _withMutableData (tokens) {
    if (!Array.isArray(tokens)) return []
    const fetchTokenData = this._tokenDataFetcher()
    if (!fetchTokenData) return tokens

    return Promise.all(tokens.map(async (token) => {
      if (!token || token.mutableData) return token
      try {
        const data = await fetchTokenData(token.tokenId)
        return { ...token, mutableData: (data && data.mutableData) || null }
      } catch (err) {
        return { ...token, mutableData: null }
      }
    }))
  }

  _tokenDataFetcher () {
    if (typeof this.tokenSource.getTokenData2 === 'function') {
      return (tokenId) => this.tokenSource.getTokenData2(tokenId)
    }
    if (typeof this.tokenSource.getTokenData === 'function') {
      return (tokenId) => this.tokenSource.getTokenData(tokenId)
    }
    return null
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
    return broadcastSuccessMessage(
      this.lastMuteResult,
      { unmute: UNMUTE_SUCCESS_MESSAGE },
      MUTE_SUCCESS_MESSAGE
    )
  }

  // The broadcast error message for the visible mute result, or ''.
  getMuteResultError () {
    return broadcastErrorMessage(this.lastMuteResult)
  }

  // Copy the profile's address to the clipboard and show a transient
  // confirmation. The clipboard write is delegated to the injected adapter so
  // the controller stays free of browser APIs.
  async copyAddress () {
    if (!this.addr) {
      throw new Error('Profile page requires an address.')
    }
    if (!this.copyToClipboard) {
      throw new Error('Profile page requires a clipboard adapter.')
    }
    await this.copyToClipboard(this.addr)
    this._setAddressCopied(true)
    this._scheduleAddressCopyReset()
    return this.addr
  }

  isShowingAddressCopyConfirmation () {
    return this.addressCopied
  }

  // Clear the copy confirmation, as the confirmation timeout would. Exposed so
  // tests and acceptance runs can elapse the timer deterministically.
  addressCopyTimeoutElapsed () {
    this._clearAddressCopyTimer()
    this._setAddressCopied(false)
    return this
  }

  // Stop the pending confirmation timer without changing the confirmation
  // state. Used when the page unmounts or reloads.
  destroy () {
    this._clearAddressCopyTimer()
    return this
  }

  _setAddressCopied (copied) {
    this.addressCopied = copied
    if (this.onAddressCopyChange) this.onAddressCopyChange(copied)
  }

  _scheduleAddressCopyReset () {
    this._clearAddressCopyTimer()
    this.addressCopyTimer = this.setTimer(() => {
      this.addressCopyTimer = null
      this._setAddressCopied(false)
    }, ADDRESS_COPY_CONFIRMATION_MS)
  }

  _clearAddressCopyTimer () {
    if (this.addressCopyTimer !== null) {
      this.clearTimer(this.addressCopyTimer)
      this.addressCopyTimer = null
    }
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
// {"version":1,"tested_at":"2026-09-22T18:07:43.978Z","module_hash":"e8a70682a4e4db507950cdf2fd1ca756f24ee5cc2515cd185f7e8a0192ff9852","functions":[{"id":"func/ProfilePage.constructor","name":"ProfilePage.constructor","line":23,"end_line":41,"hash":"5c980686dceea7849e075d670f8c9f4c61ad63b82f7efdd6106bb82b544660d1"},{"id":"func/ProfilePage.load","name":"ProfilePage.load","line":43,"end_line":59,"hash":"d38c4bec56cac83f0df4975852d915bb6bffc4c566cbcca3a933f31b340b6125"},{"id":"func/ProfilePage._assertReady","name":"ProfilePage._assertReady","line":62,"end_line":69,"hash":"e575f98fa1b492b4c11ae5275459d9f9996df4c566b84c7cae91413c72a02f38"},{"id":"func/ProfilePage._loadState","name":"ProfilePage._loadState","line":73,"end_line":78,"hash":"ab0376720ac75e6fd66d437fbb47a53176d76f681cb13b8794249f2a586549e8"},{"id":"func/ProfilePage.isOwnProfile","name":"ProfilePage.isOwnProfile","line":80,"end_line":82,"hash":"4d149bfe7b183b5d38d496c0a8126d22bd9a919e684f375d66e2c8c1348dd773"},{"id":"func/ProfilePage.canFollow","name":"ProfilePage.canFollow","line":84,"end_line":86,"hash":"0bc2c0c17991d8f1a1d18fba29c901e42633b7cf2c2c8b5747a49e5832d7001d"},{"id":"func/ProfilePage.isFollowing","name":"ProfilePage.isFollowing","line":88,"end_line":90,"hash":"9fc0470db7ffea2da96d2dbbdceff55562e1f7e84377fbb0e8b60d53cc723b40"},{"id":"func/ProfilePage.follow","name":"ProfilePage.follow","line":92,"end_line":94,"hash":"7674b789a9d3c48e0f7a6e553613bac99b2f38449fcdd17faa3c6d7cd2773bdd"},{"id":"func/ProfilePage.unfollow","name":"ProfilePage.unfollow","line":96,"end_line":98,"hash":"69d278b09da1f284be6adacb7264f9c06ac71c42f8e8f1baf9e34d5b24a891fb"},{"id":"func/ProfilePage._setFollowState","name":"ProfilePage._setFollowState","line":101,"end_line":103,"hash":"6cd937862bd6bf18d63fe767724b02ca23d1dc54f71ede23b84b9bde2930200b"},{"id":"func/ProfilePage.canMute","name":"ProfilePage.canMute","line":105,"end_line":107,"hash":"0076ea0e688df292dbe6bcde370aa32937cf7dad674e2168c3395d41b63850af"},{"id":"func/ProfilePage.isMuting","name":"ProfilePage.isMuting","line":109,"end_line":111,"hash":"c4fe9ea0501b7349da39321afd074e7ae48c2c1f2e0d1cfafafbf57f8a05c754"},{"id":"func/ProfilePage.mute","name":"ProfilePage.mute","line":113,"end_line":115,"hash":"41f8d8b0c2a63f714875c814edb6c1951f6137ecc191b947f6db2f059c093a93"},{"id":"func/ProfilePage.unmute","name":"ProfilePage.unmute","line":117,"end_line":119,"hash":"95cb63140dbd4a47f8f75a61815c1f0d2e9a8be082af7fe2d06bdaa944b50af9"},{"id":"func/ProfilePage._setMuteState","name":"ProfilePage._setMuteState","line":122,"end_line":124,"hash":"721536335442a539a8ec7700d9db79abd18cfc24ed451fcd29e198f531d0896f"},{"id":"func/ProfilePage._broadcastMute","name":"ProfilePage._broadcastMute","line":130,"end_line":143,"hash":"1054dec2514498c3ccf41dc8c8f8a7c4749107070c4da337ebf8679d9e166e44"},{"id":"func/ProfilePage.getMuteBroadcastMessage","name":"ProfilePage.getMuteBroadcastMessage","line":146,"end_line":152,"hash":"44f1334d18699c4a7ca1c86cfcaa28e6c912f8241013b767f2fbf16ac442b3b9"},{"id":"func/ProfilePage.getMuteResultError","name":"ProfilePage.getMuteResultError","line":155,"end_line":157,"hash":"74bc51c20e9945f9df7777ac8b6d7a1c616159c13dc50ba0e4eef96b7c57fec1"},{"id":"func/ProfilePage.copyAddress","name":"ProfilePage.copyAddress","line":162,"end_line":173,"hash":"ce9ecdfce76b6879f9aa99239231a1946e55299f49485052bbe0f9ce1747bd02"},{"id":"func/ProfilePage.isShowingAddressCopyConfirmation","name":"ProfilePage.isShowingAddressCopyConfirmation","line":175,"end_line":177,"hash":"8bf08c8f2d605796286065a0856a75d59bb3643b41e766930a0e4078530d821e"},{"id":"func/ProfilePage.addressCopyTimeoutElapsed","name":"ProfilePage.addressCopyTimeoutElapsed","line":181,"end_line":185,"hash":"5aa0969ee17694d118d2f8b81855fa5ed80a11eac6aee1e13e6506d68a87fe75"},{"id":"func/ProfilePage.destroy","name":"ProfilePage.destroy","line":189,"end_line":192,"hash":"39d9970ec99985992ba94d49a4cee537993ac5f678273264548724f6f4bda45b"},{"id":"func/ProfilePage._setAddressCopied","name":"ProfilePage._setAddressCopied","line":194,"end_line":197,"hash":"7cceadb7d627cd9198904a297deb5d39721ea01cb2a79669ba97377007120a0a"},{"id":"func/ProfilePage._scheduleAddressCopyReset","name":"ProfilePage._scheduleAddressCopyReset","line":199,"end_line":205,"hash":"0b4c309d0b256d564ddaf7fca212e562addf436dca7e9ea41c2f205df1800c44"},{"id":"func/ProfilePage._clearAddressCopyTimer","name":"ProfilePage._clearAddressCopyTimer","line":207,"end_line":212,"hash":"5f40316e23a3e0438d2c3c291bbfde37779eef74502c0d1ff38e04af351b9f4c"},{"id":"func/ProfilePage.explorerUrl","name":"ProfilePage.explorerUrl","line":215,"end_line":217,"hash":"5285656344fdfedeb2abc4eed4fad4d33b2d867c373326c3859c07ff25f84d51"},{"id":"func/ProfilePage.dismissMuteResult","name":"ProfilePage.dismissMuteResult","line":220,"end_line":223,"hash":"2adc077720973bf7309aef0a2c783200313de0928c5e558a8f8c4551c3bb1828"},{"id":"func/ProfilePage._setState","name":"ProfilePage._setState","line":227,"end_line":234,"hash":"0d8a66f50e222dfaee040344c810f63f74a8765343713133e8c872436b2e8c19"},{"id":"func/ProfilePage.getPost","name":"ProfilePage.getPost","line":236,"end_line":238,"hash":"1a6ae1a02b0f79b5b62a2b2324a5f1edbd743bec004fe73cfef7970bead56885"},{"id":"func/ProfilePage.canLoadMore","name":"ProfilePage.canLoadMore","line":240,"end_line":242,"hash":"634983bcc6bbe560daad8326db0dd4bf31d5cb9e45c40112565351dceaf8e5d5"}]}
// mutate4javascript-manifest-end
