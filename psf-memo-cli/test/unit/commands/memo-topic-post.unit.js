/*
  Unit tests for the memo-topic-post write command.

  These drive the real command against injected wallet and broadcast fakes so
  the wallet resolution, the three-push 0x6d0c action, the combined byte limit,
  the result reporting, the usage errors, and the broadcast-error surfacing are
  pinned without a network or a real wallet file.
*/

// Global npm libraries
import { assert } from 'chai'

// Local libraries
import MemoTopicPost from '../../../src/commands/memo-topic-post.js'
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

describe('#memo-topic-post command', () => {
  let originalExitCode

  beforeEach(() => {
    originalExitCode = process.exitCode
  })

  afterEach(() => {
    process.exitCode = originalExitCode
  })

  it('broadcasts the 0x6d0c action with the room and message and reports the txid and link as JSON', async () => {
    const { command, out, err, calls } = makeCommand(MemoTopicPost)

    const code = await command.run({ json: true, name: 'wallet1', room: 'general', memo: 'hello topic' })

    assert.equal(code, 0)
    assert.equal(calls.length, 1)
    assert.equal(calls[0].prefix, '6d0c')
    assert.deepEqual(calls[0].fields, ['general', 'hello topic'])
    assert.isObject(calls[0].wallet)

    const data = JSON.parse(out.text())
    assert.equal(data.txid, TXID)
    assert.equal(data.explorerUrl, EXPLORER)
    assert.include(data.message, TXID)
    assert.equal(err.text(), '')
  })

  it('accepts a WIF wallet source', async () => {
    const { command, calls } = makeCommand(MemoTopicPost)

    const code = await command.run({ json: true, wif: 'wif-one', room: 'general', memo: 'hello topic' })

    assert.equal(code, 0)
    assert.equal(calls.length, 1)
  })

  it('reports a combined room plus message over the limit as a usage error (exit 2)', async () => {
    await assertUsageError(
      MemoTopicPost,
      { name: 'wallet1', room: 'general', memo: 'é'.repeat(104) },
      'Topic message is too long. Maximum is 214 bytes.'
    )
  })

  it('reports a missing room as a usage error (exit 2)', async () => {
    await assertUsageError(
      MemoTopicPost,
      { name: 'wallet1', memo: 'hello topic' },
      'You must specify a topic room with the -r flag.'
    )
  })

  it('reports a missing message as a usage error (exit 2)', async () => {
    await assertUsageError(
      MemoTopicPost,
      { name: 'wallet1', room: 'general' },
      'You must specify topic message text with the -m flag.'
    )
  })

  it('reports an empty message as a usage error (exit 2)', async () => {
    await assertUsageError(
      MemoTopicPost,
      { name: 'wallet1', room: 'general', memo: '' },
      'Topic message must not be empty.'
    )
  })

  it('reports a missing wallet source as the documented usage error (exit 2)', async () => {
    await assertUsageError(
      MemoTopicPost,
      { room: 'general', memo: 'hello topic' },
      NO_SOURCE
    )
  })

  it('surfaces the wallet broadcast error (exit 1)', async () => {
    await assertBroadcastErrorSurfaces(
      (opts) => makeCommand(MemoTopicPost, opts),
      { name: 'wallet1', room: 'general', memo: 'hello topic' }
    )
  })

  it('prints the txid and explorer link in human mode', async () => {
    await assertHumanMode(
      () => makeCommand(MemoTopicPost),
      { name: 'wallet1', room: 'general', memo: 'hello topic' }
    )
  })

  it('validates the flags without broadcasting', () => {
    assertValidatesFlags(MemoTopicPost, { room: 'general', memo: 'hello topic' })
  })

  it('defaults to a real wallet util and the shared broadcaster', () => {
    const command = new MemoTopicPost()

    assert.instanceOf(command.walletUtil, WalletUtil)
    assert.equal(command.broadcast, broadcastMemo)
  })
})
