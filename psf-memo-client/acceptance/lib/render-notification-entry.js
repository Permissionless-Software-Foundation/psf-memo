/*
  Acceptance rendering adapter for a notification entry.

  Renders the same NotificationEntry component the browser uses to a static
  HTML string, so acceptance assertions can inspect the avatar, profile links,
  address, and View Post link markup without running a browser.
*/

'use strict'

const React = require('react')
const ReactDOMServer = require('react-dom/server')
const NotificationEntry = require('../../src/components/app-body/notifications/notification-entry')

function renderNotificationEntry (entry) {
  const element = React.createElement(NotificationEntry, { entry })
  return ReactDOMServer.renderToStaticMarkup(element)
}

module.exports = { renderNotificationEntry }
