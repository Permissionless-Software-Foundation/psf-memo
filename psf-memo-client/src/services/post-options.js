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

// True when a mousedown target is outside the menu container. A missing
// container (menu not mounted) or target is treated as inside so a detached
// menu cannot close itself. Pure so the component's effect stays a thin
// adapter and the decision is unit testable without a DOM.
function isOutsidePostOptions (container, target) {
  return Boolean(container) && !container.contains(target)
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
  isOutsidePostOptions,
  postOptionsKeyCommand
}

// mutate4javascript-manifest-begin
// {"version":1,"tested_at":"2026-09-16T16:53:14.617Z","module_hash":"9564c40bbc416ef70c9b53f4dcdd849182f85734b9e48f90521b400921d3c6b3","functions":[{"id":"func/explorerTxUrl","name":"explorerTxUrl","line":18,"end_line":21,"hash":"b0284558de13bf4b63d70227a688add4739e577a8908593f3ced4ff557be6a16"},{"id":"func/postOptionsItems","name":"postOptionsItems","line":24,"end_line":34,"hash":"271f7b7971ae5d011c7014444b67d4e3f7cd25b85474f9a556e8bf8a8acb2b35"},{"id":"func/initialPostOptionsState","name":"initialPostOptionsState","line":37,"end_line":39,"hash":"1b6ab74976ac9fb54520f85e9fab7e61109572783da055866dcf64e36fc857f9"},{"id":"func/openPostOptions","name":"openPostOptions","line":42,"end_line":44,"hash":"4e91430330da69f5829a931fe6df67d2c6b7aa791f8092e1152e791c4935c384"},{"id":"func/closePostOptions","name":"closePostOptions","line":47,"end_line":49,"hash":"fe56a32123f3f5241891e22b551b0abba708bf182b2e04a9c1301d15e12fa466"},{"id":"func/togglePostOptions","name":"togglePostOptions","line":52,"end_line":54,"hash":"3bcb1a0d78907b5e83920c5f5e0d3d4fd55e0d62691d3c71bfc84bd1b9d8adac"},{"id":"func/focusFirstPostOption","name":"focusFirstPostOption","line":57,"end_line":60,"hash":"c3f174e7232a704c72bc79d84c4e5ef81ad1f32012a9c215d83c5a4eb7bd3291"},{"id":"func/handlePostOptionsEscape","name":"handlePostOptionsEscape","line":63,"end_line":65,"hash":"028896c476d907d1ca26361c5958c5996ac33a5455fa90ed8a7d48eaed9d2301"},{"id":"func/handlePostOptionsOutsideClick","name":"handlePostOptionsOutsideClick","line":68,"end_line":70,"hash":"66e71edaea9e5a93f14c2cb24026a338c02be5451f1ecdb00145705cc41e3ed0"},{"id":"func/isOutsidePostOptions","name":"isOutsidePostOptions","line":76,"end_line":78,"hash":"a35084f2e010d5e4726c25cac48b78c7e10fe331caf2ca3cabc663607cbf1962"},{"id":"func/postOptionsKeyCommand","name":"postOptionsKeyCommand","line":84,"end_line":97,"hash":"625fb7f69df3baf377fcd9a0b0d3d2bd129b31090e51591552f4eaa056fc120e"}]}
// mutate4javascript-manifest-end
