/*
  Unit tests for the navigation menu model (src/services/nav-menu.js).

  The menu is the single source of truth for the navigation labels, paths, and
  order, so the component and the acceptance run agree on what the menu shows.
*/

'use strict'

const test = require('node:test')
const assert = require('node:assert/strict')

const { NAV_MENU_ENTRIES, findMenuEntry, isMenuEntryActive } = require('../../src/services/nav-menu')

const labels = (entries = NAV_MENU_ENTRIES) => entries.map((entry) => entry.label)

test('labels the hosting pages File Upload and File Dashboard', () => {
  assert.equal(findMenuEntry('/host').label, 'File Upload')
  assert.equal(findMenuEntry('/dashboard').label, 'File Dashboard')
})

test('orders Account, File Upload, File Dashboard, BCH', () => {
  const order = labels().filter((label) => ['Account', 'File Upload', 'File Dashboard', 'BCH'].includes(label))

  assert.deepEqual(order, ['Account', 'File Upload', 'File Dashboard', 'BCH'])
})

test('places File Upload and File Dashboard next to each other', () => {
  const account = NAV_MENU_ENTRIES.findIndex((entry) => entry.label === 'Account')
  const host = NAV_MENU_ENTRIES.findIndex((entry) => entry.label === 'File Upload')
  const dashboard = NAV_MENU_ENTRIES.findIndex((entry) => entry.label === 'File Dashboard')
  const bch = NAV_MENU_ENTRIES.findIndex((entry) => entry.label === 'BCH')

  assert.equal(host, account + 1)
  assert.equal(dashboard, host + 1)
  assert.equal(bch, dashboard + 1)
})

test('returns undefined for a path that is not in the menu', () => {
  assert.equal(findMenuEntry('/not-a-page'), undefined)
})

test('marks the home route as the active Posts entry', () => {
  const posts = findMenuEntry('/posts/recent')

  assert.equal(isMenuEntryActive(posts, '/'), true)
  assert.equal(isMenuEntryActive(posts, '/posts/recent'), true)
  assert.equal(isMenuEntryActive(posts, '/topics'), false)
})

test('marks an entry active only on its own path by default', () => {
  const account = findMenuEntry('/account')

  assert.equal(isMenuEntryActive(account, '/account'), true)
  assert.equal(isMenuEntryActive(account, '/bch'), false)
})
