/*
  Account Page behavior: show the authenticated account's sidebar (avatar,
  bio, copyable address, and SLP token icons), the Set Name, Set Bio, and
  Set Avatar URL controls with their descriptions, and the account's own posts
  feed below the controls.

  This is the testable controller behind the React "Account" page. It reads
  the current name, bio, and avatar URL from an injected profile store,
  exposes the navigation targets for the controls, loads the account's own
  posts from an injected memo db client, loads the account's token icons from
  an injected token source, and owns the transient address-copy confirmation.
  The wallet, profile store, memo db, token source, clipboard, timer, and
  navigate concerns are injected so this module stays free of UI/network
  concerns; environmentally unsuitable I/O lives behind those small adapter
  boundaries.
*/

const { setAddressCopied, scheduleAddressCopyReset, clearAddressCopyTimer } = require('./address-copy')
const { loadTokenIcons: loadTokenIconsFor, loadTokenData: loadTokenDataFor } = require('./token-icon-loader')

const SET_NAME_PATH = '/memo/set-name'
const SET_BIO_PATH = '/memo/set-bio'
const SET_AVATAR_URL_PATH = '/memo/set-avatar-url'
const ACCOUNT_PATH = '/account'
const ADDRESS_COPY_CONFIRMATION_MS = 1500
const SIDEBAR_SECTIONS = ['avatar', 'bio', 'address', 'tokens']
const CONTENT_SECTIONS = ['controls', 'posts']
const NO_POSTS_MESSAGE = 'You have no posts yet.'
const TRUNCATE_LENGTH = 24
const CONTROL_DESCRIPTIONS = {
  'Set Name': 'Set the name shown next to your posts and on your profile.',
  'Set Bio': 'Write the profile text shown on your profile page.',
  'Set Avatar URL': 'Set the URL of the image used as your profile picture.'
}
const CONTROL_LABELS = ['Set Name', 'Set Bio', 'Set Avatar URL']

class AccountPage {
  constructor (deps = {}) {
    this.wallet = deps.wallet || null
    this.profiles = deps.profiles || null
    this.memoDb = deps.memoDb || null
    this.navigate = deps.navigate || (() => {})
    this.addr = deps.addr || null
    this.tokenSource = deps.tokenSource || null
    this.onTokenIconsChange = deps.onTokenIconsChange || null
    this.copyToClipboard = deps.copyToClipboard || null
    this.onAddressCopyChange = deps.onAddressCopyChange || null
    this.setTimer = deps.setTimer || ((fn, ms) => setTimeout(fn, ms))
    this.clearTimer = deps.clearTimer || ((id) => clearTimeout(id))
    this.tokens = []
    this.tokenIcons = []
    this.posts = []
    this.pagination = null
    this.destroyed = false
    this.addressCopied = false
    this.addressCopyTimer = null
  }

  // The address of the authenticated wallet, or null when no wallet is present.
  getAddress () {
    return this.addr || this.wallet?.walletInfo?.cashAddress || null
  }

  // Read a profile field for the authenticated address. Falls back to null
  // when no wallet, profile store, or stored field exists.
  _getProfileField (method) {
    const address = this.getAddress()
    if (!address || !this.profiles || typeof this.profiles[method] !== 'function') {
      return null
    }
    return this.profiles[method](address)
  }

  // The current display name for the authenticated address.
  getName () {
    return this._getProfileField('getName')
  }

  // The current bio for the authenticated address.
  getBio () {
    return this._getProfileField('getBio')
  }

  // The current avatar URL for the authenticated address.
  getAvatarUrl () {
    return this._getProfileField('getAvatarUrl')
  }

  // The avatar URL to display, preferring the injected profile store and
  // falling back to an optional externally loaded URL (e.g. from memo-db).
  getDisplayAvatarUrl (fallbackUrl = null) {
    return this.getAvatarUrl() || fallbackUrl || null
  }

  // Whether the account page should display an avatar image.
  hasAvatarImage (fallbackUrl = null) {
    return this.getDisplayAvatarUrl(fallbackUrl) !== null
  }

  // The URL for the account page avatar image, or null when none is set.
  getAvatarImageUrl (fallbackUrl = null) {
    return this.getDisplayAvatarUrl(fallbackUrl)
  }

  // Whether the account page should show a jdenticon instead of an avatar image.
  showsJdenticon (fallbackUrl = null) {
    return !this.hasAvatarImage(fallbackUrl)
  }

