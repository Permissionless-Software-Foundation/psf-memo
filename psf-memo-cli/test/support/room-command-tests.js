/*
  Shared unit tests for the single-field topic room write commands.

  memo-topic-follow and memo-topic-unfollow share the same observable write
  contract: resolve the wallet, require the -r room, broadcast it under the
  command's prefix, and report the txid + explorer link. This module registers
  those shared assertions so the command test file keeps only prefix/verb.
*/

// Global npm libraries
import { assert } from 'chai'

// Local libraries
import {
  assertBroadcastErrorSurfaces,
  assertHumanMode,
  assertUsageError,
  assertValidatesFlags,
  makeCommand,
  TXID,
  EXPLORER
} from './write-command-unit.js'

const NO_SOURCE =
  'You must specify a wallet name with the -n flag or a WIF with the --wif flag.'

// Register the shared topic-room command tests for one command class.
export function defineRoomCommandTests ({ label, CommandClass, prefix, missingMessage }) {
  it(`broadcasts the 0x${prefix} action with the room and reports the txid and link as JSON`, async () => {
    const { command, out, err, calls } = makeCommand(CommandClass)

    const code = await command.run({ json: true, name: 'wallet1', room: 'general' })

    assert.equal(code, 0)
    assert.equal(calls.length, 1)
    assert.equal(calls[0].prefix, prefix)
    assert.deepEqual(calls[0].fields, ['general'])

    const data = JSON.parse(out.text())
    assert.equal(data.txid, TXID)
    assert.equal(data.explorerUrl, EXPLORER)
    assert.equal(err.text(), '')
  })

  it('accepts a WIF wallet source', async () => {
    const { command, calls } = makeCommand(CommandClass)

    const code = await command.run({ json: true, wif: 'wif-one', room: 'general' })

    assert.equal(code, 0)
    assert.equal(calls.length, 1)
  })

  it('reports a missing room as the documented usage error (exit 2)', async () => {
    await assertUsageError(CommandClass, { name: 'wallet1' }, missingMessage)
  })

  it('reports a missing wallet source as the documented usage error (exit 2)', async () => {
    await assertUsageError(CommandClass, { room: 'general' }, NO_SOURCE)
  })

  it('surfaces the wallet broadcast error (exit 1)', async () => {
    await assertBroadcastErrorSurfaces(
      (opts) => makeCommand(CommandClass, opts),
      { name: 'wallet1', room: 'general' }
    )
  })

  it('prints the txid and explorer link in human mode', async () => {
    await assertHumanMode(() => makeCommand(CommandClass), { name: 'wallet1', room: 'general' })
  })

  it('validates the room flag without broadcasting', () => {
    assertValidatesFlags(CommandClass, { room: 'general' })
  })
}
