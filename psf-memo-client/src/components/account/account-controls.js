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

// mutate4javascript-manifest-begin
// {"version":1,"tested_at":"2026-10-02T16:08:05.339Z","module_hash":"5c9ca2c685ea8cd812bc9fe5ab0bfe6387f97cc11ad30a92bdebd4246fd9b149","functions":[{"id":"func/AccountControl","name":"AccountControl","line":13,"end_line":32,"hash":"6cb2ca54b2197e77684bf9f594dd1fc2e854cc180ab47fcad9a457f1442e7bfa"},{"id":"func/AccountControls","name":"AccountControls","line":34,"end_line":47,"hash":"0a1697c45ee4a3119bd4b8d6b5daa19c8e85e7f1cf9b2d2f671f625c2fcd3e7b"}]}
// mutate4javascript-manifest-end
