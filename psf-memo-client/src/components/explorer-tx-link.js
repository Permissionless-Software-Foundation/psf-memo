/*
  Explorer link for a broadcast transaction.

  Shown by the like/tip and mute broadcast result components: "Transaction ID:"
  followed by the txid linked to its block explorer page, opening in a new tab.
  The `className` is supplied by the caller so each result keeps its own
  styling.

  Written in plain React.createElement style so the same module can be used by
  the JSX components in the browser build and by the Node acceptance adapters.
*/

const React = require('react')

function ExplorerTxLink ({ txid = '', explorerUrl = '', className = '' }) {
  if (!txid) return null
  return React.createElement(
    'p',
    { className: `${className} mb-0`.trim() },
    'Transaction ID: ',
    React.createElement(
      'a',
      {
        href: explorerUrl,
        target: '_blank',
        rel: 'noopener noreferrer',
        style: { wordBreak: 'break-all' }
      },
      txid
    )
  )
}

module.exports = ExplorerTxLink
