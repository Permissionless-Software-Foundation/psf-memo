/*
  Shared unit tests for the single-field follow/mute write commands.

  memo-follow, memo-unfollow, memo-mute, and memo-unmute share the same
  observable write contract: resolve the wallet, decode the -a target address
  to its display-order hash160, broadcast it under the command's prefix, and
  report the txid + explorer link. This module registers those shared
  assertions so each command's test file keeps only its own prefix and verb.
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

// Register the shared address-command tests for one command class.
export function defineAddressCommandTests ({
  label,
  CommandClass,
  prefix,
  missingMessage,
  validAddr,
  hash160Hex
}) {
  it(`broadcasts the 0x${prefix} action and reports the ${label} hash160 as JSON`, async () => {
    const { command, out, err, calls } = makeCommand(CommandClass)

    const code = await command.run({ json: true, name: 'wallet1', addr: validAddr })

    assert.equal(code, 0)
    assert.equal(calls.length, 1)
    assert.equal(calls[0].prefix, prefix)
    assert.equal(calls[0].fields.length, 1)
    assert.equal(Buffer.from(calls[0].fields[0]).toString('hex'), hash160Hex)

    const data = JSON.parse(out.text())
    assert.equal(data.txid, TXID)
    assert.equal(data.explorerUrl, EXPLORER)
    assert.equal(err.text(), '')
  })

  it('accepts a WIF wallet source', async () => {
    const { command, calls } = makeCommand(CommandClass)

    const code = await command.run({ json: true, wif: 'wif-one', addr: validAddr })

    assert.equal(code, 0)
    assert.equal(calls.length, 1)
  })

  it('reports a missing target address as the documented usage error (exit 2)', async () => {
    await assertUsageError(CommandClass, { name: 'wallet1' }, missingMessage)
  })

  it('reports a malformed target address as a usage error and never broadcasts (exit 2)', async () => {
    await assertUsageError(
      CommandClass,
      { name: 'wallet1', addr: 'not-an-address' },
      'Address must be a valid cash address.'
    )
  })

  it('reports a missing wallet source as the documented usage error (exit 2)', async () => {
    await assertUsageError(CommandClass, { addr: validAddr }, NO_SOURCE)
  })

  it('surfaces the wallet broadcast error (exit 1)', async () => {
    await assertBroadcastErrorSurfaces(
      (opts) => makeCommand(CommandClass, opts),
      { name: 'wallet1', addr: validAddr }
    )
  })

  it('prints the txid and explorer link in human mode', async () => {
    await assertHumanMode(() => makeCommand(CommandClass), { name: 'wallet1', addr: validAddr })
  })

  it('validates the address flag without broadcasting', () => {
    assertValidatesFlags(CommandClass, { addr: validAddr })
  })
}
