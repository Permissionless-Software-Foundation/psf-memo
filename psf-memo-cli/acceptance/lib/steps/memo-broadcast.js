/*
  Gherkin step handlers for the Memo Broadcast feature.

  The scenario world supplies a wallet that records the OP_RETURN pushes it
  receives. The real broadcast scaffolding builds and sends the action through
  that wallet, so the push order, result, and error contract are exercised
  without a network or a real key.
*/

// Local libraries
import { broadcastMemo } from '../../../src/lib/memo-broadcast.js'
import { txidToWireBytes } from '../../../src/lib/wire-encoding.js'
import { assertEqual, resolveParam, resolveTemplate } from '../step-support.js'
import { createRecordingWallet } from '../wallet-support.js'

// Broadcast the configured action, recording either the result or the error.
async function broadcastAndReport (world) {
  world.result = null
  world.error = null
  try {
    world.result = await broadcastMemo({
      wallet: world.wallet,
      prefix: world.prefix,
      fields: world.fields
    })
  } catch (err) {
    world.error = err
  }
}

// Provide a minimal action for scenarios that only exercise reporting.
function defaultAction (world) {
  if (world.fields.length === 0) {
    world.prefix = '6d02'
    world.fields = ['hello memo']
  }
}

// Read the 1-based push at `index` from the recorded broadcast.
function push (world, index) {
  const pushes = world.broadcast?.pushes
  if (!pushes || pushes.length < index) {
    throw new Error(
      `Expected at least ${index} broadcast pushes, got ${pushes?.length}`
    )
  }
  return pushes[index - 1]
}

