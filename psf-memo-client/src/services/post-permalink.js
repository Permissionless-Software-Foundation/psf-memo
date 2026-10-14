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
