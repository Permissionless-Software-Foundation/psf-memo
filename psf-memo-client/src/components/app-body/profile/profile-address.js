/*
  Profile address display with a transient copy confirmation.

  Presentational only: the profile page controller owns the clipboard write and
  the confirmation timeout. The address is a button so it is keyboard
  accessible. Written in plain React.createElement style so the same module can
  be used by the JSX profile page and by the acceptance adapter that renders
  HTML under Node.
*/

const React = require('react')

const COPIED_TEXT = 'Copied to clipboard'

function ProfileAddress ({ address = '', copied = false, onClick }) {
  const children = [
    React.createElement(
      'span',
      { key: 'label', className: 'profile-address-label' },
      'BCH'
    ),
    React.createElement(
      'button',
      {
        key: 'address',
        type: 'button',
        className: 'profile-address-value',
        title: address,
        onClick: () => { if (onClick) onClick() }
      },
      address
    )
  ]

  if (copied) {
    children.push(
      React.createElement(
        'span',
        {
          key: 'copied',
          className: 'profile-address-copied',
          role: 'status',
          'aria-live': 'polite'
        },
        COPIED_TEXT
      )
    )
  }

  return React.createElement('div', { className: 'profile-address mt-3' }, children)
}

ProfileAddress.COPIED_TEXT = COPIED_TEXT

module.exports = ProfileAddress
