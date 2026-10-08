/*
  Unit tests for the pure memo-like helper.

  The 0x6d04 like carries the post txid (32-byte little-endian), with an
  optional tip validated against the 600-sat dust floor, the 1-BCH maximum, and
  an author address. These pin the flag parsing, the tip rules, the spendable
  balance math, and the summary.
*/

// Global npm libraries
import { assert } from 'chai'

// Local libraries
import {
  parseLikeFlags,
  spendableSats,
  formatLikeMessage,
  MEMO_LIKE_PREFIX,
  DUST_LIMIT_SATS,
  DUST_TIP_SATS,
  MAX_TIP_SATS
} from '../../../src/lib/memo-like.js'
import { captureUsageError } from '../../support/usage-error.js'

const POST = `01${'00'.repeat(31)}`
const POST_WIRE = `${'00'.repeat(31)}01`
const AUTHOR = 'bitcoincash:qqlrzp23w08434twmvr4fxw672whkjy0py26r63g3d'

describe('#memo-like helpers', () => {
  it('accepts a post txid with no tip', () => {
    const parsed = parseLikeFlags({ txid: POST })

    assert.equal(parsed.postBytes.toString('hex'), POST_WIRE)
    assert.equal(parsed.tipSats, 0)
    assert.equal(parsed.author, '')
  })

  it('treats an empty, null, or numeric-zero tip as no tip', () => {
    for (const tip of ['', null, '0', 0]) {
      const parsed = parseLikeFlags({ txid: POST, tip })
      assert.equal(parsed.tipSats, 0)
    }
  })

  it('accepts a valid tip and author address', () => {
    const parsed = parseLikeFlags({ txid: POST, tip: '600', author: AUTHOR })

    assert.equal(parsed.tipSats, DUST_TIP_SATS)
    assert.equal(parsed.author, AUTHOR)
  })

  it('accepts a tip of exactly the maximum', () => {
    const parsed = parseLikeFlags({ txid: POST, tip: String(MAX_TIP_SATS), author: AUTHOR })

    assert.equal(parsed.tipSats, MAX_TIP_SATS)
  })

  it('exposes the protocol constants', () => {
    assert.equal(MEMO_LIKE_PREFIX, '6d04')
    assert.equal(DUST_LIMIT_SATS, 3000)
    assert.equal(DUST_TIP_SATS, 600)
    assert.equal(MAX_TIP_SATS, 100000000)
  })

  it('rejects a missing or malformed post txid', () => {
    const missing = captureUsageError(() => parseLikeFlags({}))
    assert.equal(missing.message, 'You must specify a post txid with the -t flag.')

    const short = captureUsageError(() => parseLikeFlags({ txid: '1234' }))
    assert.equal(short.message, 'Txid must be a 64-character hex string.')

    const nonHex = captureUsageError(() => parseLikeFlags({ txid: 'z'.repeat(64) }))
    assert.equal(nonHex.message, 'Txid must be a valid hex string.')
  })

  it('rejects a non-integer tip', () => {
    for (const tip of ['1.5', 'abc', '-1']) {
      const err = captureUsageError(() => parseLikeFlags({ txid: POST, tip, author: AUTHOR }))
      assert.equal(err.message, 'Tip must be a valid number of satoshis.')
    }
  })

  it('rejects a tip below the dust floor', () => {
    for (const tip of ['1', '599']) {
      const err = captureUsageError(() => parseLikeFlags({ txid: POST, tip, author: AUTHOR }))
      assert.equal(err.message, `Tip is below the dust limit of ${DUST_TIP_SATS} sats.`)
    }
  })

  it('rejects a tip above the maximum', () => {
    const err = captureUsageError(() =>
      parseLikeFlags({ txid: POST, tip: '100000001', author: AUTHOR })
    )
    assert.equal(err.message, `Tip exceeds the maximum of ${MAX_TIP_SATS} sats.`)
  })

  it('rejects a tip without an author address', () => {
    const err = captureUsageError(() => parseLikeFlags({ txid: POST, tip: '600' }))
    assert.equal(err.message, 'Tip requires an author address.')
  })

  it('sums spendable sats from an utxoStore', () => {
    const wallet = {
      utxos: { utxoStore: { bchUtxos: [{ value: 1000 }, { value: 2500 }] } }
    }

    assert.equal(spendableSats(wallet), 3500)
  })

  it('sums spendable sats from a plain utxo array and tolerates a missing wallet', () => {
    assert.equal(spendableSats({ utxos: [{ satoshis: 700 }, { amount: 300 }] }), 1000)
    assert.equal(spendableSats(undefined), 0)
  })

  it('treats a UTXO with no recognized value field as zero', () => {
    assert.equal(spendableSats({ utxos: [{}] }), 0)
  })

  it('renders the txid and explorer link', () => {
    const message = formatLikeMessage({
      txid: 'abc123',
      explorerUrl: 'https://bch.loping.net/tx/abc123'
    })

    assert.include(message, 'abc123')
    assert.include(message, 'https://bch.loping.net/tx/abc123')
  })
})
