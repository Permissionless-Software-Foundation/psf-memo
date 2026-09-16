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
// {"version":1,"tested_at":"2026-09-16T19:19:23.763Z","module_hash":"a285c6a2a27006b4e90960ebfe9968651e6cfd7a4f12e600fca76d521eda2751","functions":[{"id":"func/NewPostPage.constructor","name":"NewPostPage.constructor","line":24,"end_line":37,"hash":"ea4edf077e9c3631366acadc62f27b8cf4d5087cc6d2e317db9086b1d0d18347"},{"id":"func/NewPostPage.addMenuLink","name":"NewPostPage.addMenuLink","line":40,"end_line":43,"hash":"bac97164d2d70bfdb946c4d54e67983c43cad093bac558f1d169e1739ca97137"},{"id":"func/NewPostPage.hasMenuLink","name":"NewPostPage.hasMenuLink","line":46,"end_line":48,"hash":"7e1abf5d0833aaf3b3da3a024de9eb2b80da900b2930e832c7e92d77e0e50344"},{"id":"func/NewPostPage.remainingCount","name":"NewPostPage.remainingCount","line":51,"end_line":53,"hash":"521ce4ed841f62099529b327f2245a9e94c09af2f67ed5d91839e52607bcea37"},{"id":"func/NewPostPage._setBusy","name":"NewPostPage._setBusy","line":56,"end_line":58,"hash":"af4c51d75a9bbfc4d8c2566414ee950704d83831ad915ee04eea8bf2fab65a3e"},{"id":"func/NewPostPage._perform","name":"NewPostPage._perform","line":61,"end_line":66,"hash":"e66f893a4913b5d6f3cc4fcc1ad58e21557b4a316f0150050c961e3ece237795"},{"id":"func/NewPostPage.explorerUrl","name":"NewPostPage.explorerUrl","line":69,"end_line":71,"hash":"947125deea2b19ae2dff9d9bd9449a23f10b6bf6075a9c9be4bc588cd211ff56"},{"id":"func/NewPostPage.submit","name":"NewPostPage.submit","line":75,"end_line":84,"hash":"56282a4dea0927a6ab8bd3e6452f1860b978bcf4598d17cdcf86f6083b561b17"},{"id":"func/NewPostPage.dismissResult","name":"NewPostPage.dismissResult","line":87,"end_line":93,"hash":"35cae53c6e851cd96e5b81dfe5a2b954f458bdacd60d8228676779c025820c73"}]}
// mutate4javascript-manifest-end
