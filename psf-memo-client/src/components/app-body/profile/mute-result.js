/*
  Broadcast result for a mute/unmute submission.

  Shown on the profile page after a mute or unmute is broadcast: the success
  message, the transaction id, and a link to that transaction on the block
  explorer that opens in a new tab. On failure it shows the broadcast error
  message instead.

  Written in plain React.createElement style so the same module can be used by
  the JSX components in the browser build and by the acceptance adapter that
  renders HTML under Node.
*/

const React = require('react')

function MuteResult ({ txid = '', message = '', error = '', explorerUrl = '' }) {
  return React.createElement(
    'div',
    { className: 'mute-result' },
    error
      ? React.createElement('p', { className: 'mute-result-error mb-0' }, error)
      : React.createElement(
        React.Fragment,
        null,
        React.createElement('p', { className: 'mute-result-message' }, message),
        txid
          ? React.createElement(
            'p',
            { className: 'mute-result-txid mb-0' },
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
  )
}

module.exports = MuteResult
