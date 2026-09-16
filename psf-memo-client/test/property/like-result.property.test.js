/*
  Property tests for the like broadcast result.

  The unit tests probe the like result at a few fixed fixtures. These
  properties pin down the invariants over broad random inputs:

    - explorerUrl composes the shared block explorer base with the txid and
      returns '' for every falsy input.
    - The LikeResult component always shows the message, shows the txid and an
      explorer link that opens in a new tab exactly when a txid is present, and
      is deterministic.
    - The result-modal state machine mirrors the last submit outcome: a
      successful like opens the result with the success message and keeps the
      modal open; a failed like shows no result. Dismissing always closes the
      result and the modal, and reopening always clears the previous result.
*/

'use strict'

const test = require('node:test')
const React = require('react')
const ReactDOMServer = require('react-dom/server')
const { seededRandom, forAll, intGen } = require('./harness')
const LikeTipPage = require('../../src/services/like-tip-page')
const MemoLike = require('../../src/services/memo-like')
const LikeResult = require('../../src/components/post-feed/like-result')

const rng = seededRandom(20260916)

const MY_ADDRESS = 'bitcoincash:qqlrzp23w08434twmvr4fxw672whkjy0py26r63g3d'
const AUTHOR_ADDRESS = 'bitcoincash:qz7v6ztvzu2f2xd2ww8pnx9vwk0g4ncvfvavktg0jc'
const LIKE_TXID = 'ab'.repeat(32)

const HEX = '0123456789abcdef'
const SAFE_WORDS = ['like', 'broadcast', 'success', 'memo', 'network', 'tip', 'post']
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

function makeWallet (failWith) {
  return {
    walletInfo: { cashAddress: MY_ADDRESS },
    utxos: [{ txid: 'utxo', value: 100000 }],
    broadcasts: [],
    async getUtxos () {
      return this.utxos
    },
    async sendOpReturn (msg, prefix, bchOutput = []) {
      this.broadcasts.push({ msg, prefix, bchOutput })
      if (failWith) throw new Error(failWith)
      return LIKE_TXID
    }
  }
}

function makeSubmittedPage (fail) {
  const memoLike = new MemoLike({ wallet: makeWallet(fail ? 'Insufficient balance' : null) })
  const page = new LikeTipPage({ memoLike })
  page.open(randomTxid(), AUTHOR_ADDRESS)
  page.setTip('')
  return page
}

function render (props) {
  return ReactDOMServer.renderToStaticMarkup(
    React.createElement(LikeResult, props)
  )
}

test('explorerUrl composes the shared base and the txid', async () => {
  await forAll(
    () => randomTxid(),
    async (txid) =>
      LikeTipPage.explorerUrl(txid) === `${LikeTipPage.EXPLORER_TX_BASE}/${txid}`,
    { label: 'like explorer url composition', samples: 2000 }
  )
})

test('explorerUrl returns an empty string for every falsy input', async () => {
  await forAll(
    () => FALSY[intGen(rng, 0, FALSY.length - 1)()],
    async (value) => LikeTipPage.explorerUrl(value) === '',
    { label: 'like explorer url falsy inputs', samples: 500 }
  )
})

test('LikeResult always shows the message and links only with a txid', async () => {
  await forAll(
    () => ({ txid: rng() < 0.2 ? '' : randomTxid(), message: randomMessage() }),
    async ({ txid, message }) => {
      const url = LikeTipPage.explorerUrl(txid)
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
    { label: 'like result markup', samples: 1500 }
  )
})

test('rendering the same LikeResult props twice yields the same markup', async () => {
  await forAll(
    () => ({ txid: randomTxid(), message: randomMessage() }),
    async (props) => {
      const first = render(props)
      const second = render(props)
      return first === second
    },
    { label: 'like result render determinism', samples: 500 }
  )
})

test('the result modal mirrors the last submit outcome', async () => {
  await forAll(
    () => rng() < 0.4,
    async (fail) => {
      const page = makeSubmittedPage(fail)
      const result = await page.submit()
      if (result.ok) {
        if (page.showResultModal !== true || page.modalOpen !== true) return false
        if (page.getBroadcastMessage() !== LikeTipPage.SUCCESS_MESSAGE) return false
      } else {
        if (page.showResultModal !== false) return false
        if (page.getBroadcastMessage() !== '') return false
      }
      return true
    },
    { label: 'like result modal outcome', samples: 400 }
  )
})

test('dismissing the result always closes the result and the modal', async () => {
  await forAll(
    () => rng() < 0.5,
    async (fail) => {
      const page = makeSubmittedPage(fail)
      await page.submit()
      page.dismissResult()
      return page.showResultModal === false && page.modalOpen === false
    },
    { label: 'like result dismiss', samples: 400 }
  )
})

test('reopening the like/tip modal always clears the previous result', async () => {
  await forAll(
    () => rng() < 0.5,
    async (fail) => {
      const page = makeSubmittedPage(fail)
      await page.submit()
      page.open(randomTxid(), AUTHOR_ADDRESS)
      return page.showResultModal === false && page.lastResult === null
    },
    { label: 'like result reopen clears', samples: 400 }
  )
})