const memoBroadcastHandlers = [
  {
    name: 'a wallet that records broadcasts',
    pattern: /^a wallet that records broadcasts$/,
    run (m, example, world) {
      world.prefix = null
      world.fields = []
      world.broadcast = null
      world.broadcastTxid = 'broadcast-txid'
      world.broadcastError = null
      world.result = null
      world.error = null
      world.wallet = createRecordingWallet(world)
    }
  },
  {
    name: 'the wallet has spendable output',
    pattern: /^the wallet has spendable output$/,
    run (m, example, world) {
      world.wallet.hasSpendableOutput = true
    }
  },
  {
    name: 'the Memo action prefix',
    pattern: /^the Memo action prefix is "(.+)"$/,
    run (m, example, world) {
      world.prefix = resolveParam(m[1], example)
    }
  },
  {
    name: 'one UTF-8 field',
    pattern: /^the action has one field with the UTF-8 text "(.+)"$/,
    run (m, example, world) {
      world.fields = [resolveParam(m[1], example)]
    }
  },
  {
    name: 'referenced txid as the first field',
    pattern: /^the action has the referenced txid "(.+)" as its first field$/,
    run (m, example, world) {
      world.fields.push(txidToWireBytes(resolveParam(m[1], example)))
    }
  },
  {
    name: 'UTF-8 text as the second field',
    pattern: /^the action has the UTF-8 text "(.+)" as its second field$/,
    run (m, example, world) {
      world.fields.push(resolveParam(m[1], example))
    }
  },
  {
    name: 'poll type as the first field',
    pattern: /^the action has the poll type (.+) as its first field$/,
    run (m, example, world) {
      world.fields.push(
        Buffer.from([Number.parseInt(resolveParam(m[1], example), 10)])
      )
    }
  },
  {
    name: 'option count as the second field',
    pattern: /^the action has the option count (.+) as its second field$/,
    run (m, example, world) {
      world.fields.push(
        Buffer.from([Number.parseInt(resolveParam(m[1], example), 10)])
      )
    }
  },
  {
    name: 'UTF-8 question as the third field',
    pattern: /^the action has the UTF-8 question "(.+)" as its third field$/,
    run (m, example, world) {
      world.fields.push(resolveParam(m[1], example))
    }
  },
  {
    name: 'the wallet returns a txid',
    pattern: /^the wallet returns the transaction id "(.+)"$/,
    run (m, example, world) {
      world.broadcastTxid = resolveParam(m[1], example)
      defaultAction(world)
    }
  },
  {
    name: 'the wallet rejects the broadcast',
    pattern: /^the wallet rejects the broadcast with the error "(.+)"$/,
    run (m, example, world) {
      world.broadcastError = resolveParam(m[1], example)
      defaultAction(world)
    }
  },
  {
    name: 'broadcasts the Memo action',
    pattern: /^the command broadcasts the Memo action$/,
    async run (m, example, world) {
      await broadcastAndReport(world)
    }
  },
  {
    name: 'broadcasts and reports the result',
    pattern: /^the command broadcasts the Memo action and reports the result$/,
    async run (m, example, world) {
      await broadcastAndReport(world)
    }
  },
  {
    name: 'the broadcast push count',
    pattern: /^the broadcast has (.+) OP_RETURN pushes$/,
    run (m, example, world) {
      assertEqual(world.broadcast?.pushes?.length, Number.parseInt(resolveParam(m[1], example), 10), 'push count')
    }
  },
  {
    name: 'push 1 is the Memo prefix',
    pattern: /^broadcast push 1 is the Memo prefix "(.+)"$/,
    run (m, example, world) {
      assertEqual(push(world, 1).toString('hex'), resolveParam(m[1], example), 'prefix push')
    }
  },
  {
    name: 'push 2 is UTF-8 text',
    pattern: /^broadcast push 2 is the UTF-8 text "(.+)"$/,
    run (m, example, world) {
      assertEqual(push(world, 2).toString('utf8'), resolveParam(m[1], example), 'text push', { quote: true })
    }
  },
  {
    name: 'push 3 is UTF-8 text',
    pattern: /^broadcast push 3 is the UTF-8 text "(.+)"$/,
    run (m, example, world) {
      assertEqual(push(world, 3).toString('utf8'), resolveParam(m[1], example), 'text push', { quote: true })
    }
  },
  {
    name: 'push 2 is the hash160',
    pattern: /^broadcast push 2 is the hash160 "(.+)"$/,
    run (m, example, world) {
      assertEqual(push(world, 2).toString('hex'), resolveParam(m[1], example), 'hash160 push')
    }
  },
  {
    name: 'push 2 is the wire txid',
    pattern: /^broadcast push 2 is the referenced txid "(.+)" in little-endian wire order$/,
    run (m, example, world) {
      assertEqual(push(world, 2).toString('hex'), txidToWireBytes(resolveParam(m[1], example)).toString('hex'), 'wire txid')
    }
  },
  {
    name: 'push 2 is the poll type',
    pattern: /^broadcast push 2 is the poll type (.+)$/,
    run (m, example, world) {
      assertEqual(push(world, 2)[0], Number.parseInt(resolveParam(m[1], example), 10), 'poll type')
    }
  },
  {
    name: 'push 3 is the option count',
    pattern: /^broadcast push 3 is the option count (.+)$/,
    run (m, example, world) {
      assertEqual(push(world, 3)[0], Number.parseInt(resolveParam(m[1], example), 10), 'option count')
    }
  },
  {
    name: 'push 4 is the UTF-8 question',
    pattern: /^broadcast push 4 is the UTF-8 question "(.+)"$/,
    run (m, example, world) {
      assertEqual(push(world, 4).toString('utf8'), resolveParam(m[1], example), 'question push', { quote: true })
    }
  },
  {
    name: 'the reported transaction id',
    pattern: /^the reported transaction id is "(.+)"$/,
    run (m, example, world) {
      assertEqual(world.result?.txid, resolveParam(m[1], example), 'txid')
    }
  },
  {
    name: 'the reported explorer link',
    pattern: /^the reported explorer link is "(.+)"$/,
    run (m, example, world) {
      assertEqual(world.result?.explorerUrl, resolveTemplate(m[1], example), 'explorer link')
    }
  },
  {
    name: 'the reported error',
    pattern: /^the reported error is "(.+)"$/,
    run (m, example, world) {
      assertEqual(world.error?.message, resolveTemplate(m[1], example), 'error', { quote: true })
    }
  }
]

export { memoBroadcastHandlers }
