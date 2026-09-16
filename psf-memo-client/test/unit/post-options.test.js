/*
  Unit tests for the post options menu.

  Every post card shows a three-dots "Post options" button whose menu's first
  item is "See on block explorer", a link to the post transaction on
  bch.loping.net that opens in a new tab. The menu opens on the button, closes
  on the button again, an outside click, or Escape, and ArrowDown moves focus
  to the first item.

  The pure service owns the link construction and the open/close/focus state
  transitions; the component renders that state to markup.
*/

'use strict'

const test = require('node:test')
const assert = require('node:assert/strict')
const React = require('react')
const ReactDOMServer = require('react-dom/server')
const PostOptions = require('../../src/services/post-options')
const PostOptionsMenu = require('../../src/components/post-feed/post-options-menu')

const TXID = 'c96a46c8b55657fe125115e3ddf5ad30ad587bb41baa952cb8d9be9334161875'
const EXPLORER_URL = `https://bch.loping.net/tx/${TXID}`

function renderMenu (props = {}) {
  return ReactDOMServer.renderToStaticMarkup(
    React.createElement(PostOptionsMenu, { txid: TXID, ...props })
  )
}

test('explorerTxUrl builds the bch.loping.net transaction link', () => {
  assert.equal(PostOptions.explorerTxUrl(TXID), EXPLORER_URL)
})

test('explorerTxUrl returns an empty string without a txid', () => {
  assert.equal(PostOptions.explorerTxUrl(''), '')
  assert.equal(PostOptions.explorerTxUrl(null), '')
  assert.equal(PostOptions.explorerTxUrl(undefined), '')
})

test('postOptionsItems puts the block explorer link first', () => {
  const items = PostOptions.postOptionsItems(TXID)

  assert.equal(items[0].label, 'See on block explorer')
  assert.equal(items[0].href, EXPLORER_URL)
  assert.equal(items[0].target, '_blank')
  assert.equal(items[0].rel, 'noopener noreferrer')
})

test('the menu starts hidden', () => {
  const state = PostOptions.initialPostOptionsState()

  assert.equal(state.open, false)
  assert.equal(state.focusedIndex, -1)
})

test('toggling the menu opens it, then closes it again', () => {
  let state = PostOptions.initialPostOptionsState()

  state = PostOptions.togglePostOptions(state)
  assert.equal(state.open, true)

  state = PostOptions.togglePostOptions(state)
  assert.equal(state.open, false)
})

test('closing the menu also clears item focus', () => {
  const open = PostOptions.openPostOptions(PostOptions.initialPostOptionsState())
  const focused = PostOptions.focusFirstPostOption(
    open,
    PostOptions.postOptionsItems(TXID)
  )
  const closed = PostOptions.closePostOptions(focused)

  assert.equal(closed.open, false)
  assert.equal(closed.focusedIndex, -1)
})

test('Escape and an outside click both close the menu', () => {
  const open = PostOptions.openPostOptions(PostOptions.initialPostOptionsState())

  assert.equal(PostOptions.handlePostOptionsEscape(open).open, false)
  assert.equal(PostOptions.handlePostOptionsOutsideClick(open).open, false)
})

test('focusing the first item selects index 0 when items exist', () => {
  const open = PostOptions.openPostOptions(PostOptions.initialPostOptionsState())
  const focused = PostOptions.focusFirstPostOption(
    open,
    PostOptions.postOptionsItems(TXID)
  )

  assert.equal(focused.focusedIndex, 0)
})

test('focusing the first item is a no-op with no items', () => {
  const open = PostOptions.openPostOptions(PostOptions.initialPostOptionsState())
  const focused = PostOptions.focusFirstPostOption(open, [])

  assert.equal(focused.focusedIndex, -1)
})

test('the closed menu renders the post options button but no items', () => {
  const html = renderMenu()

  assert.match(html, /aria-label="Post options"/)
  assert.match(html, /aria-haspopup="menu"/)
  assert.match(html, /aria-expanded="false"/)
  assert.doesNotMatch(html, /See on block explorer/)
})

test('the open menu renders the block explorer link that opens in a new tab', () => {
  const html = renderMenu({ initialOpen: true })

  assert.match(html, /aria-expanded="true"/)
  assert.match(html, /See on block explorer/)
  assert.match(html, new RegExp(`href="${EXPLORER_URL.replace(/[.]/g, '\\.')}"`))
  assert.match(html, /target="_blank"/)
  assert.match(html, /rel="noopener noreferrer"/)
})

test('the focused first item is tabbable and the others are not', () => {
  const html = renderMenu({ initialOpen: true, initialFocusedIndex: 0 })

  assert.match(html, /tabindex="0"/)
})
