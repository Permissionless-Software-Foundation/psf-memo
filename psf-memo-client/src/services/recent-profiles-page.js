/*
  Recent Profiles Page behavior: load and display the most recent Memo profiles
  and coordinate the viewer's follow/unfollow controls for each row.

  This is the testable controller behind the React "Recent Profiles" page. It
  wraps the MemoDb client, exposes the loaded profiles and pagination, loads
  the viewer's follow state for each listed profile, and coordinates
  follow/unfollow broadcasts with an injected MemoFollow action.

  Follow results open a result modal that shows loading while a broadcast is
  pending, then the success message/txid/explorer link or the failure message.
  A failed broadcast leaves the row's follow state unchanged and the modal
  stays open until dismissed.
*/

const PaginatedPage = require('./paginated-page')
const { BLOCK_EXPLORER_TX_BASE, blockExplorerTxUrl } = require('./block-explorer')
const { broadcastSuccessMessage, broadcastErrorMessage } = require('./broadcast-result')

const RECENT_PROFILES_PATH = '/profile/recent'
const FOLLOW_SUCCESS_MESSAGE = 'Your follow was broadcast to the Bitcoin Cash network.'
const UNFOLLOW_SUCCESS_MESSAGE = 'Your unfollow was broadcast to the Bitcoin Cash network.'

class RecentProfilesPage extends PaginatedPage {
  constructor (deps = {}) {
    super(deps, {
      listField: 'profiles',
      loadMethod: 'getRecentProfiles',
      errorMessage: 'Recent profiles page requires a memo db client.'
    })
    this.myAddr = deps.myAddr || null
    this.memoFollow = deps.memoFollow || null
    this.followState = {}
    this.showFollowResultModal = false
    this.lastFollowResult = null
    this.followBusyAddr = null
  }

  async load ({ limit = 50, offset = 0 } = {}) {
    const result = await super.load({ limit, offset })
    await this._loadFollowState()
    return { ...result, followState: { ...this.followState } }
  }

  // Load the viewer's follow state for every listed profile. Without a viewer
  // address and a memo db that can report follow state there is nothing to
  // load.
  async _loadFollowState () {
    this.followState = {}
    if (!this._canLoadFollowState()) return
    for (const profile of this.profiles) {
      await this._loadProfileFollowState(profile)
    }
  }

  // True when the injected viewer address and memo db can report follow state.
  _canLoadFollowState () {
    return Boolean(this.myAddr && this.memoDb && typeof this.memoDb.getFollowState === 'function')
  }

  // Record the viewer's follow state for one profile, ignoring empty rows.
  async _loadProfileFollowState (profile) {
    if (!profile || !profile.addr) return
    this.followState[profile.addr] = await this.memoDb.getFollowState(this.myAddr, profile.addr)
  }

  getProfile (addr) {
    return this.profiles.find((profile) => profile.addr === addr) || null
  }

  isFollowing (addr) {
    return this.followState[addr] === true
  }

  // True while the follow/unfollow broadcast for `addr` is pending, so the
  // modal can show a loading indicator.
  isFollowLoading (addr) {
    return this.followBusyAddr === addr
  }

  async follow (addr) {
    return this._broadcastFollow('follow', addr, true)
  }

  async unfollow (addr) {
    return this._broadcastFollow('unfollow', addr, false)
  }

  // Broadcast a follow/unfollow and record the result for the result modal.
  // The modal opens immediately so it can show loading; a missing handler is a
  // programming error that still throws, while a broadcast failure is recorded
  // so the failure modal shows it and the row keeps its previous label.
  async _broadcastFollow (method, addr, nextState) {
    if (!this.memoFollow) {
      throw new Error('Recent profiles page requires a memo follow handler.')
    }
    this.lastFollowResult = null
    this.showFollowResultModal = true
    this.followBusyAddr = addr
    try {
      const txid = await this.memoFollow[method](addr)
      this.followState[addr] = nextState
      this.lastFollowResult = { ok: true, action: method, addr, txid }
    } catch (err) {
      this.lastFollowResult = { ok: false, action: method, addr, message: err.message || String(err) }
    }
    this.followBusyAddr = null
    return this.lastFollowResult
  }

  // The broadcast success message for the visible follow result, or ''.
  getFollowBroadcastMessage () {
    return broadcastSuccessMessage(
      this.lastFollowResult,
      { unfollow: UNFOLLOW_SUCCESS_MESSAGE },
      FOLLOW_SUCCESS_MESSAGE
    )
  }

  // The broadcast error message for the visible follow result, or ''.
  getFollowResultError () {
    return broadcastErrorMessage(this.lastFollowResult)
  }

  // Block explorer URL for a follow/unfollow transaction.
  explorerUrl (txid) {
    return blockExplorerTxUrl(txid)
  }

  // Dismiss the follow result. This closes the modal without changing the row.
  dismissFollowResult () {
    this.showFollowResultModal = false
    return this
  }
}

RecentProfilesPage.RECENT_PROFILES_PATH = RECENT_PROFILES_PATH
RecentProfilesPage.EXPLORER_TX_BASE = BLOCK_EXPLORER_TX_BASE
RecentProfilesPage.FOLLOW_SUCCESS_MESSAGE = FOLLOW_SUCCESS_MESSAGE
RecentProfilesPage.UNFOLLOW_SUCCESS_MESSAGE = UNFOLLOW_SUCCESS_MESSAGE

module.exports = RecentProfilesPage

// mutate4javascript-manifest-begin
// {"version":1,"tested_at":"2026-09-04T17:09:41.844Z","module_hash":"8a305e7c3c74e6ef33e57da9a0c1f3d3e0eff6ff2d6da99d1383d93874745b65","functions":[{"id":"func/RecentProfilesPage.constructor","name":"RecentProfilesPage.constructor","line":14,"end_line":20,"hash":"01a7876c30597e8eb8e37003290b8a9c9db2d3f2bc7305104e1b02659cc413c5"},{"id":"func/RecentProfilesPage.getProfile","name":"RecentProfilesPage.getProfile","line":22,"end_line":24,"hash":"c93f06a279f8976938fc8b91ce24e9e742c700ac6ff271328192dba9140ae195"}]}
// mutate4javascript-manifest-end
