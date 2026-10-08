/*
  Unit tests for the reply-count React view.

  The view is a thin wrapper over the reply-count view model, so these tests
  only check that the model's attributes reach the rendered HTML.
*/

'use strict'

const test = require('node:test')
const assert = require('node:assert/strict')
const React = require('react')
const ReactDOMServer = require('react-dom/server')
const ReplyCountView = require('../../src/components/post-reply-count/reply-count-view')

function render (props) {
  return ReactDOMServer.renderToStaticMarkup(React.createElement(ReplyCountView, props))
}

test('renders a non-interactive reply count without a handler', () => {
  const html = render({ count: 3 })

  assert.ok(html.includes('post-reply-count-disabled'))
  assert.ok(html.includes('post-reply-count-number'))
  assert.ok(html.includes('>3<'))
  assert.ok(html.includes('aria-label="3 replies"'))
  assert.ok(!html.includes('role="button"'))
})

test('renders a clickable reply count with a handler', () => {
  const html = render({ count: 1, onClick: () => {} })

  assert.ok(html.includes('post-reply-count-always-clickable'))
  assert.ok(html.includes('role="button"'))
  assert.ok(html.includes('tabindex="0"'))
  assert.ok(html.includes('aria-label="1 reply — click to view thread"'))
})
