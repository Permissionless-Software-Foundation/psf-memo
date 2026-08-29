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

const PROFILE_PATH_PREFIX = '/profile'

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
  }

  async load ({ limit = 100, offset = 0 } = {}) {
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
    return this._setMuteState('mute', true)
  }

  async unmute () {
    return this._setMuteState('unmute', false)
  }

  // Delegate mute/unmute to the injected handler and reflect the new state.
  async _setMuteState (method, nextState) {
    return this._setState(this.memoMute, 'mute', 'muteState', method, nextState)
  }

  // Delegate a follow/mute action to the injected handler and reflect the new
  // state on the matching field.
  async _setState (handler, label, stateField, method, nextState) {
    if (!handler) {
      throw new Error(`Profile page requires a memo ${label} handler.`)
    }
    await handler[method](this.addr)
    this[stateField] = nextState
    return { ok: true }
  }

  getPost (txid) {
    return this.posts.find((post) => post.txid === txid) || null
  }
}

ProfilePage.PROFILE_PATH_PREFIX = PROFILE_PATH_PREFIX

module.exports = ProfilePage

// mutate4javascript-manifest-begin
// {"version":1,"tested_at":"2026-08-29T03:10:07.663Z","module_hash":"be54fde7e97be7c83df6680f33b31151f5f2f91835ba404705c988c0baa84e6a","functions":[{"id":"func/ProfilePage.constructor","name":"ProfilePage.constructor","line":17,"end_line":27,"hash":"2a9265aa29bd66a11c2a627ecad5149b093f53b0892b848bef09ac2b949a2ee2"},{"id":"func/ProfilePage.load","name":"ProfilePage.load","line":29,"end_line":45,"hash":"c57316a8a92684b9506f340122361f69a7361f0190c4e8a0e7816a11de2db089"},{"id":"func/ProfilePage._assertReady","name":"ProfilePage._assertReady","line":48,"end_line":55,"hash":"e575f98fa1b492b4c11ae5275459d9f9996df4c566b84c7cae91413c72a02f38"},{"id":"func/ProfilePage._loadState","name":"ProfilePage._loadState","line":59,"end_line":64,"hash":"ab0376720ac75e6fd66d437fbb47a53176d76f681cb13b8794249f2a586549e8"},{"id":"func/ProfilePage.isOwnProfile","name":"ProfilePage.isOwnProfile","line":66,"end_line":68,"hash":"4d149bfe7b183b5d38d496c0a8126d22bd9a919e684f375d66e2c8c1348dd773"},{"id":"func/ProfilePage.canFollow","name":"ProfilePage.canFollow","line":70,"end_line":72,"hash":"0bc2c0c17991d8f1a1d18fba29c901e42633b7cf2c2c8b5747a49e5832d7001d"},{"id":"func/ProfilePage.isFollowing","name":"ProfilePage.isFollowing","line":74,"end_line":76,"hash":"9fc0470db7ffea2da96d2dbbdceff55562e1f7e84377fbb0e8b60d53cc723b40"},{"id":"func/ProfilePage.follow","name":"ProfilePage.follow","line":78,"end_line":80,"hash":"7674b789a9d3c48e0f7a6e553613bac99b2f38449fcdd17faa3c6d7cd2773bdd"},{"id":"func/ProfilePage.unfollow","name":"ProfilePage.unfollow","line":82,"end_line":84,"hash":"69d278b09da1f284be6adacb7264f9c06ac71c42f8e8f1baf9e34d5b24a891fb"},{"id":"func/ProfilePage._setFollowState","name":"ProfilePage._setFollowState","line":87,"end_line":89,"hash":"6cd937862bd6bf18d63fe767724b02ca23d1dc54f71ede23b84b9bde2930200b"},{"id":"func/ProfilePage.canMute","name":"ProfilePage.canMute","line":91,"end_line":93,"hash":"0076ea0e688df292dbe6bcde370aa32937cf7dad674e2168c3395d41b63850af"},{"id":"func/ProfilePage.isMuting","name":"ProfilePage.isMuting","line":95,"end_line":97,"hash":"c4fe9ea0501b7349da39321afd074e7ae48c2c1f2e0d1cfafafbf57f8a05c754"},{"id":"func/ProfilePage.mute","name":"ProfilePage.mute","line":99,"end_line":101,"hash":"228ff6bb19d81e92f99090b6242043b216b9ff8dd9f7aa49d4e50521b1270c26"},{"id":"func/ProfilePage.unmute","name":"ProfilePage.unmute","line":103,"end_line":105,"hash":"ea3e7cbf5a02898ea2a924fb42b683ef50a7a9985ac9118dd404e46fcaa78ed1"},{"id":"func/ProfilePage._setMuteState","name":"ProfilePage._setMuteState","line":108,"end_line":110,"hash":"721536335442a539a8ec7700d9db79abd18cfc24ed451fcd29e198f531d0896f"},{"id":"func/ProfilePage._setState","name":"ProfilePage._setState","line":114,"end_line":121,"hash":"8e01237a2cf48ca49a5c480d94a89cd6fbe3911bd476b17ca826a21bcbd60f4c"},{"id":"func/ProfilePage.getPost","name":"ProfilePage.getPost","line":123,"end_line":125,"hash":"1a6ae1a02b0f79b5b62a2b2324a5f1edbd743bec004fe73cfef7970bead56885"}]}
// mutate4javascript-manifest-end
