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
