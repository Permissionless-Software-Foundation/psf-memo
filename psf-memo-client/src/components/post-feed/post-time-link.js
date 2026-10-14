/*
  A post's timestamp rendered as a link to its single-post permalink.

  The post card shows the relative "seen" time; on the permalink page and in
  every feed, that timestamp links to /posts/thread/<txid>. The component is
  written in plain React.createElement style so the browser build and the
  acceptance adapter can share it. The browser passes the router Link as
  LinkComponent; under Node the default plain anchor is used.
*/

const React = require('react')
const { threadPath } = require('../../services/post-permalink')

function PostTimeLink ({ txid, seen, label, LinkComponent = 'a' }) {
  const href = threadPath(txid)
  const props = {
    className: 'post-time-link',
    href,
    title: 'View post'
  }

  if (LinkComponent !== 'a') {
    props.to = href
  }

  return React.createElement(
    LinkComponent,
    props,
    label ?? (seen ? String(seen) : '')
  )
}

module.exports = { PostTimeLink }

// mutate4javascript-manifest-begin
// {"version":1,"tested_at":"2026-10-14T14:24:59.431Z","module_hash":"74d4b302c509f477bab3bef5932395e14b146c96d4a9883712e32d5491fea0ae","functions":[{"id":"func/PostTimeLink","name":"PostTimeLink","line":14,"end_line":31,"hash":"bb4cf2e8c0a542e43115f83aa83979490f9a127b480529987ede364e23b4e989"}]}
// mutate4javascript-manifest-end
