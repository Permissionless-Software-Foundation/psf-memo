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

// Run a conversion, recording either its result or the thrown error on the
// world so both the success and malformed-input scenarios share one path.
function captureConversion (world, run) {
  world.conversionError = null
  try {
    return run()
  } catch (err) {
    world.conversionError = err
    return null
  }
}

// Assert that a byte buffer renders to the expected lowercase hex string.
function assertHex (value, expected, label) {
  const actual = value?.toString('hex')
  if (actual !== expected) {
    throw new Error(`Expected ${label} ${expected}, got ${actual}`)
  }
}

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
      world.wireBytes = captureConversion(world, () => txidToWireBytes(world.txid))
    }
  },
  {
    name: 'wire bytes are',
    pattern: /^the wire bytes are "(.+)"$/,
    run (m, example, world) {
      assertHex(world.wireBytes, resolveParam(m[1], example), 'wire bytes')
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
      world.payload = captureConversion(world, () => addressToHash160(world.address))
    }
  },
  {
    name: 'payload is',
    pattern: /^the payload is "(.+)"$/,
    run (m, example, world) {
      assertHex(world.payload, resolveParam(m[1], example), 'payload')
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
