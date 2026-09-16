/*
  Property tests for the post options menu.

  The unit tests probe post-options at a few fixed fixtures. These properties
  pin down the service's and the component's invariants over broad random
  inputs:

    - explorerTxUrl composes the block explorer base with the txid and returns
      '' for every falsy input.
    - postOptionsItems always offers the block explorer link first, with the
      expected label, target, and rel, and an href equal to explorerTxUrl.
    - Close transitions are idempotent and always clear focus; open preserves
      focus; toggle is an involution on the open flag.
    - focusFirstPostOption (ArrowDown) opens and focuses index 0 when items
      exist, and is a no-op with no items.
    - The key command maps only Escape and ArrowDown, never prevents the
      default for anything else.
    - The rendered component always shows the button, shows menu items only
      when open, makes exactly the focused item tabbable, and is deterministic.
*/

'use strict'

const test = require('node:test')
const React = require('react')
const ReactDOMServer = require('react-dom/server')
const { seededRandom, forAll, intGen } = require('./harness')
const PostOptions = require('../../src/services/post-options')
const PostOptionsMenu = require('../../src/components/post-feed/post-options-menu')

const rng = seededRandom(20260916)

const HEX = '0123456789abcdef'
const OTHER_KEYS = ['Enter', 'Tab', 'ArrowUp', 'ArrowLeft', 'Escape ', 'escape', '']

function randomTxid () {
  const n = intGen(rng, 1, 64)()
  let out = ''
  for (let i = 0; i < n; i++) out += HEX[Math.floor(rng() * HEX.length)]
  return out
}

function randomState () {
  return { open: rng() < 0.5, focusedIndex: intGen(rng, -1, 3)() }
}

function render (props) {
  return ReactDOMServer.renderToStaticMarkup(
    React.createElement(PostOptionsMenu, props)
  )
}

test('explorerTxUrl composes the base and the txid', async () => {
  await forAll(
    () => randomTxid(),
    async (txid) =>
      PostOptions.explorerTxUrl(txid) === `${PostOptions.BLOCK_EXPLORER_TX_BASE}/${txid}`,
    { label: 'explorerTxUrl composition', samples: 2000 }
  )
})

test('explorerTxUrl returns an empty string for every falsy input', async () => {
  await forAll(
    () => [undefined, null, '', 0, false][intGen(rng, 0, 4)()],
    async (value) => PostOptions.explorerTxUrl(value) === '',
    { label: 'explorerTxUrl falsy inputs', samples: 500 }
  )
})

test('postOptionsItems always puts the block explorer link first', async () => {
  await forAll(
    () => randomTxid(),
    async (txid) => {
      const items = PostOptions.postOptionsItems(txid)
      if (items.length === 0) return false
      const first = items[0]
      return first.id === 'block-explorer' &&
        first.label === PostOptions.BLOCK_EXPLORER_LABEL &&
        first.target === '_blank' &&
        first.rel === 'noopener noreferrer' &&
        first.href === PostOptions.explorerTxUrl(txid)
    },
    { label: 'postOptionsItems block explorer first', samples: 2000 }
  )
})

test('close transitions are idempotent and clear focus', async () => {
  await forAll(
    () => randomState(),
    async (state) => {
      const transitions = [
        PostOptions.closePostOptions,
        PostOptions.handlePostOptionsEscape,
        PostOptions.handlePostOptionsOutsideClick
      ]
      for (const transition of transitions) {
        const once = transition(state)
        const twice = transition(once)
        if (once.open !== false || once.focusedIndex !== -1) return false
        if (JSON.stringify(once) !== JSON.stringify(twice)) return false
      }
      return true
    },
    { label: 'post options close idempotence', samples: 2000 }
  )
})

test('open preserves focus and toggle is an involution on open', async () => {
  await forAll(
    () => randomState(),
    async (state) => {
      const opened = PostOptions.openPostOptions(state)
      if (opened.open !== true) return false
      if (opened.focusedIndex !== state.focusedIndex) return false
      const twice = PostOptions.togglePostOptions(PostOptions.togglePostOptions(state))
      return twice.open === state.open
    },
    { label: 'post options open and toggle', samples: 2000 }
  )
})

test('focusFirstPostOption opens and focuses index 0 only when items exist', async () => {
  await forAll(
    () => randomState(),
    async (state) => {
      const items = PostOptions.postOptionsItems(randomTxid())
      const focused = PostOptions.focusFirstPostOption(state, items)
      if (focused.open !== true || focused.focusedIndex !== 0) return false
      const empty = PostOptions.focusFirstPostOption(state, [])
      return JSON.stringify(empty) === JSON.stringify(state)
    },
    { label: 'post options focus first', samples: 2000 }
  )
})

test('the key command maps only Escape and ArrowDown', async () => {
  await forAll(
    () => ({ key: OTHER_KEYS[intGen(rng, 0, OTHER_KEYS.length - 1)()], txid: randomTxid() }),
    async ({ key, txid }) => {
      const items = PostOptions.postOptionsItems(txid)
      if (PostOptions.postOptionsKeyCommand(key, items) !== null) return false

      const escape = PostOptions.postOptionsKeyCommand('Escape', items)
      if (!escape || escape.preventDefault !== false) return false
      if (escape.transition(PostOptions.initialPostOptionsState()).open !== false) return false

      const arrowDown = PostOptions.postOptionsKeyCommand('ArrowDown', items)
      if (!arrowDown || arrowDown.preventDefault !== true) return false
      const next = arrowDown.transition(PostOptions.initialPostOptionsState())
      return next.open === true && next.focusedIndex === 0
    },
    { label: 'post options key command', samples: 1000 }
  )
})

test('the rendered menu shows the button always and items only when open', async () => {
  await forAll(
    () => ({ txid: randomTxid(), open: rng() < 0.5 }),
    async ({ txid, open }) => {
      const html = render({ txid, initialOpen: open })
      if (!html.includes('aria-label="Post options"')) return false
      if (!html.includes(`aria-expanded="${open ? 'true' : 'false'}"`)) return false
      if (html.includes(PostOptions.BLOCK_EXPLORER_LABEL) !== open) return false
      if (open && !html.includes(`href="${PostOptions.explorerTxUrl(txid)}"`)) return false
      if (open && !html.includes('target="_blank"')) return false
      return true
    },
    { label: 'post options render open and closed', samples: 1000 }
  )
})

test('exactly the focused menu item is tabbable', async () => {
  await forAll(
    () => ({ txid: randomTxid(), focusedIndex: intGen(rng, -1, 0)() }),
    async ({ txid, focusedIndex }) => {
      const html = render({ txid, initialOpen: true, initialFocusedIndex: focusedIndex })
      const tabbable = (html.match(/tabindex="0"/g) || []).length
      return tabbable === (focusedIndex === 0 ? 1 : 0)
    },
    { label: 'post options tabbable item', samples: 500 }
  )
})

test('rendering the same props twice yields the same markup', async () => {
  await forAll(
    () => ({
      txid: randomTxid(),
      initialOpen: rng() < 0.5,
      initialFocusedIndex: intGen(rng, -1, 1)()
    }),
    async (props) => {
      const first = render(props)
      const second = render(props)
      return first === second
    },
    { label: 'post options render determinism', samples: 500 }
  )
})
