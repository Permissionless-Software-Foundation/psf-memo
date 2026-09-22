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
