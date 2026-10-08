/*
  Unit tests for the memo-name write command.

  These drive the real command against injected wallet and broadcast fakes so
  the wallet resolution, the single-field 0x6d01 action, the byte-length limit,
  the result reporting, the usage errors, and the broadcast-error surfacing are
  pinned without a network or a real wallet file.
*/

// Global npm libraries
import { assert } from 'chai'

// Local libraries
import MemoName from '../../../src/commands/memo-name.js'
import WalletUtil from '../../../src/lib/wallet-util.js'
import { broadcastMemo } from '../../../src/lib/memo-broadcast.js'
import {
  assertBroadcastErrorSurfaces,
  assertHumanMode,
  assertUsageError,
  assertValidatesFlags,
  makeCommand,
  TXID,
  EXPLORER
} from '../../support/write-command-unit.js'

const NO_SOURCE =
  'You must specify a wallet name with the -n flag or a WIF with the --wif flag.'

describe('#memo-name command', () => {
  let originalExitCode

  beforeEach(() => {
    originalExitCode = process.exitCode
  })

  afterEach(() => {
    process.exitCode = originalExitCode
  })

  it('broadcasts the 0x6d01 action and reports the txid and link as JSON', async () => {
    const { command, out, err, calls } = makeCommand(MemoName)

    const code = await command.run({ json: true, name: 'wallet1', memo: 'trout' })

    assert.equal(code, 0)
    assert.equal(calls.length, 1)
    assert.equal(calls[0].prefix, '6d01')
    assert.deepEqual(calls[0].fields, ['trout'])
    assert.isObject(calls[0].wallet)

    const data = JSON.parse(out.text())
    assert.equal(data.txid, TXID)
    assert.equal(data.explorerUrl, EXPLORER)
    assert.include(data.message, TXID)
    assert.equal(err.text(), '')
  })

  it('accepts a WIF wallet source', async () => {
    const { command, calls } = makeCommand(MemoName)

    const code = await command.run({ json: true, wif: 'wif-one', memo: 'trout' })

    assert.equal(code, 0)
    assert.equal(calls.length, 1)
  })

  it('reports a missing wallet source as the documented usage error (exit 2)', async () => {
    await assertUsageError(MemoName, { memo: 'trout' }, NO_SOURCE)
  })

  it('reports an over-long name as a usage error and never broadcasts (exit 2)', async () => {
    await assertUsageError(
      MemoName,
      { name: 'wallet1', memo: 'é'.repeat(39) },
      'Name is too long. Maximum is 77 bytes.'
    )
  })

  it('reports a missing name as a usage error (exit 2)', async () => {
    await assertUsageError(
      MemoName,
      { name: 'wallet1' },
      'You must specify a name with the -m flag.'
    )
  })

  it('reports an empty name as a usage error (exit 2)', async () => {
    await assertUsageError(MemoName, { name: 'wallet1', memo: '' }, 'Name must not be empty.')
  })

  it('surfaces the wallet broadcast error (exit 1)', async () => {
    await assertBroadcastErrorSurfaces(
      (opts) => makeCommand(MemoName, opts),
      { name: 'wallet1', memo: 'trout' }
    )
  })

  it('prints the txid and explorer link in human mode', async () => {
    await assertHumanMode(() => makeCommand(MemoName), { name: 'wallet1', memo: 'trout' })
  })

  it('validates the name flag without broadcasting', () => {
    assertValidatesFlags(MemoName, { memo: 'trout' })
  })

  it('defaults to a real wallet util and the shared broadcaster', () => {
    const command = new MemoName()

    assert.instanceOf(command.walletUtil, WalletUtil)
    assert.equal(command.broadcast, broadcastMemo)
  })
})
