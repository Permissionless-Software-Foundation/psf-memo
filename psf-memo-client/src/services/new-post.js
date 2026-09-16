/*
  New Post Page behavior: compose and post a Memo, with a character counter
  that counts down from the memo limit.

  This is the testable controller behind the React "New Post" page. It wraps
  the Memo post behavior (src/services/memo-post.js) and adds page-level
  concerns: holding the current input, computing the remaining character count,
  surfacing validation/length errors, showing a success/failure result after
  broadcast, and navigating to the recent feed when that result is dismissed.

  The memoPost and navigate concerns are injected so this module stays free of
  UI/network concerns; environmentally unsuitable I/O lives behind those small
  adapter boundaries.
*/

const PageController = require('./page-controller')
const MemoPost = require('./memo-post')
const { BLOCK_EXPLORER_TX_BASE, blockExplorerTxUrl } = require('./block-explorer')

const NEW_POST_PATH = '/posts/new'
const RECENT_FEED_PATH = '/posts/recent'

class NewPostPage extends PageController {
  constructor (deps = {}) {
    super(deps)
    this.memoPost = deps.memoPost || null
    this.menuLinks = deps.menuLinks || []
    this.posting = false
    // Navigation is deferred until the result modal is dismissed.
    this.successPath = null
    this.validationCodes = ['memo_validation', 'memo_length']
    this.showResultModal = false
    this.lastResult = null

    // The navigation menu links to the new post page.
    this.addMenuLink(NEW_POST_PATH)
  }

  // Record a navigation menu link offered by the app.
  addMenuLink (path) {
    if (!this.menuLinks.includes(path)) this.menuLinks.push(path)
    return this
  }

  // Whether the navigation menu exposes a link to the given path.
  hasMenuLink (path) {
    return this.menuLinks.includes(path)
  }

  // Characters remaining before the memo limit is reached.
  remainingCount () {
    return MemoPost.MAX_MEMO_CHARS - this.input.length
  }

  // Set the in-flight posting flag.
  _setBusy (value) {
    this.posting = value
  }

  // Run the memo post action for the current input.
  async _perform (input) {
    if (!this.memoPost) {
      throw new Error('New post requires a memo post handler.')
    }
    return this.memoPost.post(input)
  }

  // Block explorer URL for a broadcast transaction.
  explorerUrl (txid) {
    return NewPostPage.explorerUrl(txid)
  }

  // Submit the memo. On broadcast success or failure, open the result modal
  // instead of navigating. Validation errors stay on the form.
  async submit () {
    this.showResultModal = false
    this.lastResult = null
    const result = await super.submit()
    this.lastResult = result
    if (result.ok || result.error === 'broadcast') {
      this.showResultModal = true
    }
    return result
  }

  // Dismiss the result modal. A successful post then navigates to the feed.
  dismissResult () {
    const shouldNavigate = Boolean(this.lastResult && this.lastResult.ok)
    this.showResultModal = false
    if (shouldNavigate) {
      this.navigate(RECENT_FEED_PATH)
    }
  }
}

NewPostPage.NEW_POST_PATH = NEW_POST_PATH
NewPostPage.RECENT_FEED_PATH = RECENT_FEED_PATH
NewPostPage.EXPLORER_TX_BASE = BLOCK_EXPLORER_TX_BASE
NewPostPage.explorerUrl = blockExplorerTxUrl

module.exports = NewPostPage

// mutate4javascript-manifest-begin
// {"version":1,"tested_at":"2026-09-13T13:36:17.184Z","module_hash":"65edafa07e390d316197347119a4d2a50c3fe73980c8e526f38fa0f66ee69689","functions":[{"id":"func/NewPostPage.constructor","name":"NewPostPage.constructor","line":24,"end_line":37,"hash":"1a42004b33ac28f396df02f70b2cec6a91f890d3a065aefe890c23cb1456ace3"},{"id":"func/NewPostPage.addMenuLink","name":"NewPostPage.addMenuLink","line":40,"end_line":43,"hash":"2bb99421f2cdbcf9a39f77244b250e4251b9bd3cc81a4f399589007f71486b79"},{"id":"func/NewPostPage.hasMenuLink","name":"NewPostPage.hasMenuLink","line":46,"end_line":48,"hash":"f2e167f20bd3040ebbcfaf3a3e95254333b9739e0fa93d7801ead542be2a15e3"},{"id":"func/NewPostPage.remainingCount","name":"NewPostPage.remainingCount","line":51,"end_line":53,"hash":"421d0af0e01278b479a5bb8d62d344498f875d188e8307eda420d637c23600d4"},{"id":"func/NewPostPage._setBusy","name":"NewPostPage._setBusy","line":56,"end_line":58,"hash":"1552af7690ee7a92b2a9ed84af1ba301c2468939b6994ca3942fe0b7004028fb"},{"id":"func/NewPostPage._perform","name":"NewPostPage._perform","line":61,"end_line":66,"hash":"c8b7394bcd5a2252278095e9af08cc5e76720b4fab08aa83218cb93fdb372407"},{"id":"func/NewPostPage.explorerUrl","name":"NewPostPage.explorerUrl","line":69,"end_line":71,"hash":"84a048fa78b38cef32573f1e31be11f870c765393213e59744d9799690da4d37"},{"id":"func/NewPostPage.submit","name":"NewPostPage.submit","line":75,"end_line":84,"hash":"1f15969b62987f29fbc310845716fe65c9ace8bec2f7bb2d8bee62e59b7cee95"},{"id":"func/NewPostPage.dismissResult","name":"NewPostPage.dismissResult","line":87,"end_line":93,"hash":"c155b35aedd68c7bbde87329ec086079621cf362ecf01472b65c7e442c9646b7"}]}
// mutate4javascript-manifest-end
