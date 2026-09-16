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

function LikeResult ({ txid = '', message = '', explorerUrl = '' }) {
  return React.createElement(
    'div',
    { className: 'like-result' },
    React.createElement('p', { className: 'like-result-message' }, message),
    txid
      ? React.createElement(
        'p',
        { className: 'like-result-txid mb-0' },
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
      : null
  )
}

module.exports = LikeResult
