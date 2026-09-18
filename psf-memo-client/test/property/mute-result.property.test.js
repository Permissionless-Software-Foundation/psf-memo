/*
  Property tests for the mute broadcast result.

  The unit tests probe the mute result at a few fixed fixtures. These
  properties pin down the invariants over broad random inputs:

    - explorerUrl composes the shared block explorer base with the txid and
      returns '' for every falsy input.
    - The MuteResult component always shows the message, shows the txid and an
      explorer link that opens in a new tab exactly when a txid is present,
      shows only the error when an error is present, and is deterministic.
    - The profile page mute result state machine mirrors the last broadcast: a
      successful mute/unmute opens the modal with the matching success message,
      a failure opens the failure modal with the error and leaves the button
      state unchanged, a new broadcast replaces the previous result, and
      dismissing closes the modal without changing the button.
*/

'use strict'

const test = require('node:test')
const React = require('react')
const ReactDOMServer = require('react-dom/server')
const { seededRandom, forAll, intGen } = require('./harness')
const ProfilePage = require('../../src/services/profile-page')
const MuteResult = require('../../src/components/app-body/profile/mute-result')

const rng = seededRandom(20260918)

const MY_ADDRESS = 'bitcoincash:qqlrzp23w08434twmvr4fxw672whkjy0py26r63g3d'
const MUTE_ADDRESS = 'bitcoincash:qr95sy3j9xwd2ap32xkykttr4cvcu7as4y0qverfuy'
const MUTE_TXID = 'ab'.repeat(32)

const HEX = '0123456789abcdef'
const SAFE_WORDS = ['mute', 'unmute', 'broadcast', 'success', 'memo', 'network']
const FALSY = [undefined, null, '', 0, false]

function randomTxid () {
  const n = intGen(rng, 1, 64)()
  let out = ''
  for (let i = 0; i < n; i++) out += HEX[Math.floor(rng() * HEX.length)]
  return out
}

function randomMessage () {
  const n = intGen(rng, 1, 6)()
  let out = ''
  for (let i = 0; i < n; i++) {
    out += `${SAFE_WORDS[intGen(rng, 0, SAFE_WORDS.length - 1)()]} `
  }
  return out.trim()
}

function makeMemoDb () {
  return {
    async getPostsByAddr () {
      return { posts: [], pagination: { total: 0 } }
    },
    async getFollowState () {
      return false
    },
    async getMuteState () {
      return false
    }
  }
}

// A profile page whose memo mute handler either succeeds with MUTE_TXID or
// fails with the given message.
function makePage ({ fail = null, txid = MUTE_TXID } = {}) {
  const page = new ProfilePage({ memoDb: makeMemoDb(), addr: MUTE_ADDRESS, myAddr: MY_ADDRESS })
  page.memoMute = {
    async mute () {
      if (fail) throw new Error(fail)
      return txid
    },
    async unmute () {
      if (fail) throw new Error(fail)
      return txid
    }
  }
  return page
}

function render (props) {
  return ReactDOMServer.renderToStaticMarkup(
    React.createElement(MuteResult, props)
  )
}

test('explorerUrl composes the shared base and the txid', async () => {
  await forAll(
    () => randomTxid(),
    async (txid) =>
      ProfilePage.explorerUrl(txid) === `${ProfilePage.EXPLORER_TX_BASE}/${txid}`,
    { label: 'mute explorer url composition', samples: 2000 }
  )
})

test('explorerUrl returns an empty string for every falsy input', async () => {
  await forAll(
    () => FALSY[intGen(rng, 0, FALSY.length - 1)()],
    async (value) => ProfilePage.explorerUrl(value) === '',
    { label: 'mute explorer url falsy inputs', samples: 500 }
  )
})

test('MuteResult shows the message and links only with a txid', async () => {
  await forAll(
    () => ({ txid: rng() < 0.2 ? '' : randomTxid(), message: randomMessage() }),
    async ({ txid, message }) => {
      const url = ProfilePage.explorerUrl(txid)
      const html = render({ txid, message, explorerUrl: url })
      if (!html.includes(message)) return false
      if (txid) {
        if (!html.includes(txid)) return false
        if (!html.includes(`href="${url}"`)) return false
        if (!html.includes('target="_blank"')) return false
      } else if (html.includes('<a ')) {
        return false
      }
      return true
    },
    { label: 'mute result markup', samples: 1500 }
  )
})