  // The account address shortened for compact display, or '' without one.
  getTruncatedAddress () {
    const addr = this.getAddress()
    if (!addr || addr.length <= TRUNCATE_LENGTH) return addr || ''
    const half = Math.floor((TRUNCATE_LENGTH - 3) / 2)
    return `${addr.slice(0, half)}...${addr.slice(-half)}`
  }

  // The display name to show: the stored name, then the fallback, then the
  // truncated account address.
  getDisplayName (fallback = null) {
    return this.getName() || fallback || this.getTruncatedAddress()
  }

  // The description shown above the named control, or null when unknown.
  getControlDescription (label) {
    return CONTROL_DESCRIPTIONS[label] || null
  }

  // The account controls in display order, each with its description.
  getControls () {
    return CONTROL_LABELS.map((label) => ({
      label,
      description: this.getControlDescription(label)
    }))
  }

  // The sidebar sections in display order: avatar, bio, address, tokens.
  getSidebarSections () {
    return SIDEBAR_SECTIONS.slice()
  }

  // The account page content sections in display order: the Set Name / Set Bio
  // / Set Avatar URL controls, then the account's own posts feed.
  getContentSections () {
    return CONTENT_SECTIONS.slice()
  }

  // Load the account page: list the account's SLP tokens and build their icons,
  // then load the account's own posts.
  async load ({ limit = 50, offset = 0 } = {}) {
    await this.loadTokenIcons()
    if (this.memoDb) {
      await this.loadPosts({ limit, offset })
    }
    return {
      tokenIcons: this.tokenIcons,
      address: this.getAddress(),
      posts: this.posts,
      pagination: this.pagination
    }
  }

  // Load the authenticated account's top-level posts, newest first. Requires a
  // memo db client and an authenticated address.
  async loadPosts ({ limit = 50, offset = 0 } = {}) {
    if (!this.memoDb) {
      throw new Error('Account page requires a memo db client.')
    }
    const addr = this.getAddress()
    if (!addr) {
      throw new Error('Account page requires an address.')
    }
    const data = await this.memoDb.getPostsByAddr(addr, { limit, offset })
    this.posts = data.posts || []
    this.pagination = data.pagination || null
    return { posts: this.posts, pagination: this.pagination }
  }

  getPost (txid) {
    return this.posts.find((post) => post.txid === txid) || null
  }

  canLoadMore () {
    return this.pagination?.hasMore ?? false
  }

  // Phase one: list the SLP tokens held by the account address and render an
  // icon for each immediately, with the token ID as its tooltip. A missing
  // source or a token lookup failure is silent: the page simply shows no token
  // icons.
  async loadTokenIcons () {
    return loadTokenIconsFor(this, this.getAddress())
  }

  // Phase two: retrieve each token's token data (its genesis name and
  // mutable-data record) through the wallet and rebuild the icons, exactly as
  // the profile page does. A per-token failure leaves that token's icon
  // unchanged.
  async loadTokenData () {
    return loadTokenDataFor(this)
  }

  getTokenIcons () {
    return this.tokenIcons
  }

  // Copy the account address to the clipboard and show a transient
  // confirmation. The clipboard write is delegated to the injected adapter so
  // the controller stays free of browser APIs.
  async copyAddress () {
    const addr = this.getAddress()
    if (!addr) {
      throw new Error('Account page requires an address.')
    }
    if (!this.copyToClipboard) {
      throw new Error('Account page requires a clipboard adapter.')
    }
    await this.copyToClipboard(addr)
    setAddressCopied(this, true)
    scheduleAddressCopyReset(this, ADDRESS_COPY_CONFIRMATION_MS)
    return addr
  }

  isShowingAddressCopyConfirmation () {
    return this.addressCopied
  }

  // Clear the copy confirmation, as the confirmation timeout would. Exposed so
  // tests and acceptance runs can elapse the timer deterministically.
  addressCopyTimeoutElapsed () {
    clearAddressCopyTimer(this)
    setAddressCopied(this, false)
    return this
  }

  // Stop the pending confirmation timer without changing the confirmation
  // state. Used when the page unmounts.
  destroy () {
    this.destroyed = true
    clearAddressCopyTimer(this)
    return this
  }

  // Whether the account page exposes a Set Name button.
  hasSetNameButton () {
    return true
  }

  // Whether the account page exposes a Set Bio button.
  hasSetBioButton () {
    return true
  }

