/*
  New Post Page behavior: compose and post a Memo, with a character counter
  that counts down from the memo limit.

  This is the testable controller behind the React "New Post" page. It wraps
  the Memo post behavior (src/services/memo-post.js) and adds page-level
  concerns: holding the current input, computing the remaining character count,
  surfacing validation/length errors, and navigating to the recent feed after a
  successful post.

  The memoPost and navigate concerns are injected so this module stays free of
  UI/network concerns; environmentally unsuitable I/O lives behind those small
  adapter boundaries.
*/

const PageController = require('./page-controller')
const MemoPost = require('./memo-post')

const NEW_POST_PATH = '/posts/new'
const RECENT_FEED_PATH = '/posts/recent'

class NewPostPage extends PageController {
  constructor (deps = {}) {
    super(deps)
    this.memoPost = deps.memoPost || null
    this.menuLinks = deps.menuLinks || []
    this.posting = false
    this.successPath = RECENT_FEED_PATH
    this.validationCodes = ['memo_validation', 'memo_length']

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
}

NewPostPage.NEW_POST_PATH = NEW_POST_PATH
NewPostPage.RECENT_FEED_PATH = RECENT_FEED_PATH

module.exports = NewPostPage

// mutate4javascript-manifest-begin
// {"version":1,"tested_at":"2026-08-26T12:18:47.139Z","module_hash":"45d772cfe40b8a34018092abbe924c01cbde741c5cbaa737a283ba35214a99ff","functions":[{"id":"func/NewPostPage.constructor","name":"NewPostPage.constructor","line":23,"end_line":33,"hash":"686653c181941b27c19cd8c1f9fa7b3fee50db6e19c1e39d0db79e6bfbe52a81"},{"id":"func/NewPostPage.addMenuLink","name":"NewPostPage.addMenuLink","line":36,"end_line":39,"hash":"bac97164d2d70bfdb946c4d54e67983c43cad093bac558f1d169e1739ca97137"},{"id":"func/NewPostPage.hasMenuLink","name":"NewPostPage.hasMenuLink","line":42,"end_line":44,"hash":"7e1abf5d0833aaf3b3da3a024de9eb2b80da900b2930e832c7e92d77e0e50344"},{"id":"func/NewPostPage.remainingCount","name":"NewPostPage.remainingCount","line":47,"end_line":49,"hash":"521ce4ed841f62099529b327f2245a9e94c09af2f67ed5d91839e52607bcea37"},{"id":"func/NewPostPage._setBusy","name":"NewPostPage._setBusy","line":52,"end_line":54,"hash":"af4c51d75a9bbfc4d8c2566414ee950704d83831ad915ee04eea8bf2fab65a3e"},{"id":"func/NewPostPage._perform","name":"NewPostPage._perform","line":57,"end_line":62,"hash":"e66f893a4913b5d6f3cc4fcc1ad58e21557b4a316f0150050c961e3ece237795"}]}
// mutate4javascript-manifest-end
