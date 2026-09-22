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
// {"version":1,"tested_at":"2026-09-22T16:11:44.935Z","module_hash":"5de586d9c4a3200582ac255f467e7608076e860b407f9b202ff4fb7dd6c32b3e","functions":[{"id":"func/RecentProfilesPage.constructor","name":"RecentProfilesPage.constructor","line":25,"end_line":37,"hash":"00900950b36f5e02ab26f9ce0c8e55f3bba4e2047ea4cc8895221a3170da248c"},{"id":"func/RecentProfilesPage.load","name":"RecentProfilesPage.load","line":39,"end_line":43,"hash":"fc0fa93abc1d6ffcbd29d76e780e7d60ade8509569d32d60302be0acc569ff18"},{"id":"func/RecentProfilesPage._loadFollowState","name":"RecentProfilesPage._loadFollowState","line":48,"end_line":54,"hash":"b041faf35e65799216804acd8219d9a7c87b2e890281a93881a2105d226fa816"},{"id":"func/RecentProfilesPage._canLoadFollowState","name":"RecentProfilesPage._canLoadFollowState","line":57,"end_line":59,"hash":"734e84fd5a21488c4c3db2fba6c20a21747a9abe350e74a5cd05c1731d50f16e"},{"id":"func/RecentProfilesPage._loadProfileFollowState","name":"RecentProfilesPage._loadProfileFollowState","line":62,"end_line":65,"hash":"c1699283e3d2e7c1b1792d47d54c4861d83730eb9390fad4df995c7bfbf630a8"},{"id":"func/RecentProfilesPage.getProfile","name":"RecentProfilesPage.getProfile","line":67,"end_line":69,"hash":"c93f06a279f8976938fc8b91ce24e9e742c700ac6ff271328192dba9140ae195"},{"id":"func/RecentProfilesPage.isFollowing","name":"RecentProfilesPage.isFollowing","line":71,"end_line":73,"hash":"d3cf2395ac941e4ef4a13b037b4b2f05657779a13c53e714e531016666539c5d"},{"id":"func/RecentProfilesPage.isFollowLoading","name":"RecentProfilesPage.isFollowLoading","line":77,"end_line":79,"hash":"73a4f9b4ce60754f8852505e3d915954856f448efc21237cbca3c125ec1cec40"},{"id":"func/RecentProfilesPage.follow","name":"RecentProfilesPage.follow","line":81,"end_line":83,"hash":"f638ebcd2f58267a45b944f422a975bc4d8b4eb11a4e8d83dbc0745b57a247db"},{"id":"func/RecentProfilesPage.unfollow","name":"RecentProfilesPage.unfollow","line":85,"end_line":87,"hash":"3cc59ef4bc0bb21a2aa0dde8c43f1daac89f575c7bb25c1409db20f608a941c9"},{"id":"func/RecentProfilesPage._broadcastFollow","name":"RecentProfilesPage._broadcastFollow","line":93,"end_line":109,"hash":"29cc4da39da6a9d2f5bfa9e099e7bf09635b69170f81c8325e5bddf4c5507c77"},{"id":"func/RecentProfilesPage.getFollowBroadcastMessage","name":"RecentProfilesPage.getFollowBroadcastMessage","line":112,"end_line":118,"hash":"0622b8a95ba525ed70d315116b7284f68d529d008da5e22f9058354e5b196221"},{"id":"func/RecentProfilesPage.getFollowResultError","name":"RecentProfilesPage.getFollowResultError","line":121,"end_line":123,"hash":"69bf10aea22cda3bef062cbccd249682a0a4627b96ef12b910bff28a2d18f6d5"},{"id":"func/RecentProfilesPage.explorerUrl","name":"RecentProfilesPage.explorerUrl","line":126,"end_line":128,"hash":"679d76c13344bcc03c607089cdfcf31a9c5f9d49cdbfd42d8ec93256150a2270"},{"id":"func/RecentProfilesPage.dismissFollowResult","name":"RecentProfilesPage.dismissFollowResult","line":131,"end_line":134,"hash":"436e87b8752c07ebdb6efe927715246d8e6c0036c117748e293c9211a7893f97"}]}
// mutate4javascript-manifest-end