  // Whether the account page exposes a Set Avatar URL button.
  hasSetAvatarUrlButton () {
    return true
  }

  // Click the Set Name button: navigate to the set-name page.
  clickSetName () {
    this.navigate(SET_NAME_PATH)
  }

  // Click the Set Bio button: navigate to the set-bio page.
  clickSetBio () {
    this.navigate(SET_BIO_PATH)
  }

  // Click the Set Avatar URL button: navigate to the set-avatar-url page.
  clickSetAvatarUrl () {
    this.navigate(SET_AVATAR_URL_PATH)
  }
}

AccountPage.SET_NAME_PATH = SET_NAME_PATH
AccountPage.SET_BIO_PATH = SET_BIO_PATH
AccountPage.SET_AVATAR_URL_PATH = SET_AVATAR_URL_PATH
AccountPage.ACCOUNT_PATH = ACCOUNT_PATH
AccountPage.ADDRESS_COPY_CONFIRMATION_MS = ADDRESS_COPY_CONFIRMATION_MS
AccountPage.SIDEBAR_SECTIONS = SIDEBAR_SECTIONS
AccountPage.CONTENT_SECTIONS = CONTENT_SECTIONS
AccountPage.NO_POSTS_MESSAGE = NO_POSTS_MESSAGE
AccountPage.CONTROL_DESCRIPTIONS = CONTROL_DESCRIPTIONS

module.exports = AccountPage

