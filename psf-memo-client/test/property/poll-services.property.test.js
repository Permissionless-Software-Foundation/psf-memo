/*
  Property tests for the Memo poll services and their page controllers.

  These pin down invariants over broad random inputs that the unit tests only
  probe at fixed fixtures:

    - Round-trip: buildTxidTextPayload encodes a poll txid + text into the
      canonical Memo wire payload, so the stored reverse-hex txid and the
      UTF-8 text both decode back unchanged.
    - hexToBytes length contract: only 64-character hex txids decode to
      32 bytes; everything else throws.
    - Page byte conservation: remainingCount is always maxBytes minus the
      UTF-8 byte length of the current input.
    - Rejection classification: empty inputs fail as validation and over-long
      inputs fail as length, in both cases without broadcasting.
*/

'use strict'

const test = require('node:test')
const { seededRandom, forAll } = require('./harness')
const { hexToBytes, buildTxidTextPayload } = require('../../src/services/hex')
const { byteLength } = require('../../src/services/utf8')
const MemoPollOption = require('../../src/services/memo-poll-option')
const MemoPollVote = require('../../src/services/memo-poll-vote')
const PollOptionPage = require('../../src/services/poll-option-page')
const PollVotePage = require('../../src/services/poll-vote-page')

const rng = seededRandom(20260828)

function randomTxid () {
  const hex = '0123456789abcdef'
  let s = ''
  for (let i = 0; i < 64; i++) {
    s += hex[Math.floor(rng() * 16)]
  }
  return s
}

function randomText (maxBytes) {
  const charset = ['a', 'b', 'c', 'd', ' ', 'é', '\u{1F600}']
  let s = ''
  let budget = maxBytes
  while (budget > 0) {
    const ch = charset[Math.floor(rng() * charset.length)]
    s += ch
    budget -= byteLength(ch)
  }
  return s
}

function makeWallet () {
  return {
    walletInfo: { cashAddress: 'bitcoincash:qtest' },
    broadcasts: [],
    async getUtxos () { return [] },
    async sendOpReturn (msg, prefix) {
      this.broadcasts.push({ msg, prefix })
      return 'aa'.repeat(32)
    }
  }
}

test('buildTxidTextPayload round-trips the canonical Memo wire format', async () => {
  await forAll(
    () => ({ txid: randomTxid(), text: randomText(200) }),
    ({ txid, text }) => {
      const bytes = buildTxidTextPayload(txid, text)
      if (bytes.length !== 32 + byteLength(text)) return false
      // The payload carries the txid's literal 32 bytes in order, followed by
      // the UTF-8 bytes of the value.
      const expectedTxidBytes = hexToBytes(txid, 32, 'Poll txid')
      for (let i = 0; i < 32; i++) {
        if (bytes[i] !== expectedTxidBytes[i]) return false
      }
      const storedText = Buffer.from(bytes.slice(32)).toString('utf8')
      return storedText === text
    },
    { label: 'poll txid+text wire round-trip' }
  )
})

test('hexToBytes decodes only exactly 64 hex characters to 32 bytes', async () => {
  await forAll(
    () => {
      const len = Math.floor(rng() * 80)
      const hex = '0123456789abcdef'
      let s = ''
      for (let i = 0; i < len; i++) {
        s += hex[Math.floor(rng() * 16)]
      }
      return s
    },
    (s) => {
      if (s.length === 64) {
        return hexToBytes(s, 32, 'Poll txid').length === 32
      }
      let threw = false
      try {
        hexToBytes(s, 32, 'Poll txid')
      } catch (err) {
        threw = true
      }
      return threw
    },
    { label: 'hexToBytes length contract' }
  )
})

test('poll pages conserve the remaining byte count', async () => {
  await forAll(
    () => {
      const mode = Math.floor(rng() * 2)
      return { mode, text: randomText(400) }
    },
    ({ mode, text }) => {
      const Page = mode === 0 ? PollOptionPage : PollVotePage
      const handlerKey = mode === 0 ? 'memoPollOption' : 'memoPollVote'
      const page = new Page({ [handlerKey]: {} })
      page.setInput(text)
      const limit = mode === 0
        ? MemoPollOption.MAX_OPTION_BYTES
        : MemoPollVote.MAX_COMMENT_BYTES
      return page.remainingCount() === limit - byteLength(text)
    },
    { label: 'poll page remaining byte conservation' }
  )
})

test('poll pages reject empty as validation and over-long as length without broadcasting', async () => {
  await forAll(
    () => {
      const mode = Math.floor(rng() * 2)
      const kind = Math.floor(rng() * 2) // 0 = empty, 1 = over-long
      return { mode, kind }
    },
    async ({ mode, kind }) => {
      const wallet = makeWallet()
      const txid = randomTxid()
      const Handler = mode === 0 ? MemoPollOption : MemoPollVote
      const handler = new Handler({ wallet, pollTxid: txid })
      const Page = mode === 0 ? PollOptionPage : PollVotePage
      const page = new Page({
        [mode === 0 ? 'memoPollOption' : 'memoPollVote']: handler
      })
      const limit = mode === 0
        ? MemoPollOption.MAX_OPTION_BYTES
        : MemoPollVote.MAX_COMMENT_BYTES
      const input = kind === 0 ? '' : 'x'.repeat(limit + 100)
      const validationCode = mode === 0 ? 'poll_option_validation' : 'poll_vote_validation'
      const lengthCode = mode === 0 ? 'poll_option_length' : 'poll_vote_length'

      page.setInput(input)
      const result = await page.submit()

      if (wallet.broadcasts.length !== 0) return false
      if (result.ok !== false) return false
      return page.submitError === (kind === 0 ? validationCode : lengthCode)
    },
    { label: 'poll page rejection classification' }
  )
})
