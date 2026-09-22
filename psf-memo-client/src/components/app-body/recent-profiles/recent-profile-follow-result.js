/*
  Broadcast result body for a follow/unfollow submission.

  Shown in the Recent Profiles follow result modal: while the broadcast is
  pending it shows a loading indicator, on success it shows the broadcast
  success message and the transaction id linked to the block explorer in a new
  tab, and on failure it shows the broadcast error in red.

  Written in plain React.createElement style so the same module can be used by
  the JSX Recent Profiles page in the browser build and by the acceptance
  adapter that renders HTML under Node.
*/

const React = require('react')
const ExplorerTxLink = require('../../explorer-tx-link')

function RecentProfileFollowResult ({ loading = false, txid = '', message = '', error = '', explorerUrl = '' }) {
  if (loading) {
    return React.createElement(
      'div',
      { className: 'recent-profile-follow-result recent-profile-follow-loading', role: 'status' },
      React.createElement('span', {
        className: 'spinner-border spinner-border-sm me-2',
        'aria-hidden': 'true'
      }),
      React.createElement('span', { className: 'recent-profile-follow-loading-text' }, 'Broadcasting your follow...')
    )
  }

  if (error) {
    return React.createElement(
      'div',
      { className: 'recent-profile-follow-result' },
      React.createElement(
        'p',
        { className: 'recent-profile-follow-error text-danger mb-0' },
        error
      )
    )
  }

  return React.createElement(
    'div',
    { className: 'recent-profile-follow-result' },
    React.createElement('p', { className: 'recent-profile-follow-message' }, message),
    React.createElement(ExplorerTxLink, {
      txid,
      explorerUrl,
      className: 'recent-profile-follow-txid'
    })
  )
}

module.exports = RecentProfileFollowResult

// mutate4javascript-manifest-begin
// {"version":1,"tested_at":"2026-09-22T16:05:13.520Z","module_hash":"cf3aba3aa8cf0e0741d55c7d372e3027c20034a453e38831f5e8a1ff4699bca7","functions":[{"id":"func/RecentProfileFollowResult","name":"RecentProfileFollowResult","line":17,"end_line":52,"hash":"ea77c02ca0c00b9ac031b3b63d3f95521d746d822cd8dfb6a3edf5f6197e5f9a"}]}
// mutate4javascript-manifest-end