// mutate4javascript-manifest-begin
// {"version":1,"tested_at":"2026-10-02T16:10:18.217Z","module_hash":"f092dd9358759a8db8d10f231f814f1da5cefbf56733c3bfc77961cfefb3fa8f","functions":[{"id":"func/AccountPage.constructor","name":"AccountPage.constructor","line":34,"end_line":50,"hash":"318b08c0d9edc67790fcfdbb3e87b6b18760f6cc935f8be251a6ea4bd76cc76f"},{"id":"func/AccountPage.getAddress","name":"AccountPage.getAddress","line":53,"end_line":55,"hash":"539204b7e4b84a1abf212540bd7b935a1c7dbc93d0414aeffed6c94937cabd0a"},{"id":"func/AccountPage._getProfileField","name":"AccountPage._getProfileField","line":59,"end_line":65,"hash":"f9cfeda61b974259daa7204c803aa186efa79f97cb56f5af4d2b502567da7674"},{"id":"func/AccountPage.getName","name":"AccountPage.getName","line":68,"end_line":70,"hash":"fd06a52ab7c03ab8e78702d3b05851294957ae30842f5649d3dbe7014d1d423f"},{"id":"func/AccountPage.getBio","name":"AccountPage.getBio","line":73,"end_line":75,"hash":"0e52e9086ca7c1a78dfb1025977356c453bfb4ad036a418afd92ccf700b6c394"},{"id":"func/AccountPage.getAvatarUrl","name":"AccountPage.getAvatarUrl","line":78,"end_line":80,"hash":"aac8da7f8bbb222a9c48e48af6e667f57b1e15f9b01ee6d9781d6739af53a168"},{"id":"func/AccountPage.getDisplayAvatarUrl","name":"AccountPage.getDisplayAvatarUrl","line":84,"end_line":86,"hash":"19f807d397818eddc8323f1698a4f859a6aaa2dc00531e834a9db0949316b1a1"},{"id":"func/AccountPage.hasAvatarImage","name":"AccountPage.hasAvatarImage","line":89,"end_line":91,"hash":"d0a80731894de29b831f26935390810fde8b4dc0d2796b092692745f4ee53774"},{"id":"func/AccountPage.getAvatarImageUrl","name":"AccountPage.getAvatarImageUrl","line":94,"end_line":96,"hash":"fa449dd4836aee10077b357a25e0fa628580e9c5d925337906c0493a3fdb9e44"},{"id":"func/AccountPage.showsJdenticon","name":"AccountPage.showsJdenticon","line":99,"end_line":101,"hash":"1feb9c9752364a0c90d7e82974284cef25ee8fa3815a8a28e1dd352bc4e89352"},{"id":"func/AccountPage.getTruncatedAddress","name":"AccountPage.getTruncatedAddress","line":104,"end_line":109,"hash":"1a173f5029cb30511ff9eec6f163e9f5a764c648d3e1a826f59e5511f187f99c"},{"id":"func/AccountPage.getDisplayName","name":"AccountPage.getDisplayName","line":113,"end_line":115,"hash":"8f2c76d613cef1b311b90a1eebfb1792bc4a95d848610a86d020ad44cd0312d3"},{"id":"func/AccountPage.getControlDescription","name":"AccountPage.getControlDescription","line":118,"end_line":120,"hash":"813d9ce027bcfd2987dbd408795cc4271207ed2d4620010f2a1655d45f20a4ec"},{"id":"func/AccountPage.getControls","name":"AccountPage.getControls","line":123,"end_line":128,"hash":"876a169e2d667b6328def36cfbc0670f33c1772c4a98a14574a834ddb946f7f9"},{"id":"func/AccountPage.getSidebarSections","name":"AccountPage.getSidebarSections","line":131,"end_line":133,"hash":"60b705ba5a481dbe13540f70f6639411b4a5f1ab8e39d74bd784b860454b3c3f"},{"id":"func/AccountPage.load","name":"AccountPage.load","line":136,"end_line":139,"hash":"ca283d532b7125ef43de6c32b18e72d1037b37124b13aa13b2a04790b3120628"},{"id":"func/AccountPage.loadTokenIcons","name":"AccountPage.loadTokenIcons","line":145,"end_line":147,"hash":"2504acaea1f9cf93bba2cb2245fb1feacbfa60ad768769a216ee2e5fcbbab66b"},{"id":"func/AccountPage.loadTokenData","name":"AccountPage.loadTokenData","line":153,"end_line":155,"hash":"c44d3edf001a69511e0eb94c060c74097f7faf1b815adf4ad16a664db2ae78cd"},{"id":"func/AccountPage.getTokenIcons","name":"AccountPage.getTokenIcons","line":157,"end_line":159,"hash":"02e2475d2a1afc6af7201bc271d5cdb8a6b1c05ce949b735878339f267539034"},{"id":"func/AccountPage.copyAddress","name":"AccountPage.copyAddress","line":164,"end_line":176,"hash":"1013bd6a1246c56f2ddb070ae77eef8d5d5207fe8c2be92161afa05ce33e0976"},{"id":"func/AccountPage.isShowingAddressCopyConfirmation","name":"AccountPage.isShowingAddressCopyConfirmation","line":178,"end_line":180,"hash":"8bf08c8f2d605796286065a0856a75d59bb3643b41e766930a0e4078530d821e"},{"id":"func/AccountPage.addressCopyTimeoutElapsed","name":"AccountPage.addressCopyTimeoutElapsed","line":184,"end_line":188,"hash":"71e5dcc471cedb413f339fa52d78e86c54c77aef00148425a860b8d666cd7e5d"},{"id":"func/AccountPage.destroy","name":"AccountPage.destroy","line":192,"end_line":196,"hash":"9ca78019fa6ebba6a8ffb35c80c161835b46dfbd1c081ee39840acc233553670"},{"id":"func/AccountPage.hasSetNameButton","name":"AccountPage.hasSetNameButton","line":199,"end_line":201,"hash":"49dc20060d4c55606057a926132f0cc5c8154548a445b299927ef68b9da86ca3"},{"id":"func/AccountPage.hasSetBioButton","name":"AccountPage.hasSetBioButton","line":204,"end_line":206,"hash":"9bfca400cd4dc62fb73911c270e5628746eaf1efbb50aa51e3bc98df4a1b05ec"},{"id":"func/AccountPage.hasSetAvatarUrlButton","name":"AccountPage.hasSetAvatarUrlButton","line":209,"end_line":211,"hash":"bcbba0b321844c4a3e70ee12708a59b08429ddac6e15d8be6261c44d8495cb8c"},{"id":"func/AccountPage.clickSetName","name":"AccountPage.clickSetName","line":214,"end_line":216,"hash":"82ff3b1da4068cbb8b78d55a9dfbd366c78927b67c7d4aa96c4cda12e3144f38"},{"id":"func/AccountPage.clickSetBio","name":"AccountPage.clickSetBio","line":219,"end_line":221,"hash":"97464fb4db204c66fd95beacc8d1e892ae92e30ae0da1dea9dd0f0efc85077d9"},{"id":"func/AccountPage.clickSetAvatarUrl","name":"AccountPage.clickSetAvatarUrl","line":224,"end_line":226,"hash":"eed3c7b975daad8eb4048b35161539f1efeb9731b710d1c90f8c30e52b40e6fe"}]}
// mutate4javascript-manifest-end
