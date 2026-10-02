/*
  Account controls.

  Renders the Set Name, Set Bio, and Set Avatar URL controls on the account
  page. Each control is a description of what it does followed by a button
  that navigates to the matching page. Written in plain React.createElement
  style so the same module can be used by the JSX account page and by the
  acceptance adapter that renders HTML under Node.
*/

const React = require('react')

function AccountControl ({ label, description, onClick }) {
  return React.createElement(
    'div',
    { className: 'account-control' },
    React.createElement(
      'p',
      { className: 'account-control-description' },
      description
    ),
    React.createElement(
      'button',
      {
        type: 'button',
        className: 'account-control-button',
        onClick: () => { if (onClick) onClick() }
      },
      label
    )
  )
}

function AccountControls ({ controls = [] }) {
  if (!Array.isArray(controls) || controls.length === 0) return null

  return React.createElement(
    'div',
    { className: 'account-controls' },
    controls.map((control) => React.createElement(AccountControl, {
      key: control.label,
      label: control.label,
      description: control.description,
      onClick: control.onClick
    }))
  )
}

AccountControls.AccountControl = AccountControl

module.exports = AccountControls
