/*
  Gherkin step handlers for the Memo wire-encoding feature.

  These steps call the real encoding helpers and compare the resulting bytes,
  so the accepted vectors and the malformed-input contract are exercised
  without a wallet or network access.
*/

// Local libraries
import {
  txidToWireBytes,
  addressToHash160
} from '../../../src/lib/wire-encoding.js'
import { resolveParam } from '../step-support.js'

const wireEncodingHandlers = [
  {
    name: 'a Memo encoding helper',
    pattern: /^a Memo encoding helper$/,
    run (m, example, world) {
      world.txid = null
      world.wireBytes = null
      world.address = null
      world.payload = null
      world.conversionError = null
    }
  },
  {
    name: 'the txid',
    pattern: /^the txid "(.+)"$/,
    run (m, example, world) {
      world.txid = resolveParam(m[1], example)
    }
  },
  {
    name: 'convert txid to wire bytes',
    pattern: /^the txid is converted to wire bytes$/,
    run (m, example, world) {
      world.conversionError = null
      try {
        world.wireBytes = txidToWireBytes(world.txid)
      } catch (err) {
        world.conversionError = err
      }
    }
  },
  {
    name: 'wire bytes are',
    pattern: /^the wire bytes are "(.+)"$/,
    run (m, example, world) {
      const expected = resolveParam(m[1], example)
      const actual = world.wireBytes?.toString('hex')
      if (actual !== expected) {
        throw new Error(`Expected wire bytes ${expected}, got ${actual}`)
      }
    }
  },
  {
    name: 'reports an invalid txid',
    pattern: /^the conversion reports an invalid txid$/,
    run (m, example, world) {
      if (!(world.conversionError instanceof Error)) {
        throw new Error('Expected the conversion to reject the txid')
      }
    }
  },
  {
    name: 'the cash address',
    pattern: /^the cash address "(.+)"$/,
    run (m, example, world) {
      world.address = resolveParam(m[1], example)
    }
  },
  {
    name: 'convert address to payload',
    pattern: /^the address is converted to its payload$/,
    run (m, example, world) {
      world.conversionError = null
      try {
        world.payload = addressToHash160(world.address)
      } catch (err) {
        world.conversionError = err
      }
    }
  },
  {
    name: 'payload is',
    pattern: /^the payload is "(.+)"$/,
    run (m, example, world) {
      const expected = resolveParam(m[1], example)
      const actual = world.payload?.toString('hex')
      if (actual !== expected) {
        throw new Error(`Expected payload ${expected}, got ${actual}`)
      }
    }
  },
  {
    name: 'reports an invalid address',
    pattern: /^the conversion reports an invalid address$/,
    run (m, example, world) {
      if (!(world.conversionError instanceof Error)) {
        throw new Error('Expected the conversion to reject the address')
      }
    }
  }
]

export { wireEncodingHandlers }
