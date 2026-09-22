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

// mutate4javascript-manifest-begin
// {"version":1,"tested_at":"2026-09-22T18:06:41.268Z","module_hash":"ef6a3eaa367a0a216ca16b33da84e3e797102886d571de28737155b96d4c4039","functions":[{"id":"func/ProfileAddress","name":"ProfileAddress","line":15,"end_line":51,"hash":"44eb6fd2adf6513a3db61dde75b08ee1730d4495cb09a1f447f160442ad1dfb4"}]}
// mutate4javascript-manifest-end
