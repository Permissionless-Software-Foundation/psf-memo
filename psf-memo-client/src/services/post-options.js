/*
  Post options menu behavior: the shared model behind the three-dots menu on
  every post card.

  The menu's first item is a "See on block explorer" link to the post
  transaction on bch.loping.net, opened in a new tab. This module owns the link
  construction and the pure open/close/focus state transitions so the feed card
  and the profile post card render identical behavior.

  It is written in plain CommonJS with no UI or DOM concerns so it can be used
  by the browser components, by unit tests, and by the acceptance handlers.
*/

const BLOCK_EXPLORER_LABEL = 'See on block explorer'
const BLOCK_EXPLORER_TX_BASE = 'https://bch.loping.net/tx'

// Block explorer URL for a post transaction, or '' without a txid.
function explorerTxUrl (txid) {
  if (!txid) return ''
  return `${BLOCK_EXPLORER_TX_BASE}/${txid}`
}

// The ordered menu items for a post. The block explorer link is first.
function postOptionsItems (txid) {
  return [
    {
      id: 'block-explorer',
      label: BLOCK_EXPLORER_LABEL,
      href: explorerTxUrl(txid),
      target: '_blank',
      rel: 'noopener noreferrer'
    }
  ]
}

// A fresh, closed menu state.
function initialPostOptionsState () {
  return { open: false, focusedIndex: -1 }
}

// Open the menu, leaving any current item focus intact.
function openPostOptions (state) {
  return { ...state, open: true }
}

// Close the menu and clear item focus.
function closePostOptions (state) {
  return { ...state, open: false, focusedIndex: -1 }
}

// Open a closed menu, close an open one.
function togglePostOptions (state) {
  return state.open ? closePostOptions(state) : openPostOptions(state)
}

// Move focus to the first menu item, if there is one.
function focusFirstPostOption (state, items = []) {
  if (!items.length) return state
  return { ...state, open: true, focusedIndex: 0 }
}

// Escape closes the menu.
function handlePostOptionsEscape (state) {
  return closePostOptions(state)
}

// A click outside the menu closes it.
function handlePostOptionsOutsideClick (state) {
  return closePostOptions(state)
}

// Resolve a key press to the menu's next state. Returns null for keys that are
// not menu shortcuts. ArrowDown reveals the menu and focuses its first item;
// Escape closes it. preventDefault is true for keys that would otherwise scroll
// the page.
function postOptionsKeyCommand (key, items = []) {
  if (key === 'Escape') {
    return { transition: handlePostOptionsEscape, preventDefault: false }
  }

  if (key === 'ArrowDown') {
    return {
      transition: (state) => focusFirstPostOption(state, items),
      preventDefault: true
    }
  }

  return null
}

module.exports = {
  BLOCK_EXPLORER_LABEL,
  BLOCK_EXPLORER_TX_BASE,
  explorerTxUrl,
  postOptionsItems,
  initialPostOptionsState,
  openPostOptions,
  closePostOptions,
  togglePostOptions,
  focusFirstPostOption,
  handlePostOptionsEscape,
  handlePostOptionsOutsideClick,
  postOptionsKeyCommand
}
