/*
  Unit tests for the Recent Profile follow confirmation component.

  The confirmation asks whether to follow or unfollow the profile's display
  name and offers Yes and No buttons. Yes continues to the broadcast; No closes
  the modal without broadcasting.
*/

'use strict'

const test = require('node:test')
const assert = require('node:assert/strict')
const React = require('react')
const ReactDOMServer = require('react-dom/server')
const RecentProfileFollowConfirm = require('../../src/components/app-body/recent-profiles/recent-profile-follow-confirm')

const MESSAGE = 'Are you sure you want to follow alice?'

function render (props = {}) {
  return ReactDOMServer.renderToStaticMarkup(
    React.createElement(RecentProfileFollowConfirm, { message: MESSAGE, ...props })
  )
}

test('renders the confirmation message', () => {
  assert.ok(render().includes(MESSAGE))
})

test('offers Yes and No buttons', () => {
  const html = render()

  assert.match(html, /<button[^>]*>Yes<\/button>/)
  assert.match(html, /<button[^>]*>No<\/button>/)
})

test('clicking Yes invokes the confirm handler', () => {
  let confirmed = 0
  const tree = RecentProfileFollowConfirm({ message: MESSAGE, onYes: () => { confirmed++ } })
  const actions = tree.props.children[1]
  const yesButton = actions.props.children[0]

  yesButton.props.onClick()

  assert.equal(confirmed, 1)
})

test('clicking No invokes the cancel handler', () => {
  let cancelled = 0
  const tree = RecentProfileFollowConfirm({ message: MESSAGE, onNo: () => { cancelled++ } })
  const actions = tree.props.children[1]
  const noButton = actions.props.children[1]

  noButton.props.onClick()

  assert.equal(cancelled, 1)
})

test('clicking without handlers is a no-op', () => {
  const tree = RecentProfileFollowConfirm({ message: MESSAGE })
  const actions = tree.props.children[1]
  const yesButton = actions.props.children[0]
  const noButton = actions.props.children[1]

  assert.doesNotThrow(() => yesButton.props.onClick())
  assert.doesNotThrow(() => noButton.props.onClick())
})
