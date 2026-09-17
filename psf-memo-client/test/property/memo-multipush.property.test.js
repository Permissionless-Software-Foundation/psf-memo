/*
  Property tests for the multi-push OP_RETURN adapter.

  Unit tests pin the adapter's push expansion at fixed fixtures. These
  properties pin the encoding invariants over broad random field lists:

    - Ordering and prefix: buildPushes always returns the action prefix first
      followed by one push per field, in input order.
    - Conservation: the concatenation of the field pushes equals the UTF-8
      encoding of the input fields, with no bytes added or dropped.
    - Round trip: toPushBuffer encodes a string as its UTF-8 bytes and passes
      byte arrays through unchanged.
    - Dispatch and idempotence: the attached wallet expands an array argument
      to separate pushes, delegates a single-field call to the original
      method, and attaching twice does not double-wrap.
*/

'use strict'

const test = require('node:test')
const { seededRandom, forAll, intGen } = require('./harness')
const {
  toPushBuffer,
  buildPushes,
  attachMultiPushOpReturn
} = require('../../src/services/memo-multipush')
const { encodeScript } = require('../support/script-encoding')

const rng = seededRandom(20260916)

// Characters with distinct UTF-8 byte widths: 1, 1, 2, 3, and 4 bytes.
const CHARS = ['a', 'b', ' ', '\u00e9', '\u20ac', '\ud83d\ude00']

function randomPrefix () {
  const len = 2 * intGen(rng, 1, 4)()
  const hex = '0123456789abcdef'
  let out = ''
  for (let i = 0; i < len; i++) out += hex[Math.floor(rng() * 16)]
  return out
}

function randomString () {
  const len = intGen(rng, 0, 24)()
  let out = ''
  for (let i = 0; i < len; i++) out += CHARS[Math.floor(rng() * CHARS.length)]
  return out
}

// Half UTF-8 strings, half raw byte arrays.
function randomField () {
  if (rng() < 0.5) return randomString()
  const len = intGen(rng, 0, 8)()
  const bytes = new Uint8Array(len)
  for (let i = 0; i < len; i++) bytes[i] = intGen(rng, 0, 255)()
  return bytes
}

function randomFields () {
  const count = intGen(rng, 1, 5)()
  const fields = []
  for (let i = 0; i < count; i++) fields.push(randomField())
  return fields
}

// A double of the minimal-slp-wallet surface the adapter reuses.
function makeWalletDouble () {
  const sent = []
  const wallet = {
    walletInfo: { cashAddress: 'bitcoincash:qtest' },
    fee: 1,
    walletInfoPromise: Promise.resolve(),
    utxos: { utxoStore: { bchUtxos: [{ tx_hash: 'aa', tx_pos: 0, value: 100000 }] } },
    calls: [],
    async sendOpReturn (msg, prefix, bchOutput = []) {
      this.calls.push({ msg, prefix, bchOutput })
      return 'single-txid'
    },
    opReturn: {
      bchjs: {
        Script: { opcodes: { OP_RETURN: 0x6a }, encode2: encodeScript }
      },
      async createTransaction (walletInfo, bchUtxos, msg, prefix) {
        this.lastEncoded = this.bchjs.Script.encode2([
          this.bchjs.Script.opcodes.OP_RETURN,
          Buffer.from(prefix, 'hex'),
          Buffer.from(msg)
        ])
        return { hex: 'beef' }
      },
      ar: {
        async sendTx (hex) {
          sent.push(hex)
          return 'txid-1'
        }
      }
    }
  }
  return { wallet, sent }
}

test('buildPushes keeps the prefix first and the fields in order', async () => {
  await forAll(
    () => ({ prefix: randomPrefix(), fields: randomFields() }),
    ({ prefix, fields }) => {
      const pushes = buildPushes(prefix, fields)
      if (pushes.length !== fields.length + 1) return false
      if (pushes[0].toString('hex') !== prefix) return false
      for (let i = 0; i < fields.length; i++) {
        if (!pushes[i + 1].equals(toPushBuffer(fields[i]))) return false
      }
      return true
    },
    { label: 'buildPushes ordering and prefix' }
  )
})

test('buildPushes conserves the field bytes', async () => {
  await forAll(
    () => ({ prefix: randomPrefix(), fields: randomFields() }),
    ({ prefix, fields }) => {
      const pushes = buildPushes(prefix, fields)
      const actual = Buffer.concat(pushes.slice(1))
      const expected = Buffer.concat(fields.map((field) => toPushBuffer(field)))
      return actual.equals(expected)
    },
    { label: 'buildPushes conservation' }
  )
})

test('toPushBuffer round-trips strings and byte arrays', async () => {
  await forAll(
    () => randomField(),
    (field) => {
      const buf = toPushBuffer(field)
      if (typeof field === 'string') return buf.toString('utf8') === field
      return buf.equals(Buffer.from(field))
    },
    { label: 'toPushBuffer round trip' }
  )
})

test('an attached wallet expands arrays into separate pushes', async () => {
  await forAll(
    () => ({ prefix: randomPrefix(), fields: randomFields() }),
    async ({ prefix, fields }) => {
      const { wallet } = makeWalletDouble()
      attachMultiPushOpReturn(wallet)
      const txid = await wallet.sendOpReturn(fields, prefix)
      if (txid !== 'txid-1') return false
      const expected = encodeScript([
        wallet.opReturn.bchjs.Script.opcodes.OP_RETURN,
        ...buildPushes(prefix, fields)
      ])
      return wallet.opReturn.lastEncoded.equals(expected)
    },
    { label: 'adapter multi-push expansion' }
  )
})

test('an attached wallet delegates a single field and attaches only once', async () => {
  await forAll(
    () => randomString(),
    async (text) => {
      const { wallet } = makeWalletDouble()
      attachMultiPushOpReturn(wallet)
      attachMultiPushOpReturn(wallet)
      const txid = await wallet.sendOpReturn(text, '6d02')
      return txid === 'single-txid' && wallet.calls.length === 1 && wallet.calls[0].msg === text
    },
    { label: 'adapter delegation and idempotent attach' }
  )
})