test('MuteResult shows only the error when an error is present', async () => {
  await forAll(
    () => ({ txid: randomTxid(), message: randomMessage(), error: randomMessage() }),
    async ({ txid, message, error }) => {
      const html = render({ txid, message, error, explorerUrl: ProfilePage.explorerUrl(txid) })
      return html.includes('mute-result-error') &&
        html.includes(error) &&
        !html.includes('mute-result-message') &&
        !html.includes('<a ')
    },
    { label: 'mute result error markup', samples: 1000 }
  )
})

test('rendering the same MuteResult props twice yields the same markup', async () => {
  await forAll(
    () => ({ txid: randomTxid(), message: randomMessage() }),
    async (props) => {
      const first = render(props)
      const second = render(props)
      return first === second
    },
    { label: 'mute result render determinism', samples: 500 }
  )
})

test('the mute result modal mirrors the last broadcast outcome', async () => {
  await forAll(
    () => ({ method: rng() < 0.5 ? 'mute' : 'unmute', fail: rng() < 0.4 }),
    async ({ method, fail }) => {
      const page = makePage({ fail: fail ? 'Insufficient balance' : null })
      const result = await page[method]()

      if (!page.showMuteResultModal) return false
      if (result.ok) {
        const expected = method === 'unmute' ? ProfilePage.UNMUTE_SUCCESS_MESSAGE : ProfilePage.MUTE_SUCCESS_MESSAGE
        return page.getMuteBroadcastMessage() === expected && page.getMuteResultError() === ''
      }
      return page.getMuteBroadcastMessage() === '' && page.getMuteResultError() === 'Insufficient balance'
    },
    { label: 'mute result modal outcome', samples: 800 }
  )
})

test('a failed mute broadcast leaves the button state unchanged', async () => {
  await forAll(
    () => ({ method: rng() < 0.5 ? 'mute' : 'unmute', initial: rng() < 0.5 }),
    async ({ method, initial }) => {
      const page = makePage({ fail: 'Insufficient balance' })
      page.muteState = initial
      const result = await page[method]()
      return result.ok === false && page.isMuting() === initial
    },
    { label: 'mute failure leaves button state', samples: 500 }
  )
})

test('a successful mute then unmute round-trips the reflected mute state', async () => {
  await forAll(
    () => rng() < 0.5,
    async (startMuted) => {
      const page = makePage()
      page.muteState = startMuted
      const muteResult = await page.mute()
      const afterMute = page.isMuting()
      const unmuteResult = await page.unmute()
      const afterUnmute = page.isMuting()
      return muteResult.ok && afterMute === true && unmuteResult.ok && afterUnmute === false
    },
    { label: 'mute reflected state round trip', samples: 400 }
  )
})

test('a new broadcast replaces the previous result', async () => {
  await forAll(
    () => rng() < 0.5,
    async (firstFails) => {
      const page = makePage({ fail: firstFails ? 'Insufficient balance' : null })
      await page.mute()
      const before = { ok: page.lastMuteResult.ok, error: page.getMuteResultError() }
      // Force the opposite outcome on the next broadcast.
      page.memoMute = {
        async mute () {
          if (!firstFails) throw new Error('Insufficient balance')
          return MUTE_TXID
        },
        async unmute () {
          return MUTE_TXID
        }
      }
      await page.mute()
      return before.ok === !firstFails &&
        page.lastMuteResult.ok === firstFails &&
        page.getMuteResultError() === (firstFails ? '' : 'Insufficient balance')
    },
    { label: 'mute result replace', samples: 400 }
  )
})

test('dismissing the mute result closes the modal without changing the button', async () => {
  await forAll(
    () => ({ method: rng() < 0.5 ? 'mute' : 'unmute', fail: rng() < 0.5 }),
    async ({ method, fail }) => {
      const page = makePage({ fail: fail ? 'Insufficient balance' : null })
      const result = await page[method]()
      const stateBeforeDismiss = page.muteState
      page.dismissMuteResult()
      return result.ok === !fail &&
        page.showMuteResultModal === false &&
        page.muteState === stateBeforeDismiss
    },
    { label: 'mute result dismiss', samples: 500 }
  )
})
