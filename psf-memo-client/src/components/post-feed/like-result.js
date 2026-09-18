/*
  Broadcast result for a like/tip submission.

  Shown after a like is broadcast: the success message, the like transaction
  id, and a link to that transaction on the block explorer. The link opens in
  a new tab.

  Written in plain React.createElement style so the same module can be used by
  the JSX components in the browser build and by the acceptance adapter that
  renders HTML under Node.
*/

const React = require('react')
const ExplorerTxLink = require('../explorer-tx-link')

function LikeResult ({ txid = '', message = '', explorerUrl = '' }) {
  return React.createElement(
    'div',
    { className: 'like-result' },
    React.createElement('p', { className: 'like-result-message' }, message),
    React.createElement(ExplorerTxLink, {
      txid,
      explorerUrl,
      className: 'like-result-txid'
    })
  )
}

module.exports = LikeResult

// mutate4javascript-manifest-begin
// {"version":1,"tested_at":"2026-09-16T19:24:39.237Z","module_hash":"53beb37c8b7aaa5c0291ff89be8444acd53240d70817b691a8eeb7def5d072f2","functions":[{"id":"func/LikeResult","name":"LikeResult","line":15,"end_line":38,"hash":"a9094a5a6f71e1142eab902750c33dded00411ae9627158589831aa3567c96a8"}]}
// mutate4javascript-manifest-end
