/*
  Post permalink construction.

  A single Memo post has a permalink page served at /posts/thread/<txid>. The
  post timestamp links to it and the post options menu copies its absolute URL,
  so both entry points share this small pure module.
*/

const THREAD_PATH_PREFIX = '/posts/thread'

// The permalink path for a post txid.
function threadPath (txid) {
  return `${THREAD_PATH_PREFIX}/${txid}`
}

// The absolute permalink URL, prepending the page origin when known.
function postPageUrl (txid, origin = '') {
  return `${origin}${threadPath(txid)}`
}

module.exports = { THREAD_PATH_PREFIX, threadPath, postPageUrl }

// mutate4javascript-manifest-begin
// {"version":1,"tested_at":"2026-10-14T14:24:59.239Z","module_hash":"c6547daeae404d5e461b370d2c868b205324e85cb7799e7957c3a625176e4d14","functions":[{"id":"func/threadPath","name":"threadPath","line":12,"end_line":14,"hash":"285cdb40908836770618f47cf477a439142eb59ec8a5ba09e54d89ddadf855aa"},{"id":"func/postPageUrl","name":"postPageUrl","line":17,"end_line":19,"hash":"804594d13854e71105f6e6df0cddd9272a0be427dd96d4b842494760f5e9e059"}]}
// mutate4javascript-manifest-end
