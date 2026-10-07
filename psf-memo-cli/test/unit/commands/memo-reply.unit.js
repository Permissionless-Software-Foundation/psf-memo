/*
  Unit tests for the memo-reply write command.

  These drive the real command against injected wallet and broadcast fakes so
  the wallet resolution, the two-field 0x6d03 action, the parent-txid encoding,
  the result reporting, the usage errors, and the broadcast-error surfacing are
  pinned without a network or a real wallet file.
*/

// Global npm libraries
import { assert } from 'chai'

// Local libraries
import MemoReply from '../../../src/commands/memo-reply.js'
import { UsageError } from '../../../src/lib/reporter.js'
import WalletUtil from '../../../src/lib/wallet-util.js'
import { broadcastMemo } from '../../../src/lib/memo-broadcast.js'
import {
  assertUsageError,
  makeCommand,
  walletUtilFor,
  TXID,
  EXPLORER
} from '../../support/write-command-unit.js'

const PARENT = `01${'00'.repeat(31)}`
const PARENT_WIRE = `${'00'.repeat(31)}01`
const NO_SOURCE =
  'You must specify a wallet name with the -n flag or a WIF with the --wif flag.'

describe('#memo-reply command', () => {
  let originalExitCode

  beforeEach(() => {
    originalExitCode = process.exitCode
  })

  afterEach(() => {
    process.exitCode = originalExitCode
  })

  it('broadcasts the 0x6d03 action and reports the txid and link as JSON', async () => {
    const { command, out, err, calls } = makeCommand(MemoReply)

    const code = await command.run({ json: true, name: 'wallet1', txid: PARENT, memo: 'hello reply' })

    assert.equal(code, 0)
    assert.equal(calls.length, 1)
    assert.equal(calls[0].prefix, '6d03')
    assert.equal(calls[0].fields[0].toString('hex'), PARENT_WIRE)
    assert.equal(calls[0].fields[1], 'hello reply')
    assert.isObject(calls[0].wallet)

    const data = JSON.parse(out.text())
    assert.equal(data.txid, TXID)
    assert.equal(data.explorerUrl, EXPLORER)
    assert.include(data.message, TXID)
    assert.equal(err.text(), '')
  })

  it('accepts a WIF wallet source', async () => {
    const { command, calls } = makeCommand(MemoReply)

    const code = await command.run({ json: true, wif: 'wif-one', txid: PARENT, memo: 'hi' })

    assert.equal(code, 0)
    assert.equal(calls.length, 1)
  })

  it('reports a missing wallet source as the documented usage error (exit 2)', async () => {
    await assertUsageError(MemoReply, { txid: PARENT, memo: 'hello reply' }, NO_SOURCE)
  })

  it('reports a malformed parent txid as a usage error and never broadcasts (exit 2)', async () => {
    await assertUsageError(
      MemoReply,
      { name: 'wallet1', txid: '1234', memo: 'hello reply' },
      'Txid must be a 64-character hex string.'
    )
    await assertUsageError(
      MemoReply,
      { name: 'wallet1', txid: 'z'.repeat(64), memo: 'hello reply' },
      'Txid must be a valid hex string.'
    )
  })

  it('reports an over-long reply as a usage error and never broadcasts (exit 2)', async () => {
    await assertUsageError(
      MemoReply,
      { name: 'wallet1', txid: PARENT, memo: 'é'.repeat(93) },
      'Reply is too long. Maximum is 184 bytes.'
    )
  })

  it('reports a missing reply as a usage error (exit 2)', async () => {
    await assertUsageError(
      MemoReply,
      { name: 'wallet1', txid: PARENT },
      'You must specify reply text with the -m flag.'
    )
  })

  it('reports an empty reply as a usage error (exit 2)', async () => {
    await assertUsageError(
      MemoReply,
      { name: 'wallet1', txid: PARENT, memo: '' },
      'Reply must not be empty.'
    )
  })

  it('surfaces the wallet broadcast error (exit 1)', async () => {
    const { command, out, err } = makeCommand(MemoReply, {
      broadcast: async () => {
        throw new Error('insufficient funds')
      }
    })

    const code = await command.run({ json: true, name: 'wallet1', txid: PARENT, memo: 'hello reply' })

    assert.equal(code, 1)
    assert.equal(out.text(), '')
    assert.deepEqual(JSON.parse(err.text()), { error: 'insufficient funds' })
  })

  it('prints the txid and explorer link in human mode', async () => {
    const { command, out } = makeCommand(MemoReply)

    const code = await command.run({ name: 'wallet1', txid: PARENT, memo: 'hello reply' })

    assert.equal(code, 0)
    assert.include(out.text(), TXID)
    assert.include(out.text(), EXPLORER)
    assert.throws(() => JSON.parse(out.text()))
  })

  it('validates the flags without broadcasting', () => {
    const command = new MemoReply({ walletUtil: walletUtilFor() })

    assert.equal(command.validateFlags({ txid: PARENT, memo: 'hello' }), true)
    assert.throws(() => command.validateFlags({ memo: 'hello' }), UsageError)
  })

  it('defaults to a real wallet util and the shared broadcaster', () => {
    const command = new MemoReply()

    assert.instanceOf(command.walletUtil, WalletUtil)
    assert.equal(command.broadcast, broadcastMemo)
  })
})
